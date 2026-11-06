// scraper/bulkScraper.js
import axios from 'axios';

export async function findNewHeroes(db) {
  console.log('🔍 Buscando héroes nuevos (solo comparación)...');

  try {
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
      params: { size: 200 },
      timeout: 10000,
    });
    const currentHeroes = response.data?.data?.records || [];

    console.log(`   Héroes en la API: ${currentHeroes.length}`);

    // 3. Encontrar los nuevos
    const newHeroes = currentHeroes.filter(h => {
      const heroId = h.data?.hero_id;
      return heroId && !existingIds.includes(heroId);
    });

    console.log(`   Héroes nuevos encontrados: ${newHeroes.length}`);

    return newHeroes.map(h => ({
      id: h.data?.hero_id,
      name: h.data?.hero?.data?.name || `Hero ${h.data?.hero_id}`
    }));

  } catch (error) {
    console.error('❌ Error en findNewHeroes:', error.message);
    throw error;
  }
}