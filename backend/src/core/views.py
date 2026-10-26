import logging

from django.db.models import Count, F, Q
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, FaqEntry, Message, OperatorPresence, Post
from .serializers import (
    ChatRequestSerializer,
    MessageSerializer,
    OperatorReplySerializer,
    PostDetailSerializer,
    PostListSerializer,
)
from .twin import TwinUnavailable, ask_twin, faq_answer

logger = logging.getLogger(__name__)

# If you've taken over a chat but closed /inbox for this long, the twin steps back in.
HANDBACK_AFTER_SECONDS = 120

JOINED = "Matsilele has joined the chat."
LEFT = "Matsilele has left the chat. His digital twin is back to help."


# --------------------------------------------------------------------------- posts
class PostListView(generics.ListAPIView):
    serializer_class = PostListSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Post.objects.filter(published=True)
        limit = self.request.query_params.get("limit")
        return qs[: int(limit)] if limit and limit.isdigit() else qs


class PostDetailView(generics.RetrieveAPIView):
    serializer_class = PostDetailSerializer
    queryset = Post.objects.filter(published=True)
    lookup_field = "slug"


# --------------------------------------------------------------------------- helpers
def after_param(request) -> int:
    raw = request.query_params.get("after", "0")
    return int(raw) if raw.isdigit() else 0


def set_mode(conv: Conversation, mode: str) -> Message | None:
    if conv.mode == mode:
        return None
    conv.mode = mode
    if mode == Conversation.HUMAN:
        conv.needs_human = False
    conv.last_activity = timezone.now()
    conv.save(update_fields=["mode", "needs_human", "last_activity"])
    return conv.messages.create(role=Message.SYSTEM, content=JOINED if mode == Conversation.HUMAN else LEFT)


def llm_history(conv: Conversation, before_id: int) -> list[dict]:
    history = []
    for m in conv.messages.filter(id__lt=before_id).exclude(role=Message.SYSTEM).order_by("-id")[:12][::-1]:
        if m.role == Message.USER:
            history.append({"role": "user", "content": m.content})
        elif m.role == Message.OPERATOR:
            history.append({"role": "assistant", "content": f"[Matsilele, live] {m.content}"})
        else:
            history.append({"role": "assistant", "content": m.content})
    return history


def state(conv: Conversation | None, after: int = 0) -> dict:
    msgs = conv.messages.filter(id__gt=after) if conv else Message.objects.none()
    return {
        "messages": MessageSerializer(msgs, many=True).data,
        "mode": conv.mode if conv else Conversation.BOT,
        "operator_online": OperatorPresence.is_online(),
    }


# --------------------------------------------------------------------------- visitor
class ChatView(APIView):
    """Visitor sends a message. The twin answers unless Matsilele has taken over."""

    throttle_scope = "chat"

    def post(self, request):
        data = ChatRequestSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        text = data.validated_data["message"]
        session_id = data.validated_data["session_id"]
        after = data.validated_data.get("after", 0)

        conv, _ = Conversation.objects.get_or_create(session_id=session_id)
        user_msg = conv.messages.create(role=Message.USER, content=text)
        conv.last_activity = timezone.now()
        conv.save(update_fields=["last_activity"])

        if conv.mode == Conversation.HUMAN:
            since = OperatorPresence.seconds_since_seen()
            if since is not None and since <= HANDBACK_AFTER_SECONDS:
                return Response(state(conv, after))  # Matsilele will reply from /inbox
            set_mode(conv, Conversation.BOT)

        activity: list[dict] = []
        http_status = status.HTTP_200_OK
        instant = faq_answer(text)
        if instant:
            number, reply = instant
            activity.append({"type": "instant", "faq": number})
        else:
            reply, http_status = self.twin_reply(conv, user_msg, text, activity)

        conv.refresh_from_db(fields=["mode"])
        bot_msg = None
        if conv.mode == Conversation.BOT:  # Matsilele may have joined while the twin was thinking
            bot_msg = conv.messages.create(role=Message.ASSISTANT, content=reply)
        body = state(conv, after)
        if bot_msg:
            body["activity"] = {"message_id": bot_msg.id, "steps": activity}
        return Response(body, status=http_status)

    @staticmethod
    def twin_reply(conv: Conversation, user_msg: Message, text: str, activity: list) -> tuple[str, int]:
        online = OperatorPresence.is_online()
        try:
            reply = ask_twin(text, llm_history(conv, user_msg.id), session_id=conv.session_id,
                             operator_online=online, activity=activity)
            http_status = status.HTTP_200_OK
        except TwinUnavailable:
            reply = ("My digital twin isn't switched on yet (no LLM API key configured). "
                     "In the meantime, please email me at matsilele.aubrey@gmail.com.")
            http_status = status.HTTP_200_OK
        except Exception:
            logger.exception("Digital twin failed")
            reply = ("Sorry, I'm having trouble thinking right now. Please try again shortly, "
                     "or email me at matsilele.aubrey@gmail.com.")
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE
        return reply, http_status


