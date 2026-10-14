from rest_framework import serializers

from .models import Message, Post


class PostListSerializer(serializers.ModelSerializer):
    tags = serializers.ListField(source="tag_list", read_only=True)

    class Meta:
        model = Post
        fields = ("title", "slug", "excerpt", "cover_image", "tags", "published_at")


class PostDetailSerializer(PostListSerializer):
    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + ("body", "updated_at")


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "role", "content", "created_at")


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000)
    session_id = serializers.RegexField(r"^[A-Za-z0-9-]{8,64}$")
    after = serializers.IntegerField(min_value=0, required=False, default=0)


class OperatorReplySerializer(serializers.Serializer):
    content = serializers.CharField(max_length=4000)
