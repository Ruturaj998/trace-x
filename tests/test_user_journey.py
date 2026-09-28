"""
Complete End-to-End User Journey Test for TRACE-X MVP.

Flow:
REGISTER
  ↓
LOGIN
  ↓
ADD DEVICE
  ↓
DEVICE ACTIVE
  ↓
GPS TELEMETRY
  ↓
LOCATION STORED
  ↓
LOCATION APPEARS ON MAP / LATEST POSITION
  ↓
LOCATION HISTORY
  ↓
MARK DEVICE LOST
  ↓
STATUS HISTORY
  ↓
DASHBOARD UPDATE
  ↓
LOGOUT
"""

import uuid
from starlette.testclient import TestClient

from app.main import app
from telemetry_agent.gps_adapter import ManualInputAdapter

client = TestClient(app)


def test_full_trace_x_user_journey():
    # 1. REGISTER
    user_email = f"journey_{uuid.uuid4().hex[:8]}@tracex.internal"
    user_password = "SecurePassword2026!"
    user_name = "Chief Security Officer"

    reg_resp = client.post(
        "/auth/register",
        json={"name": user_name, "email": user_email, "password": user_password},
    )
    assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
    user_data = reg_resp.json()
    user_id = user_data["id"]
    assert user_data["name"] == user_name
    assert user_data["email"] == user_email

    # 2. LOGIN
    login_resp = client.post(
        "/auth/login",
        json={"email": user_email, "password": user_password},
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token_data = login_resp.json()
    auth_token = token_data["access_token"]
    assert auth_token is not None
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Verify session profile
    profile_resp = client.get("/users/me", headers=headers)
    assert profile_resp.status_code == 200
    assert profile_resp.json()["id"] == user_id

    # 3. ADD DEVICE
    device_identifier = f"TRACEX-FIELD-{uuid.uuid4().hex[:6].upper()}"
    device_name = "Primary Security Smartphone"
    create_device_resp = client.post(
        "/devices",
        headers=headers,
        json={
            "device_name": device_name,
            "device_identifier": device_identifier,
            "user_id": user_id,
        },
    )
    assert create_device_resp.status_code == 200, f"Add device failed: {create_device_resp.text}"
    device = create_device_resp.json()
    device_id = device["id"]

    # 4. DEVICE ACTIVE
    assert device["status"] == "active"
    devices_list = client.get("/devices", headers=headers).json()
    assert any(d["id"] == device_id and d["status"] == "active" for d in devices_list)

    # 5. GPS TELEMETRY
    # Acquire genuine fix from GPS hardware/instrument adapter
    adapter = ManualInputAdapter(latitude=18.520430, longitude=73.856744, accuracy=3.5)
    fix1 = adapter.get_fix()
    assert fix1 is not None
    fix1.validate()

    # Ingest fix into TRACE-X
    telemetry_resp1 = client.post(
        "/locations",
        headers=headers,
        json={
            "device_id": device_id,
            "latitude": fix1.latitude,
            "longitude": fix1.longitude,
            "accuracy": fix1.accuracy,
        },
    )
    assert telemetry_resp1.status_code == 200, f"Telemetry ingestion failed: {telemetry_resp1.text}"

    # 6. LOCATION STORED
    loc_record1 = telemetry_resp1.json()
    assert loc_record1["device_id"] == device_id
    assert abs(loc_record1["latitude"] - 18.520430) < 1e-4

    # 7. LOCATION APPEARS ON MAP / LATEST POSITION
    latest_loc_resp = client.get(f"/devices/{device_id}/latest-location", headers=headers)
    assert latest_loc_resp.status_code == 200
    latest_loc = latest_loc_resp.json()
    assert abs(latest_loc["latitude"] - 18.520430) < 1e-4
    assert abs(latest_loc["longitude"] - 73.856744) < 1e-4

    # 8. LOCATION HISTORY (BREADCRUMB TRAIL)
    # Transmit second GPS fix
    adapter2 = ManualInputAdapter(latitude=18.521800, longitude=73.858200, accuracy=2.8)
    fix2 = adapter2.get_fix()
    client.post(
        "/locations",
        headers=headers,
        json={
            "device_id": device_id,
            "latitude": fix2.latitude,
            "longitude": fix2.longitude,
            "accuracy": fix2.accuracy,
        },
    )

    history_loc_resp = client.get(f"/devices/{device_id}/locations", headers=headers)
    assert history_loc_resp.status_code == 200
    all_locs = history_loc_resp.json()
    assert len(all_locs) == 2
    # Verify latest fix is at the head of the list
    assert abs(all_locs[0]["latitude"] - 18.521800) < 1e-4

    # 9. MARK DEVICE LOST
    lost_resp = client.patch(
        f"/devices/{device_id}/status",
        headers=headers,
        json={"status": "lost"},
    )
    assert lost_resp.status_code == 200
    assert lost_resp.json()["old_status"] == "active"
    assert lost_resp.json()["new_status"] == "lost"

    # 10. STATUS HISTORY
    status_history_resp = client.get(f"/devices/{device_id}/status-history", headers=headers)
    assert status_history_resp.status_code == 200
    status_history = status_history_resp.json()
    assert len(status_history) >= 1
    assert status_history[0]["old_status"] == "active"
    assert status_history[0]["new_status"] == "lost"

    # Verify telemetry continues while device is in LOST status
    adapter_lost = ManualInputAdapter(latitude=18.523000, longitude=73.859500, accuracy=4.0)
    fix_lost = adapter_lost.get_fix()
    lost_telemetry_resp = client.post(
        "/locations",
        headers=headers,
        json={
            "device_id": device_id,
            "latitude": fix_lost.latitude,
            "longitude": fix_lost.longitude,
            "accuracy": fix_lost.accuracy,
        },
    )
    assert lost_telemetry_resp.status_code == 200, "Lost device must continue tracking!"

    # 11. DASHBOARD UPDATE
    summary_resp = client.get("/dashboard/summary", headers=headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["lost_devices"] == 1
    assert summary["active_devices"] == 0

    recent_activity_resp = client.get("/dashboard/recent-activity", headers=headers)
    assert recent_activity_resp.status_code == 200
    assert any(a["device_id"] == device_id and a["new_status"] == "lost" for a in recent_activity_resp.json())

    # 12. LOGOUT (Simulate client-side token discard)
    headers_logged_out = {}
    unauth_resp = client.get("/auth/me", headers=headers_logged_out)
    assert unauth_resp.status_code == 401, "Unauthenticated request after logout must be rejected with 401"
