#!/bin/sh
# Container start-up: apply database migrations, optionally seed posts, then serve with gunicorn.
set -e

python src/manage.py migrate --noinput

if [ "${SEED_POSTS:-false}" = "true" ]; then
    python src/manage.py seed_posts   # only adds posts that don't exist yet
fi

# One worker per container keeps a single copy of the RAG index; threads handle concurrent visitors.
# Scale by running more containers. The RAG index rebuilds itself in the background on start.
exec gunicorn config.wsgi \
    --chdir src \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers "${GUNICORN_WORKERS:-1}" \
    --threads "${GUNICORN_THREADS:-8}" \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
