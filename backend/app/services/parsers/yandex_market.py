"""
Yandex Market / Magnit Market / MegaMarket parser.
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
        await page.wait_for_timeout(3000)

        data = await page.evaluate("""() => {
            const result = {title: null, price: null, description: null, images: []};
            const h1 = document.querySelector('h1');
            if (h1) result.title = h1.innerText.trim();
            const priceSelectors = [
                '[data-auto="price-value"]', '[data-baobab-name="price"] span',
                'span[data-auto="mainPrice"]', 'div[data-zone-name="price"] span',
                'span[class*="price"]',
            ];
            for (const sel of priceSelectors) {
                const el = document.querySelector(sel);
                if (el) { const m = el.innerText.match(/(\\d[\\d\\s.,]*\\d)/); if (m) { const n = parseFloat(m[1].replace(/[\\s]/g,'').replace(',','.')); if (n>0) { result.price=n; break; } } }
            }
            document.querySelectorAll('[data-zone-name="gallery"] img, [data-auto="image"] img, [data-apiary-widget-name*="gallery"] img, picture img').forEach(img => {
                let src = img.getAttribute('src') || '';
                if (src && !src.includes('icon') && !src.includes('logo') && !result.images.includes(src)) result.images.push(src);
            });
            if (result.images.length === 0) { const og = document.querySelector('meta[property="og:image"]'); if (og && og.content) result.images.push(og.content); }
            const descEl = document.querySelector('[data-auto="product-full-description"], [data-zone-name="description"]');
            if (descEl) result.description = descEl.innerText.trim().slice(0, 500);
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            scripts.forEach(s => {
                try {
                    const d = JSON.parse(s.textContent);
                    const items = Array.isArray(d) ? d : [d];
                    items.forEach(item => {
                        if (item['@type'] === 'Product') {
                            if (!result.title) result.title = item.name;
                            if (!result.description) result.description = (item.description || '').slice(0, 500);
                            const offers = item.offers;
                            if (offers && !result.price) { const o = Array.isArray(offers) ? offers[0] : offers; if (o && o.price) result.price = parseFloat(o.price); }
                            if (item.image && result.images.length === 0) { const imgs = Array.isArray(item.image) ? item.image : [item.image]; imgs.forEach(i => { const u = typeof i === 'string' ? i : (i.url || ''); if (u) result.images.push(u); }); }
                        }
                    });
                } catch(e) {}
            });
            return result;
        }""")

    return {
        "title": data.get("title") or "Без названия",
        "price": data.get("price"),
        "images": data.get("images", [])[:10],
        "description": data.get("description"),
    }
