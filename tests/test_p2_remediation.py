import os
import stat
import tempfile
import uuid
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient

from app.main import app
from app.database.connection import SessionLocal
from app.models.device import Device
from telemetry_agent.offline_queue import OfflineTelemetryQueue

client = TestClient(app)


def create_user():
    email = f"p2_user_{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/auth/register",
        json={"name": "P2 Security Tester", "email": email, "password": "password123"},
    )
    assert reg.status_code == 200
    user_id = reg.json()["id"]

    login = client.post(
        "/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    csrf_token = login.json().get("csrf_token")
    return {"id": user_id, "email": email, "token": token, "csrf_token": csrf_token}


# ==============================================================================
# PHASE 1: Device-Specific Authentication Tests
# ==============================================================================


def test_device_credential_generation_rotation_revocation():
    user = create_user()
    headers = {"Authorization": f"Bearer {user['token']}"}

    # 1. Create Device
    ident = f"DEV-AUTH-{uuid.uuid4().hex[:6].upper()}"
    dev_resp = client.post(
        "/devices",
        headers=headers,
        json={"device_name": "Edge Tracker A", "device_identifier": ident, "user_id": user["id"]},
    )
    assert dev_resp.status_code == 200
    dev = dev_resp.json()
    device_id = dev["id"]
    assert dev["has_token"] is False
    assert dev["token_prefix"] is None

    # 2. Generate Device Token
    token_resp = client.post(f"/devices/{device_id}/token", headers=headers)
    assert token_resp.status_code == 200
    token_data = token_resp.json()
    raw_token = token_data["device_token"]
    prefix = token_data["token_prefix"]
    assert raw_token.startswith("txd_")
    assert prefix == raw_token[:12]

    # Verify regular GET /devices does not leak raw token or hash
    get_resp = client.get(f"/devices/{device_id}", headers=headers)
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["has_token"] is True
    assert get_data["token_prefix"] == prefix
    assert "device_token" not in get_data
    assert "device_token_hash" not in get_data

    # 3. Ingest telemetry using the device token via X-Device-Token header
    device_headers = {"X-Device-Token": raw_token}
    loc_resp = client.post(
        "/locations",
        headers=device_headers,
        json={"device_id": device_id, "latitude": 37.7749, "longitude": -122.4194, "accuracy": 4.5},
    )
    assert loc_resp.status_code == 200
    assert loc_resp.json()["device_id"] == device_id

    # 4. Ingest with invalid device token fails
    bad_headers = {"X-Device-Token": "txd_invalid_token_1234567890"}
    bad_resp = client.post(
        "/locations",
        headers=bad_headers,
        json={"device_id": device_id, "latitude": 37.7749, "longitude": -122.4194},
    )
    assert bad_resp.status_code == 401

    # 5. Rotate Token
    rotate_resp = client.post(f"/devices/{device_id}/token", headers=headers)
    assert rotate_resp.status_code == 200
    new_token = rotate_resp.json()["device_token"]
    assert new_token != raw_token

    # Old token is now invalid
    old_loc_resp = client.post(
        "/locations",
        headers=device_headers,
        json={"device_id": device_id, "latitude": 37.7749, "longitude": -122.4194},
    )
    assert old_loc_resp.status_code == 401

    # New token works
    new_loc_resp = client.post(
        "/locations",
        headers={"X-Device-Token": new_token},
        json={"device_id": device_id, "latitude": 37.7750, "longitude": -122.4195},
    )
    assert new_loc_resp.status_code == 200

    # 6. Revoke Token
    revoke_resp = client.delete(f"/devices/{device_id}/token", headers=headers)
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["message"] == "Device credentials revoked successfully"

    # Revoked token immediately stops working
    post_revoke_resp = client.post(
        "/locations",
        headers={"X-Device-Token": new_token},
        json={"device_id": device_id, "latitude": 37.7750, "longitude": -122.4195},
    )
    assert post_revoke_resp.status_code == 401


def test_cross_device_impersonation_prevention():
    user = create_user()
    headers = {"Authorization": f"Bearer {user['token']}"}

    # Create Device 1
    d1 = client.post(
        "/devices",
        headers=headers,
        json={"device_name": "Device 1", "device_identifier": f"D1-{uuid.uuid4().hex[:6]}", "user_id": user["id"]},
    ).json()
    token1 = client.post(f"/devices/{d1['id']}/token", headers=headers).json()["device_token"]

    # Create Device 2
    d2 = client.post(
        "/devices",
        headers=headers,
        json={"device_name": "Device 2", "device_identifier": f"D2-{uuid.uuid4().hex[:6]}", "user_id": user["id"]},
    ).json()

    # Attempt to use Device 1's credential to submit telemetry for Device 2
    impersonation_resp = client.post(
        "/locations",
        headers={"X-Device-Token": token1},
        json={"device_id": d2["id"], "latitude": 12.34, "longitude": 56.78},
    )
    assert impersonation_resp.status_code == 403
    assert "Cross-device impersonation forbidden" in impersonation_resp.json()["detail"]


def test_cross_user_device_access_prevention():
    user_a = create_user()
    user_b = create_user()

    headers_a = {"Authorization": f"Bearer {user_a['token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['token']}"}

    # User A creates a device
    dev_a = client.post(
        "/devices",
        headers=headers_a,
        json={"device_name": "User A Device", "device_identifier": f"DA-{uuid.uuid4().hex[:6]}", "user_id": user_a["id"]},
    ).json()

    # User B attempts to generate token for User A's device
    unauth_token_resp = client.post(f"/devices/{dev_a['id']}/token", headers=headers_b)
    assert unauth_token_resp.status_code == 404

    # User B attempts to revoke token for User A's device
    unauth_revoke_resp = client.delete(f"/devices/{dev_a['id']}/token", headers=headers_b)
    assert unauth_revoke_resp.status_code == 404


# ==============================================================================
# PHASE 2: Real Online/Offline Detection Tests
# ==============================================================================


def test_real_online_offline_detection():
    user = create_user()
    headers = {"Authorization": f"Bearer {user['token']}"}

    ident = f"DEV-CONN-{uuid.uuid4().hex[:6].upper()}"
    dev_resp = client.post(
        "/devices",
        headers=headers,
        json={"device_name": "Connectivity Test Device", "device_identifier": ident, "user_id": user["id"]},
    )
    dev = dev_resp.json()
    device_id = dev["id"]

    # 1. Newly registered device has NEVER_CONNECTED and no last_seen
    assert dev["connectivity_status"] == "NEVER_CONNECTED"
    assert dev["last_seen"] is None

    # Check dashboard summary
    summary = client.get("/dashboard/summary", headers=headers).json()
    assert summary["never_connected_devices"] >= 1

    # 2. Ingest telemetry fix -> status becomes ONLINE
    loc_resp = client.post(
        "/locations",
        headers=headers,
        json={"device_id": device_id, "latitude": 40.7128, "longitude": -74.0060, "accuracy": 5.0},
    )
    assert loc_resp.status_code == 200

    dev_updated = client.get(f"/devices/{device_id}", headers=headers).json()
    assert dev_updated["connectivity_status"] == "ONLINE"
    assert dev_updated["last_seen"] is not None

    summary2 = client.get("/dashboard/summary", headers=headers).json()
    assert summary2["online_devices"] >= 1

    # 3. Simulate passage of time (> 5 minutes heartbeat threshold)
    db = SessionLocal()
    try:
        db_dev = db.query(Device).filter(Device.id == device_id).first()
        db_dev.last_seen = datetime.now(timezone.utc) - timedelta(minutes=10)
        db.commit()
    finally:
        db.close()

    dev_offline = client.get(f"/devices/{device_id}", headers=headers).json()
    assert dev_offline["connectivity_status"] == "OFFLINE"

    summary3 = client.get("/dashboard/summary", headers=headers).json()
    assert summary3["offline_devices"] >= 1


# ==============================================================================
# PHASE 3: Offline Location Buffering & Synchronization Tests
# ==============================================================================


def test_offline_buffering_and_batch_sync():
    user = create_user()
    headers = {"Authorization": f"Bearer {user['token']}"}

    dev = client.post(
        "/devices",
        headers=headers,
        json={"device_name": "Buffer Device", "device_identifier": f"BUF-{uuid.uuid4().hex[:6]}", "user_id": user["id"]},
    ).json()
    device_id = dev["id"]
    token = client.post(f"/devices/{device_id}/token", headers=headers).json()["device_token"]

    idemp1 = str(uuid.uuid4())
    idemp2 = str(uuid.uuid4())
    idemp3 = str(uuid.uuid4())

    batch_fixes = [
        {"latitude": 34.0522, "longitude": -118.2437, "accuracy": 3.0, "recorded_at": "2026-11-09T05:00:00Z", "idempotency_key": idemp1},
        {"latitude": 34.0523, "longitude": -118.2438, "accuracy": 3.2, "recorded_at": "2026-11-09T05:01:00Z", "idempotency_key": idemp2},
        {"latitude": 34.0524, "longitude": -118.2439, "accuracy": 2.9, "recorded_at": "2026-11-09T05:02:00Z", "idempotency_key": idemp3},
    ]

    # 1. Sync batch with device token
    sync_resp = client.post(
        "/locations/sync",
        headers={"X-Device-Token": token},
        json={"device_id": device_id, "fixes": batch_fixes},
    )
    assert sync_resp.status_code == 200
    data = sync_resp.json()
    assert data["synced_count"] == 3
    assert data["duplicates_skipped"] == 0

    # 2. Resending same batch should skip all duplicates idempotently
    resync_resp = client.post(
        "/locations/sync",
        headers={"X-Device-Token": token},
        json={"device_id": device_id, "fixes": batch_fixes},
    )
    assert resync_resp.status_code == 200
    resync_data = resync_resp.json()
    assert resync_data["synced_count"] == 0
    assert resync_data["duplicates_skipped"] == 3

    # Verify total locations in DB is exactly 3
    locs_resp = client.get(f"/devices/{device_id}/locations", headers=headers)
    assert locs_resp.status_code == 200
    assert len(locs_resp.json()) == 3


def test_offline_queue_file_permissions():
    """Verify offline file queue strictly sets 0600 user-read/write permissions."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        q_path = os.path.join(tmp_dir, "test_queue.json")
        queue = OfflineTelemetryQueue(q_path)

        # Check permissions
        mode = stat.S_IMODE(os.stat(q_path).st_mode)
        assert mode == 0o600, f"Expected 0600 permissions, got {oct(mode)}"

        # Enqueue item
        queue.enqueue({"lat": 1.0, "lon": 2.0, "key": "abc"})
        assert queue.size() == 1

        # Mode remains 0600 after writing
        mode2 = stat.S_IMODE(os.stat(q_path).st_mode)
        assert mode2 == 0o600

        # Peek & Drain
        items = queue.peek(10)
        assert len(items) == 1
        queue.drain(1)
        assert queue.size() == 0


# ==============================================================================
# PHASE 4: HttpOnly Cookies & CSRF Protection Tests
# ==============================================================================


def test_httponly_cookie_and_csrf_validation():
    # Dedicated test client instance to control cookie jar cleanly
    isolated_client = TestClient(app)

    email = f"csrf_test_{uuid.uuid4().hex[:8]}@example.com"
    reg = isolated_client.post(
        "/auth/register",
        json={"name": "CSRF Tester", "email": email, "password": "password123"},
    )
    assert reg.status_code == 200

    login = isolated_client.post(
        "/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert login.status_code == 200
    csrf_token = login.json()["csrf_token"]

    # Verify cookies in response
    cookies = login.cookies
    assert "access_token" in cookies
    assert "csrf_token" in cookies

    # 1. State-changing request WITH cookie but WITHOUT X-CSRF-Token -> HTTP 403
    blocked_resp = isolated_client.post(
        "/devices",
        json={"device_name": "Attacked Device", "device_identifier": f"ATTACK-{uuid.uuid4().hex[:6]}", "user_id": 1},
    )
    assert blocked_resp.status_code == 403
    assert "CSRF token missing or invalid" in blocked_resp.json()["detail"] or "CSRF validation failed" in blocked_resp.json()["detail"]

    # 2. State-changing request WITH cookie and WRONG X-CSRF-Token -> HTTP 403
    wrong_csrf_resp = isolated_client.post(
        "/devices",
        headers={"X-CSRF-Token": "bogus_tampered_csrf_token"},
        json={"device_name": "Attacked Device", "device_identifier": f"ATTACK-{uuid.uuid4().hex[:6]}", "user_id": 1},
    )
    assert wrong_csrf_resp.status_code == 403

    # 3. State-changing request WITH cookie and VALID X-CSRF-Token -> HTTP 200
    user_me = isolated_client.get("/auth/me").json()
    valid_resp = isolated_client.post(
        "/devices",
        headers={"X-CSRF-Token": csrf_token},
        json={"device_name": "Secure Device", "device_identifier": f"SEC-{uuid.uuid4().hex[:6]}", "user_id": user_me["id"]},
    )
    assert valid_resp.status_code == 200
    assert valid_resp.json()["device_name"] == "Secure Device"

    # 4. Logout clears HttpOnly session and CSRF cookies
    logout = isolated_client.post("/auth/logout")
    assert logout.status_code == 200
    assert logout.json()["message"] == "Logged out successfully"

    # Subsequent GET /auth/me returns 401
    post_logout_me = isolated_client.get("/auth/me")
    assert post_logout_me.status_code == 401
