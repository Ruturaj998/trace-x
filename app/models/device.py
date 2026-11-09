import os
from datetime import datetime, timezone, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.database.types import UTCDateTime

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.location import Location
    from app.models.device_status_history import DeviceStatusHistory


class Device(Base):
    __tablename__ = "devices"
    __table_args__ = (
        Index("idx_devices_user_id_status", "user_id", "status"),
    )

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
        ForeignKey("users.id"),
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="active"
    )

    # Device credentials: store only cryptographic hash of token
    device_token_hash: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        index=True,
    )

    device_token_prefix: Mapped[str | None] = mapped_column(
        String(16),
        nullable=True,
    )

    # Real-time connectivity telemetry
    last_seen: Mapped[datetime | None] = mapped_column(
        UTCDateTime,
        nullable=True,
        index=True,
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

    @property
    def has_token(self) -> bool:
        return self.device_token_hash is not None

    @property
    def token_prefix(self) -> str | None:
        return self.device_token_prefix

    @property
    def connectivity_status(self) -> str:
        if self.last_seen is None:
            return "NEVER_CONNECTED"
        threshold_minutes = int(os.getenv("DEVICE_ONLINE_HEARTBEAT_MINUTES", "5"))
        now = datetime.now(timezone.utc)
        ls = self.last_seen
        if ls.tzinfo is None:
            ls = ls.replace(tzinfo=timezone.utc)
        if (now - ls) <= timedelta(minutes=threshold_minutes):
            return "ONLINE"
        return "OFFLINE"
