"""
Wildberries parser — CDN + Playwright fallback for images.
"""

import logging
import re
from typing import List, Optional

import httpx

from app.services.parsers.base import ProductParserError, new_page

logger = logging.getLogger("parser")


def _article(url: str) -> Optional[str]:
    m = re.search(r"/catalog/(\d+)", url)
    return m.group(1) if m else None


def _basket(vol: int) -> str:
    basket_map = [
        (143, "01"), (287, "02"), (431, "03"), (719, "04"),
        (1007, "05"), (1061, "06"), (1115, "07"), (1169, "08"),
        (1313, "09"), (1601, "10"), (1655, "11"), (1919, "12"),
        (2045, "13"), (2189, "14"), (2405, "15"), (2621, "16"),
        (2837, "17"),
    ]
    for threshold, b in basket_map:
        if vol <= threshold:
            return b
    return "18"


def _cdn_base(article: str) -> str:
    nm = int(article)
    vol = nm // 100000
    part = nm // 1000
    b = _basket(vol)
    return f"https://basket-{b}.wbbasket.ru/vol{vol}/part{part}/{nm}"


def _image_urls_cdn(article: str, count: int = 10) -> List[str]:
    base = _cdn_base(article)
    return [f"{base}/images/c516x688/{i}.webp" for i in range(1, count + 1)]


async def _images_from_page(url: str) -> List[str]:
    images: List[str] = []
    try:
        async with new_page() as page:
            await page.goto(url, wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(3000)

            data = await page.evaluate("""() => {
                const imgs = [];
                const seen = new Set();
                const add = (src) => {
                    if (!src || seen.has(src) || src.includes('icon') || src.includes('logo') || src.includes('placeholder')) return;
                    src = src.replace(/\\/s\\d+\\//g, '/s800/').replace(/\\/c\\d+x\\d+\\//g, '/c516x688/');
                    seen.add(src);
                    imgs.push(src);
                };
                document.querySelectorAll('img[src*="wbbasket"], img[src*="wbimg"], [class*="gallery"] img, [class*="carousel"] img, [class*="slide"] img').forEach(img => {
                    add(img.src || img.dataset.src || img.getAttribute('data-src'));
                });
                document.querySelectorAll('script').forEach(s => {
                    const m = s.textContent && s.textContent.match(/https?:\\/\\/[^"']+wbbasket[^"']+\\/images[^"']+/g);
                    if (m) m.forEach(u => add(u));
                });
                const meta = document.querySelector('meta[property="og:image"]');
                if (meta && meta.content) add(meta.content);
                return imgs;
            }""")
            images = data or []
    except Exception as e:
        logger.warning("WB Playwright images failed: %s", e)
    return images[:10]


async def _validate_images(urls: List[str], max_check: int = 5) -> List[str]:
    valid: List[str] = []
    async with httpx.AsyncClient(timeout=5) as client:
        for u in urls[:max_check]:
            try:
                r = await client.head(u)
                if r.status_code == 200:
                    valid.append(u)
            except Exception:
                pass
    return valid


async def parse(url: str) -> dict:
    article = _article(url)
    if not article:
        raise ProductParserError("Не удалось извлечь артикул WB из ссылки")

    cdn_base = _cdn_base(article)
    title = "Без названия"
    description = None
    price = None
    photo_count = 10

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(f"{cdn_base}/info/ru/card.json")
            if r.status_code == 200:
                card = r.json()
                title = card.get("imt_name") or title
                brand = None
                selling = card.get("selling")
                if isinstance(selling, dict):
                    brand = selling.get("brand_name")
                if brand and brand.lower() not in title.lower():
                    title = f"{brand} / {title}"
                description = (card.get("description") or "")[:500] or None
                media = card.get("media")
                if isinstance(media, dict) and media.get("photo_count"):
                    photo_count = min(media["photo_count"], 10)
        except Exception as e:
            logger.warning("WB card.json failed for %s: %s", article, e)

        try:
            r = await client.get(f"{cdn_base}/info/price-history.json")
            if r.status_code == 200:
                history = r.json()
                if history:
                    latest = history[-1]
                    price_raw = latest.get("price", {}).get("RUB")
                    if price_raw:
                        price = round(price_raw / 100, 2)
        except Exception as e:
            logger.warning("WB price-history.json failed for %s: %s", article, e)

    images = await _images_from_page(url)
    if not images:
        cdn_urls = _image_urls_cdn(article, photo_count)
        images = await _validate_images(cdn_urls, photo_count)
    if not images:
        images = _image_urls_cdn(article, min(3, photo_count))

    return {
        "title": title,
        "price": price,
        "images": images[:10],
        "description": description,
    }
