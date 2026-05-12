const fs = require('node:fs')
const path = require('node:path')
const { parse } = require('csv-parse/sync')

const RAW_DIR = path.join(process.cwd(), 'data/csv')

const LANGUAGES = [
  { id: '12', code: 'zh' }, // Simplified Chinese
  { id: '9', code: 'en' },  // English
  { id: '11', code: 'ja' }  // Japanese
]

const COLOR_MAP = {
  1: 'black', 2: 'blue', 3: 'brown', 4: 'gray', 5: 'green', 6: 'pink', 7: 'purple', 8: 'red', 9: 'white', 10: 'yellow'
}

function readCsv(filename) {
  const content = fs.readFileSync(path.join(RAW_DIR, filename), 'utf8')
  return parse(content, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true })
}

function getLocalized(records, idField, id, langId) {
  const matches = records.filter(r => r[idField] === id)
  const langMatch = matches.find(r => r.local_language_id === langId)
  if (langMatch) return langMatch.name
  
  // Fallback to English (9) if requested language not found
  const enMatch = matches.find(r => r.local_language_id === '9')
  return enMatch?.name || 'Unknown'
}

function buildConditionsSummary(edge, triggers, langId) {
  const parts = []
  const labels = {
    '12': { trigger: '方式', level: '等级', item: '道具', happy: '亲密度', beauty: '美丽度', affect: '友好度', time: '时段', base: '基础进化关系' },
    '9': { trigger: 'Method', level: 'Level', item: 'Item', happy: 'Happiness', beauty: 'Beauty', affect: 'Affection', time: 'Time', base: 'Base Evolution' },
    '11': { trigger: '方法', level: 'レベル', item: '道具', happy: 'なつき度', beauty: 'うつくしさ', affect: 'なかよし度', time: '時間帯', base: '基本進化' }
  }
  const l = labels[langId] || labels['9']

  if (edge.evolution_trigger_id) {
    const triggerName = getLocalized(triggers, 'evolution_trigger_id', edge.evolution_trigger_id, langId)
    parts.push(`${l.trigger}: ${triggerName}`)
  }
  if (edge.minimum_level) parts.push(`${l.level}: ${edge.minimum_level}`)
  if (edge.trigger_item_id) parts.push(`${l.item}: ${edge.trigger_item_id}`)
  if (edge.minimum_happiness) parts.push(`${l.happy}: ${edge.minimum_happiness}`)
  if (edge.minimum_beauty) parts.push(`${l.beauty}: ${edge.minimum_beauty}`)
  if (edge.minimum_affection) parts.push(`${l.affect}: ${edge.minimum_affection}`)
  if (edge.time_of_day) parts.push(`${l.time}: ${edge.time_of_day}`)
  
  return parts.join(' | ') || l.base
}

