"""
Product parsers package.

Each marketplace has its own module.
The main entry point is parse_product_from_url().
"""

from app.services.parsers.base import (
    ProductParserError,
    shutdown_browser,
    parse_product_from_url,
)

__all__ = [
    "ProductParserError",
    "shutdown_browser",
    "parse_product_from_url",
]
