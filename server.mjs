// server.mjs
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { createRequire } from 'module';

// Para cargar serviceAccountKey.json
const require = createRequire(import.meta.url);

// Cargar credenciales de Firebase
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
  serviceAccount = JSON.parse(json);
  console.log('✅ Firebase configurado desde variable de entorno');
} else {
  serviceAccount = require('./serviceAccountKey.json');
  console.log('✅ Firebase configurado desde archivo local');
}

// Importar los scrapers (asegúrate de que tengan extensión .js)
import { scrapeHero } from './scraper/heroScraper.js';
import { scrapeHome } from './scraper/homeScraper.js';
import { findNewHeroes } from './scraper/bulkScraper.js';

// Inicializar Firebase
const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://comidas-b1396-default-rtdb.firebaseio.com"
});
const db = getDatabase(firebaseApp);

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// ENDPOINT: Status
// ============================================================
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/scrape/hero/:heroId',
      'POST /api/scrape/new-heroes',
      'POST /api/scrape/home',
      'GET /api/heroes',
      'GET /api/status'
    ]
  });
});

// ============================================================
// ENDPOINT: Listar héroes desde Firebase
// ============================================================
app.get('/api/heroes', async (req, res) => {
  try {
    const snapshot = await db.ref('mlbb/heroes-detailed').once('value');
    const data = snapshot.val();
    const heroes = Array.isArray(data)
      ? data.filter(Boolean)
      : Object.values(data || {}).filter(Boolean);

    res.json({ success: true, count: heroes.length, heroes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ENDPOINT: Scrapear un héroe individual
// ============================================================
app.post('/api/scrape/hero/:heroId', async (req, res) => {
  const { heroId } = req.params;
  const idNumerico = parseInt(heroId);

  try {
    console.log(`🎯 Scrapeando héroe ID: ${heroId}`);
    const details = await scrapeHero(idNumerico);

    // Forzar el hero_id correcto
    const detailsWithCorrectId = {
      ...details,
      heroId: idNumerico
    };

    const snapshot = await db.ref('mlbb/heroes-detailed').once('value');
    const data = snapshot.val();
    let heroes = Array.isArray(data)
      ? data.filter(Boolean)
      : Object.values(data || {}).filter(Boolean);

    const existingIndex = heroes.findIndex(h => h.data?.hero_id === idNumerico);

    const newHeroData = {
      data: { hero_id: idNumerico },
      detail: detailsWithCorrectId
    };

    if (existingIndex !== -1) {
      heroes[existingIndex] = newHeroData;
      console.log(`   ✅ Héroe ${idNumerico} actualizado`);
    } else {
      heroes.push(newHeroData);
      console.log(`   ✅ Héroe ${idNumerico} añadido`);
    }

    await db.ref('mlbb/heroes-detailed').set(heroes);

    res.json({ success: true, heroId: idNumerico, details: detailsWithCorrectId });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ENDPOINT: Scrapear héroes nuevos
// ============================================================
app.post('/api/scrape/new-heroes', async (req, res) => {
  try {
    console.log('🔍 Buscando héroes nuevos...');
    const newHeroes = await findNewHeroes(db);

    res.json({
      success: true,
      newHeroes: newHeroes.length,
      heroes: newHeroes
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ENDPOINT: Scrapear el home
// ============================================================
app.post('/api/scrape/home', async (req, res) => {
  try {
    console.log('🏠 Scrapeando home...');
    const data = await scrapeHome();

    await db.ref('mlbb/home').set(data);

    res.json({ success: true, data });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Scraper API corriendo en http://localhost:${PORT}`);
});