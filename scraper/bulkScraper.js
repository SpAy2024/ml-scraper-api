// scraper/bulkScraper.js
const axios = require('axios');

/**
 * Solo compara la API de Rone Arena con Firebase para encontrar IDs nuevos.
 * No scrapea nada (evita OOM en Render).
 * @param {Object} db - Firebase Realtime Database
 * @returns {Promise<Array>} Lista de héroes nuevos {id, name}
 */
async function findNewHeroes(db) {
  console.log('🔍 Buscando héroes nuevos (solo comparación)...');

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

  // 4. Devolver solo la info básica
  return newHeroes.map(h => ({
    id: h.data?.hero_id,
    name: h.data?.hero?.data?.name || `Hero ${h.data?.hero_id}`
  }));
}

module.exports = { findNewHeroes };