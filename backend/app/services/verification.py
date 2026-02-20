"""Verification code service using Redis"""
import random
import logging
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)
_redis = None


async def get_redis():
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def generate_verification_code(email: str) -> str:
    """Generate 6-digit code and store in Redis with 10min TTL"""
    code = "".join(random.choices("0123456789", k=6))
    r = await get_redis()
    # Store code with 10 minute expiration
    await r.setex(f"verify:{email}", 600, code)
    # Track attempts (max 5 resends per hour)
    attempts_key = f"verify_attempts:{email}"
    await r.incr(attempts_key)
    await r.expire(attempts_key, 3600)
    
    logger.warning(f"🔑 VERIFICATION CODE for {email}: {code}")
    print(f"VERIFICATION_CODE {email}: {code}", flush=True)
    
    return code


async def verify_code(email: str, code: str) -> bool:
    """Verify the code and delete it if correct"""
    r = await get_redis()
    stored = await r.get(f"verify:{email}")
    if stored and stored == code:
        await r.delete(f"verify:{email}")
        return True
    return False


async def get_resend_attempts(email: str) -> int:
    """Get number of resend attempts in the last hour"""
    r = await get_redis()
    attempts = await r.get(f"verify_attempts:{email}")
    return int(attempts) if attempts else 0


async def close_redis():
    global _redis
    if _redis:
        await _redis.close()
        _redis = None
