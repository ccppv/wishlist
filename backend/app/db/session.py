"""
Database session management
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Import all models to register them with SQLAlchemy
import app.models  # noqa

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    poolclass=NullPool,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session.
    
    NOTE: No auto-commit. Each endpoint that writes to DB must call
    `await db.commit()` explicitly. This prevents accidental persistence
    of in-memory mutations (e.g. hiding reservation info for owner view).
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database"""
    # This will be handled by Alembic migrations
    # Just check connection
    async with engine.begin() as conn:
        # Tables will be created via Alembic
        pass
