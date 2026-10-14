"""Alerts to the real Matsilele. Any channel with credentials configured in .env is used.

- Pushover: instant push notification on your phone (pushover.net, one-off app purchase, free API)
- Email:    any SMTP account, e.g. Gmail with an App Password
"""

import logging

import requests
from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)


def send_pushover(title: str, body: str) -> bool:
    if not (settings.PUSHOVER_USER and settings.PUSHOVER_TOKEN):
        return False
    try:
        r = requests.post(
            "https://api.pushover.net/1/messages.json",
            data={"token": settings.PUSHOVER_TOKEN, "user": settings.PUSHOVER_USER,
                  "title": title, "message": body[:1000]},
            timeout=10,
        )
        r.raise_for_status()
        return True
    except Exception:
        logger.exception("Pushover notification failed")
        return False


def send_email(title: str, body: str, reply_to: str | None = None) -> bool:
    if not (settings.NOTIFY_EMAIL_TO and settings.EMAIL_HOST_USER):
        return False
    try:
        EmailMessage(
            subject=f"[Website] {title}",
            body=body + "\n\n— sent by your digital twin",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.NOTIFY_EMAIL_TO],
            reply_to=[reply_to] if reply_to else None,
        ).send()
        return True
    except Exception:
        logger.exception("Email notification failed")
        return False


def notify(title: str, body: str, reply_to: str | None = None) -> None:
    sent = [send_pushover(title, body), send_email(title, body, reply_to)]
    if not any(sent):
        logger.warning("No notification channel configured; saved to the database only. %s: %s", title, body)
