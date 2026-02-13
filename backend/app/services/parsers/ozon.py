"""
Ozon parser — multi-strategy: Playwright → httpx → URL slug fallback.
"""

import json
import logging
import re
from typing import Optional

import httpx
from playwright.async_api import TimeoutError as PwTimeout

from app.services.parsers.base import new_page

logger = logging.getLogger("parser")


def _product_id(url: str) -> Optional[str]:
    m = re.search(r'/product/[^/]*?-(\d+)/?', url) or re.search(r'/product/(\d+)', url)
    return m.group(1) if m else None


def _title_from_slug(url: str) -> Optional[str]:
    m = re.search(r'/product/([a-zA-Z0-9\-]+?)(?:-\d+)?/?(?:\?|$)', url)
    if not m:
        return None
    slug = m.group(1)
    words = slug.replace('-', ' ').strip()
    if not words:
        return None
    _translit_map = {
        'zh': 'ж', 'ch': 'ч', 'sh': 'ш', 'shch': 'щ', 'yo': 'ё', 'yu': 'ю', 'ya': 'я',
        'ts': 'ц', 'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е',
        'z': 'з', 'i': 'и', 'y': 'й', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н',
        'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф',
        'h': 'х', 'j': 'дж',
    }
    result = []
    i = 0
    while i < len(words):
        if words[i] == ' ':
            result.append(' ')
            i += 1
            continue
        matched = False
        for length in (4, 3, 2):
            chunk = words[i:i + length].lower()
            if chunk in _translit_map:
                result.append(_translit_map[chunk])
                i += length
                matched = True
                break
        if not matched:
            ch = words[i].lower()
            if ch in _translit_map:
                result.append(_translit_map[ch])
            else:
                result.append(words[i])
            i += 1
    title = ''.join(result).strip()
    return title.capitalize() if title else None


async def _parse_playwright(url: str) -> dict:
    logger.info("Ozon: Playwright strategy for %s", url)
    async with new_page() as page:
        try:
            await page.goto("https://www.ozon.ru/", wait_until="domcontentloaded", timeout=20000)
            await page.wait_for_timeout(2000)
        except Exception:
            pass

        await page.goto(url, wait_until="domcontentloaded", timeout=45000)

        for attempt in range(3):
            content = await page.content()
            if "Подтвердите" in content and "бот" in content:
                logger.info("Ozon bot challenge (attempt %d)", attempt + 1)
                await page.wait_for_timeout(5000)
            else:
                break

        try:
            await page.wait_for_selector("h1", timeout=15000)
        except PwTimeout:
            pass
        await page.wait_for_timeout(3000)

        data = await page.evaluate("""() => {
            const result = {title: null, price: null, description: null, images: []};
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            scripts.forEach(s => {
                try {
                    const d = JSON.parse(s.textContent);
                    const items = Array.isArray(d) ? d : [d];
                    items.forEach(item => {
                        if (!item || item['@type'] !== 'Product') return;
                        if (!result.title) result.title = item.name;
                        if (!result.description) result.description = (item.description || '').slice(0, 500);
                        const offers = item.offers;
                        if (offers && !result.price) {
                            const o = Array.isArray(offers) ? offers[0] : offers;
                            if (o && o.price) result.price = parseFloat(String(o.price).replace(/[^\\d.]/g, ''));
                        }
                        if (item.image && result.images.length === 0) {
                            const imgs = Array.isArray(item.image) ? item.image : [item.image];
                            imgs.forEach(i => {
                                const u = typeof i === 'string' ? i : (i && i.url || '');
                                if (u) result.images.push(u);
                            });
                        }
                    });
                } catch(e) {}
            });
            if (!result.title) { const h1 = document.querySelector('h1'); if (h1) result.title = h1.innerText.trim(); }
            if (!result.title) { const og = document.querySelector('meta[property="og:title"]'); if (og) result.title = og.content; }
            if (!result.price) {
                const sels = ['[data-widget="webPrice"] span', 'span[class*="price"]'];
                for (const sel of sels) {
                    const el = document.querySelector(sel);
                    if (el) { const m = el.innerText.match(/(\\d[\\d\\s.,]*\\d)/); if (m) { const n = parseFloat(m[1].replace(/[\\s]/g,'').replace(',','.')); if (n>0) { result.price=n; break; } } }
                }
            }
            if (result.images.length === 0) {
                document.querySelectorAll('[data-widget="webGallery"] img, [data-widget="imageCarousel"] img').forEach(img => {
                    let src = img.src || ''; src = src.replace(/\\/s\\d+\\//g, '/s800/');
                    if (src && !src.includes('icon') && !result.images.includes(src)) result.images.push(src);
                });
            }
            if (result.images.length === 0) { const og = document.querySelector('meta[property="og:image"]'); if (og && og.content) result.images.push(og.content); }
            if (!result.description) { const d = document.querySelector('[data-widget="webDescription"]'); if (d) result.description = d.innerText.trim().slice(0,500); }
            if (!result.description) { const og = document.querySelector('meta[property="og:description"]'); if (og && og.content) result.description = og.content.slice(0,500); }
            return result;
        }""")

    return {
        "title": data.get("title"),
        "price": data.get("price"),
        "images": data.get("images", [])[:10],
        "description": data.get("description"),
    }


