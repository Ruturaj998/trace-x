from starlette.testclient import TestClient

from app.main import app
from app.database.connection import SessionLocal
from app.models.device import Device
from app.services.auth import create_access_token

client = TestClient(app)


def test_device_15_telemetry_and_visibility():
    db = SessionLocal()
    dev15 = db.query(Device).filter(Device.id == 15).first()
    assert dev15 is not None, "Device 15 must exist in the database!"
    assert dev15.device_name == "Ruturaj Test Phone"
    assert dev15.device_identifier == "TRACEX-TEST-001"
    user_id = dev15.user_id
    db.close()

    # Generate valid bearer token for device 15's owner (user 5)
    token = create_access_token(user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Verify device 15 is listed in user's devices
    devices = client.get("/devices", headers=headers).json()
    assert any(d["id"] == 15 and d["device_identifier"] == "TRACEX-TEST-001" for d in devices)

    # Ingest real GPS coordinate fix for Device 15
    fix_payload = {
        "device_id": 15,
        "latitude": 18.520430,
        "longitude": 73.856744,
        "accuracy": 4.5,
    }
    ingest_resp = client.post("/locations", headers=headers, json=fix_payload)
    assert ingest_resp.status_code == 200, ingest_resp.text
    ingest_data = ingest_resp.json()
    assert ingest_data["device_id"] == 15
    assert abs(ingest_data["latitude"] - 18.520430) < 1e-4

    # Verify latest location for Device 15
    latest_resp = client.get("/devices/15/latest-location", headers=headers)
    assert latest_resp.status_code == 200
    assert abs(latest_resp.json()["latitude"] - 18.520430) < 1e-4

    # Verify locations list for Device 15
    locs_resp = client.get("/devices/15/locations", headers=headers)
    assert locs_resp.status_code == 200
    all_locs = locs_resp.json()
    assert len(all_locs) >= 1
    assert all_locs[0]["device_id"] == 15

    # Verify dashboard latest location endpoint
    dash_latest = client.get("/dashboard/latest-location", headers=headers)
    assert dash_latest.status_code == 200
    assert dash_latest.json()["device_id"] == 15
    assert dash_latest.json()["device_name"] == "Ruturaj Test Phone"
