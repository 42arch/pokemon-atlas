import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const API_BASE = 'https://pokeapi.co/api/v2'
const OUTPUT_DIR = path.join(process.cwd(), 'data')
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'pokemon-core.json')
const CONCURRENCY_LIMIT = 5
const FILE_EXTENSION_REGEX = /\.[^.]+$/

interface NamedApiResource {
  name: string
  url: string
}

interface LocalizedName {
  language: {
    name: string
  }
  name: string
}

interface TypeRecord {
  id: string
  slug: string
  name: string
}

interface PokemonTypeRecord {
  slot: number
  typeId: string
  slug: string
  name: string
}

interface SpeciesRecord {
  id: string
  speciesId: number
  slug: string
  name: string
  generation: number
  pokedexNumber: string
  defaultPokemonId: string
  evolutionChainId: string | null
  evolvesFromSpeciesId: string | null
}

interface PokemonRecord {
  id: string
  pokemonId: number
  speciesId: string
  pokedexNumber: string
  slug: string
  name: string
  generation: number
  sprite: string
  height: number
  weight: number
  stats: Record<string, number>
  types: PokemonTypeRecord[]
}

interface EvolutionEdgeRecord {
  id: string
  chainId: string
  fromSpeciesId: string
  toSpeciesId: string
  fromPokemonId: string | null
  toPokemonId: string | null
  trigger: string | null
  minLevel: number | null
  item: string | null
  heldItem: string | null
  knownMove: string | null
  knownMoveType: string | null
  location: string | null
  minHappiness: number | null
  minBeauty: number | null
  minAffection: number | null
  needsOverworldRain: boolean
  partySpecies: string | null
  partyType: string | null
  relativePhysicalStats: number | null
  timeOfDay: string | null
  tradeSpecies: string | null
  turnUpsideDown: boolean
  conditionsSummary: string
}

interface EvolutionChainRecord {
  id: string
  chainId: number
  rootSpeciesId: string
  speciesIds: string[]
  edges: EvolutionEdgeRecord[]
}

interface CoreDataset {
  metadata: {
    source: string
    generatedAt: string
    speciesCount: number
    pokemonCount: number
    typeCount: number
    evolutionChainCount: number
    evolutionEdgeCount: number
  }
  types: TypeRecord[]
  species: SpeciesRecord[]
  pokemon: PokemonRecord[]
  evolutionChains: EvolutionChainRecord[]
}

const typeMap: Record<string, string> = {
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

const genMap: Record<string, number> = {
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

const fetchCache = new Map<string, Promise<any | null>>()

function toSpeciesNodeId(speciesId: number) {
  return `species-${speciesId}`
}

function toPokemonNodeId(pokemonId: number) {
  return `pokemon-${pokemonId}`
}

function toChainNodeId(chainId: number) {
  return `evolution-chain-${chainId}`
}

function getSpeciesIdFromChainNode(chainNode: any) {
  return getResourceId(chainNode.species.url)
}

async function fetchJson(url: string) {
  if (!fetchCache.has(url)) {
    const request = fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404)
            return null
          throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
        }
        return res.json()
      })
    fetchCache.set(url, request)
  }

  return fetchCache.get(url)!
}

function getLocalizedName(names: LocalizedName[] | undefined, fallback: string) {
  if (!names?.length)
    return fallback

  const localized = names.find(name => name.language.name === 'zh-hans')
    ?? names.find(name => name.language.name === 'zh-hant')
    ?? names.find(name => name.language.name === 'en')

  return localized?.name || fallback
}

function getResourceId(url: string) {
  return Number(url.split('/').filter(Boolean).at(-1))
}

function getSpriteId(pokemon: any) {
  const officialArtwork = pokemon.sprites?.other?.['official-artwork']?.front_default as string | null
  const frontDefault = pokemon.sprites?.front_default as string | null
  const spriteUrl = officialArtwork || frontDefault

  if (!spriteUrl)
    return String(pokemon.id)

  const filename = spriteUrl.split('/').pop()
  return filename ? filename.replace(FILE_EXTENSION_REGEX, '') : String(pokemon.id)
}

function formatStatKey(statName: string) {
  return statName.replaceAll('-', '_')
}

function formatConditionValue(value: string | number | boolean) {
  if (typeof value === 'boolean')
    return value ? '是' : '否'
  return String(value)
}

