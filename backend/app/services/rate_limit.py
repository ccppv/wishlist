"""Rate limiting via Redis"""
from app.services.verification import get_redis

LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SEC = 900  # 15 min
REGISTER_MAX_ATTEMPTS = 5
REGISTER_WINDOW_SEC = 3600  # 1 hour


async def check_login_rate(identifier: str) -> bool:
    r = await get_redis()
    key = f"rate:login:{identifier}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, LOGIN_WINDOW_SEC)
    return count <= LOGIN_MAX_ATTEMPTS


async def reset_login_rate(identifier: str) -> None:
    r = await get_redis()
    await r.delete(f"rate:login:{identifier}")


async def check_register_rate(identifier: str) -> bool:
    r = await get_redis()
    key = f"rate:register:{identifier}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, REGISTER_WINDOW_SEC)
    return count <= REGISTER_MAX_ATTEMPTS
