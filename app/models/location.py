from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.database.types import UTCDateTime

if TYPE_CHECKING:
    from app.models.device import Device


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (
        Index("idx_locations_device_timestamp", "device_id", "timestamp"),
        Index("idx_locations_idempotency", "device_id", "idempotency_key"),
        Index("idx_locations_recorded_at", "device_id", "recorded_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    device_id: Mapped[int] = mapped_column(
        ForeignKey("devices.id", ondelete="CASCADE"),
        index=True,
    )

    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    accuracy: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # Server reception timestamp
    timestamp: Mapped[datetime] = mapped_column(
        UTCDateTime,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Client/hardware capture timestamp for store-and-forward buffered telemetry
    recorded_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime,
        nullable=True,
        index=True,
    )

    # Idempotency deduplication key
    idempotency_key: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )

    device: Mapped["Device"] = relationship(
        back_populates="locations",
    )