class FaqListView(APIView):
    """Numbered FAQ for the avatar page: typing "Qn" in the chat returns answer n instantly."""

    throttle_scope = "poll"

    def get(self, request):
        return Response([{"number": n, "question": f.question} for n, f in FaqEntry.numbered()])


class ChatPollView(APIView):
    """Visitor window checks for new messages (e.g. Matsilele's live replies)."""

    throttle_scope = "poll"

    def get(self, request, session_id):
        conv = Conversation.objects.filter(session_id=session_id[:64]).first()
        return Response(state(conv, after_param(request)))


# --------------------------------------------------------------------------- inbox (staff only)
class StaffView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        OperatorPresence.touch()  # having /inbox open is what makes you "online"


class InboxMeView(StaffView):
    def get(self, request):
        # The CSRF token lives in the session (no cookie behind Firebase), so hand it to the inbox here
        return Response({"username": request.user.get_username(), "csrf": get_token(request)})


class InboxListView(StaffView):
    def get(self, request):
        since = timezone.now() - timezone.timedelta(days=7)
        convs = (
            Conversation.objects.filter(last_activity__gte=since)
            .annotate(
                unread=Count("messages", filter=Q(messages__role=Message.USER,
                                                  messages__id__gt=F("operator_read_up_to"))),
                total=Count("messages"),
            )
            .filter(total__gt=0)
            # Explicit: Meta.ordering is ignored once the query is grouped by the counts above
            .order_by("-last_activity", "-id")[:50]
        )
        out = []
        for c in convs:
            last = c.messages.exclude(role=Message.SYSTEM).last()
            out.append({
                "id": c.id,
                "name": c.display_name,
                "mode": c.mode,
                "needs_human": c.needs_human,
                "unread": c.unread,
                "last_activity": c.last_activity,
                "last_message": last.content[:120] if last else "",
                "last_role": last.role if last else None,
            })
        return Response(out)


class InboxMessagesView(StaffView):
    def get(self, request, pk):
        conv = get_object_or_404(Conversation, pk=pk)
        msgs = list(conv.messages.filter(id__gt=after_param(request)))
        if msgs:
            Conversation.objects.filter(pk=pk, operator_read_up_to__lt=msgs[-1].id).update(
                operator_read_up_to=msgs[-1].id)
        return Response({
            "conversation": {"id": conv.id, "name": conv.display_name, "mode": conv.mode,
                             "needs_human": conv.needs_human},
            "messages": MessageSerializer(msgs, many=True).data,
        })

    def post(self, request, pk):
        conv = get_object_or_404(Conversation, pk=pk)
        data = OperatorReplySerializer(data=request.data)
        data.is_valid(raise_exception=True)
        set_mode(conv, Conversation.HUMAN)  # replying takes over the chat
        msg = conv.messages.create(role=Message.OPERATOR, content=data.validated_data["content"])
        Conversation.objects.filter(pk=pk).update(last_activity=timezone.now(), operator_read_up_to=msg.id)
        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class InboxModeView(StaffView):
    def post(self, request, pk):
        conv = get_object_or_404(Conversation, pk=pk)
        mode = request.data.get("mode")
        if mode not in (Conversation.BOT, Conversation.HUMAN):
            return Response({"detail": "mode must be 'bot' or 'human'"}, status=status.HTTP_400_BAD_REQUEST)
        set_mode(conv, mode)
        return Response({"mode": conv.mode})
