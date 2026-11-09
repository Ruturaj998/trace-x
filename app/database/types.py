from datetime import datetime, timezone
from sqlalchemy import DateTime, TypeDecorator


class UTCDateTime(TypeDecorator):
    """SQLAlchemy type that guarantees timezone-aware UTC datetimes across engines.

    - Under PostgreSQL: compiles to TIMESTAMP WITH TIME ZONE.
    - Under SQLite: marks stored naive values with UTC tzinfo on retrieval.
    - Ensures all datetime instances entering and leaving the ORM are UTC timezone-aware.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if not isinstance(value, datetime):
                return value
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            if not isinstance(value, datetime):
                return value
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc)
        return value
