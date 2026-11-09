from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class LocationCreate(BaseModel):
    device_id: int
    latitude: float = Field(ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    accuracy: Optional[float] = Field(default=None, ge=0.0, description="Estimated accuracy in meters (>= 0)")
    recorded_at: Optional[datetime] = Field(default=None, description="Original client capture timestamp")
    idempotency_key: Optional[str] = Field(default=None, max_length=64, description="Unique client fix identifier")


class LocationSyncFix(BaseModel):
    latitude: float = Field(ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    accuracy: Optional[float] = Field(default=None, ge=0.0, description="Estimated accuracy in meters (>= 0)")
    recorded_at: Optional[datetime] = Field(default=None, description="Original client capture timestamp")
    idempotency_key: Optional[str] = Field(default=None, max_length=64, description="Unique client fix identifier")


class LocationSyncRequest(BaseModel):
    device_id: int
    fixes: List[LocationSyncFix] = Field(..., min_length=1, max_length=100, description="Batch of queued fixes (max 100)")


class LocationSyncResponse(BaseModel):
    device_id: int
    synced_count: int
    duplicates_skipped: int
    latest_fix_id: Optional[int] = None
    message: str


class LocationResponse(BaseModel):
    id: int
    device_id: int
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    timestamp: datetime
    recorded_at: Optional[datetime] = None
    idempotency_key: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
