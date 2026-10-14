"""Retrieval-augmented generation (RAG) for the digital twin.

What gets indexed
    - every .md/.txt file in core/knowledge/ (profile.md), split by heading
    - every published blog Post, split by "## " section

Where it lives
    ChromaDB, embedded in this Django process, persisted to settings.CHROMA_DIR (backend/chroma/).
    The folder is disposable: the index is rebuilt from the knowledge files and the database
    when the app starts, and kept in sync when posts are saved or deleted.

Embeddings
    OpenAI-compatible embeddings API (settings.EMBEDDING_MODEL, default text-embedding-3-small).
"""

from __future__ import annotations

import hashlib
import logging
import re
import threading
from dataclasses import dataclass, field
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

KNOWLEDGE_DIR = Path(__file__).resolve().parent / "knowledge"
COLLECTION = "knowledge"
MAX_CHUNK_CHARS = 1500
CORE_SECTIONS = {"contact", "summary"}  # always given to the twin, never left to retrieval

_lock = threading.RLock()
_client = None
_fingerprint: str | None = None  # what the index in this process was last built from
_rebuilding = threading.Event()


class RagUnavailable(Exception):
    pass


@dataclass
class Chunk:
    id: str
    text: str
    metadata: dict = field(default_factory=dict)


# --------------------------------------------------------------------------- chunking
def _split_long(text: str, limit: int = MAX_CHUNK_CHARS) -> list[str]:
    if len(text) <= limit:
        return [text]
    parts, cur = [], ""
    for para in re.split(r"\n\s*\n", text):
        if cur and len(cur) + len(para) + 2 > limit:
            parts.append(cur)
            cur = para
        else:
            cur = f"{cur}\n\n{para}" if cur else para
    if cur:
        parts.append(cur)
    return parts


def split_by_headings(markdown: str) -> list[tuple[str, str]]:
    """[(heading path, body)] for each ##/### section. Text before the first heading gets path ''."""
    sections: list[tuple[str, str]] = []
    h2 = h3 = ""
    buf: list[str] = []

    def flush():
        body = "\n".join(buf).strip()
        if body:
            path = " > ".join(p for p in (h2, h3) if p)
            sections.append((path, body))
        buf.clear()

    for line in markdown.splitlines():
        m = re.match(r"^(#{1,3})\s+(.*)", line)
        if m:
            flush()
            level, title = len(m.group(1)), m.group(2).strip()
            if level <= 2:
                h2, h3 = (title if level == 2 else ""), ""
            else:
                h3 = title
        else:
            buf.append(line)
    flush()
    return sections


def knowledge_chunks() -> list[Chunk]:
    chunks = []
    for f in sorted(KNOWLEDGE_DIR.glob("*")):
        if f.suffix not in {".md", ".txt"}:
            continue
        for i, (path, body) in enumerate(split_by_headings(f.read_text(encoding="utf-8"))):
            top = path.split(" > ")[0].lower()
            for j, part in enumerate(_split_long(body)):
                chunks.append(Chunk(
                    id=f"kb:{f.stem}:{i}:{j}",
                    text=f"{path}\n{part}" if path else part,
                    metadata={"kind": "profile", "source": f.name, "section": path or f.stem,
                              "core": top in CORE_SECTIONS},
                ))
    return chunks


def post_chunks(post) -> list[Chunk]:
    url = f"/posts/{post.slug}"
    head = f"Blog post: {post.title} ({post.published_at:%d %B %Y})"
    chunks = [Chunk(id=f"post:{post.slug}:summary", text=f"{head}\nSummary: {post.excerpt}",
                    metadata={"kind": "post", "post": post.slug, "title": post.title, "url": url,
                              "section": "Summary", "core": False})]
    for i, (path, body) in enumerate(split_by_headings(post.body)):
        for j, part in enumerate(_split_long(body)):
            chunks.append(Chunk(
                id=f"post:{post.slug}:{i}:{j}",
                text=f"{head}\nSection: {path or 'Introduction'}\n{part}",
                metadata={"kind": "post", "post": post.slug, "title": post.title, "url": url,
                          "section": path or "Introduction", "core": False},
            ))
    return chunks


def core_profile_text() -> str:
    """The sections the twin always sees (who he is, how to reach him)."""
    out = []
    for c in knowledge_chunks():
        if c.metadata.get("core"):
            out.append(c.text)
    return "\n\n".join(out)


