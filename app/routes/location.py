from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.database.auth_dependencies import get_current_user
from app.models.device import Device
from app.models.location import Location
from app.models.user import User
from app.schemas.location import LocationCreate, LocationResponse

router = APIRouter()


@router.post("/locations", response_model=LocationResponse)
def create_location(
    location: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = (
        db.query(Device)
        .filter(
            Device.id == location.device_id,
            Device.user_id == current_user.id
        )
        .first()
    )

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )

    new_location = Location(
        device_id=location.device_id,
        latitude=location.latitude,
        longitude=location.longitude,
        accuracy=location.accuracy
    )

    db.add(new_location)
    db.commit()
    db.refresh(new_location)

    return new_location


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