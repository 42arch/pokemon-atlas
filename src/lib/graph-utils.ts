import type { GraphLink, GraphNode } from '@/components/pixi-graph'

export interface NodeDetails {
  name: string
  type: 'pokemon' | 'ability' | 'type'
  description?: string
  types?: string[]
  generation?: number
  pokedexNumber?: string
  color?: string
  trigger?: string
  label?: string
  isHidden?: boolean
}

export function getEndpointId(endpoint: string | GraphNode) {
  return typeof endpoint === 'string' ? endpoint : endpoint.i
}

export function getLinkId(link: GraphLink) {
  return link.i || `${getEndpointId(link.s)}-${getEndpointId(link.t)}-${link.ty}`
}

export function getSpriteUrl(sprite: string) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${sprite}.png`
}

export function generationLabel(generation?: number) {
  return generation ? `Gen ${generation}` : 'Unknown Gen'
}
