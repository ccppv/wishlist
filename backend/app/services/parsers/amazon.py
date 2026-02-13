"""
Amazon parser.
"""

import logging
from playwright.async_api import TimeoutError as PwTimeout
from app.services.parsers.base import new_page

logger = logging.getLogger("parser")


async def parse(url: str) -> dict:
    async with new_page() as page:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_selector("#productTitle", timeout=15000)
        except PwTimeout:
            pass
        await page.wait_for_timeout(2000)

        data = await page.evaluate("""() => {
            const result = {title: null, price: null, description: null, images: []};
            const titleEl = document.querySelector('#productTitle');
            if (titleEl) result.title = titleEl.innerText.trim();
            const wholeEl = document.querySelector('.a-price-whole');
            const fracEl = document.querySelector('.a-price-fraction');
            if (wholeEl) {
                const whole = wholeEl.innerText.replace(/[^\\d]/g, '');
                const frac = fracEl ? fracEl.innerText.replace(/[^\\d]/g, '') : '00';
                result.price = parseFloat(whole + '.' + frac);
            }
            const mainImg = document.querySelector('#landingImage');
            if (mainImg) {
                const dynData = mainImg.getAttribute('data-a-dynamic-image');
                if (dynData) { try { Object.keys(JSON.parse(dynData)).forEach(u => result.images.push(u)); } catch(e) {} }
                if (result.images.length === 0 && mainImg.src) result.images.push(mainImg.src);
            }
            const descEl = document.querySelector('#productDescription');
            if (descEl) result.description = descEl.innerText.trim().slice(0, 500);
            return result;
        }""")

    return {
        "title": data.get("title") or "Без названия",
        "price": data.get("price"),
        "images": data.get("images", [])[:10],
        "description": data.get("description"),
    }
