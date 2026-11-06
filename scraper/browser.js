// scraper/browser.js
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function getBrowser() {
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
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

    try {
      return await puppeteer.launch({
        executablePath,
        headless: 'new',
        args: commonArgs,
        protocolTimeout: 180000
      });
    } catch (error) {
      console.warn('⚠️ Falló Chromium del sistema, usando @sparticuz/chromium...', error.message);
      executablePath = await chromium.executablePath();
      return await puppeteer.launch({
        executablePath,
        headless: chromium.headless || 'new',
        args: [...chromium.args, ...commonArgs],
        protocolTimeout: 180000
      });
    }
  }

  console.log('💻 Iniciando navegador para entorno local...');
  const puppeteerFull = require('puppeteer');
  return await puppeteerFull.launch({
    headless: 'new',
    args: commonArgs
  });
}