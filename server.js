// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// ✅ Cargar credenciales desde variable de entorno (producción) o archivo (local)
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  // Producción (Render): leer desde base64
  const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
  serviceAccount = JSON.parse(json);
  console.log('✅ Firebase configurado desde variable de entorno');
} else {
  // Desarrollo local: leer desde archivo
  serviceAccount = require('./serviceAccountKey.json');
  console.log('✅ Firebase configurado desde archivo local');
}

const { scrapeHero } = require('./scraper/heroScraper');
const { scrapeHome } = require('./scraper/homeScraper');
const { findNewHeroes } = require('./scraper/bulkScraper'); // ✅ Nueva función

const app = express();
app.use(cors());
app.use(express.json());

// Inicializar Firebase
const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://comidas-b1396-default-rtdb.firebaseio.com"
});
const db = getDatabase(firebaseApp);

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

// server.js - endpoint de scrapeo individual
app.post('/api/scrape/hero/:heroId', async (req, res) => {
  const { heroId } = req.params;
  const idNumerico = parseInt(heroId);

  try {
    console.log(`🎯 Scrapeando héroe ID: ${heroId}`);
    const details = await scrapeHero(idNumerico);

    // ✅ FORZAR el hero_id correcto (el de la URL, no el de la página)
    const detailsWithCorrectId = {
      ...details,
      heroId: idNumerico // Sobrescribe el heroId que vino de la página
    };

    // Leer el array actual
    const snapshot = await db.ref('mlbb/heroes-detailed').once('value');
    const data = snapshot.val();
    let heroes = Array.isArray(data)
      ? data.filter(Boolean)
      : Object.values(data || {}).filter(Boolean);

    // Buscar si ya existe
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
// server.js (endpoint nuevo)
app.post('/api/scrape/new-heroes', async (req, res) => {
  try {
    console.log('🔍 Buscando héroes nuevos...');
    const newHeroes = await findNewHeroes(db);
    
    res.json({ 
      success: true, 
      newHeroes: newHeroes.length, 
      heroes: newHeroes // Devuelve la lista de IDs y nombres
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

    // Guardar en Firebase
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