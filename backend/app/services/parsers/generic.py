"""
Generic parser — works for any site via JSON-LD / Open Graph / heuristics.
"""

import logging
from playwright.async_api import TimeoutError as PwTimeout
from app.services.parsers.base import new_page

logger = logging.getLogger("parser")


async def parse(url: str) -> dict:
    async with new_page() as page:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_selector("h1, title", timeout=10000)
        except PwTimeout:
            pass
        await page.wait_for_timeout(2000)

        data = await page.evaluate("""() => {
            const result = {title: null, price: null, description: null, images: []};
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            scripts.forEach(s => {
                try {
                    const d = JSON.parse(s.textContent);
                    const items = Array.isArray(d) ? d : [d];
                    items.forEach(item => {
                        if (!item || typeof item !== 'object') return;
                        const checkProduct = (node) => {
                            if (!node || node['@type'] !== 'Product') return;
                            if (!result.title) result.title = node.name;
                            if (!result.description) result.description = (node.description || '').slice(0, 500);
                            const offers = node.offers;
                            if (offers && !result.price) { const o = Array.isArray(offers) ? offers[0] : offers; if (o && o.price) result.price = parseFloat(String(o.price).replace(/[^\\d.]/g, '')); }
                            const imgs = node.image;
                            if (imgs && result.images.length === 0) { const arr = Array.isArray(imgs) ? imgs : [imgs]; arr.forEach(i => { const u = typeof i === 'string' ? i : (i && i.url || ''); if (u) result.images.push(u); }); }
                        };
                        checkProduct(item);
                        (item['@graph'] || []).forEach(checkProduct);
                    });
                } catch(e) {}
            });
            const ogGet = (prop) => { const tag = document.querySelector('meta[property="'+prop+'"]') || document.querySelector('meta[name="'+prop+'"]'); return tag ? (tag.content || '').trim() : null; };
            if (!result.title) result.title = ogGet('og:title');
            if (!result.description) result.description = ogGet('og:description');
            const ogImg = ogGet('og:image');
            if (ogImg && !result.images.includes(ogImg)) result.images.unshift(ogImg);
            if (!result.price) { const pm = ogGet('product:price:amount') || ogGet('og:price:amount'); if (pm) result.price = parseFloat(pm.replace(/[^\\d.]/g, '')); }
            if (!result.title) { const h1 = document.querySelector('h1'); if (h1) result.title = h1.innerText.trim(); }
            if (!result.title) { const t = document.querySelector('title'); if (t) result.title = t.innerText.trim(); }
            if (!result.description) { const desc = document.querySelector('meta[name="description"]'); if (desc && desc.content) result.description = desc.content.trim().slice(0, 500); }
            if (result.images.length < 5) {
                document.querySelectorAll('img[src]').forEach(img => {
                    if (result.images.length >= 10) return;
                    const src = img.src;
                    if (!src || src.startsWith('data:')) return;
                    const skip = ['icon','logo','sprite','avatar','btn','pixel','1x1','tracking','.svg','spacer'];
                    if (skip.some(s => src.toLowerCase().includes(s))) return;
                    const w = img.naturalWidth || parseInt(img.width) || 0;
                    const h = img.naturalHeight || parseInt(img.height) || 0;
                    if (w > 0 && w < 80) return;
                    if (h > 0 && h < 80) return;
                    if (!result.images.includes(src)) result.images.push(src);
                });
            }
            if (!result.price) {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                let node;
                while ((node = walker.nextNode())) {
                    const text = node.textContent.trim();
                    const match = text.match(/^(\\d[\\d\\s.,]*)\\s*[₽$€£]/);
                    if (match) { const num = parseFloat(match[1].replace(/[\\s]/g,'').replace(',','.')); if (num > 0 && num < 100000000) { result.price = num; break; } }
                }
            }
            return result;
        }""")

    return {
        "title": data.get("title") or "Без названия",
        "price": data.get("price"),
        "images": data.get("images", [])[:10],
        "description": (data.get("description") or "")[:500] or None,
    }
