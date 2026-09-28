import uuid
from datetime import datetime, timezone, timedelta
import pytest
from starlette.testclient import TestClient

from app.main import app
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.services.auth import create_access_token, hash_password
from app.services.password_reset import generate_reset_token, hash_token

client = TestClient(app)


def test_register_and_login_success():
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    reg_resp = client.post(
        "/auth/register",
        json={"name": "Alice Tester", "email": unique_email, "password": "password123"},
    )
    assert reg_resp.status_code == 200, reg_resp.text
    user_data = reg_resp.json()
    assert user_data["email"] == unique_email
    assert "password_hash" not in user_data

    # Duplicate registration must fail
    dup_resp = client.post(
        "/auth/register",
        json={"name": "Alice Duplicate", "email": unique_email, "password": "password123"},
    )
    assert dup_resp.status_code == 400
    assert "Email already registered" in dup_resp.json()["detail"]

    # Invalid login (wrong password)
    bad_login = client.post(
        "/auth/login",
        json={"email": unique_email, "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401

    # Successful login
    login_resp = client.post(
        "/auth/login",
        json={"email": unique_email, "password": "password123"},
    )
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # Test /auth/me and /users/me
    me_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == unique_email

    users_me = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert users_me.status_code == 200
    assert users_me.json()["email"] == unique_email


def test_password_validation():
    # Short password (< 8 chars)
    resp = client.post(
        "/auth/register",
        json={"name": "Bob", "email": f"bob_{uuid.uuid4().hex[:6]}@example.com", "password": "short"},
    )
    assert resp.status_code == 422


def test_forgot_and_reset_password_flow():
    unique_email = f"reset_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/auth/register",
        json={"name": "Reset User", "email": unique_email, "password": "originalPassword1"},
    )

    # Forgot password for existing email
    forgot_resp = client.post("/auth/forgot-password", json={"email": unique_email})
    assert forgot_resp.status_code == 200
    assert "If an account exists" in forgot_resp.json()["message"]

    # Forgot password for non-existent email gives SAME message (does not reveal existence)
    non_existent = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
    assert non_existent.status_code == 200
    assert non_existent.json()["message"] == forgot_resp.json()["message"]

    # Inspect DB for generated token
    db = SessionLocal()
    user = db.query(User).filter(User.email == unique_email).first()
    assert user is not None
    reset_entry = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.user_id == user.id, PasswordResetToken.used == False)
        .order_by(PasswordResetToken.created_at.desc())
        .first()
    )
    assert reset_entry is not None
    db.close()

    # Create a known token directly to test reset endpoint
    db = SessionLocal()
    raw_token = generate_reset_token()
    token_hashed = hash_token(raw_token)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    test_reset_record = PasswordResetToken(
        token=token_hashed,
        user_id=user.id,
        expires_at=expires,
        used=False,
    )
    db.add(test_reset_record)
    db.commit()
    db.close()

    # Reset with invalid token
    invalid_reset = client.post(
        "/auth/reset-password",
        json={"token": "completely-invalid-token", "new_password": "newSecretPassword123"},
    )
    assert invalid_reset.status_code == 400

    # Reset with valid token
    valid_reset = client.post(
        "/auth/reset-password",
        json={"token": raw_token, "new_password": "newSecretPassword123"},
    )
    assert valid_reset.status_code == 200
    assert "successfully reset" in valid_reset.json()["message"]

    # Single-use check: using the same token again must fail
    reuse_reset = client.post(
        "/auth/reset-password",
        json={"token": raw_token, "new_password": "anotherPassword123"},
    )
    assert reuse_reset.status_code == 400

    # Login with new password must succeed
    new_login = client.post(
        "/auth/login",
        json={"email": unique_email, "password": "newSecretPassword123"},
    )
    assert new_login.status_code == 200

    # Login with old password must fail
    old_login = client.post(
        "/auth/login",
        json={"email": unique_email, "password": "originalPassword1"},
    )
    assert old_login.status_code == 401


def test_change_password_flow():
    unique_email = f"change_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/auth/register",
        json={"name": "Change User", "email": unique_email, "password": "currentPassword1"},
    )

    login_resp = client.post(
        "/auth/login",
        json={"email": unique_email, "password": "currentPassword1"},
    )
    token = login_resp.json()["access_token"]

    # Attempt change with wrong current password
    bad_change = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "wrongOldPassword", "new_password": "updatedPassword1"},
    )
    assert bad_change.status_code == 400
    assert "Incorrect current password" in bad_change.json()["detail"]

    # Successful change
    good_change = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "currentPassword1", "new_password": "updatedPassword1"},
    )
    assert good_change.status_code == 200

    # Login with updated password
    verify_login = client.post(
        "/auth/login",
        json={"email": unique_email, "password": "updatedPassword1"},
    )
    assert verify_login.status_code == 200


def test_expired_or_invalid_jwt():
    # Expired token
    expired_token = create_access_token(99999)
    # Tamper token
    tampered_token = expired_token[:-4] + "abcd"

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert resp.status_code == 401
    assert "Invalid or expired token" in resp.json()["detail"]


def test_rate_limiter_logic():
    import os
    from fastapi import HTTPException, Request
    from app.services.rate_limiter import RateLimiter

    limiter = RateLimiter(max_requests=2, window_seconds=60)
    # Temporarily unset TESTING to test rate limiting
    old_val = os.environ.get("TESTING")
    os.environ["TESTING"] = "false"

    class FakeRequest:
        client = type("Client", (), {"host": "192.168.1.100"})()
        headers = {}

    req = FakeRequest()
    limiter.check(req, "test")
    limiter.check(req, "test")

    with pytest.raises(HTTPException) as exc_info:
        limiter.check(req, "test")
    assert exc_info.value.status_code == 429
    assert "Too many requests" in exc_info.value.detail

    if old_val is not None:
        os.environ["TESTING"] = old_val
