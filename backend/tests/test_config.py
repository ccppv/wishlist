"""Config validation tests"""
import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_secret_key_placeholder_fails():
    """App must not start with placeholder SECRET_KEY."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(SECRET_KEY="your-secret-key-change-in-production")
    assert "SECRET_KEY" in str(exc_info.value) or "placeholder" in str(exc_info.value).lower()


def test_secret_key_env_example_placeholder_fails():
    """Reject .env.example style placeholder."""
    with pytest.raises(ValidationError):
        Settings(SECRET_KEY="your-secret-key-change-in-production-min-32-chars")


def test_secret_key_min_length():
    """SECRET_KEY must be at least 32 chars."""
    with pytest.raises(ValidationError):
        Settings(SECRET_KEY="short")
