from pydantic import BaseModel

class DeviceCreate(BaseModel):
    device_name: str
    device_identifier: str
    user_id: int
