from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.device import Device


class DeviceStatusHistory(Base):
    __tablename__ = "device_status_history"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    device_id: Mapped[int] = mapped_column(
        ForeignKey("devices.id"),
        index=True
    )

    old_status: Mapped[str] = mapped_column(
        String(20)
    )

    new_status: Mapped[str] = mapped_column(
        String(20)
    )

    changed_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    device: Mapped["Device"] = relationship(
        back_populates="status_history"
    )