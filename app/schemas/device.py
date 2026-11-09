from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DeviceCreate(BaseModel):
    device_name: str
    device_identifier: str
    user_id: int


class DeviceUpdate(BaseModel):
    device_name: str


class DeviceStatusUpdate(BaseModel):
    status: str


class DeviceResponse(BaseModel):
    id: int
    device_name: str
    device_identifier: str
    user_id: int
    status: str
    connectivity_status: str = "NEVER_CONNECTED"
    last_seen: datetime | None = None
    has_token: bool = False
    token_prefix: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DeviceTokenResponse(BaseModel):
    device_id: int
    device_token: str
    token_prefix: str
    message: str = "Save this device token now; it will not be displayed again."
