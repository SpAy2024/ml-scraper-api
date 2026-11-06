// scraper/heroScraper.js
import axios from 'axios';

export async function scrapeHero(heroId) {
  try {
    console.log(`   📡 Consultando Rone Arena API para el héroe ${heroId}...`);

    // Usamos axios directo a la API pública
    const response = await axios.get(`https://arena.rone.dev/api/heroes/${heroId}`, {
      params: { lang: 'es' },
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });

    const data = response.data;
    const heroRecord = data.records?.[0];

    if (!heroRecord) {
      throw new Error('No se encontraron datos del héroe en la respuesta de la API');
    }

    const heroData = heroRecord.data;
    const heroInfo = heroData.hero?.data || {};
    
    // Extraer habilidades si existen
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

    const details = {
      heroId: parseInt(heroId),
      name: heroInfo.name || `Hero ${heroId}`,
      role: heroInfo.sortid?.[0]?.sort_title || 'Unknown',
      stats: {
        winRate: null,
        pickRate: null,
        banRate: null,
      },
      lore: heroInfo.story || '',
      skills: skills.length > 0 ? skills : null,
      combos: null,
    };

    console.log(`   ✅ Datos de ${details.name} obtenidos de la API.`);
    return details;

  } catch (error) {
    console.error(`   ❌ Error consultando Rone Arena para el héroe ${heroId}:`, error.message);
    throw new Error(`No se pudo obtener datos del héroe ${heroId}: ${error.message}`);
  }
}