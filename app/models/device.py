from typing import TYPE_CHECKING

from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.location import Location
    from app.models.device_status_history import DeviceStatusHistory


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    device_name: Mapped[str] = mapped_column(
        String(100)
    )

    device_identifier: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="active"
    )

    user: Mapped["User"] = relationship(
        back_populates="devices"
    )

    locations: Mapped[list["Location"]] = relationship(
        "Location",
        back_populates="device",
        cascade="all, delete-orphan"
    )

    status_history: Mapped[list["DeviceStatusHistory"]] = relationship(
        "DeviceStatusHistory",
        back_populates="device",
        cascade="all, delete-orphan"
    )