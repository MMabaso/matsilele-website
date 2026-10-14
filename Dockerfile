# syntax=docker/dockerfile:1
#
# One image for the whole site: React (built here) + Django API, admin, /inbox and the digital twin.
#
#   docker build -t matsilele-website .
#   docker run -p 8000:8000 --env-file backend/.env -e DJANGO_SECRET_KEY=... matsilele-website
#
# Or locally with Postgres:  docker compose up --build

# ---------------------------------------------------------------- 1. build the React frontend
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Same-origin API: leave VITE_API_URL empty so the app calls /api on its own domain.
RUN npm run build

# ---------------------------------------------------------------- 2. Python runtime
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DJANGO_DEBUG=False \
    FRONTEND_DIST=/app/frontend/dist \
    PORT=8000

WORKDIR /app/backend

# Dependencies first, so code changes don't reinstall packages
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

COPY backend/src ./src
COPY backend/entrypoint.sh /app/entrypoint.sh
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# Django admin CSS/JS -> backend/staticfiles (served by WhiteNoise)
RUN DJANGO_SECRET_KEY=build-only python src/manage.py collectstatic --noinput

# Run as a non-root user; chroma/ (RAG index) and media/ (post images) must be writable
RUN chmod +x /app/entrypoint.sh \
    && useradd --create-home --uid 1000 app \
    && mkdir -p chroma media \
    && chown -R app:app /app/backend
USER app

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"8000\")}/healthz', timeout=4)"

ENTRYPOINT ["/app/entrypoint.sh"]
