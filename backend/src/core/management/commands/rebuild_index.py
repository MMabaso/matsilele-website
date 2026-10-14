"""Rebuild the twin's RAG index by hand (it also rebuilds itself when the app starts)."""

from django.core.management.base import BaseCommand, CommandError

from core.rag import RagUnavailable, rebuild_index, retrieve


class Command(BaseCommand):
    help = "Rebuild the digital twin's ChromaDB knowledge index from profile files and published posts."

    def add_arguments(self, parser):
        parser.add_argument("--query", help="After rebuilding, show what this question retrieves.")

    def handle(self, *args, **opts):
        try:
            n = rebuild_index()
        except RagUnavailable as e:
            raise CommandError(f"Can't build the index: {e}")
        self.stdout.write(self.style.SUCCESS(f"Indexed {n} chunks."))
        if opts.get("query"):
            for r in retrieve(opts["query"]):
                where = r.get("title") or r.get("section")
                self.stdout.write(f"  {r['distance']:.3f}  {where} — {r['text'][:90].replace(chr(10), ' ')}…")
