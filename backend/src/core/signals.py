"""Keep the twin's RAG index in sync when posts change in the admin."""

import logging

from django.conf import settings
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Post

logger = logging.getLogger(__name__)


def _safely(fn, *args):
    from .rag import RagUnavailable

    try:
        fn(*args)
    except RagUnavailable:
        pass  # no API key yet: the index is built on the next start once a key is set
    except Exception as e:  # never let indexing break saving a post
        logger.warning("RAG index update skipped (%s); it will catch up on the next rebuild", e)


@receiver(post_save, sender=Post)
def reindex_post(sender, instance, **kwargs):
    if settings.RAG_ENABLED:
        from .rag import index_post

        transaction.on_commit(lambda: _safely(index_post, instance))


@receiver(post_delete, sender=Post)
def unindex_post(sender, instance, **kwargs):
    if settings.RAG_ENABLED:
        from .rag import remove_post

        slug = instance.slug
        transaction.on_commit(lambda: _safely(remove_post, slug))
