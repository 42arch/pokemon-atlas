import type { GraphLink, GraphNode } from '@/components/pixi-graph'

export interface Move {
  id: string
  name: string
  type_id: string
  power: string
  pp: string
  accuracy: string
  damage_class_id: string
  level: number
  method: string
}

export interface AbilityDetail {
  id: string
  name: string
  description: string
  isHidden: boolean
}

export interface NodeDetails {
  name: string
  type: 'pokemon' | 'ability' | 'type' | 'move'
  description?: string
  types?: string[]
  generation?: number
  pokedexNumber?: string
  color?: string
  trigger?: string
  label?: string
  isHidden?: boolean
  moves?: Move[]
  abilities?: AbilityDetail[]
  power?: string
  pp?: string
  accuracy?: string
  damage_class_id?: string
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

export function getHomeSpriteUrl(sprite: string) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${sprite}.png`
}

export function generationLabel(generation?: number) {
  return generation ? `Gen ${generation}` : 'Unknown Gen'
}
