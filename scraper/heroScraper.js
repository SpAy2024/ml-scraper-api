// scraper/heroScraper.js
import { createMlbbClient } from 'mlbb-sdk';

export async function scrapeHero(heroId) {
  try {
    console.log(`   📡 Consultando Rone Arena API (vía SDK) para el héroe ${heroId}...`);

    const client = createMlbbClient({
      lang: 'es',
      timeout: 30000,
      retries: 3
    });

    // El SDK acepta el ID numérico o el nombre del héroe.
    // Nota: Es posible que el método se llame 'getHero' o 'getHeroById'. 
    // Si 'getHero' falla, prueba con 'getHeroById'.
    const heroData = await client.mlbb.getHero(heroId);

    // --- LOG PARA DEPURACIÓN ---
    // Descomenta la siguiente línea para ver la estructura exacta que devuelve el SDK en los logs de Render.
    // console.log('   📦 Estructura del SDK:', JSON.stringify(heroData, null, 2));

    // --- EXTRACCIÓN DE DATOS (ajusta según la estructura real del SDK) ---
    // Basado en el uso común del SDK, los datos suelen estar en heroData.data.hero.data
    const heroInfo = heroData?.data?.hero?.data || heroData?.data || heroData || {};
    
    // Mapear habilidades
    const skills = [];
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

    // Construir el objeto 'details'
    const details = {
      heroId: parseInt(heroId),
      name: heroInfo.name || `Hero ${heroId}`,
      role: heroInfo.sortid?.[0]?.sort_title || 'Unknown',
      stats: {
        // El SDK podría no incluir stats en la llamada getHero, se dejan como null.
        winRate: null,
        pickRate: null,
        banRate: null,
      },
      lore: heroInfo.story || '',
      skills: skills.length > 0 ? skills : null,
      combos: null, // El SDK tiene un método separado para combos (getHeroSkillCombos)
    };

    console.log(`   ✅ Datos de ${details.name} obtenidos vía SDK.`);
    return details;

  } catch (error) {
    console.error(`   ❌ Error consultando Rone Arena (SDK):`, error.message);
    throw new Error(`No se pudo obtener datos del héroe ${heroId}: ${error.message}`);
  }
}