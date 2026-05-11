const fs = require('node:fs')
const path = require('node:path')
const { parse } = require('csv-parse/sync')

const RAW_DIR = path.join(process.cwd(), 'data/csv')
const GRAPH_OUTPUT_PATH = path.join(process.cwd(), 'public/graph-data.json')
const DETAILS_OUTPUT_PATH = path.join(process.cwd(), 'public/node-details.json')
const COLOR_MAP = {
  1: '黑色',
  2: '蓝色',
  3: '褐色',
  4: '灰色',
  5: '绿色',
  6: '粉红色',
  7: '紫色',
  8: '红色',
  9: '白色',
  10: '黄色',
}
function readCsv(filename) {
  const content = fs.readFileSync(path.join(RAW_DIR, filename), 'utf8')
  return parse(content, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true })
}
function getLocalized(records, idField, id) {
  const matches = records.filter(r => r[idField] === id)
  const zhHans = matches.find(r => r.local_language_id === '12')
  const zhHant = matches.find(r => r.local_language_id === '4')
  const en = matches.find(r => r.local_language_id === '9')
  return zhHans?.name || zhHant?.name || en?.name || 'Unknown'
}
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
function buildConditionsSummary(edge, triggers) {
  const parts = []
  if (edge.evolution_trigger_id) {
    const triggerName = getLocalized(triggers, 'evolution_trigger_id', edge.evolution_trigger_id)
    parts.push(`方式: ${triggerName}`)
  }
  if (edge.minimum_level)
    parts.push(`等级: ${edge.minimum_level}`)
  if (edge.trigger_item_id)
    parts.push(`道具: ${edge.trigger_item_id}`) // Ideally we'd translate item_id
  if (edge.minimum_happiness)
    parts.push(`亲密度: ${edge.minimum_happiness}`)
  if (edge.minimum_beauty)
    parts.push(`美丽度: ${edge.minimum_beauty}`)
  if (edge.minimum_affection)
    parts.push(`友好度: ${edge.minimum_affection}`)
  if (edge.time_of_day)
    parts.push(`时段: ${edge.time_of_day}`)
  return parts.join(' | ') || '基础进化关系'
}
function main() {
  console.log('Reading CSV files...')
  const pokemonRaw = readCsv('pokemon.csv')
  const speciesRaw = readCsv('pokemon_species.csv')
  const speciesNames = readCsv('pokemon_species_names.csv')
  const pokemonTypes = readCsv('pokemon_types.csv')
  const typesRaw = readCsv('types.csv')
  const typeNames = readCsv('type_names.csv')
  const statsRaw = readCsv('pokemon_stats.csv')
  const evoRaw = readCsv('pokemon_evolution.csv')
  const triggerProse = readCsv('evolution_trigger_prose.csv')
  const formsRaw = readCsv('pokemon_forms.csv')
  const formNamesRaw = readCsv('pokemon_form_names.csv')
  const abilitiesRaw = readCsv('abilities.csv')
  const abilityNamesRaw = readCsv('ability_names.csv')
  const abilityProseRaw = readCsv('ability_prose.csv')
  const pokemonAbilitiesRaw = readCsv('pokemon_abilities.csv')
  const movesRaw = readCsv('moves.csv')
  const moveNamesRaw = readCsv('move_names.csv')
  const pokemonMovesRaw = readCsv('pokemon_moves.csv')
  const nodes = []
  const links = []
  // 1. Types
  const typeDict = new Map()
  typesRaw.forEach((t) => {
    const tId = t.id
    const tName = typeMap[t.identifier] || getLocalized(typeNames, 'type_id', tId)
    const tSlug = t.identifier
    const tNodeId = `type-${tSlug}`
    typeDict.set(tId, { id: tNodeId, name: tName, slug: tSlug })
    nodes.push({
      i: tNodeId,
      n: tName,
      v: 50,
      g: tName,
      it: true,
    })
  })
  // 2. Pokemon stats
  const pokemonBst = new Map()
  statsRaw.forEach((s) => {
    const pid = s.pokemon_id
    pokemonBst.set(pid, (pokemonBst.get(pid) || 0) + Number(s.base_stat))
  })
  // 3. Pokemon types
  const pkmTypes = new Map()
  pokemonTypes.forEach((pt) => {
    const pid = pt.pokemon_id
    if (!pkmTypes.has(pid))
      pkmTypes.set(pid, [])
    const tInfo = typeDict.get(pt.type_id)
    if (tInfo) {
      pkmTypes.get(pid).push(tInfo)
    }
  })
  // 4. Species mapping
  const speciesInfo = new Map()
  speciesRaw.forEach((sp) => {
    speciesInfo.set(sp.id, {
      generation: Number(sp.generation_id),
      evoChainId: sp.evolution_chain_id,
      evolvesFrom: sp.evolves_from_species_id,
      color_id: sp.color_id,
    })
  })
  // 5. Form naming mapping
  const pokemonToFormId = new Map()
  formsRaw.forEach((f) => {
    if (f.is_default === '1') {
      pokemonToFormId.set(f.pokemon_id, f.id)
    }
  })
  // 6. Abilities
  const abilityDict = new Map()
  const usedAbilityIds = new Set()
  pokemonAbilitiesRaw.forEach(pa => usedAbilityIds.add(pa.ability_id))
  abilitiesRaw.forEach((a) => {
    if (!usedAbilityIds.has(a.id))
      return
    const aId = a.id
    const aName = getLocalized(abilityNamesRaw, 'ability_id', aId)
    // Get description
    const proseMatches = abilityProseRaw.filter(r => r.ability_id === aId)
    const zhProse = proseMatches.find(r => r.local_language_id === '12')
    const enProse = proseMatches.find(r => r.local_language_id === '9')
    const description = zhProse?.short_effect || enProse?.short_effect || ''
    const aNodeId = `ability-${aId}`
    abilityDict.set(aId, { id: aNodeId, name: aName, description })
    nodes.push({
      i: aNodeId,
      n: aName,
      v: 40,
      g: '特性',
      ia: true,
    })
  })
  // 7. Pokemon abilities mapping
  const pkmAbilities = new Map()
  pokemonAbilitiesRaw.forEach((pa) => {
    const pid = pa.pokemon_id
    if (!pkmAbilities.has(pid))
      pkmAbilities.set(pid, [])
    const aInfo = abilityDict.get(pa.ability_id)
    if (aInfo) {
      pkmAbilities.get(pid).push({
        ...aInfo,
        isHidden: pa.is_hidden === '1',
      })
    }
  })
  // 8. Moves mapping
  const moveDict = new Map()
  movesRaw.forEach((m) => {
    const mId = m.id
    const mName = getLocalized(moveNamesRaw, 'move_id', mId)
    moveDict.set(mId, {
      id: mId,
      name: mName,
      type_id: m.type_id,
      power: m.power,
      pp: m.pp,
      accuracy: m.accuracy,
      damage_class_id: m.damage_class_id,
    })
  })
  // 9. Pokemon moves mapping (Filter for Gen 9 - version_group_id 25)
  const pkmMoves = new Map()
  const usedMoveIds = new Set()
  pokemonMovesRaw.forEach((pm) => {
    // Scan ALL versions to find any possible connection
    const pid = pm.pokemon_id
    if (!pkmMoves.has(pid))
      pkmMoves.set(pid, [])
    const mInfo = moveDict.get(pm.move_id)
    if (mInfo && pkmMoves.get(pid).length < 64) { // Increased limit significantly
      pkmMoves.get(pid).push({
        ...mInfo,
        level: Number(pm.level),
        method: pm.pokemon_move_method_id,
      })
      usedMoveIds.add(pm.move_id)
    }
  })

  // 9.5 Add moves to nodes only if they are used
  moveDict.forEach((mInfo, mId) => {
    if (!usedMoveIds.has(mId))
      return
    nodes.push({
      i: `move-${mId}`,
      n: mInfo.name,
      v: 35,
      g: '招式',
      im: true,
    })
  })
  // 10. Pokemon & species
  const speciesToDefaultPokemon = new Map()
  // First pass: identify default pokemon for each species
  pokemonRaw.forEach((p) => {
    if (p.is_default === '1') {
      speciesToDefaultPokemon.set(p.species_id, `pokemon-${p.id}`)
    }
  })
  console.log(`Processing ${pokemonRaw.length} pokemon forms...`)
  pokemonRaw.forEach((p) => {
    const pId = p.id
    const spId = p.species_id
    const sInfo = speciesInfo.get(spId)
    if (!sInfo)
      return
    const speciesBaseName = getLocalized(speciesNames, 'pokemon_species_id', spId) || p.identifier
    let fullName = speciesBaseName
    // If it's a special form, try to get the form name
    if (p.is_default !== '1') {
      const formId = pokemonToFormId.get(pId)
      const sRaw = speciesRaw.find(s => s.id === spId)
      const speciesIdentifier = sRaw?.identifier || ''
      if (formId) {
        const formName = getLocalized(formNamesRaw, 'pokemon_form_id', formId)
        if (formName && formName !== 'Unknown' && !fullName.includes(formName)) {
          fullName = `${speciesBaseName}-${formName}`
        }
        else {
          // Fallback to identifier parts
          let formPart = p.identifier
          if (speciesIdentifier) {
            formPart = formPart.replace(speciesIdentifier.toLowerCase(), '')
          }
          formPart = formPart.replace(/^-/, '').replace(/-$/, '')
          if (formPart) {
            fullName = `${speciesBaseName}-${formPart}`
          }
        }
      }
    }
    const bst = pokemonBst.get(pId) || 300
    const pTypes = pkmTypes.get(pId) || []
    const primaryType = pTypes[0]?.name || '未知'
    nodes.push({
      i: `pokemon-${pId}`,
      n: fullName,
      v: +(Math.max(3, bst / 100)).toFixed(1),
      g: primaryType,
      s: pId,
      c: COLOR_MAP[Number(sInfo.color_id)] || '',
    })
    // Add type links
    pTypes.forEach((t) => {
      links.push({
        i: `t-${pId}-${t.slug}`,
        s: `pokemon-${pId}`,
        t: t.id,
        ty: 'type-link',
      })
    })
    // Add ability links
    const pAbilities = pkmAbilities.get(pId) || []
    pAbilities.forEach((a) => {
      links.push({
        i: `a-${pId}-${a.id}`,
        s: `pokemon-${pId}`,
        t: a.id,
        ty: 'ability-link',
      })
    })
    // Add move links (top 32 moves to keep performance balanced but coverage high)
    const pMoves = pkmMoves.get(pId) || []
    pMoves.slice(0, 32).forEach((m) => {
      links.push({
        i: `m-${pId}-${m.id}`,
        s: `pokemon-${pId}`,
        t: `move-${m.id}`,
        ty: 'move-link',
      })
    })
    // Link special forms to their base form
    const defaultPkmId = speciesToDefaultPokemon.get(spId)
    if (defaultPkmId && defaultPkmId !== `pokemon-${pId}`) {
      links.push({
        i: `f-${defaultPkmId}-${pId}`,
        s: defaultPkmId,
        t: `pokemon-${pId}`,
        ty: 'form-link',
      })
    }
  })
  // 7. Evolutions
  evoRaw.forEach((evo) => {
    const toSpId = evo.evolved_species_id
    const toSpInfo = speciesInfo.get(toSpId)
    if (!toSpInfo || !toSpInfo.evolvesFrom)
      return
    const fromSpId = toSpInfo.evolvesFrom
    const fromPkmId = speciesToDefaultPokemon.get(fromSpId)
    const toPkmId = speciesToDefaultPokemon.get(toSpId)
    if (!fromPkmId || !toPkmId)
      return
    const summary = buildConditionsSummary(evo, triggerProse)
    const triggerName = evo.evolution_trigger_id ? getLocalized(triggerProse, 'evolution_trigger_id', evo.evolution_trigger_id) : 'unknown'
    links.push({
      i: `e-${evo.id}`,
      s: fromPkmId,
      t: toPkmId,
      ty: 'evolution',
    })
  })
  // 9. Build Details Map
  console.log('Building details map...')
  const details = {}
  // Type details
  typesRaw.forEach((t) => {
    const tId = t.id
    const tInfo = typeDict.get(tId)
    if (tInfo) {
      details[tInfo.id] = {
        name: tInfo.name,
        type: 'type',
      }
    }
  })
  // Ability details
  abilitiesRaw.forEach((a) => {
    const aInfo = abilityDict.get(a.id)
    if (aInfo) {
      details[aInfo.id] = {
        name: aInfo.name,
        description: aInfo.description,
        type: 'ability',
      }
    }
  })
  // Move details
  movesRaw.forEach((m) => {
    const mInfo = moveDict.get(m.id)
    if (mInfo) {
      details[`move-${m.id}`] = {
        name: mInfo.name,
        type: 'move',
        power: mInfo.power,
        pp: mInfo.pp,
        accuracy: mInfo.accuracy,
        damage_class_id: mInfo.damage_class_id,
      }
    }
  })
  // Pokemon details
  pokemonRaw.forEach((p) => {
    const pId = p.id
    const spId = p.species_id
    const sInfo = speciesInfo.get(spId)
    if (!sInfo)
      return
    const pTypes = pkmTypes.get(pId) || []
    // We need to re-calculate name logic here or store it earlier
    // To keep it simple for this script, let's just use the nodes list we built
    const node = nodes.find(n => n.i === `pokemon-${pId}`)
    details[`pokemon-${pId}`] = {
      name: node?.n || p.identifier,
      types: pTypes.map(t => t.name),
      generation: sInfo.generation,
      pokedexNumber: String(spId).padStart(4, '0'),
      color: COLOR_MAP[Number(sInfo.color_id)] || '未知',
      type: 'pokemon',
      moves: (pkmMoves.get(pId) || []).sort((a, b) => a.level - b.level),
    }
  })
  // Link details
  links.forEach((l) => {
    // For evolution links, add trigger and label
    const evo = evoRaw.find(e => `e-${e.id}` === l.i)
    if (evo) {
      details[l.i] = {
        trigger: evo.evolution_trigger_id ? getLocalized(triggerProse, 'evolution_trigger_id', evo.evolution_trigger_id) : 'unknown',
        label: buildConditionsSummary(evo, triggerProse),
      }
    }
    // For ability links, add isHidden
    const pkmIdMatch = l.i.match(/^a-(\d+)-ability-(\d+)$/)
    if (pkmIdMatch) {
      const pId = pkmIdMatch[1]
      const aId = pkmIdMatch[2]
      const pa = pokemonAbilitiesRaw.find(p => p.pokemon_id === pId && p.ability_id === aId)
      if (pa) {
        details[l.i] = {
          isHidden: pa.is_hidden === '1',
          label: pa.is_hidden === '1' ? '隐藏特性' : '普通特性',
        }
      }
    }
  })
  // Write output
  const output = {
    metadata: {
      source: 'local CSV',
      generatedAt: new Date().toISOString(),
      nodes: nodes.length,
      links: links.length,
      typeCount: typeDict.size,
      abilityCount: abilityDict.size,
      moveCount: moveDict.size,
      evolutionChainCount: new Set(Array.from(speciesInfo.values()).map(s => s.evoChainId)).size,
    },
    nodes,
    links,
  }
  fs.writeFileSync(GRAPH_OUTPUT_PATH, JSON.stringify(output)) // Minified
  fs.writeFileSync(DETAILS_OUTPUT_PATH, JSON.stringify(details))
  console.log(`Generated minified graph (${nodes.length} nodes) and details map to public/`)
}
main()
