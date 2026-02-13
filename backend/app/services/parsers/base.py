"""
Browser singleton + shared helpers for all parsers.
"""

import asyncio
import logging
import re
import urllib.parse
from contextlib import asynccontextmanager
from typing import Optional

from playwright.async_api import async_playwright, Browser, Page, TimeoutError as PwTimeout

logger = logging.getLogger("parser")

# Try stealth — optional dependency
try:
    from playwright_stealth import stealth_async
except ImportError:
    stealth_async = None  # type: ignore[assignment]


class ProductParserError(Exception):
    pass


# ═══════════════════════════════════════════════════════════════════════════════
# Browser singleton
# ═══════════════════════════════════════════════════════════════════════════════

_browser: Optional[Browser] = None
_pw = None
_lock = asyncio.Lock()


async def _get_browser() -> Browser:
    global _browser, _pw
    async with _lock:
        if _browser is not None and not _browser.is_connected():
            logger.warning("Browser disconnected, cleaning up…")
            try:
                await _browser.close()
            except Exception:
                pass
            _browser = None
            if _pw:
                try:
                    await _pw.stop()
                except Exception:
                    pass
                _pw = None

        if _browser is None:
            _pw = await async_playwright().start()
            import glob
            chromium_paths = glob.glob(
                "/root/.cache/ms-playwright/chromium-*/chrome-linux/chrome"
            )
            exe = chromium_paths[0] if chromium_paths else None
            _browser = await _pw.chromium.launch(
                executable_path=exe,
                headless=True,
                args=[
                    "--headless=new",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-blink-features=AutomationControlled",
                ],
            )
            logger.info("Chromium launched (exe=%s)", exe)
    return _browser


async def shutdown_browser():
    """Close the shared browser on app shutdown."""
    global _browser, _pw
    if _browser:
        try:
            await _browser.close()
        except Exception:
            pass
        _browser = None
    if _pw:
        try:
            await _pw.stop()
        except Exception:
            pass
        _pw = None


@asynccontextmanager
async def new_page():
    """Create a stealth browser page; auto-close on exit."""
    browser = await _get_browser()
    context = await browser.new_context(
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        locale="ru-RU",
        viewport={"width": 1440, "height": 900},
        java_script_enabled=True,
        extra_http_headers={
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        },
    )
    await context.route(
        re.compile(r"\.(mp4|webm|ogg|mp3|wav|flac|aac|woff2?|ttf|otf)$"),
        lambda route: route.abort(),
    )
    page = await context.new_page()
    if stealth_async is not None:
        await stealth_async(page)
    try:
        yield page
    finally:
        try:
            await context.close()
        except Exception:
            pass


# ═══════════════════════════════════════════════════════════════════════════════
# Router
# ═══════════════════════════════════════════════════════════════════════════════

async def parse_product_from_url(url: str) -> dict:
    url = url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    domain = urllib.parse.urlparse(url).netloc.lower()

    # Lazy imports — keep startup fast, avoid circular deps
    try:
        if "wildberries.ru" in domain or "wb.ru" in domain:
            from app.services.parsers.wildberries import parse
            return await parse(url)
        elif "ozon.ru" in domain:
            from app.services.parsers.ozon import parse
            return await parse(url)
        elif any(d in domain for d in ("market.yandex", "pokupki.market", "magnit.market", "megamarket")):
            from app.services.parsers.yandex_market import parse
            return await parse(url)
        elif "avito.ru" in domain:
            from app.services.parsers.avito import parse
            return await parse(url)
        elif "amazon." in domain:
            from app.services.parsers.amazon import parse
            return await parse(url)
        else:
            from app.services.parsers.generic import parse
            return await parse(url)
    except ProductParserError:
        raise
    except Exception as e:
        logger.exception("Parser error for %s", url)
        raise ProductParserError(f"Не удалось распарсить товар: {e}")
