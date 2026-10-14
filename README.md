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
images in `/app/backend/media` (mount a volume or Azure Files share there).

## GitHub Actions (CI/CD)

```
.github/workflows/ci.yml      every PR and non-main push: Django tests · React lint + build · Docker build + smoke test
.github/workflows/deploy.yml  every push to main: runs ci.yml → builds image → pushes to ACR → updates Container App → checks the live site
```

`deploy.yml` signs in to Azure with **OIDC** (GitHub proves who it is; no passwords stored anywhere).

### One-time Azure setup

```bash
# Names: change to taste (ACR names must be globally unique, lowercase letters/numbers)
RG=matsilele-site; LOC=southafricanorth; ACR=matsileleacr; ENV=matsilele-env; APP=matsilele-website
GH_REPO=<your-github-user>/<your-repo>

az group create -n $RG -l $LOC
az acr create -n $ACR -g $RG --sku Basic
az containerapp env create -n $ENV -g $RG -l $LOC

# The Container App (a placeholder image until the first deploy replaces it)
az containerapp create -n $APP -g $RG --environment $ENV \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --ingress external --target-port 8000 \
  --registry-server $ACR.azurecr.io --registry-identity system \
  --min-replicas 0 --max-replicas 1 \
  --secrets django-secret="$(openssl rand -base64 48)" openai-key="<your-openai-key>" \
            database-url="<postgres://user:pass@host:5432/db?sslmode=require>" \
  --env-vars DJANGO_SECRET_KEY=secretref:django-secret OPENAI_API_KEY=secretref:openai-key \
             DATABASE_URL=secretref:database-url SEED_POSTS=true \
             DJANGO_ALLOWED_HOSTS=.azurecontainerapps.io \
             CSRF_TRUSTED_ORIGINS=https://$APP.<your-env-domain>.azurecontainerapps.io \
             SITE_URL=https://$APP.<your-env-domain>.azurecontainerapps.io
# (get the exact address with: az containerapp show -n $APP -g $RG --query properties.configuration.ingress.fqdn -o tsv
#  and add your own domain to ALLOWED_HOSTS/CSRF_TRUSTED_ORIGINS/SITE_URL once you connect it)

# An identity GitHub Actions can use, trusted only for this repo's "production" environment
CLIENT_ID=$(az ad app create --display-name github-$APP --query appId -o tsv)
az ad sp create --id $CLIENT_ID
az ad app federated-credential create --id $CLIENT_ID --parameters "{
  \"name\": \"github-production\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:$GH_REPO:environment:production\",
  \"audiences\": [\"api://AzureADTokenExchange\"]}"
az role assignment create --assignee $CLIENT_ID --role Contributor --scope $(az group show -n $RG --query id -o tsv)
az role assignment create --assignee $CLIENT_ID --role AcrPush --scope $(az acr show -n $ACR --query id -o tsv)

echo "AZURE_CLIENT_ID=$CLIENT_ID"
echo "AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
echo "AZURE_SUBSCRIPTION_ID=$(az account show --query id -o tsv)"
```

Then in GitHub → **Settings → Secrets and variables → Actions**:

- **Secrets:** `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (printed above)
- **Variables:** `AZURE_RESOURCE_GROUP` = `matsilele-site`, `ACR_NAME` = `matsileleacr`,
  `CONTAINER_APP_NAME` = `matsilele-website`

Push to `main` and watch the **Actions** tab. Add more app settings (email, Pushover) with
`az containerapp update -n $APP -g $RG --set-env-vars ...` or in the Azure portal.

**Database:** use Azure Database for PostgreSQL (Flexible Server, smallest tier) or a free Postgres such as
Neon, and put its connection string in the `database-url` secret. Don't use SQLite in a container: it's
wiped on every deploy.
