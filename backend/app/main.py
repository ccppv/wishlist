"""
Main FastAPI application
"""
import logging
from contextlib import asynccontextmanager
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1 import api_router
from app.api.google_auth import router as google_auth_router
from app.db.session import init_db
from app.services.parsers import shutdown_browser
from app.services.verification import close_redis

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    await init_db()
    
    # Create uploads directory if not exists
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    (uploads_dir / "avatars").mkdir(exist_ok=True)
    (uploads_dir / "items").mkdir(exist_ok=True)
    
    logger.info("Application started")
    yield
    # Shutdown
    await shutdown_browser()
    await close_redis()
    logger.info("Application shutdown")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads (only if directory exists)
uploads_path = Path("uploads")
if uploads_path.exists() and uploads_path.is_dir():
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Landing page images (served by backend for reliable static delivery)
static_images = Path("static/images")
if static_images.exists() and static_images.is_dir():
    app.mount("/images", StaticFiles(directory="static/images"), name="images")

#Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Google OAuth router (at /api/auth/google, outside v1 prefix)
app.include_router(google_auth_router, prefix="/api/auth/google", tags=["google-auth"])


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": settings.VERSION}
