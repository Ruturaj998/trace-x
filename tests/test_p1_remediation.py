import uuid
from datetime import datetime
from unittest.mock import patch
from starlette.testclient import TestClient
from sqlalchemy import text

from app.main import app
from app.database.connection import SessionLocal, engine
from app.models.device import Device
from app.models.location import Location
from app.models.device_status_history import DeviceStatusHistory
from app.database.migrations.run_migrations import (
    discover_migrations,
    clean_sql,
    ensure_migrations_table,
    get_applied_migrations,
)

client = TestClient(app)


def create_user_and_token():
    email = f"p1_tester_{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/auth/register",
        json={"name": "P1 Tester", "email": email, "password": "password123"},
    )
    assert reg.status_code == 200
    user_id = reg.json()["id"]

    login = client.post(
        "/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"id": user_id, "email": email, "token": token}


# ==============================================================================
# 1. Health Check Endpoint Tests
# ==============================================================================


def test_health_check_healthy():
    """Verify public unauthenticated /health returns 200 with zero credential leakage."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["api"] == "online"
    assert data["database"] == "connected"
    assert response.headers.get("Cache-Control") == "no-cache, no-store, must-revalidate"
    # Ensure no connection string or internal trace is exposed
    assert "password" not in response.text
    assert "postgresql" not in response.text
    assert "sqlite" not in response.text


def test_health_check_database_disconnected():
    """Verify /health returns 503 degraded when DB connection fails with zero leak."""
    with patch("sqlalchemy.orm.Session.execute", side_effect=Exception("Connection refused to db")):
        response = client.get("/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "degraded"
        assert data["api"] == "online"
        assert data["database"] == "disconnected"
        assert "Connection refused" not in response.text


# ==============================================================================
# 2. Database Foreign Key Cascades & Deletion Tests
# ==============================================================================


def test_cascade_deletion_via_api():
    """Verify deleting a device cleans up all associated locations & status history."""
    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    # Create device
    identifier = f"DEV-P1-{uuid.uuid4().hex[:6].upper()}"
    dev_resp = client.post(
        "/devices",
        headers=headers,
        json={"device_name": "Telemetry Probe", "device_identifier": identifier, "user_id": user["id"]},
    )
    assert dev_resp.status_code == 200
    device_id = dev_resp.json()["id"]

    # Ingest multiple locations
    for lat, lon in [(37.7749, -122.4194), (37.7750, -122.4195), (37.7751, -122.4196)]:
        loc_resp = client.post(
            "/locations",
            headers=headers,
            json={"device_id": device_id, "latitude": lat, "longitude": lon, "accuracy": 5.0},
        )
        assert loc_resp.status_code == 200

    # Create status history transitions
    patch_resp = client.patch(
        f"/devices/{device_id}/status",
        headers=headers,
        json={"status": "lost"},
    )
    assert patch_resp.status_code == 200

    patch_resp2 = client.patch(
        f"/devices/{device_id}/status",
        headers=headers,
        json={"status": "active"},
    )
    assert patch_resp2.status_code == 200

    # Verify rows exist in database
    db = SessionLocal()
    try:
        assert db.query(Location).filter(Location.device_id == device_id).count() == 3
        assert db.query(DeviceStatusHistory).filter(DeviceStatusHistory.device_id == device_id).count() == 2

        # Delete device via API
        del_resp = client.delete(f"/devices/{device_id}", headers=headers)
        assert del_resp.status_code == 200
        assert del_resp.json()["message"] == "Device deleted successfully"

        # Verify device is gone
        assert db.query(Device).filter(Device.id == device_id).count() == 0

        # Verify cascades: child locations and status history must be 0
        loc_count = db.query(Location).filter(Location.device_id == device_id).count()
        hist_count = db.query(DeviceStatusHistory).filter(DeviceStatusHistory.device_id == device_id).count()
        assert loc_count == 0, f"Expected 0 orphaned locations, found {loc_count}"
        assert hist_count == 0, f"Expected 0 orphaned status history records, found {hist_count}"
    finally:
        db.close()


def test_database_level_foreign_key_cascade():
    """Verify raw SQL DELETE on devices table triggers database-level ON DELETE CASCADE."""
    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    identifier = f"DEV-RAW-{uuid.uuid4().hex[:6].upper()}"
    dev_resp = client.post(
        "/devices",
        headers=headers,
        json={"device_name": "Raw Cascade Device", "device_identifier": identifier, "user_id": user["id"]},
    )
    device_id = dev_resp.json()["id"]

    client.post(
        "/locations",
        headers=headers,
        json={"device_id": device_id, "latitude": 40.7128, "longitude": -74.0060, "accuracy": 10.0},
    )
    client.patch(
        f"/devices/{device_id}/status",
        headers=headers,
        json={"status": "lost"},
    )

    db = SessionLocal()
    try:
        assert db.query(Location).filter(Location.device_id == device_id).count() == 1
        assert db.query(DeviceStatusHistory).filter(DeviceStatusHistory.device_id == device_id).count() == 1

        # Direct SQL delete bypassing ORM session.delete()
        db.execute(text("DELETE FROM devices WHERE id = :did"), {"did": device_id})
        db.commit()

        # Check cascading cleanup at database layer
        assert db.query(Location).filter(Location.device_id == device_id).count() == 0
        assert db.query(DeviceStatusHistory).filter(DeviceStatusHistory.device_id == device_id).count() == 0
    finally:
        db.close()


# ==============================================================================
# 3. Timezone-Aware Timestamps Tests
# ==============================================================================


def test_timezone_aware_location_timestamps():
    """Verify location timestamps are ISO 8601 with timezone and sort descending."""
    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    identifier = f"DEV-TZ-{uuid.uuid4().hex[:6].upper()}"
    dev_resp = client.post(
        "/devices",
        headers=headers,
        json={"device_name": "TZ Device", "device_identifier": identifier, "user_id": user["id"]},
    )
    device_id = dev_resp.json()["id"]

    # Ingest two fixes
    resp1 = client.post(
        "/locations",
        headers=headers,
        json={"device_id": device_id, "latitude": 51.5074, "longitude": -0.1278, "accuracy": 2.0},
    )
    assert resp1.status_code == 200
    ts1_str = resp1.json()["timestamp"]

    # Parse ISO 8601 string
    dt1 = datetime.fromisoformat(ts1_str)
    # Ensure tzinfo is present (or parsed as aware/UTC)
    assert dt1.tzinfo is not None or ts1_str.endswith("Z") or "+" in ts1_str

    resp2 = client.post(
        "/locations",
        headers=headers,
        json={"device_id": device_id, "latitude": 51.5075, "longitude": -0.1279, "accuracy": 3.0},
    )
    assert resp2.status_code == 200
    ts2_str = resp2.json()["timestamp"]

    # Fetch history
    hist_resp = client.get(f"/devices/{device_id}/locations", headers=headers)
    assert hist_resp.status_code == 200
    locations = hist_resp.json()
    assert len(locations) == 2

    # Verify descending sort order
    t_first = datetime.fromisoformat(locations[0]["timestamp"])
    t_second = datetime.fromisoformat(locations[1]["timestamp"])
    assert t_first >= t_second


def test_timezone_aware_status_history():
    """Verify status history changed_at is timezone-aware."""
    user = create_user_and_token()
    headers = {"Authorization": f"Bearer {user['token']}"}

    identifier = f"DEV-STATUS-{uuid.uuid4().hex[:6].upper()}"
    dev = client.post(
        "/devices",
        headers=headers,
        json={"device_name": "Status TZ", "device_identifier": identifier, "user_id": user["id"]},
    ).json()

    client.patch(f"/devices/{dev['id']}/status", headers=headers, json={"status": "lost"})

    hist_resp = client.get(f"/devices/{dev['id']}/status-history", headers=headers)
    assert hist_resp.status_code == 200
    entries = hist_resp.json()
    assert len(entries) >= 1

    changed_at_str = entries[0]["changed_at"]
    parsed_dt = datetime.fromisoformat(changed_at_str)
    assert parsed_dt.tzinfo is not None or changed_at_str.endswith("Z") or "+" in changed_at_str


# ==============================================================================
# 4. Migration Runner Tests
# ==============================================================================


def test_migration_discovery_and_sql_cleaning():
    """Verify migration auto-discovery finds migrations in numerical order."""
    migrations = discover_migrations()
    assert len(migrations) >= 2

    versions = [m[1] for m in migrations]
    assert "001_add_indexes" in versions
    assert "002_foreign_key_cascades_and_timezones" in versions

    # Numerical ordering check
    nums = [m[0] for m in migrations]
    assert nums == sorted(nums)

    # Clean SQL statements check
    raw_sql = "-- comment\nSELECT 1;\n\n-- another comment\nSELECT 2;\n"
    statements = clean_sql(raw_sql)
    assert statements == ["SELECT 1", "SELECT 2"]


def test_migration_tracking_table():
    """Verify schema_migrations table tracks applied migrations properly."""
    with engine.begin() as conn:
        ensure_migrations_table(conn)
        applied = get_applied_migrations(conn)
        assert isinstance(applied, dict)
