"""
Wildberries parser — CDN approach, no browser needed.
"""

import logging
import re
from typing import List, Optional

import httpx

from app.services.parsers.base import ProductParserError

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


def _image_urls(article: str, count: int = 10) -> List[str]:
    base = _cdn_base(article)
    return [f"{base}/images/c516x688/{i}.webp" for i in range(1, count + 1)]


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
        # card.json — title, brand, description, photo_count
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
                    photo_count = media["photo_count"]
        except Exception as e:
            logger.warning("WB card.json failed for %s: %s", article, e)

        # price-history.json
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

    images = _image_urls(article, photo_count)

    return {
        "title": title,
        "price": price,
        "images": images,
        "description": description,
    }
