// scraper/heroScraper.js
import { getBrowser } from './browser.js';

export async function scrapeHero(heroId) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  const url = `https://www.mobilelegends.com/hero/detail?channelid=2727282&heroid=${heroId}`;

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`   🌐 Navegando a ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('div::-p-text(Win Rate)', { timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));

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

    const details = await page.evaluate((heroIdFromParam) => {
      // Función para limpiar textos y evitar JSON inválidos
      const sanitize = (text) => {
        if (!text) return '';
        return text.replace(/[\n\r]+/g, ' ').replace(/"/g, "'").replace(/\s+/g, ' ').trim();
      };

      const roleKeywords = ['Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'];
      const stats = {};
      let name = null, role = null, lore = null;
      let poster = null;
      let roleIcon = null;
      const skills = [];
      const combos = [];

      const allText = document.body.innerText;
      const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      // NOMBRE
      const allSpans = Array.from(document.querySelectorAll('span'));
      for (const span of allSpans) {
        const text = span.textContent.trim();
        if (text.length > 2 && text.length < 30 && 
            /^[A-Z]/.test(text) && 
            !roleKeywords.includes(text) &&
            !text.toLowerCase().includes('win') &&
            !text.toLowerCase().includes('rate') &&
            !text.toLowerCase().includes('hero') &&
            !text.toLowerCase().includes('skill') &&
            !text.toLowerCase().includes('mobile') &&
            !text.toLowerCase().includes('legend') &&
            !text.toLowerCase().includes('pick') &&
            !text.toLowerCase().includes('ban')) {
          name = text;
          break;
        }
      }
      if (!name) {
        const titleParts = document.title.split('|').map(s => s.trim());
        for (const part of titleParts) {
          if (part.length > 2 && part.length < 30 &&
              !part.toLowerCase().includes('mobile legends') &&
              !part.toLowerCase().includes('moonton') &&
              !roleKeywords.includes(part)) {
            name = part;
            break;
          }
        }
      }
      if (!name) name = `Hero ${heroIdFromParam}`;

      // ROL
      document.querySelectorAll('div, span, p').forEach(el => {
        const text = el.textContent.trim();
        if (roleKeywords.includes(text) && text.length < 15 && !role) role = text;
      });

      // POSTER Y ICONO DE ROL
      const posterImg = document.querySelector('img[alt="hero.data.smallmap"]');
      if (posterImg) poster = posterImg.src;
      
      const roleIconImg = document.querySelector('img[alt="data.sort_icon"]');
      if (roleIconImg) roleIcon = roleIconImg.src;

      // ESTADÍSTICAS
      const winRateMatch = allText.match(/([\d.]+%)\s*[\r\n]*\s*Win Rate/);
      const pickRateMatch = allText.match(/([\d.]+%)\s*[\r\n]*\s*Pick Rate/);
      const banRateMatch = allText.match(/([\d.]+%)\s*[\r\n]*\s*Ban Rate/);
      if (winRateMatch) stats.winRate = winRateMatch[1];
      if (pickRateMatch) stats.pickRate = pickRateMatch[1];
      if (banRateMatch) stats.banRate = banRateMatch[1];

      // LORE
      const loreMatch = allText.match(/Ban Rate\s*[\r\n]+\s*(Win Rate\s*[\r\n]+\s*)?([A-Z][^\n]{50,400}?)(?:\n|SKILLS|COUNTERS|GUIDES)/);
      if (loreMatch) lore = (loreMatch[2] || loreMatch[1]).trim();

      // SKILLS
      const skillTypes = ['Buff', 'Passive', 'Debuff', 'Blink', 'AOE', 'CC', 'Slow', 'Burst', 'Heal', 'Shield', 'Mobility', 'Damage', 'Charge', 'Teleport', 'Crowd Control', 'Poke', 'Reap', 'Guard'];
      const allRichTexts = Array.from(document.querySelectorAll('[class*="mt-rich-text-content"]'));
      const foundTypes = [];
      const foundDescriptions = [];

      allRichTexts.forEach((el, idx) => {
        const text = el.textContent?.trim() || '';
        if (skillTypes.includes(text) && text.length < 25) {
          foundTypes.push({ type: text, index: idx });
        } else if (text.length > 60 && text.length < 1500 && !text.includes('Cookie') && !text.includes('Win Rate') && !text.includes('SKILLS') && !text.includes('COMBOS') && text !== lore) {
          foundDescriptions.push({ text, index: idx });
        }
      });

      foundTypes.forEach(typeInfo => {
        let bestDesc = null;
        let bestDistance = Infinity;
        foundDescriptions.forEach(descInfo => {
          if (descInfo.index > typeInfo.index) {
            const distance = descInfo.index - typeInfo.index;
            if (!skills.some(s => s.description === descInfo.text) && distance < bestDistance) {
              bestDesc = descInfo;
              bestDistance = distance;
            }
          }
        });
        if (bestDesc) {
          skills.push({ type: typeInfo.type, description: bestDesc.text });
        }
      });

      // COMBOS
      const allTexts = document.querySelectorAll('[class*="mt-text"] span');
      allTexts.forEach(titleEl => {
        const title = titleEl.textContent?.trim();
        if (!title || !(title.includes('COMBOS') || title.includes('Combos'))) return;

        const comboContainer = titleEl.parentElement?.parentElement;
        if (!comboContainer) return;

        let description = '';
        const descSpans = comboContainer.querySelectorAll('[class*="mt-text"] span');
        for (const descEl of descSpans) {
          const text = descEl.textContent?.trim() || '';
          if (text !== title && text.length > 50 && !text.includes('COMBOS')) {
            description = text;
            break;
          }
        }

        const icons = [];
        comboContainer.querySelectorAll('img[alt*="skillicon"]').forEach(img => {
          if (img.src) icons.push(img.src);
        });

        if (description) {
          combos.push({ title, description, icons: icons.length > 0 ? icons : null });
        }
      });

      // RETORNO CON SANITIZACIÓN
      return {
        heroId: heroIdFromParam,
        name: sanitize(name),
        role: sanitize(role),
        poster,
        roleIcon,
        stats: Object.keys(stats).length > 0 ? stats : null,
        lore: sanitize(lore),
        skills: skills.length > 0 ? skills.map(s => ({ type: sanitize(s.type), description: sanitize(s.description) })) : null,
        combos: combos.length > 0 ? combos.map(c => ({ title: sanitize(c.title), description: sanitize(c.description), icons: c.icons })) : null
      };
    }, heroId);

    await page.close();
    if (!process.env.BROWSERLESS_TOKEN) {
      await browser.close();
    }
    
    return details;

  } catch (error) {
    await page.close();
    if (!process.env.BROWSERLESS_TOKEN) {
      await browser.close();
    }
    throw error;
  }
}