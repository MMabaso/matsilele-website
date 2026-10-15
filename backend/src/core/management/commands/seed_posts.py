"""Seed starter posts based on projects from the CV. Edit or delete them in /admin afterwards."""

from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Post

TZ = timezone.get_default_timezone()

POSTS = [
    {
        "title": "Connecting to an LLM with OpenAI or Ollama, Then Chatting: A Step-by-Step Guide",
        "date": datetime(2026, 10, 15),
        "tags": "LLMs, OpenAI, Ollama, Python",
        "excerpt": "One small Python script that talks to either a hosted OpenAI model or a local Ollama model, "
                   "then grows into a multi-turn chat with memory and streaming.",
        "body": """If you're starting out with LLMs, the first job is simply getting a model to answer you. The nice
part: OpenAI's API and Ollama's local server speak the same protocol, so one piece of code works with both. You
pick hosted (OpenAI) or local (Ollama) by changing two settings.

- **OpenAI**: hosted, strong models, pay per token, needs an API key and an internet connection.
- **Ollama**: runs open models (Llama, Mistral, Qwen and others) on your own machine. Free and private, but limited
  by your hardware.

## Step 1: Set up a Python project

```bash
mkdir llm-chat && cd llm-chat
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\\Scripts\\activate
pip install openai python-dotenv
```

We use the official `openai` package for both providers.

## Step 2a: Option A, get an OpenAI API key

1. Sign in at platform.openai.com and create an API key.
2. Add a small amount of credit and set a monthly spending limit.
3. Create a `.env` file in your project (and add `.env` to `.gitignore`, never commit keys):

```bash
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...your-key...
LLM_MODEL=gpt-4o-mini
```

## Step 2b: Option B, run a model locally with Ollama

1. Install Ollama from ollama.com (macOS, Windows and Linux installers are available).
2. Download a model and try it in the terminal:

```bash
ollama pull llama3.2
ollama run llama3.2 "Say hello in one sentence."
```

3. Ollama now runs a server on `http://localhost:11434` with an OpenAI-compatible endpoint at `/v1`. Point your
   `.env` at it. The API key can be any non-empty string, because Ollama doesn't check it:

```bash
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=llama3.2
```

Tip: smaller models (1B to 8B parameters) run fine on a modern laptop. Bigger ones need a good GPU or lots of RAM.

## Step 3: Send your first message

Create `hello.py`:

```python
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(base_url=os.environ["LLM_BASE_URL"], api_key=os.environ["LLM_API_KEY"])

response = client.chat.completions.create(
    model=os.environ["LLM_MODEL"],
    messages=[{"role": "user", "content": "Explain RAG in two sentences."}],
)
print(response.choices[0].message.content)
```

Run `python hello.py`. If you see an answer, you're connected. Switching between OpenAI and Ollama is now just a
matter of editing `.env`, with no code changes.

## Step 4: Add a system prompt

The system message sets the model's role and rules. It's the cheapest way to improve answers.

```python
messages = [
    {"role": "system", "content": "You are a friendly tutor. Answer clearly and briefly."},
    {"role": "user", "content": "What is an embedding?"},
]
```

## Step 5: Turn it into a chat with memory

LLM APIs are stateless: the model only knows what you send in each request. To have a conversation, you keep the
history in a list and send all of it every time. Create `chat.py`:

```python
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(base_url=os.environ["LLM_BASE_URL"], api_key=os.environ["LLM_API_KEY"])
model = os.environ["LLM_MODEL"]

messages = [{"role": "system", "content": "You are a helpful assistant. Keep answers short."}]

print("Chat started. Type 'quit' to exit.")
while True:
    user_input = input("\\nYou: ").strip()
    if user_input.lower() in {"quit", "exit"}:
        break
    if not user_input:
        continue

    messages.append({"role": "user", "content": user_input})
    response = client.chat.completions.create(model=model, messages=messages, temperature=0.7)
    reply = response.choices[0].message.content

    messages.append({"role": "assistant", "content": reply})
    print(f"\\nAssistant: {reply}")
```

Ask "My name is Thabo", then "What's my name?". It remembers, because the earlier turns are in `messages`.

## Step 6: Stream the answer as it's written

Waiting for a full answer feels slow. With `stream=True`, you print each piece as it arrives. Replace the
request part of the loop with:

```python
    stream = client.chat.completions.create(model=model, messages=messages, stream=True)

    print("\\nAssistant: ", end="", flush=True)
    reply = ""
    for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content or ""
        print(delta, end="", flush=True)
        reply += delta
    print()

    messages.append({"role": "assistant", "content": reply})
```

## Step 7: Handle errors and long conversations

- **Errors**: wrap the request in `try/except` for `openai.APIConnectionError` (Ollama not running, no internet),
  `openai.AuthenticationError` (wrong key) and `openai.RateLimitError` (too many requests or no credit).
- **Context limits**: every model has a maximum context window. For long chats, keep the system message and only the
  last N turns, for example `messages = [messages[0]] + messages[-20:]`.
- **Cost**: with OpenAI, you pay for the whole history on every turn, so trimming saves money as well.

## Common problems

- `Connection refused` on localhost:11434: start Ollama (open the app, or run `ollama serve`).
- `model not found` with Ollama: run `ollama pull <model>` first, and check the name with `ollama list`.
- `401 Unauthorized` with OpenAI: check the key in `.env`, and that `load_dotenv()` runs before you create the client.
- Very slow local answers: try a smaller model, or close other heavy apps.

## Where to go next

Once you can chat, the next steps are structured JSON output, tool calling, and retrieval over your own documents
(RAG). The digital twin on this website is built exactly this way: the same chat loop, plus my profile as
context and a few tools. I cover those topics in
[ML Engineer → AI Engineer](/posts/from-ml-engineer-to-ai-engineer-a-step-by-step-guide).""",
    },
    {
        "title": "From AI Engineer to Forward Deployed Engineer: A Step-by-Step Guide",
        "date": datetime(2026, 10, 14),
        "tags": "Career, Forward Deployed Engineering, AI",
        "excerpt": "Part 3 of my career series. The last step is less about new tech and more about where you work: "
                   "inside the problem, next to the people who have it, owning the outcome.",
        "body": """*Part 3 of a series: [Data Scientist → ML Engineer](/posts/from-data-scientist-to-ml-engineer-a-step-by-step-guide),
[ML Engineer → AI Engineer](/posts/from-ml-engineer-to-ai-engineer-a-step-by-step-guide), and this one.*

A forward deployed engineer (FDE) is an engineer who works embedded with a customer or a business team and is
responsible for getting real value out of technology in their world. The role was popularised by Palantir and is
now common at AI companies, because the hard part of AI today is rarely the model. It's the messy data, the
existing systems, the security rules, and the people whose workflow has to change.

An AI engineer builds great AI systems. An FDE makes sure one of them actually solves a specific problem for
specific people, in their environment, and keeps solving it. Here's how I'd make that move.

## Step 1: Start from the problem, not the model

Your first instinct as an engineer is to ask "what should I build?". The FDE question is "what is going wrong,
for whom, and what does it cost them?".

- Spend time where the work happens. Sit with the operators, analysts or agents who will use what you build.
- Ask them to show you, not tell you. Watch how they do the task today, including the workarounds.
- Write the problem down in their words, then get them to agree it's right before you design anything.

## Step 2: Learn the domain language

Every industry has its own vocabulary and its own definition of "good". In credit risk it's default rates and
regulation. In a contact centre it's idle time and contact rates. In manufacturing it's yield, quality and
downtime. You earn trust fast when you speak that language, and you build better systems because you understand
what the numbers mean.

## Step 3: Scope ruthlessly

Big AI programmes stall. Small, valuable wins build momentum.

1. Pick the smallest version that delivers something real within a few weeks.
2. Agree a success metric with the people who own the problem, before you start.
3. Write down what is explicitly out of scope, so the project can't quietly double in size.

## Step 4: Build in their environment

Demos run on clean data in your favourite cloud. Real deployments run on the customer's data, behind their
firewall, under their security and privacy rules.

- Expect private infrastructure: their cloud tenancy, their identity system, sometimes private LLMs only.
- Integrate with what already exists (their databases, tools and workflows) instead of asking people to adopt a
  new system for one feature.
- Bring the full ML/AI engineering toolkit from the earlier posts. You'll often be the only engineer in the room,
  so you need to own data, model, API, UI and deployment yourself.

## Step 5: Prototype fast, then harden what sticks

Show something working in days, even if it's rough. A clickable prototype on real data surfaces wrong assumptions
far faster than a requirements document. Then invest in production quality (tests, CI/CD, monitoring, security
review) only for the parts people actually use.

## Step 6: Communicate constantly

An FDE spends a real share of their time talking, and that's part of the job, not a distraction from it.

- Demo regularly to the people who will use the system, not just to sponsors.
- Explain trade-offs in plain language: "this is faster but less accurate", "this needs data we don't have yet".
- Translate between worlds: what executives care about, what operators need, and what engineers can build.

## Step 7: Own adoption, not just delivery

A shipped system nobody uses is a failed project. Track whether people use it and whether the metric from Step 3
moves. Train users, write short guides, add feedback buttons, and fix the small annoyances that stop people
trusting the tool. Plan the handover so the team can run it after you leave.

## Step 8: Feed what you learn back

When you solve the same problem for the second or third time, turn it into something reusable: a template, a
library, a deployment pattern, a checklist. This is how forward deployed work makes the whole organisation faster,
and it's how you grow from solving one problem to shaping how many are solved.

## How to start practising now

You don't need the job title to build the skills:

- Volunteer for projects where you work directly with business users.
- Ask to sit in on the operational meetings your models affect.
- Present your own work to stakeholders, including the parts that didn't work.
- Measure your projects by adoption and business outcome, not model accuracy.

That's the whole journey: from analysing data, to engineering ML systems, to building with AI, to owning real
outcomes alongside the people who need them. If you're on a similar path, my digital twin is happy to chat about
it, or you can ask it to put you in touch with me directly.""",
    },
    {
        "title": "From ML Engineer to AI Engineer: A Step-by-Step Guide",
        "date": datetime(2026, 10, 7),
        "tags": "Career, GenAI, LLMs, RAG",
        "excerpt": "Part 2 of my career series. How to go from training models on your own data to building "
                   "products on top of foundation models: prompts, retrieval, tools, evaluation and guardrails.",
        "body": """*Part 2 of a series: [Data Scientist → ML Engineer](/posts/from-data-scientist-to-ml-engineer-a-step-by-step-guide),
this one, then [AI Engineer → Forward Deployed Engineer](/posts/from-ai-engineer-to-forward-deployed-engineer-a-step-by-step-guide).*

As an ML engineer, your core loop is: collect data, train a model, deploy it, monitor it. As an AI engineer, you
mostly don't train the model. You build products on top of large foundation models, and your work moves to
prompts, retrieval, tool use, evaluation and safety.

The good news is that ML engineering is a great starting point. Production habits like APIs, containers, CI/CD,
monitoring and thinking about failure modes matter even more with LLMs. Here's the path I'd follow.

## Step 1: Get fluent with LLM APIs

Start by calling models directly, without a framework, so you understand what is really happening.

- Chat messages and roles (system, user, assistant), temperature and max tokens.
- Structured output: asking for JSON that matches a schema, and validating it.
- Streaming responses so users see answers as they're written.
- Tokens, context windows and cost. Work out what one request costs before you build a feature around it.

## Step 2: Treat prompts as code

Prompts are part of your system, so manage them like code.

1. Keep them in version control, not pasted into a dashboard.
2. Be explicit: role, goal, constraints, output format, and what to do when unsure.
3. Add a few examples of good answers where the task is subtle.
4. Write test cases for the prompt, and re-run them whenever you change it.

## Step 3: Learn retrieval-augmented generation (RAG)

Most valuable business use cases need the model to use *your* knowledge. RAG is how you do that.

- Chunk documents sensibly (by section, not every 500 characters blindly).
- Create embeddings and store them in a vector store such as FAISS, ChromaDB or pgvector.
- Retrieve the most relevant chunks and give them to the model as context, with sources.
- Measure retrieval quality separately from answer quality. Most bad answers are really bad retrieval.

At Hulamin, a private RAG chatbot over engineering manuals, SOPs and reports cut support requests by 40%. The
model mattered less than good chunking, good embeddings and keeping the data private.

## Step 4: Give models tools

Tool (function) calling lets the model take actions: look something up, save a record, call an API. Start with one
or two well-described tools and add more only when needed.

The digital twin on this website is a small example. It answers questions from my profile, but it can also save a
visitor's contact details and alert me, or bring me into the chat live when I'm online.

## Step 5: Build evaluation in from day one

LLM outputs are non-deterministic, so "it looked fine when I tried it" is not a test.

- Build an evaluation set of real questions with expected answers or grading notes.
- Score answers automatically where you can, and review a sample by hand.
- Use an LLM as a judge carefully, and check its judgements against your own.
- Track latency and cost per request alongside quality.

## Step 6: Design for safety, security and privacy

- Assume users (and documents) will try prompt injection. Never let model output trigger risky actions without checks.
- Keep personal and confidential data out of prompts you don't control; use private deployments where needed.
- Add rate limits and spending caps so a bug or an abusive user can't run up a bill.
- Give the model a graceful "I don't know" path instead of letting it guess.

## Step 7: Ship a product, not a demo

Real users need more than a good answer: streaming responses, clear errors, a way to give feedback, conversation
logs you can learn from, and a handoff to a human when the AI isn't enough. This is where your ML engineering
background pays off.

## Step 8: Keep your ML foundations

Not everything should be an LLM. For tabular prediction, forecasting or classification at scale, a classic model is
often cheaper, faster and more accurate. Good AI engineers know when *not* to use generative AI.

## A project to prove it

Build a digital twin of yourself: an LLM that answers questions about your career from your CV, with retrieval,
one or two tools, an evaluation set, and a real deployment. It covers every step above, and recruiters can try it.

In [Part 3](/posts/from-ai-engineer-to-forward-deployed-engineer-a-step-by-step-guide) I cover the final move: from
AI engineer to forward deployed engineer.""",
    },
    {
        "title": "From Data Scientist to ML Engineer: A Step-by-Step Guide",
        "date": datetime(2026, 9, 30),
        "tags": "Career, MLOps, Data Science",
        "excerpt": "Part 1 of my career series. The practical steps I took to go from building models in notebooks "
                   "to owning ML systems in production.",
        "body": """*Part 1 of a series: this one, then [ML Engineer → AI Engineer](/posts/from-ml-engineer-to-ai-engineer-a-step-by-step-guide)
and [AI Engineer → Forward Deployed Engineer](/posts/from-ai-engineer-to-forward-deployed-engineer-a-step-by-step-guide).*

A data scientist's main question is "is this model good?". An ML engineer's main question is "will this model keep
working for real users, every day, without me watching it?".

I made this move gradually: from credit scoring models at Consumer Profile Bureau, to forecasting APIs at Sasol, to
shipping ML applications on Azure Kubernetes Service at Hulamin. These are the steps that mattered most.

## Step 1: Write code other people can run

Notebooks are great for exploration and painful for production.

- Move logic into Python modules and functions with clear inputs and outputs.
- Use Git properly: branches, small commits, pull requests and code review.
- Write tests with pytest, starting with data validation and feature code.
- Add type hints, a linter and a formatter so your code reads like engineering code.

## Step 2: Serve a model behind an API

A model becomes useful when other systems can call it.

1. Save the trained model as a versioned artifact, for example a .pkl file in cloud storage.
2. Wrap it in a REST API with FastAPI or Django REST Framework.
3. Validate every input. Production data is messier than your training set.
4. Decide between real-time inference (an API call per request) and batch scoring (a scheduled job).

## Step 3: Containerise it with Docker

Docker packages your code, dependencies and runtime into one image, so it runs the same on your laptop, in testing
and in production. Pin your package versions and keep images small.

## Step 4: Automate with CI/CD

Set up a pipeline (I use GitHub Actions) that runs on every change:

- Run the tests.
- Build the Docker image.
- Push it to a container registry.
- Deploy to a test environment, then to production.

Once this works, deploying stops being a scary event and becomes routine.

## Step 5: Deploy to the cloud

Pick one cloud and learn it well rather than three superficially. On Azure, my path is Azure Container Registry for
images, Azure Kubernetes Service for running them, and Azure Blob Storage for model artifacts. Learn the
Kubernetes basics: deployments, services, configuration, secrets and scaling.

## Step 6: Make training reproducible

- Build data and feature pipelines that run the same way every time (Spark or Databricks for larger data).
- Track experiments, parameters and metrics with MLflow.
- Register models so you always know which version is in production and what data trained it.

## Step 7: Monitor and retrain

Models decay as the world changes. Log predictions and inputs, watch for data drift, track latency and errors, and
set alerts. Then decide how retraining happens: on a schedule, or when monitoring says performance has dropped.

## Step 8: Build one end-to-end project and show it

Nothing proves the move like a working system. Take one model all the way: pipeline, training, API, Docker, CI/CD,
cloud deployment and monitoring, with a small frontend if you can. Put it on GitHub with a clear README and an
architecture diagram.

## What you keep from data science

Your statistics, experimental thinking and feel for what a model is really doing are a huge advantage. Many
engineers can deploy a model; far fewer can tell when it's quietly wrong. Keep that skill.

In [Part 2](/posts/from-ml-engineer-to-ai-engineer-a-step-by-step-guide) I cover the next move: from ML engineer to
AI engineer.""",
    },
    {
        "title": "From .pkl to Production: Shipping ML on Azure Kubernetes Service",
        "date": datetime(2026, 9, 20),
        "tags": "MLOps, Azure, Kubernetes, Django",
        "excerpt": "The path I use to take a trained model all the way to a cloud-hosted inference app: "
                   "Django REST, React, Docker, GitHub Actions, ACR and AKS.",
        "body": """A model that only lives in a notebook isn't delivering value yet. At Hulamin, a big part of my work
is closing the gap between *a trained model* and *an application people actually use*.

## The production path

1. **Model artifacts in Azure Blob Storage.** Trained models are serialised (.pkl) and stored centrally, so the
   serving layer always loads a known, versioned artifact rather than something copied around by hand.
2. **A Django REST Framework backend** loads the artifact and exposes predictions through a clean REST API.
3. **A React + TypeScript frontend** turns those predictions into something engineers and operators can use day to day.
4. **Docker** packages each service so it runs the same on my laptop as in the cloud.
5. **GitHub Actions** builds, tests and pushes images on every merge.
6. **Azure Container Registry → Azure Kubernetes Service** handles image management and production workloads.

## Why bother with all of this?

Because reproducibility is a feature. When a model needs retraining, the path back to production is the same
pipeline — not a heroic weekend. Monitoring and retraining become routine, and the business can trust the numbers.

If you're building something similar, ask my digital twin on the Avatar page — or email me directly.""",
    },
    {
        "title": "Building a Private RAG Chatbot over Engineering Manuals",
        "date": datetime(2026, 7, 8),
        "tags": "GenAI, RAG, LLMs, FAISS",
        "excerpt": "How retrieval-augmented generation over SOPs, manuals and reports helped cut support "
                   "requests by 40% — while keeping the data private.",
        "body": """Manufacturing sites run on documentation: engineering manuals, standard operating procedures, reports.
The knowledge is there — finding it quickly is the hard part.

## The approach

We built an enterprise chatbot that pairs a **private LLM** with **Retrieval-Augmented Generation (RAG)**:

- Documents are chunked and embedded, then indexed for **semantic search** with FAISS / ChromaDB.
- At question time, the most relevant passages are retrieved and handed to the LLM as context.
- The model answers in natural language, grounded in the company's own documents.

## The result

People can simply *ask* instead of hunting through folders, and support requests dropped by **40%**.

## Lessons

- Retrieval quality matters more than model size. Good chunking and embeddings pay off.
- Keeping the LLM private was non-negotiable for internal documents.
- Grounding answers in sources builds trust with engineers, who rightly want to know *where* an answer came from.

Fun fact: the digital twin on this website uses the same core idea — an LLM grounded in my own profile.""",
    },
    {
        "title": "Forecasting That Ships: A Django + React Time-Series API",
        "date": datetime(2026, 4, 15),
        "tags": "Forecasting, Time Series, Django, React",
        "excerpt": "Combining ARIMA with ML-based models behind a production API — and reducing inventory "
                   "variance by 18% along the way.",
        "body": """At Sasol I designed and deployed a time-series forecasting application that put model inference
directly into the hands of planners.

## What it did

- Combined classical **ARIMA** models with **ML-based forecasting** models, so each series could use what worked best.
- Exposed forecasts through a **Django** API with a **React.js** frontend.
- Made forecasts part of the demand-planning workflow rather than a one-off spreadsheet.

## Impact

Demand-planning accuracy improved and **inventory variance fell by 18%**.

## Takeaway

Statistical rigour and good software engineering are not separate disciplines. The forecasting model was only
half the work — the other half was making it reliable, explainable and easy to use.""",
    },
    {
        "title": "From Computer Vision Research to Production ML",
        "date": datetime(2026, 1, 12),
        "tags": "Career, Computer Vision, Research",
        "excerpt": "What a PhD in computer vision at the CSIR taught me about building machine learning "
                   "systems in industry.",
        "body": """My path into industry ML started in research. I spent years at the CSIR in Pretoria — first on
bio-image processing for my Master's, then on computer vision and robotic perception for my doctorate at the
University of Johannesburg.

## What research gave me

- **Mathematical foundations.** My undergraduate and honours studies in mathematics and statistics at the
  University of Limpopo still shape how I think about models and uncertainty.
- **Comfort with open problems.** Research means working where there isn't a tutorial yet.
- **Communication.** Presenting at international conferences — including an invited talk in Wuhan and a best
  paper presentation in India — taught me to explain complex ideas clearly.

## What industry added

Credit scoring at Consumer Profile Bureau, predictive maintenance and forecasting at Sasol, and production ML
platforms at Hulamin taught me the other half: data engineering, APIs, CI/CD, cloud and, above all, building
things people rely on every day.

The best ML engineers I know live in both worlds. That's where I try to be.""",
    },
]


class Command(BaseCommand):
    help = "Create starter blog posts (skips any that already exist)."

    def handle(self, *args, **options):
        created = 0
        for p in POSTS:
            _, was_created = Post.objects.get_or_create(
                title=p["title"],
                defaults={
                    "excerpt": p["excerpt"],
                    "body": p["body"],
                    "tags": p["tags"],
                    "published_at": timezone.make_aware(p["date"], TZ),
                },
            )
            created += was_created
        self.stdout.write(self.style.SUCCESS(f"Seeded {created} new post(s)."))
