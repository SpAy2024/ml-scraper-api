// scraper/homeScraper.js
const puppeteer = require('puppeteer');

async function scrapeHome() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    await page.goto('https://www.mobilelegends.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForSelector('.swiper-slide', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Cerrar banner de cookies
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        for (const btn of buttons) {
          const text = btn.textContent?.trim().toLowerCase() || '';
          if (text.includes('accept') || text.includes('agree') || text === 'ok') {
            btn.click();
            return true;
          }
        }
      });
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    const homeData = await page.evaluate(() => {
      // ✅ SOLO el slider (swiper-slide)
      const slider = [];
      document.querySelectorAll('.swiper-slide img').forEach(img => {
        const src = img.src;
        if (src && !src.endsWith('.svg') && !slider.some(s => s.img === src)) {
          slider.push({
            img: src,
            alt: img.alt || 'slide'
          });
        }
      });

      // ✅ Banners promocionales (fuera del slider)
      const banners = [];
      document.querySelectorAll('[class*="banner"] img, [class*="promo"] img').forEach(img => {
        const src = img.src;
        // Excluir íconos pequeños (SVG) y las del slider
        if (src && !src.endsWith('.svg') && !slider.some(s => s.img === src) && !banners.some(b => b.img === src)) {
          banners.push({
            img: src,
            alt: img.alt || '',
            link: img.parentElement?.href || ''
          });
        }
      });

      // ✅ Noticias
      const news = [];
      document.querySelectorAll('[class*="news"] a, [class*="article"] a').forEach(a => {
        const title = a.querySelector('h3, h4, [class*="title"]')?.textContent?.trim();
        const img = a.querySelector('img')?.src;
        const link = a.href;
        if (title && !news.some(n => n.title === title)) {
          news.push({ title, img, link });
        }
      });

      return {
        slider: slider.slice(0, 20),
        banners: banners.slice(0, 20),
        news: news.slice(0, 20),
        scrapedAt: new Date().toISOString()
      };
    });

    await browser.close();
    return homeData;

  } catch (error) {
    await browser.close();
    throw error;
  }
}

module.exports = { scrapeHome };