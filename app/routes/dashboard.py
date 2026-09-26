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
    total_devices = (
        db.query(func.count(Device.id))
        .filter(Device.user_id == current_user.id)
        .scalar()
    )

    active_devices = (
        db.query(func.count(Device.id))
        .filter(
            Device.user_id == current_user.id,
            Device.status == "active"
        )
        .scalar()
    )

    lost_devices = (
        db.query(func.count(Device.id))
        .filter(
            Device.user_id == current_user.id,
            Device.status == "lost"
        )
        .scalar()
    )

    disabled_devices = (
        db.query(func.count(Device.id))
        .filter(
            Device.user_id == current_user.id,
            Device.status == "disabled"
        )
        .scalar()
    )

    return {
        "total_devices": total_devices,
        "active_devices": active_devices,
        "lost_devices": lost_devices,
        "disabled_devices": disabled_devices
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
            "status": device.status
        }
        for device in devices
    ]