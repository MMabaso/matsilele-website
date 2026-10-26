# Matsilele Mabaso — personal website

A personal site in the style of edwarddonner.com with three sections:

- **Avatar** — a chat with your AI *digital twin*, grounded in your CV
- **About** — bio, experience, skills, education and awards
- **Posts** — blog posts you manage from the Django admin

**Frontend:** React + TypeScript + Tailwind CSS (Vite) · **Backend:** Django + Django REST Framework

```
matsilele-website/
├── backend/                     Django API
│   ├── .env                     your secrets (copy from .env.example)
│   ├── requirements.txt
│   ├── db.sqlite3, media/       created when you run it
│   └── src/
│       ├── manage.py
│       ├── config/              settings, urls
│       └── core/
│           ├── knowledge/       profile.md  ← what the twin knows (add more .md files here)
│           ├── twin.py          digital-twin prompt, tools + LLM call
│           ├── notify.py        phone (Pushover) and email alerts
│           ├── models.py        Post, Conversation, Message, ContactRequest, ...
│           ├── views.py         posts, visitor chat and /inbox APIs
│           ├── tests.py
│           └── management/commands/seed_posts.py
└── frontend/                    React app
    ├── public/matsilele.jpg     your photo
    └── src/
        ├── data/profile.ts      ← About-page content, email, social links
        ├── pages/               Home, Avatar, About, Posts, PostDetail, Inbox
        └── components/
```

## Run locally

**Backend** (terminal 1):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# backend/.env is ready (with a generated secret key): just add your OPENAI_API_KEY
cd src
python manage.py migrate
python manage.py seed_posts     # starter posts (safe to re-run; adds only new ones)
python manage.py createsuperuser
python manage.py runserver      # http://127.0.0.1:8000
```

All `python manage.py ...` commands in this README are run from `backend/src/`.

**Secrets:** `backend/.env` and `frontend/.env` hold your real settings and are git-ignored, so they're never
committed. The `.env.example` files next to them are the templates that *are* committed; if you clone the
repo somewhere new, copy each `.env.example` to `.env` and fill it in. Paths like `core/knowledge/`
below are inside `backend/src/`.

**Frontend** (terminal 2):

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173 (proxies /api to Django)
```

## The digital twin

`core/twin.py` answers as you, using **RAG** (`core/rag.py`) over your profile and blog posts, and sends the
conversation to any OpenAI-compatible endpoint.

### How the RAG works

```
profile.md + other files in core/knowledge/ ─┐   split by heading     OpenAI embeddings      ChromaDB
published blog posts (Postgres/SQLite) ──────┴─► (~60 chunks today) ─► text-embedding-3-small ─► backend/chroma/
visitor question ─► embed ─► top 5 most similar chunks ─► added to the twin's prompt (+ your contact & summary, always)
```

- **When the index is built:** automatically, in the background, every time the web server starts
  (`runserver` or gunicorn), and a single post is re-indexed whenever you save, unpublish or delete it in
  `/admin`. If anything else changes, the next question notices and triggers a rebuild.
- **Where it lives:** `backend/chroma/`. It's disposable and git-ignored; delete it any time.
- **Links:** when the twin uses a blog post, it links to it, e.g. "I wrote about this in
  [From AI Engineer to Forward Deployed Engineer](/posts/...)".
- **Fallback:** without an API key, or if the index isn't ready yet, the twin uses your whole profile as before.
- **Inspect it:** `python manage.py rebuild_index --query "What did you do at Sasol?"` rebuilds and shows
  which chunks a question retrieves, with their distances.
- **Cost:** embedding everything is about US$0.0002 per rebuild; each question adds a fraction of a cent.

| Variable          | Example                                  |

| Variable          | Example                                  |
|-------------------|------------------------------------------|
| `OPENAI_API_KEY`  | your key                                 |
| `LLM_MODEL`       | `gpt-4o-mini`                            |
| `OPENAI_BASE_URL` | blank for OpenAI; or Azure OpenAI / OpenRouter / Ollama (`http://localhost:11434/v1`) |

Without a key the chat still works but replies with a polite "not switched on yet" message.
Every conversation is saved under **Conversations** in `/admin` so you can see what recruiters ask.
Rate-limited to `CHAT_RATE_LIMIT` (default 30/hour per client).

### Live chat: answer visitors yourself from /inbox

Open **http://localhost:5173/inbox** and sign in with your superuser account. While that page is open:

