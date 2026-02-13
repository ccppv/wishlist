"""
Avito parser.
"""

import logging
from playwright.async_api import TimeoutError as PwTimeout
from app.services.parsers.base import new_page

logger = logging.getLogger("parser")


async def parse(url: str) -> dict:
    async with new_page() as page:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_selector("h1", timeout=15000)
        except PwTimeout:
            pass
        await page.wait_for_timeout(2000)

        data = await page.evaluate("""() => {
            const result = {title: null, price: null, description: null, images: []};
            const h1 = document.querySelector('h1');
            if (h1) result.title = h1.innerText.trim();
            const priceEl = document.querySelector('[data-marker="item-view/item-price"], span[itemprop="price"], [class*="price-value"]');
            if (priceEl) {
                const content = priceEl.getAttribute('content');
                if (content) { result.price = parseFloat(content); }
                else { const m = priceEl.innerText.match(/(\\d[\\d\\s.,]*\\d)/); if (m) result.price = parseFloat(m[1].replace(/[\\s]/g,'').replace(',','.')); }
            }
            document.querySelectorAll('[data-marker="image-frame/image-wrapper"] img, [class*="gallery"] img, [class*="image-frame"] img, li[class*="images-preview"] img').forEach(img => {
                let src = img.getAttribute('src') || '';
                src = src.replace('/140x105/', '/640x480/');
                if (src && !src.includes('icon') && !result.images.includes(src)) result.images.push(src);
            });
            if (result.images.length === 0) { const og = document.querySelector('meta[property="og:image"]'); if (og && og.content) result.images.push(og.content); }
            const descEl = document.querySelector('[data-marker="item-view/item-description"], [itemprop="description"]');
            if (descEl) result.description = descEl.innerText.trim().slice(0, 500);
            return result;
        }""")

    return {
        "title": data.get("title") or "Без названия",
        "price": data.get("price"),
        "images": data.get("images", [])[:10],
        "description": data.get("description"),
    }
