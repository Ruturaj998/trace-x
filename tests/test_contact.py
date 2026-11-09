import uuid
from starlette.testclient import TestClient

from app.main import app
from app.database.connection import SessionLocal
from app.models.contact_message import ContactMessage

client = TestClient(app)


def test_contact_submission_success():
    db = SessionLocal()
    unique_email = f"contact_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Jane Developer",
        "email": unique_email,
        "subject": "Technical Support & Telemetry Sync",
        "message": "This is a detailed technical support inquiry regarding the background agent.",
        "honeypot": "",
    }

    response = client.post("/contact", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "success"
    assert "Thank you for contacting TRACE-X" in data["message"]

    # Verify message was safely persisted in database
    saved = db.query(ContactMessage).filter(ContactMessage.email == unique_email).first()
    assert saved is not None
    assert saved.name == "Jane Developer"
    assert saved.subject == "Technical Support & Telemetry Sync"
    assert "detailed technical support inquiry" in saved.message

    # Cleanup test record
    db.delete(saved)
    db.commit()
    db.close()


def test_contact_honeypot_bot_defense():
    db = SessionLocal()
    bot_email = f"spambot_{uuid.uuid4().hex[:8]}@spamdomain.net"
    payload = {
        "name": "Spam Bot 3000",
        "email": bot_email,
        "subject": "Buy cheap pharmaceutical deals now",
        "message": "Visit our external link right now to buy products.",
        # Bot fills the hidden honeypot field
        "honeypot": "https://spam-payload.example.com",
    }

    response = client.post("/contact", json=payload)
    # Must return 200 to not alert spam bots, but NOT persist to database
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify message was dropped and NOT persisted in the database
    saved = db.query(ContactMessage).filter(ContactMessage.email == bot_email).first()
    assert saved is None, "Honeypot submission must not be saved to the database!"
    db.close()


def test_contact_validation_failures():
    # 1. Invalid email
    bad_email = client.post(
        "/contact",
        json={
            "name": "John Doe",
            "email": "not-a-valid-email",
            "subject": "Support",
            "message": "Valid length message here.",
        },
    )
    assert bad_email.status_code == 422

    # 2. Message too short (< 10 chars)
    short_msg = client.post(
        "/contact",
        json={
            "name": "John Doe",
            "email": "john@example.com",
            "subject": "Support",
            "message": "Too short",
        },
    )
    assert short_msg.status_code == 422

    # 3. Malicious script tag rejected
    script_attack = client.post(
        "/contact",
        json={
            "name": "<script>alert(1)</script>",
            "email": "john@example.com",
            "subject": "Support",
            "message": "Testing input sanitization filter.",
        },
    )
    assert script_attack.status_code == 422


def test_public_health_check_unauthenticated():
    # Requirement 15: Ensure health checks work without requiring a user login
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["api"] == "online"
    assert data["status"] in ("healthy", "degraded")
    assert data["database"] in ("connected", "disconnected")