async def _parse_httpx(url: str) -> dict:
    from bs4 import BeautifulSoup

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    }
    async with httpx.AsyncClient(follow_redirects=True, timeout=20) as client:
        r = await client.get(url, headers=headers)
    if r.status_code != 200:
        return {}

    soup = BeautifulSoup(r.text, "lxml")
    title = price = description = None
    images: list = []

    for script in soup.find_all("script", type="application/ld+json"):
        try:
            ld = json.loads(script.string)
            items = ld if isinstance(ld, list) else [ld]
            for item in items:
                if item.get("@type") == "Product":
                    title = title or item.get("name")
                    description = description or (item.get("description") or "")[:500]
                    offers = item.get("offers")
                    if offers and not price:
                        o = offers[0] if isinstance(offers, list) else offers
                        if o and o.get("price"):
                            price = float(str(o["price"]).replace(",", "."))
                    img = item.get("image")
                    if img and not images:
                        images = img if isinstance(img, list) else [img]
        except Exception:
            pass

    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = title or og_title["content"]
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        images = images or [og_image["content"]]
    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        description = description or og_desc["content"][:500]
    if not title:
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(strip=True)

    return {
        "title": title,
        "price": price,
        "images": [i for i in images if isinstance(i, str)][:10],
        "description": description,
    }


async def parse(url: str) -> dict:
    product_id = _product_id(url)

    # Strategy 1: Playwright
    try:
        data = await _parse_playwright(url)
        title = data.get("title") or ""
        if title and "бот" not in title.lower() and "подтвердите" not in title.lower():
            for sep in [" — купить", " - купить", " – купить"]:
                idx = title.find(sep)
                if idx > 10:
                    title = title[:idx].strip()
            data["title"] = title
            return data
        logger.info("Ozon captcha via Playwright, trying fallback")
    except Exception as e:
        logger.warning("Ozon Playwright failed: %s", e, exc_info=True)

    # Strategy 2: httpx
    try:
        data = await _parse_httpx(url)
        if data.get("title") and "бот" not in data["title"].lower():
            return data
    except Exception as e:
        logger.warning("Ozon httpx failed: %s", e, exc_info=True)

    # Strategy 3: URL slug fallback
    title = _title_from_slug(url) or "Товар Ozon"
    if product_id:
        title = f"{title} (артикул {product_id})"

    return {
        "title": title,
        "price": None,
        "images": [],
        "description": f"Не удалось загрузить полные данные с Ozon (антибот-защита). Откройте ссылку вручную: {url}",
    }
