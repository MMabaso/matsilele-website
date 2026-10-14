from django.urls import path

from . import views

urlpatterns = [
    path("posts/", views.PostListView.as_view(), name="post-list"),
    path("posts/<slug:slug>/", views.PostDetailView.as_view(), name="post-detail"),
    # visitor
    path("chat/", views.ChatView.as_view(), name="chat"),
    path("chat/<str:session_id>/", views.ChatPollView.as_view(), name="chat-poll"),
    # inbox (staff only)
    path("inbox/me/", views.InboxMeView.as_view(), name="inbox-me"),
    path("inbox/conversations/", views.InboxListView.as_view(), name="inbox-list"),
    path("inbox/conversations/<int:pk>/messages/", views.InboxMessagesView.as_view(), name="inbox-messages"),
    path("inbox/conversations/<int:pk>/mode/", views.InboxModeView.as_view(), name="inbox-mode"),
]
