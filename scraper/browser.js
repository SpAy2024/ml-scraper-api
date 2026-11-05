// scraper/browser.js
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

async function getBrowser() {
  // Detectar si estamos en Render (producción) o en local
  const isProduction = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';

  if (isProduction) {
    console.log('🐳 Iniciando navegador para entorno Docker (Render)...');
    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  } else {
    console.log('💻 Iniciando navegador para entorno local...');
    // En local, puedes seguir usando puppeteer completo o apuntar a un Chrome instalado
    const puppeteerFull = require('puppeteer'); // Asegúrate de tenerlo instalado para local
    return await puppeteerFull.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }
}

module.exports = { getBrowser };