"""Django settings for Matsilele Mabaso's personal website backend."""

import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# Layout: backend/            <- PROJECT_DIR: .env, requirements.txt, db, media, staticfiles
#         backend/src/        <- BASE_DIR: manage.py, config/, core/
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BASE_DIR.parent
load_dotenv(PROJECT_DIR / ".env")


def env_list(name: str, default: str = "") -> list[str]:
    return [v.strip() for v in os.getenv(name, default).split(",") if v.strip()]


DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() == "true"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-insecure-key-change-me")
if not DEBUG and SECRET_KEY.startswith("dev-only"):
    raise ImproperlyConfigured("Set DJANGO_SECRET_KEY when DJANGO_DEBUG=False")
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "core",
]

MIDDLEWARE = [
    "core.middleware.HealthCheckMiddleware",  # answers /healthz before host checks (for container probes)
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # serves static files + the built React app
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# SQLite locally; set DATABASE_URL (e.g. postgres://user:pass@host:5432/db) in production.
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{PROJECT_DIR / 'db.sqlite3'}", conn_max_age=600, conn_health_checks=True
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-za"
TIME_ZONE = "Africa/Johannesburg"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = PROJECT_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = PROJECT_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Serving the React app (production / Docker) ------------------------------
# The built frontend (frontend/dist) is served by Django + WhiteNoise, so the site, API, admin and /inbox
# all live on one domain. In development Vite serves the frontend instead.
FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", PROJECT_DIR.parent / "frontend" / "dist"))
if FRONTEND_DIST.is_dir():
    WHITENOISE_ROOT = FRONTEND_DIST  # /assets/..., /favicon.png, /matsilele.jpg
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage" if DEBUG
        else "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}
SERVE_MEDIA = os.getenv("SERVE_MEDIA", "True").lower() == "true"  # uploaded post images

# --- Production security -------------------------------------------------------
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")  # TLS ends at the load balancer
    SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "False").lower() == "true"
    SESSION_COOKIE_SECURE = os.getenv("SECURE_COOKIES", "True").lower() == "true"
    CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"

# --- API / CORS -------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)

# Public URL of the site, used for links in notifications (e.g. to /inbox)
SITE_URL = os.getenv("SITE_URL", "http://localhost:5173").rstrip("/")

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        "chat": os.getenv("CHAT_RATE_LIMIT", "30/hour"),
        "poll": "2000/hour",  # visitor windows check for live replies every few seconds
    },
}

# --- Digital twin (LLM) -----------------------------------------------------
# Any OpenAI-compatible endpoint works (OpenAI, Azure OpenAI, Ollama, OpenRouter...)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "") or None
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

# --- RAG: the twin's knowledge base (ChromaDB + embeddings) -------------------
RAG_ENABLED = os.getenv("RAG_ENABLED", "True").lower() == "true"
RAG_BUILD_ON_START = os.getenv("RAG_BUILD_ON_START", "True").lower() == "true"
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
CHROMA_DIR = Path(os.getenv("CHROMA_DIR", PROJECT_DIR / "chroma"))
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))           # passages given to the twin per question
# Optional relevance cut-off (cosine distance, 0 = identical, 2 = opposite). 1.0 keeps the top K regardless;
# lower it (e.g. 0.75) only after checking real scores with: python manage.py rebuild_index --query "..."
RAG_MAX_DISTANCE = float(os.getenv("RAG_MAX_DISTANCE", "1.0"))

# --- Notifications when a visitor wants to reach you -------------------------
# Push to your phone via Pushover (pushover.net)
PUSHOVER_USER = os.getenv("PUSHOVER_USER", "")
PUSHOVER_TOKEN = os.getenv("PUSHOVER_TOKEN", "")

# Email (e.g. Gmail: EMAIL_HOST=smtp.gmail.com, an App Password as EMAIL_HOST_PASSWORD)
NOTIFY_EMAIL_TO = os.getenv("NOTIFY_EMAIL_TO", "")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "webmaster@localhost")
EMAIL_TIMEOUT = 15
