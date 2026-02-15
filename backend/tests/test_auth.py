"""Auth endpoint smoke tests"""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_login_empty_returns_422():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        r = await client.post("/api/v1/auth/login", data={})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_login_wrong_creds_returns_401():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        r = await client.post(
            "/api/v1/auth/login",
            data={"username": "nonexistent_user_xyz", "password": "wrongpass"},
        )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_without_token_returns_401():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        r = await client.get("/api/v1/users/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_with_invalid_token_returns_401():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": "Bearer invalid_token_xyz"},
    ) as client:
        r = await client.get("/api/v1/users/me")
    assert r.status_code == 401
