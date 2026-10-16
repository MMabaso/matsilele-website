"""Run with: python manage.py test core

The LLM is mocked, so these tests run offline and cost nothing.
"""

import json
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from .models import ContactRequest, Conversation, FaqEntry, Message, OperatorPresence, Post, UnansweredQuestion

SESSION = "session-0001"


def tool_call_response(name: str, args: dict):
    call = SimpleNamespace(id="call_1", type="function",
                           function=SimpleNamespace(name=name, arguments=json.dumps(args)))
    msg = SimpleNamespace(content=None, tool_calls=[call], role="assistant")
    return SimpleNamespace(choices=[SimpleNamespace(message=msg)])


def text_response(text: str):
    msg = SimpleNamespace(content=text, tool_calls=None, role="assistant")
    return SimpleNamespace(choices=[SimpleNamespace(message=msg)])


def fake_client(*responses):
    client = MagicMock()
    client.chat.completions.create.side_effect = list(responses)
    return client


NOTIFY_SETTINGS = dict(
    OPENAI_API_KEY="test-key",
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_HOST_USER="me@example.com",
    NOTIFY_EMAIL_TO="matsilele@example.com",
    PUSHOVER_USER="", PUSHOVER_TOKEN="",
    RAG_ENABLED=False,  # RAG has its own tests below
)


class ChatTestCase(TestCase):
    def chat(self, message, session=SESSION):
        return self.client.post("/api/chat/", {"message": message, "session_id": session},
                                content_type="application/json")


