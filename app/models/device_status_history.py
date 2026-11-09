from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.database.types import UTCDateTime

if TYPE_CHECKING:
    from app.models.device import Device


class DeviceStatusHistory(Base):
    __tablename__ = "device_status_history"
    __table_args__ = (
        Index("idx_status_history_device_changed", "device_id", "changed_at"),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    device_id: Mapped[int] = mapped_column(
        ForeignKey("devices.id", ondelete="CASCADE"),
        index=True,
    )

    old_status: Mapped[str] = mapped_column(
        String(20),
    )

    new_status: Mapped[str] = mapped_column(
        String(20),
    )

    changed_at: Mapped[datetime] = mapped_column(
        UTCDateTime,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    device: Mapped["Device"] = relationship(
        back_populates="status_history",
    )
