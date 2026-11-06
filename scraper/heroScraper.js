// scraper/heroScraper.js
const axios = require('axios');

async function scrapeHero(heroId) {
  try {
    console.log(`   📡 Consultando Rone Arena API para el héroe ${heroId}...`);

    // La API acepta el ID numérico o el nombre
    const response = await axios.get(`https://arena.rone.dev/api/heroes/${heroId}`, {
      params: {
        lang: 'es', // Puedes cambiar el idioma: en, es, pt, etc.
      },
      timeout: 30000,
    });

    const data = response.data;

    // La API devuelve un array en 'records', tomamos el primero
    const heroRecord = data.records?.[0];
    if (!heroRecord) {
      throw new Error('No se encontraron datos del héroe en la respuesta de la API');
    }

    const heroData = heroRecord.data;
    const heroInfo = heroData.hero?.data || {};
    const relation = heroData.relation || {};

    // Mapear las habilidades al formato que usa tu app
    const skills = [];
    if (heroInfo.heroskilllist) {
      heroInfo.heroskilllist.forEach(skillSet => {
        if (skillSet.skilllist) {
          skillSet.skilllist.forEach(skill => {
            skills.push({
              type: skill.skilltag?.[0]?.tagname || 'Passive', // Usa el primer tag como tipo
              description: skill.skilldesc || '',
              // Opcional: podrías guardar el icono si tu app lo necesita
              // icon: skill.skillicon || '' 
            });
          });
        }
      });
    }

    // Construir el objeto con el formato que espera tu app (y tu server.js)
    const details = {
      heroId: parseInt(heroId), // Forzamos el ID de la URL
      name: heroInfo.name || `Hero ${heroId}`,
      role: heroInfo.sortid?.[0]?.sort_title || 'Unknown',
      stats: {
        // La API devuelve los stats en otro endpoint o en la lista. 
        // Por ahora, los dejamos vacíos o los buscas en getHeroStats.
        // Para simplificar, usaremos los que ya tengas en Firebase o los de la lista de héroes.
        winRate: null,
        pickRate: null,
        banRate: null,
      },
      lore: heroInfo.story || '',
      skills: skills.length > 0 ? skills : null,
      combos: null, // La API tiene un endpoint separado para combos
    };

    console.log(`   ✅ Datos de ${details.name} obtenidos de Rone Arena.`);
    return details;

  } catch (error) {
    console.error(`   ❌ Error consultando Rone Arena para el héroe ${heroId}:`, error.message);
    // Si falla la API, lanzamos el error para que server.js lo capture
    throw new Error(`No se pudo obtener datos del héroe ${heroId}: ${error.message}`);
  }
}

module.exports = { scrapeHero };