@override_settings(**NOTIFY_SETTINGS)
class DigitalTwinTests(ChatTestCase):
    def test_bot_reply_is_stored_in_conversation(self):
        with patch("openai.OpenAI", return_value=fake_client(text_response("Hello there!"))):
            res = self.chat("Hi")
        self.assertEqual(res.status_code, 200)
        self.assertEqual([m["role"] for m in res.json()["messages"]], ["user", "assistant"])
        self.assertEqual(Conversation.objects.get().messages.count(), 2)

    def test_contact_request_is_saved_and_emailed(self):
        client = fake_client(
            tool_call_response("record_contact_request", {
                "name": "Thandi Nkosi", "email": "thandi@acme.co.za",
                "organisation": "Acme", "reason": "Senior ML Engineer role",
            }),
            text_response("Thanks Thandi, I've let Matsilele know and he'll be in touch."),
        )
        with patch("openai.OpenAI", return_value=client):
            res = self.chat("I'd like to talk to you about a role. I'm Thandi, thandi@acme.co.za")

        self.assertEqual(res.status_code, 200)
        req = ContactRequest.objects.get()
        self.assertEqual((req.name, req.email, req.organisation), ("Thandi Nkosi", "thandi@acme.co.za", "Acme"))
        self.assertEqual(Conversation.objects.get().visitor_name, "Thandi Nkosi")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Senior ML Engineer role", mail.outbox[0].body)
        self.assertIn("/inbox?c=", mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].reply_to, ["thandi@acme.co.za"])

    def test_contact_request_without_contact_detail_is_rejected(self):
        client = fake_client(
            tool_call_response("record_contact_request", {"name": "Sipho", "reason": "Chat"}),
            text_response("Could you share an email address or phone number?"),
        )
        with patch("openai.OpenAI", return_value=client):
            self.chat("I'm Sipho, I want to chat")
        self.assertEqual(ContactRequest.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_unanswered_question_is_logged(self):
        client = fake_client(
            tool_call_response("record_unanswered_question", {"question": "What are your salary expectations?"}),
            text_response("I don't have that to hand, but I can pass your details on."),
        )
        with patch("openai.OpenAI", return_value=client):
            self.chat("What are your salary expectations?")
        self.assertEqual(UnansweredQuestion.objects.get().question, "What are your salary expectations?")

    def test_live_chat_tool_only_offered_when_online(self):
        client = fake_client(text_response("a"), text_response("b"))
        with patch("openai.OpenAI", return_value=client):
            self.chat("hi")
            OperatorPresence.touch()
            self.chat("hi again")
        calls = client.chat.completions.create.call_args_list
        names = lambda c: {t["function"]["name"] for t in c.kwargs["tools"]}  # noqa: E731
        self.assertNotIn("request_live_chat", names(calls[0]))
        self.assertIn("request_live_chat", names(calls[1]))
        self.assertIn("ONLINE", calls[1].kwargs["messages"][0]["content"])

    def test_request_live_chat_flags_conversation_and_notifies(self):
        OperatorPresence.touch()
        client = fake_client(
            tool_call_response("request_live_chat", {"reason": "Wants to discuss a contract"}),
            text_response("I've let Matsilele know, he should join shortly."),
        )
        with patch("openai.OpenAI", return_value=client):
            self.chat("Can I talk to the real you?")
        self.assertTrue(Conversation.objects.get().needs_human)
        self.assertIn("live", mail.outbox[0].subject)

    @override_settings(OPENAI_API_KEY="")
    def test_chat_without_key_gives_friendly_reply(self):
        res = self.chat("hi")
        self.assertEqual(res.status_code, 200)
        self.assertIn("isn't switched on", res.json()["messages"][-1]["content"])

    def test_invalid_session_id_rejected(self):
        self.assertEqual(self.chat("hi", session="x").status_code, 400)


@override_settings(**NOTIFY_SETTINGS)
class LiveInboxTests(ChatTestCase):
    def setUp(self):
        self.staff = Client()
        user = get_user_model().objects.create_user("matsilele", password="pw", is_staff=True)
        self.staff.force_login(user)
        with patch("openai.OpenAI", return_value=fake_client(text_response("Hi, I'm the twin."))):
            self.chat("Hello")
        self.conv = Conversation.objects.get()

    def inbox_reply(self, text):
        return self.staff.post(f"/api/inbox/conversations/{self.conv.id}/messages/", {"content": text},
                               content_type="application/json")

    def test_inbox_requires_staff(self):
        self.assertEqual(self.client.get("/api/inbox/conversations/").status_code, 403)
        visitor = get_user_model().objects.create_user("v", password="pw")
        c = Client()
        c.force_login(visitor)
        self.assertEqual(c.get("/api/inbox/conversations/").status_code, 403)

    def test_opening_inbox_makes_operator_online(self):
        self.assertFalse(self.client.get(f"/api/chat/{SESSION}/").json()["operator_online"])
        listing = self.staff.get("/api/inbox/conversations/").json()
        self.assertEqual(listing[0]["unread"], 1)
        self.assertTrue(self.client.get(f"/api/chat/{SESSION}/").json()["operator_online"])

    def test_takeover_reply_reaches_visitor_and_silences_bot(self):
        res = self.inbox_reply("Hi, it's the real Matsilele here!")
        self.assertEqual(res.status_code, 201)

        poll = self.client.get(f"/api/chat/{SESSION}/?after=0").json()
        self.assertEqual(poll["mode"], "human")
        self.assertEqual([m["role"] for m in poll["messages"]][-2:], ["system", "operator"])

        client = fake_client()  # any LLM call would raise StopIteration
        with patch("openai.OpenAI", return_value=client):
            res = self.chat("Great to meet you!")
        self.assertEqual(res.status_code, 200)
        client.chat.completions.create.assert_not_called()
        self.assertEqual(res.json()["messages"][-1]["role"], "user")

    def test_hand_back_to_twin(self):
        self.inbox_reply("Hello!")
        self.staff.post(f"/api/inbox/conversations/{self.conv.id}/mode/", {"mode": "bot"},
                        content_type="application/json")
        with patch("openai.OpenAI", return_value=fake_client(text_response("Twin again"))):
            res = self.chat("Thanks")
        self.assertEqual(res.json()["messages"][-1]["content"], "Twin again")
        self.assertEqual(self.conv.messages.filter(role=Message.SYSTEM).count(), 2)

    def test_twin_steps_back_in_if_operator_disappears(self):
        self.inbox_reply("Back in a sec")
        OperatorPresence.objects.update(last_seen=timezone.now() - timedelta(minutes=5))
        with patch("openai.OpenAI", return_value=fake_client(text_response("I'm here meanwhile"))):
            res = self.chat("Hello?")
        roles = [m["role"] for m in res.json()["messages"]]
        self.assertEqual(roles[-2:], ["system", "assistant"])
        self.assertEqual(res.json()["mode"], "bot")

    def test_operator_messages_given_to_llm_as_history(self):
        self.inbox_reply("I'm free on Friday")
        self.staff.post(f"/api/inbox/conversations/{self.conv.id}/mode/", {"mode": "bot"},
                        content_type="application/json")
        client = fake_client(text_response("ok"))
        with patch("openai.OpenAI", return_value=client):
            self.chat("When were you free again?")
        sent = client.chat.completions.create.call_args.kwargs["messages"]
        self.assertTrue(any("[Matsilele, live] I'm free on Friday" in m["content"] for m in sent))


@override_settings(**NOTIFY_SETTINGS)
class FaqTests(ChatTestCase):
    def setUp(self):
        FaqEntry.objects.all().delete()  # ignore the seeded starters
        FaqEntry.objects.create(question="First?", answer="Answer one", order=1)
        FaqEntry.objects.create(question="Hidden?", answer="Nope", order=2, published=False)
        FaqEntry.objects.create(question="Second?", answer="Answer two", order=3)

    def test_faq_list_is_numbered_and_skips_unpublished(self):
        self.assertEqual(self.client.get("/api/faq/").json(),
                         [{"number": 1, "question": "First?"}, {"number": 2, "question": "Second?"}])

    def test_q_shortcut_answers_instantly_without_llm(self):
        client = fake_client()
        with patch("openai.OpenAI", return_value=client):
            res = self.chat("Q2")
        client.chat.completions.create.assert_not_called()
        body = res.json()
        self.assertEqual(body["messages"][-1]["content"], "Answer two")
        self.assertEqual(body["activity"], {"message_id": body["messages"][-1]["id"],
                                            "steps": [{"type": "instant", "faq": 2}]})

    def test_q_shortcut_is_forgiving(self):
        with patch("openai.OpenAI", return_value=fake_client()):
            res = self.chat(" q 1? ")
        self.assertEqual(res.json()["messages"][-1]["content"], "Answer one")

    def test_unknown_q_number(self):
        with patch("openai.OpenAI", return_value=fake_client()):
            res = self.chat("Q99")
        self.assertIn("Q1–Q2", res.json()["messages"][-1]["content"])

    def test_q_text_in_a_sentence_goes_to_llm(self):
        with patch("openai.OpenAI", return_value=fake_client(text_response("Sure"))):
            res = self.chat("What is Q2 about?")
        self.assertEqual(res.json()["messages"][-1]["content"], "Sure")

    def test_q_shortcut_reaches_matsilele_when_live(self):
        OperatorPresence.touch()
        Conversation.objects.create(session_id=SESSION, mode=Conversation.HUMAN)
        res = self.chat("Q1")
        self.assertEqual(res.json()["messages"][-1]["role"], "user")
        self.assertNotIn("activity", res.json())

    def test_activity_lists_search_and_tools(self):
        client = fake_client(
            tool_call_response("record_unanswered_question", {"question": "Salary?"}),
            text_response("Not sure, sorry."),
        )
        with patch("openai.OpenAI", return_value=client):
            res = self.chat("Salary?")
        self.assertEqual(res.json()["activity"]["steps"],
                         [{"type": "search", "count": 0}, {"type": "tool", "name": "record_unanswered_question"}])


def fake_embed(texts):
    """Offline stand-in for the embeddings API: hashed bag-of-words vectors. Similar wording -> similar vectors."""
    import hashlib
    import math
    import re as _re

    out = []
    for t in texts:
        v = [0.0] * 256
        for w in _re.findall(r"[a-z]{3,}", t.lower()):
            v[int(hashlib.md5(w.encode()).hexdigest(), 16) % 256] += 1.0
        n = math.sqrt(sum(x * x for x in v)) or 1.0
        out.append([x / n for x in v])
    return out


class RagTests(TestCase):
    def setUp(self):
        import tempfile

        from . import rag

        self.rag = rag
        self.tmp = tempfile.mkdtemp()
        self.settings_cm = override_settings(CHROMA_DIR=self.tmp, RAG_ENABLED=True, OPENAI_API_KEY="test-key",
                                             RAG_MAX_DISTANCE=0.95)
        self.settings_cm.enable()
        rag.reset_client()
        self.embed_patch = patch("core.rag.embed", side_effect=fake_embed)
        self.embed_patch.start()
        self.bg_patch = patch("core.rag.rebuild_in_background")  # keep tests single-threaded
        self.bg_patch.start()
        with self.captureOnCommitCallbacks(execute=True):
            Post.objects.create(title="Forward Deployed Engineering", excerpt="What an FDE does",
                                body="## Scope ruthlessly\nPick the smallest valuable thing and ship it with the customer.",
                                tags="Career")
            Post.objects.create(title="Kubernetes Deployments", excerpt="Shipping on AKS",
                                body="## Containers\nDocker images pushed to Azure Container Registry.", tags="MLOps")

    def tearDown(self):
        self.embed_patch.stop()
        self.bg_patch.stop()
        self.rag.reset_client()
        self.settings_cm.disable()

    def test_split_by_headings(self):
        parts = self.rag.split_by_headings("intro\n## A\none\n### B\ntwo\n## C\nthree")
        self.assertEqual([p for p, _ in parts], ["", "A", "A > B", "C"])

    def test_core_sections_always_available(self):
        core = self.rag.core_profile_text()
        self.assertIn("matsilele.aubrey@gmail.com", core)
        self.assertIn("Summary", core)

    def test_rebuild_and_retrieve_post_with_link(self):
        n = self.rag.rebuild_index()
        self.assertGreater(n, 10)
        hits = self.rag.retrieve("How do I scope work as a forward deployed engineer with the customer?")
        self.assertEqual(hits[0]["kind"], "post")
        self.assertEqual(hits[0]["url"], "/posts/forward-deployed-engineering")
        self.assertFalse(any(h.get("core") for h in hits))  # contact/summary are never "retrieved"

    def test_retrieve_profile_section(self):
        self.rag.rebuild_index()
        hits = self.rag.retrieve("Which awards did you win at the CSIR?")
        self.assertTrue(any("Awards" in h.get("section", "") for h in hits))

    def test_saving_and_unpublishing_post_updates_index(self):
        self.rag.rebuild_index()
        with self.captureOnCommitCallbacks(execute=True):
            p = Post.objects.create(title="Quantum Llamas", excerpt="Llamas in quantum computing",
                                    body="## Llamas\nQuantum llamas everywhere.")
        self.assertIn("quantum-llamas", [h.get("post") for h in self.rag.retrieve("quantum llamas")])
        with self.captureOnCommitCallbacks(execute=True):
            p.published = False
            p.save()
        self.assertNotIn("quantum-llamas", [h.get("post") for h in self.rag.retrieve("quantum llamas")])

    def test_deleting_post_removes_it(self):
        self.rag.rebuild_index()
        with self.captureOnCommitCallbacks(execute=True):
            Post.objects.get(slug="kubernetes-deployments").delete()
        self.assertNotIn("kubernetes-deployments",
                         [h.get("post") for h in self.rag.retrieve("Docker images Azure Container Registry")])

    def test_stale_index_triggers_background_rebuild(self):
        self.rag.rebuild_index()
        self.rag.retrieve("anything")
        self.rag.rebuild_in_background.assert_not_called()
        Post.objects.filter(slug="kubernetes-deployments").update(title="Changed")  # bypasses signals
        Post.objects.create(title="Sneaky", excerpt="x", body="y")  # (signal callback not executed)
        self.rag.retrieve("anything")
        self.rag.rebuild_in_background.assert_called_once()

    def test_twin_prompt_uses_retrieved_passages(self):
        self.rag.rebuild_index()
        client = fake_client(text_response("Here's how I scope work..."))
        with patch("openai.OpenAI", return_value=client):
            res = self.client.post("/api/chat/", {"message": "How do you scope projects as a forward deployed engineer?",
                                                  "session_id": SESSION}, content_type="application/json")
        self.assertEqual(res.status_code, 200)
        system = client.chat.completions.create.call_args.kwargs["messages"][0]["content"]
        self.assertIn("# Retrieved knowledge", system)
        self.assertIn("[Forward Deployed Engineering](/posts/forward-deployed-engineering)", system)
        self.assertIn("matsilele.aubrey@gmail.com", system)  # core profile still there
        self.assertNotIn("# Profile\n", system)

    def test_twin_falls_back_to_full_profile_without_rag(self):
        with override_settings(RAG_ENABLED=False):
            client = fake_client(text_response("ok"))
            with patch("openai.OpenAI", return_value=client):
                self.client.post("/api/chat/", {"message": "hi", "session_id": SESSION},
                                 content_type="application/json")
        system = client.chat.completions.create.call_args.kwargs["messages"][0]["content"]
        self.assertIn("# Profile\n", system)
        self.assertIn("Awards", system)


class PostApiTests(TestCase):
    def test_list_and_detail(self):
        Post.objects.create(title="Hello World", excerpt="e", body="# Hi", tags="MLOps, Azure")
        Post.objects.create(title="Hidden", excerpt="e", body="b", published=False)
        posts = self.client.get("/api/posts/").json()
        self.assertEqual([p["title"] for p in posts], ["Hello World"])
        self.assertEqual(posts[0]["tags"], ["MLOps", "Azure"])
        detail = self.client.get("/api/posts/hello-world/").json()
        self.assertEqual(detail["body"], "# Hi")
        self.assertEqual(self.client.get("/api/posts/hidden/").status_code, 404)
