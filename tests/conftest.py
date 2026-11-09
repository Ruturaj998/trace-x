import os
import pytest

os.environ["TESTING"] = "true"

from app.database.base import Base
from app.database.connection import engine
import app.models  # noqa: F401 - Ensure all models are registered with metadata


@pytest.fixture(autouse=True, scope="session")
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
