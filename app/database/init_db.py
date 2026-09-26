from app.database.base import Base
from app.database.connection import engine

from app.models.user import User
from app.models.device import Device
from app.models.location import Location
from app.models.device_status_history import DeviceStatusHistory


Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")