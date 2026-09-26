from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class LocationCreate(BaseModel):
    device_id: int
    latitude: float = Field(ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    accuracy: float | None = Field(default=None, ge=0.0, description="Estimated accuracy in meters (>= 0)")


class LocationResponse(BaseModel):
    id: int
    device_id: int
    latitude: float
    longitude: float
    accuracy: float | None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)