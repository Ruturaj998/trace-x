from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.database.auth_dependencies import get_current_user
from app.models.device import Device
from app.models.user import User
from app.models.device_status_history import DeviceStatusHistory
from app.schemas.device import (
    DeviceCreate,
    DeviceUpdate,
    DeviceStatusUpdate,
    DeviceResponse,
    DeviceTokenResponse,
)
from app.services.device_auth import generate_device_token

router = APIRouter()


@router.post("/devices", response_model=DeviceResponse)
def create_device(
    device: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if device.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only create a device for yourself"
        )

    existing_device = (
        db.query(Device)
        .filter(Device.device_identifier == device.device_identifier)
        .first()
    )

    if existing_device:
        raise HTTPException(
            status_code=400,
            detail="Device already registered"
        )

    new_device = Device(
        device_name=device.device_name,
        device_identifier=device.device_identifier,
        user_id=current_user.id
    )

    db.add(new_device)
    db.commit()
    db.refresh(new_device)

    return new_device


@router.get("/devices", response_model=list[DeviceResponse])
def get_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Device).filter(Device.user_id == current_user.id).all()


@router.get("/users/{user_id}/devices", response_model=list[DeviceResponse])
def get_user_devices(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own devices"
        )

    return (
        db.query(Device)
        .filter(Device.user_id == current_user.id)
        .all()
    )


@router.get("/devices/{device_id}", response_model=DeviceResponse)
def get_device(
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

    return device


@router.put("/devices/{device_id}", response_model=DeviceResponse)
def update_device(
    device_id: int,
    device_data: DeviceUpdate,
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

    device.device_name = device_data.device_name

    db.commit()
    db.refresh(device)

    return device


@router.patch("/devices/{device_id}/status")
def update_device_status(
    device_id: int,
    status_data: DeviceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed_statuses = ["active", "lost", "disabled"]

    if status_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use active, lost, or disabled."
        )

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

    old_status = device.status
    new_status = status_data.status

    if old_status == new_status:
        return {
            "message": "Device status is already set to this status",
            "device_id": device.id,
            "status": device.status
        }

    device.status = new_status

    history = DeviceStatusHistory(
        device_id=device.id,
        old_status=old_status,
        new_status=new_status
    )

    db.add(history)
    db.commit()
    db.refresh(device)

    return {
        "message": "Device status updated successfully",
        "device_id": device.id,
        "old_status": old_status,
        "new_status": new_status
    }


@router.post("/devices/{device_id}/token", response_model=DeviceTokenResponse)
def generate_or_rotate_device_token(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate or rotate cryptographic telemetry credentials for an authorized edge device.
    Only the device owner can request credential generation. Plaintext is returned only once.
    """
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

    raw_token, prefix, token_hash = generate_device_token()
    device.device_token_hash = token_hash
    device.device_token_prefix = prefix

    db.commit()

    return DeviceTokenResponse(
        device_id=device.id,
        device_token=raw_token,
        token_prefix=prefix,
        message="Save this device credential securely. It will never be shown again.",
    )


@router.delete("/devices/{device_id}/token")
def revoke_device_token(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoke telemetry credentials for a device immediately."""
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

    device.device_token_hash = None
    device.device_token_prefix = None
    db.commit()

    return {
        "message": "Device credentials revoked successfully",
        "device_id": device.id,
    }


@router.delete("/devices/{device_id}")
def delete_device(
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

    db.delete(device)
    db.commit()

    return {
        "message": "Device deleted successfully"
    }
