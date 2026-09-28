from app.database.base import Base
from app.database.connection import engine

from app.models.user import User
from app.models.device import Device
from app.models.location import Location
from app.models.device_status_history import DeviceStatusHistory
from app.models.password_reset_token import PasswordResetToken


Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")