from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.database.auth_dependencies import (
    get_current_user,
    get_telemetry_caller,
    TelemetryCaller,
)
from app.models.device import Device
from app.models.location import Location
from app.models.user import User
from app.schemas.location import (
    LocationCreate,
    LocationResponse,
    LocationSyncRequest,
    LocationSyncResponse,
)

router = APIRouter()


@router.post("/locations", response_model=LocationResponse)
def create_location(
    location: LocationCreate,
    db: Session = Depends(get_db),
    caller: TelemetryCaller = Depends(get_telemetry_caller),
):
    """Ingest a verified GPS telemetry fix.
    Supports either edge device token (X-Device-Token) or user authentication.
    Updates device last_seen and enforces idempotency deduplication.
    """
    device = caller.resolve_and_authorize_device(location.device_id, db)

    # Idempotency check: return existing if key already stored
    if location.idempotency_key:
        existing = (
            db.query(Location)
            .filter(
                Location.device_id == location.device_id,
                Location.idempotency_key == location.idempotency_key,
            )
            .first()
        )
        if existing:
            return existing

    server_now = datetime.now(timezone.utc)
    new_location = Location(
        device_id=location.device_id,
        latitude=location.latitude,
        longitude=location.longitude,
        accuracy=location.accuracy,
        recorded_at=location.recorded_at,
        idempotency_key=location.idempotency_key,
        timestamp=server_now,
    )

    # Update real-time online status
    device.last_seen = server_now

    db.add(new_location)
    db.commit()
    db.refresh(new_location)

    return new_location


@router.post("/locations/sync", response_model=LocationSyncResponse)
def sync_offline_locations(
    payload: LocationSyncRequest,
    db: Session = Depends(get_db),
    caller: TelemetryCaller = Depends(get_telemetry_caller),
):
    """Store-and-forward batch telemetry synchronization for authorized devices.
    Enforces device authorization, deduplication via idempotency keys, and updates last_seen.
    """
    device = caller.resolve_and_authorize_device(payload.device_id, db)

    synced_count = 0
    duplicates_skipped = 0
    latest_id = None
    server_now = datetime.now(timezone.utc)

    # Deduplicate against database within batch
    keys_in_batch = [f.idempotency_key for f in payload.fixes if f.idempotency_key]
    existing_keys = set()
    if keys_in_batch:
        rows = (
            db.query(Location.idempotency_key)
            .filter(
                Location.device_id == payload.device_id,
                Location.idempotency_key.in_(keys_in_batch),
            )
            .all()
        )
        existing_keys = {r[0] for r in rows}

    for fix in payload.fixes:
        if fix.idempotency_key and fix.idempotency_key in existing_keys:
            duplicates_skipped += 1
            continue

        loc = Location(
            device_id=payload.device_id,
            latitude=fix.latitude,
            longitude=fix.longitude,
            accuracy=fix.accuracy,
            recorded_at=fix.recorded_at,
            idempotency_key=fix.idempotency_key,
            timestamp=server_now,
        )
        db.add(loc)
        synced_count += 1
        if fix.idempotency_key:
            existing_keys.add(fix.idempotency_key)

    if synced_count > 0:
        device.last_seen = server_now
        db.flush()
        latest_loc = (
            db.query(Location.id)
            .filter(Location.device_id == payload.device_id)
            .order_by(Location.id.desc())
            .first()
        )
        if latest_loc:
            latest_id = latest_loc[0]

    db.commit()

    return LocationSyncResponse(
        device_id=payload.device_id,
        synced_count=synced_count,
        duplicates_skipped=duplicates_skipped,
        latest_fix_id=latest_id,
        message=f"Successfully synchronized {synced_count} telemetry fixes ({duplicates_skipped} duplicates skipped)",
    )


@router.get(
    "/devices/{device_id}/locations",
    response_model=list[LocationResponse]
)
def get_device_locations(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = (
        db.query(Device)
        .filter(
            Device.id == device_id,
            Device.user_id == current_user.id
        )
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )

    locations = (
        db.query(Location)
        .filter(Location.device_id == device_id)
        .order_by(Location.timestamp.desc())
        .all()
    )

    return locations


@router.get(
    "/devices/{device_id}/latest-location",
    response_model=LocationResponse
)
def get_latest_location(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = (
        db.query(Device)
        .filter(
            Device.id == device_id,
            Device.user_id == current_user.id
        )
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )

    location = (
        db.query(Location)
        .filter(Location.device_id == device_id)
        .order_by(Location.timestamp.desc())
        .first()
    )

    if not location:
        raise HTTPException(
            status_code=404,
            detail="No location data found for this device"
        )

    return location
