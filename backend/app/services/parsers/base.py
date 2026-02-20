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
            import os
            search_paths = [
                "/root/.cache/ms-playwright/chromium-*/chrome-linux/chrome",
                os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux/chrome"),
                os.path.expanduser("~/Library/Caches/ms-playwright/chromium-*/chrome-mac/Chromium.app/Contents/MacOS/Chromium"),
            ]
            exe = None
            for pattern in search_paths:
                found = glob.glob(pattern)
                if found:
                    exe = found[0]
                    break
            launch_opts = {
                "headless": True,
                "args": [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-blink-features=AutomationControlled",
                ],
            }
            if exe and os.path.isfile(exe):
                launch_opts["executable_path"] = exe
            _browser = await _pw.chromium.launch(**launch_opts)
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


async def _parse_via_httpx(url: str) -> dict:
    """Simple httpx-only parser - no Playwright. Gets og:*, JSON-LD, basic meta."""
    import json
    try:
        import httpx
        from bs4 import BeautifulSoup
    except ImportError:
        return {}

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
            r = await client.get(url, headers=headers)
        if r.status_code != 200:
            return {}
    except Exception as e:
        logger.warning("httpx fetch failed: %s", e)
        return {}

    soup = BeautifulSoup(r.text, "lxml")
    title = price = description = None
    images = []

    for script in soup.find_all("script", type="application/ld+json"):
        try:
            ld = json.loads(script.string or "{}")
            items = ld if isinstance(ld, list) else [ld]
            for item in items:
                if isinstance(item, dict) and item.get("@type") == "Product":
                    title = title or item.get("name")
                    description = description or (item.get("description") or "")[:500]
                    offers = item.get("offers")
                    if offers and not price:
                        o = offers[0] if isinstance(offers, list) else offers
                        if isinstance(o, dict) and o.get("price"):
                            try:
                                price = float(str(o["price"]).replace(",", "."))
                            except (ValueError, TypeError):
                                pass
                    img = item.get("image")
                    if img and not images:
                        images = img if isinstance(img, list) else [img]
                        images = [i for i in images if isinstance(i, str)][:10]
        except Exception:
            pass

    og = lambda p: (soup.find("meta", property=p) or soup.find("meta", attrs={"name": p}))
    for prop, val in [("og:title", "title"), ("og:description", "description"), ("og:image", "images")]:
        tag = og(prop)
        if tag and tag.get("content"):
            content = tag["content"].strip()
            if val == "title": title = title or content
            elif val == "description": description = description or content[:500]
            elif val == "images" and content: images = images or [content]

    if not title:
        h1 = soup.find("h1")
        if h1: title = h1.get_text(strip=True)
    if not title:
        t = soup.find("title")
        if t: title = t.get_text(strip=True)

    if not price:
        for tag in soup.find_all(string=True):
            text = tag if isinstance(tag, str) else (tag.get_text() if hasattr(tag, "get_text") else "")
            import re
            m = re.search(r"(\d[\d\s.,]*)\s*[₽$€£]", text)
            if m:
                try:
                    n = float(m.group(1).replace(" ", "").replace(",", "."))
                    if 0 < n < 100000000:
                        price = n
                        break
                except ValueError:
                    pass

    base = urllib.parse.urljoin(url, "/")
    if isinstance(images, list):
        images = [urllib.parse.urljoin(base, i) if i and not i.startswith("http") else i for i in images if i][:10]
    else:
        images = []

    return {
        "title": title or "Товар",
        "price": price,
        "images": images,
        "description": description,
    }

async def parse_product_from_url(url: str) -> dict:
    url = url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    domain = urllib.parse.urlparse(url).netloc.lower()

    last_error = None
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
    except ProductParserError as e:
        last_error = e
    except Exception as e:
        logger.warning("Parser failed for %s: %s", url[:50], e)
        last_error = e

    fallback = await _parse_via_httpx(url)
    if fallback and fallback.get("title"):
        return fallback
    raise ProductParserError(str(last_error) if last_error else "Не удалось распарсить товар")
