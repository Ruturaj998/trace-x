from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.database.auth_dependencies import get_current_user
from app.models.device import Device
from app.models.device_status_history import DeviceStatusHistory
from app.models.user import User

router = APIRouter()


@router.get("/devices/{device_id}/status-history")
def get_device_status_history(
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

    history = (
        db.query(DeviceStatusHistory)
        .filter(DeviceStatusHistory.device_id == device_id)
        .order_by(DeviceStatusHistory.changed_at.desc())
        .all()
    )

    return history