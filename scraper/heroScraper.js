// scraper/heroScraper.js
const { createMlbbClient } = require('mlbb-sdk');

async function scrapeHero(heroId) {
  try {
    console.log(`   📡 Consultando Rone Arena API (vía SDK) para el héroe ${heroId}...`);

    // 1. Crear el cliente del SDK con configuración robusta
    const client = createMlbbClient({
      lang: 'es',
      timeout: 30000,
      retries: 3, // Reintenta hasta 3 veces si falla (útil para el 403)
    });

    // 2. Obtener los datos del héroe
    // El SDK acepta el ID numérico o el nombre
    const heroData = await client.mlbb.getHero(heroId);

    // 3. La estructura de 'heroData' puede variar. 
    //    Normalmente, los datos del héroe están en 'heroData.data.hero.data'
    //    Vamos a inspeccionar la respuesta para adaptarnos.
    console.log('   📦 Estructura de respuesta del SDK:', JSON.stringify(heroData, null, 2).substring(0, 500) + '...');

    // Intenta extraer la info del héroe (ajusta según la respuesta real)
    const heroInfo = heroData?.data?.hero?.data || heroData?.data || heroData || {};
    const relation = heroData?.data?.relation || {};

    // 4. Mapear las habilidades (si el SDK las devuelve en getHero, si no, habría que llamar a otro método)
    const skills = [];
    // El SDK tiene un método específico para combos: client.mlbb.getHeroSkillCombos(heroId)
    // Para las habilidades básicas, a veces vienen en el detalle.
    if (heroInfo.heroskilllist) {
      heroInfo.heroskilllist.forEach(skillSet => {
        if (skillSet.skilllist) {
          skillSet.skilllist.forEach(skill => {
            skills.push({
              type: skill.skilltag?.[0]?.tagname || 'Passive',
              description: skill.skilldesc || '',
            });
          });
        }
      });
    }

    // 5. Construir el objeto 'details' con el formato que espera tu app
    const details = {
      heroId: parseInt(heroId),
      name: heroInfo.name || `Hero ${heroId}`,
      role: heroInfo.sortid?.[0]?.sort_title || 'Unknown',
      stats: {
        // Los stats (winRate, etc.) a menudo requieren otra llamada: client.mlbb.getHeroStats(heroId)
        // Por ahora los dejamos null para que no falle.
        winRate: null,
        pickRate: null,
        banRate: null,
      },
      lore: heroInfo.story || '',
      skills: skills.length > 0 ? skills : null,
      combos: null, // Podrías usar client.mlbb.getHeroSkillCombos(heroId)
    };

    console.log(`   ✅ Datos de ${details.name} obtenidos vía SDK.`);
    return details;

  } catch (error) {
    console.error(`   ❌ Error consultando Rone Arena (SDK):`, error.message);
    throw new Error(`No se pudo obtener datos del héroe ${heroId}: ${error.message}`);
  }
}

module.exports = { scrapeHero };