function buildConditionsSummary(detail: EvolutionEdgeRecord) {
  const parts: string[] = []

  if (detail.trigger)
    parts.push(`方式: ${detail.trigger}`)
  if (detail.minLevel != null)
    parts.push(`等级: ${detail.minLevel}`)
  if (detail.item)
    parts.push(`道具: ${detail.item}`)
  if (detail.heldItem)
    parts.push(`携带道具: ${detail.heldItem}`)
  if (detail.knownMove)
    parts.push(`已学会招式: ${detail.knownMove}`)
  if (detail.knownMoveType)
    parts.push(`已学会属性: ${detail.knownMoveType}`)
  if (detail.location)
    parts.push(`地点: ${detail.location}`)
  if (detail.minHappiness != null)
    parts.push(`亲密度: ${detail.minHappiness}`)
  if (detail.minBeauty != null)
    parts.push(`美丽度: ${detail.minBeauty}`)
  if (detail.minAffection != null)
    parts.push(`友好度: ${detail.minAffection}`)
  if (detail.partySpecies)
    parts.push(`队伍中存在: ${detail.partySpecies}`)
  if (detail.partyType)
    parts.push(`队伍中属性: ${detail.partyType}`)
  if (detail.relativePhysicalStats != null)
    parts.push(`物攻/物防关系: ${detail.relativePhysicalStats}`)
  if (detail.timeOfDay)
    parts.push(`时段: ${detail.timeOfDay}`)
  if (detail.tradeSpecies)
    parts.push(`交换对象: ${detail.tradeSpecies}`)
  if (detail.needsOverworldRain)
    parts.push(`需要天气雨天: ${formatConditionValue(detail.needsOverworldRain)}`)
  if (detail.turnUpsideDown)
    parts.push(`需要倒置设备: ${formatConditionValue(detail.turnUpsideDown)}`)

  return parts.join(' | ') || '基础进化关系'
}

async function processSpecies(speciesSummary: NamedApiResource) {
  const species = await fetchJson(speciesSummary.url)
  if (!species)
    return null

  const defaultVariety = species.varieties.find((variety: any) => variety.is_default)
  if (!defaultVariety)
    return null

  const pokemon = await fetchJson(defaultVariety.pokemon.url)
  if (!pokemon)
    return null

  const speciesId = species.id as number
  const speciesNodeId = toSpeciesNodeId(speciesId)
  const pokemonNodeId = toPokemonNodeId(pokemon.id)
  const evolutionChainResourceId = species.evolution_chain?.url ? getResourceId(species.evolution_chain.url) : null
  const evolutionChainId = evolutionChainResourceId ? toChainNodeId(evolutionChainResourceId) : null
  const pokedexNumber = String(species.id).padStart(4, '0')
  const speciesName = getLocalizedName(species.names, species.name)

  const pokemonTypes: PokemonTypeRecord[] = pokemon.types
    .slice()
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((entry: any) => ({
      slot: entry.slot,
      typeId: `type-${entry.type.name}`,
      slug: entry.type.name,
      name: typeMap[entry.type.name] || entry.type.name,
    }))

  const stats = Object.fromEntries(
    pokemon.stats.map((statEntry: any) => [formatStatKey(statEntry.stat.name), statEntry.base_stat]),
  )

  const speciesRecord: SpeciesRecord = {
    id: speciesNodeId,
    speciesId,
    slug: species.name,
    name: speciesName,
    generation: genMap[species.generation.name] || 0,
    pokedexNumber,
    defaultPokemonId: pokemonNodeId,
    evolutionChainId,
    evolvesFromSpeciesId: species.evolves_from_species ? toSpeciesNodeId(getResourceId(species.evolves_from_species.url)) : null,
  }

  const pokemonRecord: PokemonRecord = {
    id: pokemonNodeId,
    pokemonId: pokemon.id,
    speciesId: speciesNodeId,
    pokedexNumber,
    slug: pokemon.name,
    name: speciesName,
    generation: speciesRecord.generation,
    sprite: getSpriteId(pokemon),
    height: pokemon.height / 10,
    weight: pokemon.weight / 10,
    stats,
    types: pokemonTypes,
  }

  return {
    species: speciesRecord,
    pokemon: pokemonRecord,
    evolutionChainUrl: species.evolution_chain?.url as string | undefined,
    types: pokemonTypes,
  }
}

function collectSpeciesIds(chainNode: any, bucket: Set<string>) {
  bucket.add(toSpeciesNodeId(getSpeciesIdFromChainNode(chainNode)))
  for (const child of chainNode.evolves_to) {
    collectSpeciesIds(child, bucket)
  }
}

