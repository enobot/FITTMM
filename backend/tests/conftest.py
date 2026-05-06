# conftest.py
# Shared test fixtures for all backend tests.
# Uses an in-memory SQLite database so no MySQL connection is needed.
# The DATABASE_URL and SECRET_KEY env vars MUST be set before any project
# modules are imported, so they appear at the very top of this file.

import os
os.environ["DATABASE_URL"] = "sqlite:///./test_fittmm.db"
os.environ["SECRET_KEY"] = "test-only-secret-key-do-not-use-in-production"

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Project imports (after env vars are set above)
from core.database import Base, get_db
from main import app

# ---------------------------------------------------------------------------
# Test database setup (SQLite, file-based so it resets cleanly each test)
# ---------------------------------------------------------------------------
TEST_DB_URL = "sqlite:///./test_fittmm.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def reset_db():
    """Create fresh tables before each test, drop them after. Keeps tests isolated."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(reset_db):
    """
    Returns a FastAPI TestClient wired to the SQLite test database.
    Patches register_default_user() so startup doesn't try to reach MySQL.
    """
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Patch the startup function so it doesn't attempt a MySQL connection
    with patch("core.defaultentries.register_default_user"):
        with TestClient(app) as c:
            yield c

    app.dependency_overrides.clear()
