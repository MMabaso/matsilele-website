import os
import sys

from django.apps import AppConfig
from django.conf import settings


def _is_web_server_start() -> bool:
    """True when this process is about to serve web requests (runserver or gunicorn),
    False for one-off commands like migrate, test or shell."""
    argv = sys.argv
    if argv and argv[0].endswith("manage.py"):
        if len(argv) < 2 or argv[1] != "runserver":
            return False
        # runserver's auto-reloader starts two processes; only the inner one serves requests
        return os.environ.get("RUN_MAIN") == "true" or "--noreload" in argv
    return True


class CoreConfig(AppConfig):
    name = "core"

    def ready(self):
        from . import signals  # noqa: F401  keeps the RAG index in sync with posts

        if settings.RAG_ENABLED and settings.RAG_BUILD_ON_START and _is_web_server_start():
            import threading

            from .rag import rebuild_in_background

            # Rebuild the twin's knowledge index from the knowledge files + database, in the
            # background so the site starts serving immediately.
            threading.Timer(1.0, rebuild_in_background).start()
