// scraper/bulkScraper.js
const axios = require('axios');
const { scrapeHero } = require('./heroScraper');

/**
 * Detecta héroes nuevos comparando la API de Rone Arena con Firebase
 * @param {Object} db - Firebase Realtime Database
 * @returns {Promise<Object>} Resultado del scraping
 */
async function scrapeNewHeroes(db) {
  console.log('🔍 Buscando héroes nuevos...');

  // 1. Obtener lista actual de Firebase
  const snapshot = await db.ref('mlbb/heroes-detailed').once('value');
  const existingData = snapshot.val();
  const existingHeroes = Array.isArray(existingData)
    ? existingData.filter(Boolean)
    : Object.values(existingData || {}).filter(Boolean);
  const existingIds = existingHeroes.map(h => h.data?.hero_id);

  console.log(`   Héroes existentes en Firebase: ${existingIds.length}`);

  // 2. Obtener lista actual desde la API
  const response = await axios.get('https://arena.rone.dev/api/heroes', {
    params: { size: 200 }
  });
  const currentHeroes = response.data?.data?.records || [];

  console.log(`   Héroes en la API: ${currentHeroes.length}`);

  // 3. Encontrar los nuevos
  const newHeroes = currentHeroes.filter(h => !existingIds.includes(h.data?.hero_id));

  console.log(`   Héroes nuevos encontrados: ${newHeroes.length}`);

  if (newHeroes.length === 0) {
    return { newHeroes: 0, results: [] };
  }

  // 4. Scrapear solo los nuevos
  const results = [];
  for (const hero of newHeroes) {
    const heroId = hero.data?.hero_id;
    const heroName = hero.data?.hero?.data?.name || `ID ${heroId}`;

    console.log(`   Scrapeando: ${heroName} (ID: ${heroId})`);

    try {
      const details = await scrapeHero(heroId);
      const combinedData = { ...hero, detail: details };

      // Guardar en Firebase
      await db.ref('mlbb/heroes-detailed').push(combinedData);

      results.push({ heroId, name: heroName, success: true });
      console.log(`   ✅ ${heroName} guardado`);

    } catch (error) {
      console.error(`   ❌ Error con ${heroName}:`, error.message);
      results.push({ heroId, name: heroName, success: false, error: error.message });
    }

    // Pausa entre héroes
    await new Promise(r => setTimeout(r, 2000));
  }

  return { newHeroes: newHeroes.length, results };
}

module.exports = { scrapeNewHeroes };