function extractEvolutionEdges(
  chainId: string,
  chainNode: any,
  speciesToPokemonMap: Map<string, string>,
  edges: EvolutionEdgeRecord[],
) {
  const fromSpeciesNumericId = getSpeciesIdFromChainNode(chainNode)
  const fromSpeciesId = toSpeciesNodeId(fromSpeciesNumericId)

  chainNode.evolves_to.forEach((childNode: any) => {
    const toSpeciesNumericId = getSpeciesIdFromChainNode(childNode)
    const toSpeciesId = toSpeciesNodeId(toSpeciesNumericId)
    const details = childNode.evolution_details?.length ? childNode.evolution_details : [null]

    details.forEach((detail: any, index: number) => {
      const edge: EvolutionEdgeRecord = {
        id: `${chainId}-${fromSpeciesNumericId}-${toSpeciesNumericId}-${index}`,
        chainId,
        fromSpeciesId,
        toSpeciesId,
        fromPokemonId: speciesToPokemonMap.get(fromSpeciesId) ?? null,
        toPokemonId: speciesToPokemonMap.get(toSpeciesId) ?? null,
        trigger: detail?.trigger?.name ?? null,
        minLevel: detail?.min_level ?? null,
        item: detail?.item?.name ?? null,
        heldItem: detail?.held_item?.name ?? null,
        knownMove: detail?.known_move?.name ?? null,
        knownMoveType: detail?.known_move_type?.name ?? null,
        location: detail?.location?.name ?? null,
        minHappiness: detail?.min_happiness ?? null,
        minBeauty: detail?.min_beauty ?? null,
        minAffection: detail?.min_affection ?? null,
        needsOverworldRain: Boolean(detail?.needs_overworld_rain),
        partySpecies: detail?.party_species?.name ?? null,
        partyType: detail?.party_type?.name ?? null,
        relativePhysicalStats: detail?.relative_physical_stats ?? null,
        timeOfDay: detail?.time_of_day || null,
        tradeSpecies: detail?.trade_species?.name ?? null,
        turnUpsideDown: Boolean(detail?.turn_upside_down),
        conditionsSummary: '',
      }

      edge.conditionsSummary = buildConditionsSummary(edge)
      edges.push(edge)
    })

    extractEvolutionEdges(chainId, childNode, speciesToPokemonMap, edges)
  })
}

async function processEvolutionChain(chainUrl: string, speciesToPokemonMap: Map<string, string>) {
  const chain = await fetchJson(chainUrl)
  if (!chain)
    return null

  const chainId = toChainNodeId(chain.id)
  const speciesIds = new Set<string>()
  collectSpeciesIds(chain.chain, speciesIds)

  const edges: EvolutionEdgeRecord[] = []
  extractEvolutionEdges(chainId, chain.chain, speciesToPokemonMap, edges)

  return {
    id: chainId,
    chainId: chain.id,
    rootSpeciesId: toSpeciesNodeId(getSpeciesIdFromChainNode(chain.chain)),
    speciesIds: Array.from(speciesIds),
    edges,
  } satisfies EvolutionChainRecord
}

async function main() {
  console.log('Fetching species index from PokéAPI...')
  const speciesList = await fetchJson(`${API_BASE}/pokemon-species?limit=2000`)
  if (!speciesList?.results?.length)
    throw new Error('Failed to load species list from PokéAPI.')

  const sortedSpecies: NamedApiResource[] = speciesList.results.sort((a: NamedApiResource, b: NamedApiResource) => {
    return getResourceId(a.url) - getResourceId(b.url)
  })

  const speciesRecords: SpeciesRecord[] = []
  const pokemonRecords: PokemonRecord[] = []
  const typeMapById = new Map<string, TypeRecord>()
  const evolutionChainUrls = new Set<string>()

  console.log(`Processing ${sortedSpecies.length} species with concurrency ${CONCURRENCY_LIMIT}...`)

  for (let index = 0; index < sortedSpecies.length; index += CONCURRENCY_LIMIT) {
    const batch = sortedSpecies.slice(index, index + CONCURRENCY_LIMIT)
    const batchResults = await Promise.all(batch.map(processSpecies))

    batchResults.forEach((result) => {
      if (!result)
        return

      speciesRecords.push(result.species)
      pokemonRecords.push(result.pokemon)

      result.types.forEach((pokemonType) => {
        typeMapById.set(pokemonType.typeId, {
          id: pokemonType.typeId,
          slug: pokemonType.slug,
          name: pokemonType.name,
        })
      })

      if (result.evolutionChainUrl)
        evolutionChainUrls.add(result.evolutionChainUrl)
    })

    console.log(`Progress: ${Math.min(index + CONCURRENCY_LIMIT, sortedSpecies.length)}/${sortedSpecies.length}`)
  }

  const speciesToPokemonMap = new Map(
    speciesRecords.map(species => [species.id, species.defaultPokemonId]),
  )

  console.log(`Fetching ${evolutionChainUrls.size} unique evolution chains...`)
  const evolutionChains = (
    await Promise.all(
      Array.from(evolutionChainUrls).map(chainUrl => processEvolutionChain(chainUrl, speciesToPokemonMap)),
    )
  ).filter((chain): chain is EvolutionChainRecord => Boolean(chain))

  const dataset: CoreDataset = {
    metadata: {
      source: API_BASE,
      generatedAt: new Date().toISOString(),
      speciesCount: speciesRecords.length,
      pokemonCount: pokemonRecords.length,
      typeCount: typeMapById.size,
      evolutionChainCount: evolutionChains.length,
      evolutionEdgeCount: evolutionChains.reduce((count, chain) => count + chain.edges.length, 0),
    },
    types: Array.from(typeMapById.values()).sort((a, b) => a.slug.localeCompare(b.slug)),
    species: speciesRecords,
    pokemon: pokemonRecords,
    evolutionChains,
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dataset, null, 2))

  console.log(`Saved normalized dataset to ${OUTPUT_PATH}`)
  console.log(JSON.stringify(dataset.metadata, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
