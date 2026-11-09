"""TRACE-X Database Initialization Script
Creates all defined SQLAlchemy models/tables in the configured target database.
"""

from app.database.base import Base
from app.database.connection import engine
import app.models  # noqa: F401 - Register all models with Base.metadata


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")


if __name__ == "__main__":
    init_db()
