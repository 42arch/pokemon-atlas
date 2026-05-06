import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

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
  pokemon: PokemonRecord[]
  evolutionChains: EvolutionChainRecord[]
}

interface Node {
  id: string
  name: string
  val: number
  group: string
  isType?: boolean
  sprite?: string
  types?: string[]
  generation?: number
  pokedexNumber?: string
}

interface Link {
  source: string
  target: string
  value: number
  type: 'type-link' | 'evolution'
  trigger?: string | null
  minLevel?: number | null
  label?: string
}

const inputPath = path.join(process.cwd(), 'data/pokemon-core.json')
const outputPath = path.join(process.cwd(), 'public/graph-data.json')

if (!fs.existsSync(inputPath)) {
  console.error(`Error: Input file not found at ${inputPath}`)
  console.error('Run `pnpm data:fetch` first.')
  process.exit(1)
}

const dataset: CoreDataset = JSON.parse(fs.readFileSync(inputPath, 'utf8'))

const nodes: Node[] = []
const links: Link[] = []

dataset.types.forEach((type) => {
  nodes.push({
    id: type.id,
    name: type.name,
    val: 50,
    group: type.name,
    isType: true,
  })
})

dataset.pokemon.forEach((pokemon) => {
  const bst = Object.values(pokemon.stats).reduce((sum, stat) => sum + stat, 0)
  const primaryType = pokemon.types[0]?.name || '未知'

  nodes.push({
    id: pokemon.id,
    name: pokemon.name,
    val: Math.max(3, bst / 100),
    group: primaryType,
    sprite: pokemon.sprite,
    types: pokemon.types.map(type => type.name),
    generation: pokemon.generation,
    pokedexNumber: pokemon.pokedexNumber,
  })

  pokemon.types.forEach((type) => {
    links.push({
      source: pokemon.id,
      target: type.typeId,
      value: 1,
      type: 'type-link',
    })
  })
})

dataset.evolutionChains.forEach((chain) => {
  chain.edges.forEach((edge) => {
    if (!edge.fromPokemonId || !edge.toPokemonId)
      return

    links.push({
      source: edge.fromPokemonId,
      target: edge.toPokemonId,
      value: 1,
      type: 'evolution',
      trigger: edge.trigger,
      minLevel: edge.minLevel,
      label: edge.conditionsSummary,
    })
  })
})

const graphData = {
  metadata: dataset.metadata,
  nodes,
  links,
}

fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2))
console.log(`Successfully generated graph data with ${nodes.length} nodes and ${links.length} links.`)
