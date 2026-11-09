import logging
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.models.contact_message import ContactMessage
from app.schemas.contact import ContactCreate, ContactResponse
from app.services.rate_limiter import contact_limiter, get_client_ip

logger = logging.getLogger("tracex.contact")

router = APIRouter(tags=["Contact"])


@router.post("/contact", response_model=ContactResponse)
def submit_contact_form(
    request: Request,
    payload: ContactCreate,
    db: Session = Depends(get_db),
):
    # 1. Rate limiting check (e.g. max 3 requests per 60s per IP)
    contact_limiter.check(request, "contact")

    # 2. Extract client IP safely using trusted proxy resolution
    client_ip = get_client_ip(request)

    # 3. Honeypot check: If the hidden honeypot field is populated, a bot filled it.
    # Return success immediately without persisting or triggering downstream workflows.
    if payload.honeypot and payload.honeypot.strip():
        logger.warning(
            f"Spam bot detected via honeypot field from IP: {client_ip}. Silently dropping submission."
        )
        return {
            "status": "success",
            "message": "Thank you for contacting TRACE-X. Your message has been received.",
        }

    # 4. Safely persist message in the database
    contact_entry = ContactMessage(
        name=payload.name,
        email=payload.email,
        subject=payload.subject,
        message=payload.message,
        client_ip=client_ip,
    )

    db.add(contact_entry)
    db.commit()

    logger.info(
        f"Valid contact inquiry recorded from {payload.email} [Subject: {payload.subject}]"
    )

    return {
        "status": "success",
        "message": "Thank you for contacting TRACE-X. Your message has been received and our team will respond shortly.",
    }
