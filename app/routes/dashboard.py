from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.dependencies import get_db
from app.database.auth_dependencies import get_current_user
from app.models.user import User
from app.models.device import Device
from app.models.location import Location
from app.models.device_status_history import DeviceStatusHistory

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    devices = (
        db.query(Device)
        .filter(Device.user_id == current_user.id)
        .all()
    )

    total_devices = len(devices)
    active_devices = sum(1 for d in devices if d.status == "active")
    lost_devices = sum(1 for d in devices if d.status == "lost")
    disabled_devices = sum(1 for d in devices if d.status == "disabled")

    online_devices = sum(1 for d in devices if d.connectivity_status == "ONLINE")
    offline_devices = sum(1 for d in devices if d.connectivity_status == "OFFLINE")
    never_connected_devices = sum(1 for d in devices if d.connectivity_status == "NEVER_CONNECTED")

    return {
        "total_devices": total_devices,
        "active_devices": active_devices,
        "lost_devices": lost_devices,
        "disabled_devices": disabled_devices,
        "online_devices": online_devices,
        "offline_devices": offline_devices,
        "never_connected_devices": never_connected_devices,
    }
@router.get("/latest-location")
def get_dashboard_latest_location(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = (
        db.query(Location, Device)
        .join(Device, Location.device_id == Device.id)
        .filter(Device.user_id == current_user.id)
        .order_by(Location.timestamp.desc())
        .first()
    )

    if not result:
        user_has_devices = (
            db.query(Device.id)
            .filter(Device.user_id == current_user.id)
            .first()
        )
        if not user_has_devices:
            return {
                "device_id": None,
                "message": "No device found"
            }
        return {
            "device_id": None,
            "message": "No location data found"
        }

    location, device = result

    return {
        "device_id": device.id,
        "device_name": device.device_name,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "accuracy": location.accuracy,
        "timestamp": location.timestamp
    }
@router.get("/recent-activity")
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device_ids = (
        db.query(Device.id)
        .filter(Device.user_id == current_user.id)
        .all()
    )

    device_ids = [device_id for (device_id,) in device_ids]

    if not device_ids:
        return []

    history = (
        db.query(DeviceStatusHistory)
        .filter(DeviceStatusHistory.device_id.in_(device_ids))
        .order_by(DeviceStatusHistory.changed_at.desc())
        .limit(10)
        .all()
    )

    return history
@router.get("/devices")
def get_dashboard_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    devices = (
        db.query(Device)
        .filter(Device.user_id == current_user.id)
        .all()
    )

    return [
        {
            "id": device.id,
            "device_name": device.device_name,
            "device_identifier": device.device_identifier,
            "status": device.status,
            "connectivity_status": device.connectivity_status,
            "last_seen": device.last_seen,
            "has_token": device.has_token,
            "token_prefix": device.token_prefix,
        }
        for device in devices
    ]