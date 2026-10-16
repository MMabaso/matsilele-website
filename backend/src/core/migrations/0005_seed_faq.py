"""Starter FAQs for the avatar page ("type Q2 for an instant answer"). Edit them in the admin."""

from django.db import migrations

FAQS = [
    (
        "What do you work on at Hulamin?",
        "I'm a Senior Data Scientist at Hulamin in Pietermaritzburg (since November 2024). I design, build and "
        "deploy production-grade ML applications for the manufacturing environment — from model development "
        "through Django/DRF APIs, React/TypeScript frontends, Docker, CI/CD and Azure deployment. Highlights "
        "include a private GenAI chatbot with RAG over engineering manuals and SOPs, and a product quality "
        "prediction model.",
    ),
    (
        "How do you deploy ML models to production?",
        "I expose models through Django / Django REST Framework APIs, containerise the apps with Docker, run "
        "CI/CD with GitHub Actions, push images to Azure Container Registry and deploy to AKS. Model artifacts "
        "live in Azure Blob Storage for production inference, and I treat the whole lifecycle — reproducible "
        "pipelines, evaluation, monitoring and retraining — as part of the job.",
    ),
    (
        "What was your PhD about?",
        "I hold a Doctor of Electrical Engineering from the University of Johannesburg (2015–2019), specialising "
        "in Computer Vision and Machine Learning. I did the research at the CSIR, working on computer vision and "
        "robotic perception, and was named the CSIR's Best Doctor of Engineering Student in 2018.",
    ),
    (
        "What's your tech stack?",
        "Python, SQL and PySpark on Databricks for data and ML; MLflow, Docker, Kubernetes/AKS and GitHub Actions "
        "for MLOps; Django/DRF and React/TypeScript for applications; Azure for cloud. For GenAI I work with LLMs, "
        "RAG, embeddings, FAISS and ChromaDB.",
    ),
    (
        "How can I get in touch?",
        "Email me at matsilele.aubrey@gmail.com or connect on "
        "[LinkedIn](https://www.linkedin.com/in/matsilele-aubrey-mabaso-phd-74b37438). Or just leave your name "
        "and email here and I'll pass your message on to the real me straight away.",
    ),
]


def seed(apps, schema_editor):
    FaqEntry = apps.get_model("core", "FaqEntry")
    for i, (question, answer) in enumerate(FAQS, 1):
        FaqEntry.objects.get_or_create(question=question, defaults={"answer": answer, "order": i * 10})


def unseed(apps, schema_editor):
    apps.get_model("core", "FaqEntry").objects.filter(question__in=[q for q, _ in FAQS]).delete()


class Migration(migrations.Migration):
    dependencies = [("core", "0004_faqentry")]

    operations = [migrations.RunPython(seed, unseed)]