function processLanguage(lang, rawData) {
  console.log(`Processing language: ${lang.code}...`)
  const {
    pokemonRaw, speciesRaw, speciesNames, pokemonTypes, typesRaw, typeNames,
    statsRaw, evoRaw, triggerProse, formsRaw, formNamesRaw, abilitiesRaw,
    abilityNamesRaw, abilityProseRaw, pokemonAbilitiesRaw, movesRaw, moveNamesRaw,
    pokemonMovesRaw
  } = rawData

  const nodes = []
  const links = []

  // 1. Types
  const typeDict = new Map()
  typesRaw.forEach((t) => {
    const tId = t.id
    const tName = getLocalized(typeNames, 'type_id', tId, lang.id)
    const tSlug = t.identifier
    const tNodeId = `type-${tSlug}`
    typeDict.set(tId, { id: tNodeId, name: tName, slug: tSlug })
    nodes.push({ i: tNodeId, n: tName, v: 50, g: tSlug, it: true })
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
    if (!pkmTypes.has(pid)) pkmTypes.set(pid, [])
    const tInfo = typeDict.get(pt.type_id)
    if (tInfo) pkmTypes.get(pid).push(tInfo)
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

  // 5. Form naming
  const pokemonToFormId = new Map()
  formsRaw.forEach((f) => {
    if (f.is_default === '1') pokemonToFormId.set(f.pokemon_id, f.id)
  })

  // 6. Abilities
  const abilityDict = new Map()
  const usedAbilityIds = new Set()
  pokemonAbilitiesRaw.forEach(pa => usedAbilityIds.add(pa.ability_id))
  abilitiesRaw.forEach((a) => {
    if (!usedAbilityIds.has(a.id)) return
    const aId = a.id
    const aName = getLocalized(abilityNamesRaw, 'ability_id', aId, lang.id)
    const proseMatches = abilityProseRaw.filter(r => r.ability_id === aId)
    const localProse = proseMatches.find(r => r.local_language_id === lang.id) || proseMatches.find(r => r.local_language_id === '9')
    const description = localProse?.short_effect || ''
    const aNodeId = `ability-${aId}`
    abilityDict.set(aId, { id: aNodeId, name: aName, description })
    nodes.push({ i: aNodeId, n: aName, v: 40, g: lang.code === 'zh' ? '特性' : (lang.code === 'ja' ? '特性' : 'Ability'), ia: true })
  })

  // 7. Pokemon abilities mapping
  const pkmAbilities = new Map()
  pokemonAbilitiesRaw.forEach((pa) => {
    const pid = pa.pokemon_id
    if (!pkmAbilities.has(pid)) pkmAbilities.set(pid, [])
    const aInfo = abilityDict.get(pa.ability_id)
    if (aInfo) {
      pkmAbilities.get(pid).push({ ...aInfo, isHidden: pa.is_hidden === '1' })
    }
  })

  // 8. Moves
  const moveDict = new Map()
  movesRaw.forEach((m) => {
    const mId = m.id
    const mName = getLocalized(moveNamesRaw, 'move_id', mId, lang.id)
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

  // 9. Pokemon moves mapping
  const pkmMoves = new Map()
  const usedMoveIds = new Set()
  pokemonMovesRaw.forEach((pm) => {
    const pid = pm.pokemon_id
    if (!pkmMoves.has(pid)) pkmMoves.set(pid, [])
    const mInfo = moveDict.get(pm.move_id)
    if (mInfo && pkmMoves.get(pid).length < 64) {
      pkmMoves.get(pid).push({ ...mInfo, level: Number(pm.level), method: pm.pokemon_move_method_id })
      usedMoveIds.add(pm.move_id)
    }
  })

  // 9.5 Move nodes
  moveDict.forEach((mInfo, mId) => {
    if (!usedMoveIds.has(mId)) return
    nodes.push({ i: `move-${mId}`, n: mInfo.name, v: 35, g: lang.code === 'zh' ? '招式' : (lang.code === 'ja' ? 'わざ' : 'Move'), im: true })
  })

  // 10. Pokemon & species
  const speciesToDefaultPokemon = new Map()
  pokemonRaw.forEach((p) => {
    if (p.is_default === '1') speciesToDefaultPokemon.set(p.species_id, `pokemon-${p.id}`)
  })

  pokemonRaw.forEach((p) => {
    const pId = p.id
    const spId = p.species_id
    const sInfo = speciesInfo.get(spId)
    if (!sInfo) return
    
    const speciesBaseName = getLocalized(speciesNames, 'pokemon_species_id', spId, lang.id) || p.identifier
    let fullName = speciesBaseName
    if (p.is_default !== '1') {
      const formId = pokemonToFormId.get(pId)
      const sRaw = speciesRaw.find(s => s.id === spId)
      const speciesIdentifier = sRaw?.identifier || ''
      if (formId) {
        const formName = getLocalized(formNamesRaw, 'pokemon_form_id', formId, lang.id)
        if (formName && formName !== 'Unknown' && !fullName.includes(formName)) {
          fullName = `${speciesBaseName}-${formName}`
        } else {
          let formPart = p.identifier.replace(speciesIdentifier.toLowerCase(), '').replace(/^-/, '').replace(/-$/, '')
          if (formPart) fullName = `${speciesBaseName}-${formPart}`
        }
      }
    }

    const bst = pokemonBst.get(pId) || 300
    const pTypes = pkmTypes.get(pId) || []
    const primaryType = pTypes[0]?.slug || 'unknown'
    
    nodes.push({
      i: `pokemon-${pId}`,
      n: fullName,
      v: +(Math.max(3, bst / 100)).toFixed(1),
      g: primaryType,
      s: pId,
      c: COLOR_MAP[Number(sInfo.color_id)] || '',
    })

    pTypes.forEach(t => links.push({ i: `t-${pId}-${t.slug}`, s: `pokemon-${pId}`, t: t.id, ty: 'type-link' }))
    const pAbilitiesList = pkmAbilities.get(pId) || []
    pAbilitiesList.forEach(a => links.push({ i: `a-${pId}-${a.id}`, s: `pokemon-${pId}`, t: a.id, ty: 'ability-link' }))
    const pMovesList = pkmMoves.get(pId) || []
    pMovesList.slice(0, 32).forEach(m => links.push({ i: `m-${pId}-${m.id}`, s: `pokemon-${pId}`, t: `move-${m.id}`, ty: 'move-link' }))
    
    const defaultPkmId = speciesToDefaultPokemon.get(spId)
    if (defaultPkmId && defaultPkmId !== `pokemon-${pId}`) {
      links.push({ i: `f-${defaultPkmId}-${pId}`, s: defaultPkmId, t: `pokemon-${pId}`, ty: 'form-link' })
    }
  })

  // Evolutions
  evoRaw.forEach((evo) => {
    const toSpId = evo.evolved_species_id
    const toSpInfo = speciesInfo.get(toSpId)
    if (!toSpInfo || !toSpInfo.evolvesFrom) return
    const fromSpId = toSpInfo.evolvesFrom
    const fromPkmId = speciesToDefaultPokemon.get(fromSpId)
    const toPkmId = speciesToDefaultPokemon.get(toSpId)
    if (!fromPkmId || !toPkmId) return
    links.push({ i: `e-${evo.id}`, s: fromPkmId, t: toPkmId, ty: 'evolution' })
  })

  // Details
  const details = {}
  typesRaw.forEach(t => {
    const tInfo = typeDict.get(t.id)
    if (tInfo) details[tInfo.id] = { name: tInfo.name, type: 'type' }
  })
  abilityDict.forEach((aInfo, aId) => {
    details[aInfo.id] = { name: aInfo.name, description: aInfo.description, type: 'ability' }
  })
  moveDict.forEach((mInfo, mId) => {
    details[`move-${mId}`] = { 
      name: mInfo.name, type: 'move', power: mInfo.power, pp: mInfo.pp, 
      accuracy: mInfo.accuracy, damage_class_id: mInfo.damage_class_id 
    }
  })
  pokemonRaw.forEach(p => {
    const pId = p.id
    const sInfo = speciesInfo.get(p.species_id)
    if (!sInfo) return
    const node = nodes.find(n => n.i === `pokemon-${pId}`)
    details[`pokemon-${pId}`] = {
      name: node?.n || p.identifier,
      types: pkmTypes.get(pId).map(t => t.name),
      generation: sInfo.generation,
      pokedexNumber: String(p.species_id).padStart(4, '0'),
      color: COLOR_MAP[Number(sInfo.color_id)] || '',
      type: 'pokemon',
      abilities: pkmAbilities.get(pId) || [],
      moves: (pkmMoves.get(pId) || []).sort((a, b) => a.level - b.level)
    }
  })
  links.forEach(l => {
    const evo = evoRaw.find(e => `e-${e.id}` === l.i)
    if (evo) {
      details[l.i] = {
        trigger: evo.evolution_trigger_id ? getLocalized(triggerProse, 'evolution_trigger_id', evo.evolution_trigger_id, lang.id) : 'unknown',
        label: buildConditionsSummary(evo, triggerProse, lang.id),
      }
    }
    const pkmIdMatch = l.i.match(/^a-(\d+)-ability-(\d+)$/)
    if (pkmIdMatch) {
      const pId = pkmIdMatch[1]
      const aId = pkmIdMatch[2]
      const pa = pokemonAbilitiesRaw.find(p => p.pokemon_id === pId && p.ability_id === aId)
      if (pa) {
        details[l.i] = {
          isHidden: pa.is_hidden === '1',
          label: pa.is_hidden === '1' ? (lang.code === 'zh' ? '隐藏特性' : (lang.code === 'ja' ? '隠れ特性' : 'Hidden Ability')) : (lang.code === 'zh' ? '普通特性' : (lang.code === 'ja' ? '通常特性' : 'Normal Ability')),
        }
      }
    }
  })

  fs.writeFileSync(path.join(process.cwd(), `public/graph-data-${lang.code}.json`), JSON.stringify({ metadata: { lang: lang.code }, nodes, links }))
  fs.writeFileSync(path.join(process.cwd(), `public/node-details-${lang.code}.json`), JSON.stringify(details))
}

function main() {
  console.log('Reading CSV files...')
  const rawData = {
    pokemonRaw: readCsv('pokemon.csv'),
    speciesRaw: readCsv('pokemon_species.csv'),
    speciesNames: readCsv('pokemon_species_names.csv'),
    pokemonTypes: readCsv('pokemon_types.csv'),
    typesRaw: readCsv('types.csv'),
    typeNames: readCsv('type_names.csv'),
    statsRaw: readCsv('pokemon_stats.csv'),
    evoRaw: readCsv('pokemon_evolution.csv'),
    triggerProse: readCsv('evolution_trigger_prose.csv'),
    formsRaw: readCsv('pokemon_forms.csv'),
    formNamesRaw: readCsv('pokemon_form_names.csv'),
    abilitiesRaw: readCsv('abilities.csv'),
    abilityNamesRaw: readCsv('ability_names.csv'),
    abilityProseRaw: readCsv('ability_prose.csv'),
    pokemonAbilitiesRaw: readCsv('pokemon_abilities.csv'),
    movesRaw: readCsv('moves.csv'),
    moveNamesRaw: readCsv('move_names.csv'),
    pokemonMovesRaw: readCsv('pokemon_moves.csv')
  }

  LANGUAGES.forEach(lang => processLanguage(lang, rawData))
  console.log('All languages processed successfully.')
}

main()
