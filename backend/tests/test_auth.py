"""Auth endpoint tests: register, login, /auth/me, onboarding"""
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.models.user import User
from app.core.security import get_password_hash


@pytest.fixture
async def verified_user(db):
    """Verified user with onboarding completed."""
    user = User(
        email="logintest@example.com",
        username="logintestuser",
        hashed_password=get_password_hash("testpass123"),
        full_name="Login Test",
        email_verified=True,
        onboarding_completed=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    yield user
    await db.delete(user)
    await db.commit()


@pytest.fixture
async def unverified_user(db):
    """User without onboarding."""
    user = User(
        email="onboard@example.com",
        username="onboarduser",
        hashed_password=get_password_hash("testpass123"),
        full_name=None,
        email_verified=True,
        onboarding_completed=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    yield user
    await db.delete(user)
    await db.commit()


@pytest.mark.asyncio
async def test_login_success_returns_token_and_user(verified_user):
    """Login returns access_token, token_type, user."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        r = await client.post(
            "/api/v1/auth/login",
            data={"username": "logintestuser", "password": "testpass123"},
        )
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["id"] == verified_user.id
    assert data["user"]["onboarding_completed"] is True


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
async def test_auth_me_without_token_returns_401():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_with_invalid_token_returns_401():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": "Bearer invalid_token_xyz"},
    ) as client:
        r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_register_returns_201(db):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        r = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "password123",
                "full_name": "New User",
            },
        )
    assert r.status_code == 201
    data = r.json()
    assert "message" in data
    assert data["email"] == "newuser@example.com"
    assert "access_token" not in data


@pytest.mark.asyncio
async def test_full_flow_login_me(verified_user):
    """Login -> token -> /auth/me."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        login_r = await client.post(
            "/api/v1/auth/login",
            data={"username": "logintestuser", "password": "testpass123"},
        )
    assert login_r.status_code == 200
    token = login_r.json()["access_token"]

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as client:
        me_r = await client.get("/api/v1/auth/me")
    assert me_r.status_code == 200
    assert me_r.json()["id"] == verified_user.id


@pytest.mark.asyncio
async def test_onboarding_completes_and_returns_user(unverified_user):
    """Onboarding sets full_name, onboarding_completed=true."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        login_r = await client.post(
            "/api/v1/auth/login",
            data={"username": "onboarduser", "password": "testpass123"},
        )
    assert login_r.status_code == 200
    token = login_r.json()["access_token"]

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as client:
        r = await client.post(
            "/api/v1/auth/onboarding",
            files={"full_name": (None, "Test Name")},
        )
    assert r.status_code == 200
    data = r.json()
    assert data["full_name"] == "Test Name"
    assert data["onboarding_completed"] is True
    assert data["id"] == unverified_user.id


@pytest.mark.asyncio
async def test_onboarding_idempotent_when_already_completed(verified_user):
    """If onboarding_completed=true, returns 200 with user."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        login_r = await client.post(
            "/api/v1/auth/login",
            data={"username": "logintestuser", "password": "testpass123"},
        )
    assert login_r.status_code == 200
    token = login_r.json()["access_token"]

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as client:
        r = await client.post(
            "/api/v1/auth/onboarding",
            files={"full_name": (None, "Other Name")},
        )
    assert r.status_code == 200
    data = r.json()
    assert data["onboarding_completed"] is True
