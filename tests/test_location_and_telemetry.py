import uuid
from starlette.testclient import TestClient

from app.main import app
from telemetry_agent.gps_adapter import GPSFix

client = TestClient(app)


def get_user_and_device():
    email = f"loc_user_{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post("/auth/register", json={"name": "Loc Tester", "email": email, "password": "password123"})
    user_id = reg.json()["id"]
    login = client.post("/auth/login", json={"email": email, "password": "password123"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    dev_resp = client.post(
        "/devices",
        headers=headers,
        json={"device_name": "Telemetry Unit", "device_identifier": f"LOC-{uuid.uuid4().hex[:6]}", "user_id": user_id},
    )
    device_id = dev_resp.json()["id"]

    return {"user_id": user_id, "token": token, "headers": headers, "device_id": device_id}


def test_location_ingestion_and_history():
    ctx = get_user_and_device()
    headers = ctx["headers"]
    device_id = ctx["device_id"]

    # 1. Ingest initial coordinate fix
    fix1 = {"device_id": device_id, "latitude": 18.520430, "longitude": 73.856744, "accuracy": 5.2}
    resp1 = client.post("/locations", headers=headers, json=fix1)
    assert resp1.status_code == 200, resp1.text
    data1 = resp1.json()
    assert data1["device_id"] == device_id
    assert abs(data1["latitude"] - 18.520430) < 1e-4
    assert abs(data1["longitude"] - 73.856744) < 1e-4

    # 2. Ingest second coordinate fix (breadcrumb)
    fix2 = {"device_id": device_id, "latitude": 18.521500, "longitude": 73.857900, "accuracy": 4.1}
    resp2 = client.post("/locations", headers=headers, json=fix2)
    assert resp2.status_code == 200

    # 3. Retrieve device locations history
    locs_resp = client.get(f"/devices/{device_id}/locations", headers=headers)
    assert locs_resp.status_code == 200
    locations = locs_resp.json()
    assert len(locations) == 2
    # Verify latest is first
    assert abs(locations[0]["latitude"] - 18.521500) < 1e-4

    # 4. Retrieve latest location endpoint
    latest_resp = client.get(f"/devices/{device_id}/latest-location", headers=headers)
    assert latest_resp.status_code == 200
    latest = latest_resp.json()
    assert abs(latest["latitude"] - 18.521500) < 1e-4

    # 5. Retrieve dashboard latest location
    dash_latest = client.get("/dashboard/latest-location", headers=headers)
    assert dash_latest.status_code == 200
    assert dash_latest.json()["device_id"] == device_id


def test_tracking_continues_for_lost_device():
    ctx = get_user_and_device()
    headers = ctx["headers"]
    device_id = ctx["device_id"]

    # Mark device as lost
    client.patch(f"/devices/{device_id}/status", headers=headers, json={"status": "lost"})

    # Ingest GPS fix while device is in LOST state
    lost_fix = {"device_id": device_id, "latitude": 18.530000, "longitude": 73.860000, "accuracy": 8.0}
    lost_resp = client.post("/locations", headers=headers, json=lost_fix)
    assert lost_resp.status_code == 200, "Location tracking must continue for lost devices!"

    # Verify latest location reflects the newly ingested fix
    latest_resp = client.get(f"/devices/{device_id}/latest-location", headers=headers)
    assert latest_resp.status_code == 200
    assert abs(latest_resp.json()["latitude"] - 18.530000) < 1e-4


def test_invalid_coordinates_rejection():
    ctx = get_user_and_device()
    headers = ctx["headers"]
    device_id = ctx["device_id"]

    # Latitude > 90
    bad_lat = client.post("/locations", headers=headers, json={"device_id": device_id, "latitude": 95.0, "longitude": 50.0})
    assert bad_lat.status_code == 422

    # Latitude < -90
    bad_lat2 = client.post("/locations", headers=headers, json={"device_id": device_id, "latitude": -95.0, "longitude": 50.0})
    assert bad_lat2.status_code == 422

    # Longitude > 180
    bad_lon = client.post("/locations", headers=headers, json={"device_id": device_id, "latitude": 20.0, "longitude": 185.0})
    assert bad_lon.status_code == 422

    # Accuracy negative
    bad_acc = client.post("/locations", headers=headers, json={"device_id": device_id, "latitude": 20.0, "longitude": 50.0, "accuracy": -5.0})
    assert bad_acc.status_code == 422


def test_unauthorized_location_isolation():
    user_a = get_user_and_device()
    user_b_email = f"intruder_{uuid.uuid4().hex[:6]}@example.com"
    client.post("/auth/register", json={"name": "Intruder", "email": user_b_email, "password": "password123"})
    b_login = client.post("/auth/login", json={"email": user_b_email, "password": "password123"})
    headers_b = {"Authorization": f"Bearer {b_login.json()['access_token']}"}

    # User B tries to post location for User A's device
    spoof_loc = client.post(
        "/locations",
        headers=headers_b,
        json={"device_id": user_a["device_id"], "latitude": 10.0, "longitude": 10.0},
    )
    assert spoof_loc.status_code == 404

    # User B tries to read locations of User A's device
    spy_locs = client.get(f"/devices/{user_a['device_id']}/locations", headers=headers_b)
    assert spy_locs.status_code == 404

    spy_latest = client.get(f"/devices/{user_a['device_id']}/latest-location", headers=headers_b)
    assert spy_latest.status_code == 404


def test_gps_fix_validation_model():
    # Valid fix
    good_fix = GPSFix(latitude=18.5204, longitude=73.8567, accuracy=5.0)
    good_fix.validate()

    # Out of range latitude
    import pytest
    with pytest.raises(ValueError):
        GPSFix(latitude=100.0, longitude=50.0).validate()

    # Out of range longitude
    with pytest.raises(ValueError):
        GPSFix(latitude=20.0, longitude=200.0).validate()

    # Negative accuracy
    with pytest.raises(ValueError):
        GPSFix(latitude=20.0, longitude=50.0, accuracy=-1.0).validate()