- Visitors see a green "Matsilele is online" dot, and the twin offers to bring you into the chat.
- Every conversation from the last 7 days is listed, with **Wants you** (visitor asked for you live),
  **You're live** and **new message** badges. The browser tab title shows how many need attention,
  and you can turn on desktop alerts.
- Click a conversation to read it, then **Take over chat** or just type a reply. The twin pauses, and your
  messages appear in the visitor's window marked "Matsilele · live".
- **Hand back to twin** when you're done. If you close /inbox mid-chat, the twin steps back in automatically
  after 2 minutes, so no visitor is left waiting.

Everything you and the twin say is kept as one conversation (also visible in `/admin` → Conversations),
and the twin sees your live messages if it takes over again.

### Getting notified when someone wants to talk to you

When a visitor wants to reach you (a recruiter, a collaborator, a speaking invite), the twin asks for their
name, an email or phone number, and what it's about. It then calls the `record_contact_request` tool, which:

1. saves a **Contact request** in `/admin` (tick *handled* once you've replied), and
2. alerts you on every channel you've configured in `.env`:
   - **Push to your phone** with [Pushover](https://pushover.net): install the app, then copy your
     *User Key* to `PUSHOVER_USER` and create an application to get `PUSHOVER_TOKEN`.
   - **Email**: for Gmail, create an App Password (Google Account → Security → App passwords) and set
     `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD`. Hitting *Reply* on the alert email replies to the visitor.

Questions the twin can't answer are saved as **Unanswered questions** and also sent to you. Add the answers
to `core/knowledge/` and the twin gets smarter.

Run the tests (offline, LLM mocked): `python manage.py test core`

To teach the twin more (e.g. your opinions, a longer bio, a FAQ), drop extra markdown files into
`core/knowledge/` (use `##` headings, which become the chunks) and restart the server. New blog posts are
picked up automatically.

## Writing posts

Go to `http://127.0.0.1:8000/admin` → **Posts**. Body supports Markdown; cover images are optional
(posts without one get a coloured tag card). The four seeded posts are drafts based on your CV — edit
them to your own voice or delete them.

## Personalise

- Social links (LinkedIn, GitHub…): `frontend/src/data/profile.ts` → `social`
- Home-page intro text: `frontend/src/pages/Home.tsx`
- Colours & fonts: `frontend/src/index.css` (`@theme` block)

## Docker

One image runs the whole site: the `Dockerfile` (repo root) builds React with Node, then serves it from
Django + WhiteNoise together with `/api`, `/admin` and `/inbox`, all on one domain, so the inbox sign-in
just works.

```
Dockerfile               multi-stage: node:22-alpine builds frontend → python:3.12-slim runs Django
backend/entrypoint.sh    migrate → (optional) seed_posts → gunicorn (1 worker, 8 threads)
docker-compose.yml       the image + Postgres, for running production-style locally
.dockerignore            keeps node_modules, .env, db and caches out of the image
```

**Try it locally (with Postgres):**

```bash
# make sure backend/.env has your OPENAI_API_KEY etc.
docker compose up --build                 # http://localhost:8000
docker compose exec web python src/manage.py createsuperuser
```

**Build and run the image on its own:**

```bash
docker build -t matsilele-website .
docker run -p 8000:8000 --env-file backend/.env \
  -e DJANGO_SECRET_KEY=change-me -e DJANGO_ALLOWED_HOSTS=localhost \
  -e CSRF_TRUSTED_ORIGINS=http://localhost:8000 -e SECURE_COOKIES=False matsilele-website
```

**Environment variables for production:**

| Variable | Purpose |
|---|---|
| `DJANGO_SECRET_KEY` | required; long random string |
| `DJANGO_ALLOWED_HOSTS` | your domain(s), e.g. `matsilele.dev,www.matsilele.dev` |
| `CSRF_TRUSTED_ORIGINS` | `https://matsilele.dev` (needed for admin and /inbox logins) |
| `SITE_URL` | `https://matsilele.dev` (links in alerts) |
| `DATABASE_URL` | Postgres, e.g. `postgres://user:pass@host:5432/db?sslmode=require` |
| `OPENAI_API_KEY` | the digital twin + RAG embeddings |
| `SEED_POSTS` | `true` on first deploy to add the starter posts |
| `SECURE_SSL_REDIRECT` | `true` if your platform doesn't already redirect http → https |
| `PUSHOVER_*`, `EMAIL_*`, `NOTIFY_EMAIL_TO` | alerts when visitors want you |

The container listens on `$PORT` (default 8000) and answers health checks at `/healthz`. The RAG index
(`chroma/`) is rebuilt on every start, so the container needs no persistent disk except for uploaded post
images in `/app/backend/media` (mount a volume there, or use a Cloud Storage bucket on Cloud Run).

## Deploying to Google Cloud Run

The site runs on **Cloud Run** in `europe-west3` (Frankfurt, next to the Neon database), as the service
`matsilele-website` in project `matsilelemabaso`, running as the service account `matsilele`.

- **Secrets** live in Secret Manager and are mounted as environment variables: `DATABASE_URL`, `DJANGO_SECRET_KEY`,
  `OPENAI_API_KEY`, `EMAIL_HOST_PASSWORD`. Only the `matsilele` account can read them.
- **Plain settings** (`DJANGO_ALLOWED_HOSTS=.run.app`, `CSRF_TRUSTED_ORIGINS`, `SITE_URL`, `LLM_MODEL`, ...) are set on
  the service. Change either kind with `gcloud run services update matsilele-website --update-env-vars ...` or
  `--update-secrets ...`; deploys keep whatever is set there.
- **Execution environment gen2** is required: Chroma (the RAG index) can't open its SQLite store in gen1.
- Cloud Run answers `/healthz` itself (paths ending in `z` are reserved), so check `/` instead from outside.
- The disk is wiped on every restart: the RAG index rebuilds itself, but post images uploaded in /admin are lost
  (move them to a Cloud Storage bucket before relying on them).

Update a secret without it appearing in your shell history:

```bash
read -s -p "New OpenAI key: " K && printf '%s' "$K" | gcloud secrets versions add OPENAI_API_KEY --data-file=- && unset K
gcloud run services update matsilele-website --region europe-west3 --update-secrets OPENAI_API_KEY=OPENAI_API_KEY:latest
```

## Public address (Firebase Hosting)

The site's public address is **https://matsilelemabaso.web.app**. Firebase Hosting serves it (free SSL and CDN) and
forwards every request to the Cloud Run service through the rewrite in `firebase.json`. `firebase/public/` stays
empty on purpose so nothing shadows the site.

Firebase is turned on for the `matsilelemabaso` project (Blaze plan, same billing as Cloud Run). Publish the
Hosting config with your gcloud login (no Firebase CLI needed; `firebase deploy --only hosting` does the same):

```bash
bash scripts/deploy-hosting.sh
```

Tell Django about the new address (`^@^` makes `@` the separator, since the values contain commas):

```bash
gcloud run services update matsilele-website --region europe-west3 --update-env-vars \
  "^@^DJANGO_ALLOWED_HOSTS=.run.app,matsilelemabaso.web.app@CSRF_TRUSTED_ORIGINS=https://matsilelemabaso.web.app@SITE_URL=https://matsilelemabaso.web.app"
```

A domain of your own can be added later in the Firebase console → **Hosting → Add custom domain** (add it to the
three settings above too).

Things Firebase changes:

- **Only one cookie survives**: Firebase drops every cookie except `__session`. That's why the Django session
  cookie is named `__session` and the CSRF token is kept in the session (the inbox gets it from `/api/inbox/me/`).
- **60-second limit** per request: a chat reply that takes longer is cut off.
- Re-run `scripts/deploy-hosting.sh` only when `firebase.json` changes; normal pushes to `main` still deploy
  to Cloud Run as before.

## GitHub Actions (CI/CD)

```
.github/workflows/ci.yml      every PR and non-main push: Django tests · React lint + build · Docker build + smoke test
.github/workflows/deploy.yml  every push to main: runs ci.yml → builds image → pushes to Artifact Registry → deploys to Cloud Run → checks the live site
```

`deploy.yml` signs in to Google Cloud with **Workload Identity Federation** (GitHub proves who it is with OIDC;
no keys or passwords stored anywhere). It uses its own `github-deployer` service account, which can only push to
the `website` image repository and deploy the `matsilele-website` service, and only this repo's `main` branch can
use it.

### One-time setup

```bash
bash scripts/setup-github-deploy.sh
```

Then in GitHub → **Settings → Secrets and variables → Actions → Variables**, add the five values it prints:
`GCP_PROJECT_ID`, `GCP_REGION`, `CLOUD_RUN_SERVICE`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOY_SERVICE_ACCOUNT`.
Push to `main` and watch the **Actions** tab.
