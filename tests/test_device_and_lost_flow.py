import uuid
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def get_authenticated_user():
    email = f"dev_user_{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post("/auth/register", json={"name": "Device Tester", "email": email, "password": "password123"})
    user_id = reg.json()["id"]
    login = client.post("/auth/login", json={"email": email, "password": "password123"})
    token = login.json()["access_token"]
    return {"id": user_id, "email": email, "token": token}


def test_device_lifecycle_and_lost_flow():
    user = get_authenticated_user()
    headers = {"Authorization": f"Bearer {user['token']}"}

    # 1. Add Device
    identifier = f"DEV-{uuid.uuid4().hex[:6].upper()}"
    add_resp = client.post(
        "/devices",
        headers=headers,
        json={"device_name": "Field Asset 1", "device_identifier": identifier, "user_id": user["id"]},
    )
    assert add_resp.status_code == 200, add_resp.text
    device = add_resp.json()
    device_id = device["id"]
    assert device["status"] == "active"
    assert device["device_name"] == "Field Asset 1"

    # 2. Duplicate device identifier rejected
    dup_resp = client.post(
        "/devices",
        headers=headers,
        json={"device_name": "Field Asset 2", "device_identifier": identifier, "user_id": user["id"]},
    )
    assert dup_resp.status_code == 400
    assert "already registered" in dup_resp.json()["detail"]

    # 3. Check Dashboard Summary initially
    dash_summary = client.get("/dashboard/summary", headers=headers).json()
    assert dash_summary["total_devices"] >= 1
    assert dash_summary["active_devices"] >= 1
    assert dash_summary["lost_devices"] == 0

    # 4. Mark Device as LOST
    lost_resp = client.patch(
        f"/devices/{device_id}/status",
        headers=headers,
        json={"status": "lost"},
    )
    assert lost_resp.status_code == 200
    assert lost_resp.json()["old_status"] == "active"
    assert lost_resp.json()["new_status"] == "lost"

    # 5. Verify Status History is recorded
    history_resp = client.get(f"/devices/{device_id}/status-history", headers=headers)
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert len(history) >= 1
    latest_hist = history[0]
    assert latest_hist["old_status"] == "active"
    assert latest_hist["new_status"] == "lost"

    # 6. Verify Dashboard updates: lost_devices increments
    new_dash = client.get("/dashboard/summary", headers=headers).json()
    assert new_dash["lost_devices"] == 1
    assert new_dash["active_devices"] == 0

    # 7. Check recent activity feed
    activity = client.get("/dashboard/recent-activity", headers=headers).json()
    assert len(activity) >= 1
    assert activity[0]["new_status"] == "lost"

    # 8. Mark Device as DISABLED
    disable_resp = client.patch(
        f"/devices/{device_id}/status",
        headers=headers,
        json={"status": "disabled"},
    )
    assert disable_resp.status_code == 200
    assert disable_resp.json()["new_status"] == "disabled"

    # 9. Reactivate Device
    active_resp = client.patch(
        f"/devices/{device_id}/status",
        headers=headers,
        json={"status": "active"},
    )
    assert active_resp.status_code == 200
    assert active_resp.json()["new_status"] == "active"


def test_unauthorized_device_isolation():
    # User A creates a device
    user_a = get_authenticated_user()
    headers_a = {"Authorization": f"Bearer {user_a['token']}"}
    dev_resp = client.post(
        "/devices",
        headers=headers_a,
        json={"device_name": "Private Device", "device_identifier": f"SEC-{uuid.uuid4().hex[:6]}", "user_id": user_a["id"]},
    )
    device_id = dev_resp.json()["id"]

    # User B attempts to access, modify, or delete User A's device
    user_b = get_authenticated_user()
    headers_b = {"Authorization": f"Bearer {user_b['token']}"}

    # Cannot get device
    get_resp = client.get(f"/devices/{device_id}", headers=headers_b)
    assert get_resp.status_code == 404

    # Cannot update status
    patch_resp = client.patch(f"/devices/{device_id}/status", headers=headers_b, json={"status": "lost"})
    assert patch_resp.status_code == 404

    # Cannot get status history
    hist_resp = client.get(f"/devices/{device_id}/status-history", headers=headers_b)
    assert hist_resp.status_code == 404

    # Cannot delete device
    del_resp = client.delete(f"/devices/{device_id}", headers=headers_b)
    assert del_resp.status_code == 404

    # User B cannot create device pretending to be User A
    spoof_resp = client.post(
        "/devices",
        headers=headers_b,
        json={"device_name": "Spoof", "device_identifier": f"SPF-{uuid.uuid4().hex[:6]}", "user_id": user_a["id"]},
    )
    assert spoof_resp.status_code == 403
