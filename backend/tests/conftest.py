"""Pytest fixtures"""
import os

# Set valid SECRET_KEY and local Redis for tests before any app import
if not os.environ.get("SECRET_KEY") or "your-secret-key" in os.environ.get("SECRET_KEY", ""):
    os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-minimum-32-characters"
if os.environ.get("REDIS_HOST") != "localhost":
    os.environ["REDIS_HOST"] = "localhost"

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db.session import AsyncSessionLocal


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def db():
    async with AsyncSessionLocal() as session:
        yield session


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
