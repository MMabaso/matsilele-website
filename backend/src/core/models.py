from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class Post(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    excerpt = models.TextField(max_length=400, help_text="Short summary shown on the posts list.")
    body = models.TextField(help_text="Markdown supported.")
    cover_image = models.ImageField(upload_to="posts/", blank=True, null=True)
    tags = models.CharField(max_length=200, blank=True, help_text="Comma-separated, e.g. MLOps, Azure")
    published = models.BooleanField(default=True)
    published_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at"]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:200] or "post"
            slug, n = base, 2
            while Post.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug, n = f"{base}-{n}", n + 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def tag_list(self) -> list[str]:
        return [t.strip() for t in self.tags.split(",") if t.strip()]


class ContactRequest(models.Model):
    """A visitor asked the twin to put them in touch with the real Matsilele."""

    session_id = models.CharField(max_length=64, db_index=True)
    name = models.CharField(max_length=200)
    email = models.CharField(max_length=254, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    organisation = models.CharField(max_length=200, blank=True)
    reason = models.TextField()
    handled = models.BooleanField(default=False, help_text="Tick once you've replied.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} — {self.reason[:60]}"


class UnansweredQuestion(models.Model):
    """Questions the twin couldn't answer — add the answers to core/knowledge/ to make it smarter."""

    session_id = models.CharField(max_length=64, db_index=True)
    question = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.question[:80]


class FaqEntry(models.Model):
    """FAQ shown on the avatar page. Visitors type "Q2" to get the 2nd published answer instantly."""

    question = models.CharField(max_length=300)
    answer = models.TextField(help_text="Markdown supported.")
    order = models.PositiveIntegerField(default=0, help_text="Lower comes first; sets the Q-number.")
    published = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "FAQ entry"
        verbose_name_plural = "FAQ entries"

    def __str__(self) -> str:
        return self.question[:80]

    @classmethod
    def numbered(cls) -> list[tuple[int, "FaqEntry"]]:
        """Published entries, numbered from 1 in display order."""
        return list(enumerate(cls.objects.filter(published=True), 1))


class Conversation(models.Model):
    """One visitor's chat. In BOT mode the twin answers; in HUMAN mode you answer from /inbox."""

    BOT, HUMAN = "bot", "human"
    MODES = [(BOT, "Digital twin"), (HUMAN, "Matsilele (live)")]

    session_id = models.CharField(max_length=64, unique=True)
    visitor_name = models.CharField(max_length=200, blank=True)
    mode = models.CharField(max_length=10, choices=MODES, default=BOT)
    needs_human = models.BooleanField(default=False, help_text="Visitor asked to chat with you live.")
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now_add=True, db_index=True)
    operator_read_up_to = models.PositiveBigIntegerField(default=0)

    class Meta:
        ordering = ["-last_activity"]

    def __str__(self) -> str:
        return self.display_name

    @property
    def display_name(self) -> str:
        return self.visitor_name or f"Visitor {self.session_id[:4].upper()}"


class Message(models.Model):
    USER, ASSISTANT, OPERATOR, SYSTEM = "user", "assistant", "operator", "system"
    ROLES = [(USER, "Visitor"), (ASSISTANT, "Digital twin"), (OPERATOR, "Matsilele"), (SYSTEM, "System")]

    conversation = models.ForeignKey(Conversation, related_name="messages", on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.get_role_display()}: {self.content[:60]}"


class OperatorPresence(models.Model):
    """A single row: when you last had /inbox open. Visitors see you as online for 60s after."""

    last_seen = models.DateTimeField(null=True, blank=True)

    ONLINE_WINDOW_SECONDS = 60

    @classmethod
    def touch(cls) -> None:
        cls.objects.update_or_create(pk=1, defaults={"last_seen": timezone.now()})

    @classmethod
    def seconds_since_seen(cls) -> float | None:
        row = cls.objects.filter(pk=1).first()
        if not row or not row.last_seen:
            return None
        return (timezone.now() - row.last_seen).total_seconds()

    @classmethod
    def is_online(cls) -> bool:
        s = cls.seconds_since_seen()
        return s is not None and s <= cls.ONLINE_WINDOW_SECONDS
