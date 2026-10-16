from django.contrib import admin

from .models import ContactRequest, Conversation, FaqEntry, Message, Post, UnansweredQuestion


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("title", "published", "published_at")
    list_filter = ("published",)
    search_fields = ("title", "excerpt", "body", "tags")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(ContactRequest)
class ContactRequestAdmin(admin.ModelAdmin):
    list_display = ("created_at", "name", "organisation", "email", "phone", "handled")
    list_filter = ("handled",)
    list_editable = ("handled",)
    search_fields = ("name", "email", "organisation", "reason")
    readonly_fields = ("session_id", "created_at")


@admin.register(UnansweredQuestion)
class UnansweredQuestionAdmin(admin.ModelAdmin):
    list_display = ("created_at", "question")
    search_fields = ("question",)


@admin.register(FaqEntry)
class FaqEntryAdmin(admin.ModelAdmin):
    list_display = ("question", "order", "published")
    list_editable = ("order", "published")
    search_fields = ("question", "answer")


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("role", "content", "created_at")
    can_delete = False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("last_activity", "display_name", "mode", "needs_human")
    list_filter = ("mode", "needs_human")
    search_fields = ("visitor_name", "session_id", "messages__content")
    readonly_fields = ("session_id", "created_at", "last_activity")
    inlines = [MessageInline]
