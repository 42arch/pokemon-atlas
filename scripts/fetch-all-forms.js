const fs = require('node:fs')
const path = require('node:path')

const API_BASE = 'https://pokeapi.co/api/v2'
const OUTPUT_DIR = path.join(process.cwd(), 'data')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'pokemon.json')
const CONCURRENCY_LIMIT = 5

const typeMap = {
  normal: '一般',
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  ice: '冰',
  fighting: '格斗',
  poison: '毒',
  ground: '地面',
  flying: '飞行',
  psychic: '超能力',
  bug: '虫',
  rock: '岩石',
  ghost: '幽灵',
  dragon: '龙',
  dark: '恶',
  steel: '钢',
  fairy: '妖精',
  stellar: '星晶',
  unknown: '未知',
}

const genMap = {
  'generation-i': 1,
  'generation-ii': 2,
  'generation-iii': 3,
  'generation-iv': 4,
  'generation-v': 5,
  'generation-vi': 6,
  'generation-vii': 7,
  'generation-viii': 8,
  'generation-ix': 9,
}

let globalIdCounter = 1

async function fetchJson(url) {
  try {
    const res = await fetch(url)
    if (!res.ok)
      return null
    return await res.json()
  }
  catch (e) {
    return null
  }
}

function getNameByLang(names, lang) {
  if (!names)
    return null
  const item = names.find(n => n.language.name === lang)
  return item ? item.name : null
}

// 综合获取中文名，没有则找英文
function getLocalizedName(names) {
  return getNameByLang(names, 'zh-hans')
    || getNameByLang(names, 'zh-hant')
    || getNameByLang(names, 'en')
}

async function processSpecies(speciesSummary) {
  const species = await fetchJson(speciesSummary.url)
  if (!species)
    return []

  const speciesName = getLocalizedName(species.names) || species.name
  const gen = genMap[species.generation.name] || 0
  const pokedexId = species.id.toString().padStart(4, '0')

  const results = []

  for (const variety of species.varieties) {
    const pokemon = await fetchJson(variety.pokemon.url)
    if (!pokemon)
      continue

    const types = pokemon.types.map(t => typeMap[t.type.name] || t.type.name)
    const stats = {}
    pokemon.stats.forEach((s) => {
      stats[s.stat.name.replace('-', '_')] = s.base_stat
    })

    for (const formRef of pokemon.forms) {
      const form = await fetchJson(formRef.url)
      if (!form)
        continue

      // 获取形态名：优先 form_names，其次 names，最后是原始 ID 名
      let formName = getLocalizedName(form.form_names) || getLocalizedName(form.names)

      // 如果获取到的是英文或没有，且是默认形态，通常 formName 就是 speciesName
      if (!formName || formName === 'default') {
        formName = speciesName
      }

      // 提取 sprite ID
      const spriteUrl = form.sprites.front_default || pokemon.sprites.other['official-artwork'].front_default || ''
      const spriteId = spriteUrl ? spriteUrl.split('/').pop().split('.')[0] : ''

      results.push({
        id: globalIdCounter++,
        pokedex_id: pokedexId,
        name: speciesName,
        form_name: formName,
        types,
        stats,
        height: pokemon.height / 10,
        weight: pokemon.weight / 10,
        gen,
        sprite: spriteId,
      })
    }
  }
  return results
}

async function main() {
  console.log('开始同步 PokéAPI 全形态数据...')
  const listData = await fetchJson(`${API_BASE}/pokemon-species?limit=2000`)
  if (!listData)
    return

  const sortedList = listData.results.sort((a, b) => {
    const idA = Number.parseInt(a.url.split('/').slice(-2, -1)[0])
    const idB = Number.parseInt(b.url.split('/').slice(-2, -1)[0])
    return idA - idB
  })

  if (!fs.existsSync(OUTPUT_DIR))
    fs.mkdirSync(OUTPUT_DIR)

  const allResults = []
  for (let i = 0; i < sortedList.length; i += CONCURRENCY_LIMIT) {
    const batch = sortedList.slice(i, i + CONCURRENCY_LIMIT)
    const batchResults = await Promise.all(batch.map((s) => {
      process.stdout.write(`.`)
      return processSpecies(s).catch(() => [])
    }))

    batchResults.forEach(res => allResults.push(...res))
    console.log(`\n进度: ${Math.min(i + CONCURRENCY_LIMIT, sortedList.length)}/${sortedList.length} | 已处理形态: ${allResults.length}`)
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2))
  console.log(`\n成功！共计 ${allResults.length} 条数据已保存至 ${OUTPUT_FILE}`)
}

main()