# --------------------------------------------------------------------------- embeddings + store
def embed(texts: list[str]) -> list[list[float]]:
    if not settings.OPENAI_API_KEY:
        raise RagUnavailable("OPENAI_API_KEY is not set")
    from openai import OpenAI

    client = OpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL)
    vectors: list[list[float]] = []
    for i in range(0, len(texts), 100):
        resp = client.embeddings.create(model=settings.EMBEDDING_MODEL, input=texts[i:i + 100])
        vectors.extend(d.embedding for d in resp.data)
    return vectors


def _get_client():
    global _client
    if _client is None:
        import chromadb
        from chromadb.config import Settings as ChromaSettings

        Path(settings.CHROMA_DIR).mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=str(settings.CHROMA_DIR), settings=ChromaSettings(anonymized_telemetry=False)
        )
    return _client


def _collection(create: bool = True):
    client = _get_client()
    if create:
        return client.get_or_create_collection(COLLECTION, embedding_function=None,
                                               metadata={"hnsw:space": "cosine"})
    return client.get_collection(COLLECTION)


def _add(col, chunks: list[Chunk]) -> None:
    if not chunks:
        return
    col.add(ids=[c.id for c in chunks], documents=[c.text for c in chunks],
            metadatas=[c.metadata for c in chunks], embeddings=embed([c.text for c in chunks]))


def reset_client() -> None:
    """Forget the cached client (used by tests that point CHROMA_DIR somewhere else)."""
    global _client, _fingerprint
    with _lock:
        _client = None
        _fingerprint = None


# --------------------------------------------------------------------------- keeping it in sync
def current_fingerprint() -> str:
    from django.db.models import Count, Max

    from .models import Post

    agg = Post.objects.filter(published=True).aggregate(n=Count("id"), latest=Max("updated_at"))
    h = hashlib.sha256()
    for f in sorted(KNOWLEDGE_DIR.glob("*")):
        if f.suffix in {".md", ".txt"}:
            h.update(f.read_bytes())
    h.update(f"{agg['n']}|{agg['latest']}".encode())
    return h.hexdigest()


def rebuild_index() -> int:
    """Rebuild the whole index from the knowledge files and published posts. Returns chunk count."""
    global _fingerprint
    from .models import Post

    with _lock:
        fp = current_fingerprint()
        chunks = knowledge_chunks()
        for post in Post.objects.filter(published=True):
            chunks.extend(post_chunks(post))
        embeddings = embed([c.text for c in chunks])  # embed first, so a failure leaves the old index intact
        client = _get_client()
        try:
            client.delete_collection(COLLECTION)
        except Exception:
            pass
        col = _collection()
        col.add(ids=[c.id for c in chunks], documents=[c.text for c in chunks],
                metadatas=[c.metadata for c in chunks], embeddings=embeddings)
        _fingerprint = fp
        logger.info("RAG index rebuilt: %d chunks", len(chunks))
        return len(chunks)


def rebuild_in_background() -> None:
    if _rebuilding.is_set():
        return
    _rebuilding.set()

    def run():
        try:
            rebuild_index()
        except RagUnavailable as e:
            logger.warning("RAG index not built: %s", e)
        except Exception:
            logger.exception("RAG index rebuild failed")
        finally:
            _rebuilding.clear()
            from django.db import connection
            connection.close()

    threading.Thread(target=run, name="rag-rebuild", daemon=True).start()


def index_post(post) -> None:
    """Re-index one post (called after it's saved). Unpublished posts are removed."""
    global _fingerprint
    with _lock:
        col = _collection()
        col.delete(where={"post": post.slug})
        if post.published:
            _add(col, post_chunks(post))
        _fingerprint = current_fingerprint()


def remove_post(slug: str) -> None:
    global _fingerprint
    with _lock:
        _collection().delete(where={"post": slug})
        _fingerprint = current_fingerprint()


# --------------------------------------------------------------------------- search
def retrieve(query: str, k: int | None = None) -> list[dict]:
    """Most relevant non-core chunks for `query`. Returns [] if RAG isn't available, never raises."""
    if not settings.RAG_ENABLED or not query.strip():
        return []
    k = k or settings.RAG_TOP_K
    try:
        if _fingerprint != current_fingerprint():
            rebuild_in_background()  # something changed (or this process never built it); use what we have meanwhile
        col = _collection(create=False)
        if col.count() == 0:
            return []
        res = col.query(
            query_embeddings=embed([query]),
            n_results=min(k, col.count()),
            where={"core": {"$ne": True}},
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:  # missing collection, no API key, network error...
        logger.info("RAG retrieval skipped: %s", e)
        return []
    out = []
    for doc, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
        if dist > settings.RAG_MAX_DISTANCE:
            continue
        out.append({"text": doc, "distance": round(dist, 4), **meta})
    return out
