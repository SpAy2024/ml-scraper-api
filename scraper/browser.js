// scraper/browser.js
const puppeteer = require('puppeteer-core');

async function getBrowser() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  const commonArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
    '--no-first-run',
    '--no-default-browser-check',
    '--memory-pressure-off'
  ];

  if (isProduction) {
    console.log('🐳 Iniciando navegador para Render...');

    // 1) Intentar Chromium del sistema (/usr/bin/chromium)
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

    try {
      console.log(`   Usando Chromium del sistema: ${executablePath}`);
      return await puppeteer.launch({
        executablePath,
        headless: 'new',
        args: commonArgs
      });
    } catch (error) {
      console.warn('⚠️ Falló Chromium del sistema, intentando @sparticuz/chromium...', error.message);

      // 2) Fallback: @sparticuz/chromium
      const chromium = require('@sparticuz/chromium');
      executablePath = await chromium.executablePath();

      return await puppeteer.launch({
        executablePath,
        headless: chromium.headless || 'new',
        args: [...chromium.args, ...commonArgs]
      });
    }
  }

  // Desarrollo local
  console.log('💻 Iniciando navegador para entorno local...');
  const puppeteerFull = require('puppeteer');
  return await puppeteerFull.launch({
    headless: 'new',
    args: commonArgs
  });
}

module.exports = { getBrowser };