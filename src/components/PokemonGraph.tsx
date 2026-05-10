'use client'

import { GitBranch, Lightning, MagnifyingGlass, ShareNetwork, Sparkle, Target } from '@phosphor-icons/react'
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import PixiGraph, { GraphLink, GraphNode } from './PixiGraph'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { TYPE_COLORS } from '@/lib/constants'

const TYPE_LINE_COLOR = 'rgba(31, 38, 54, 0.6)'
const EVOLUTION_LINE_COLOR = '#7df2c0'
const TYPE_ICON_SIZE = 50
const TYPES_ARRAY = ['一般', '格斗', '飞行', '毒', '地面', '岩石', '虫', '幽灵', '钢', '火', '水', '草', '电', '超能力', '冰', '龙', '恶', '妖精']

type LinkType = 'type-link' | 'evolution' | 'form-link' | 'ability-link'



interface GraphPayload {
  metadata: {
    source: string
    generatedAt: string
    speciesCount: number
    pokemonCount: number
    typeCount: number
    evolutionChainCount: number
    evolutionEdgeCount: number
  }
  nodes: GraphNode[]
  links: GraphLink[]
}

interface NodeDetails {
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

function getEndpointId(endpoint: string | GraphNode) {
  return typeof endpoint === 'string' ? endpoint : endpoint.i
}

function getLinkId(link: GraphLink) {
  return link.i || `${getEndpointId(link.s)}-${getEndpointId(link.t)}-${link.ty}`
}

function getSpriteUrl(sprite: string) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${sprite}.png`
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function formatTrigger(trigger?: string | null) {
  if (!trigger)
    return '自然关系'

  const map: Record<string, string> = {
    level_up: '升级',
    use_item: '使用道具',
    trade: '交换',
    shed: '特殊',
  }

  return map[trigger] || trigger
}

function generationLabel(generation?: number) {
  return generation ? `Gen ${generation}` : 'Unknown Gen'
}

export default function PokemonGraph() {
  const [payload, setPayload] = useState<GraphPayload | null>(null)
  const [details, setDetails] = useState<Record<string, NodeDetails> | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [confirmedQuery, setConfirmedQuery] = useState('')
  const [showTypeLinks, setShowTypeLinks] = useState(true)
  const [showEvolutionLinks, setShowEvolutionLinks] = useState(true)
  const [showAbilityLinks, setShowAbilityLinks] = useState(false)
  const [generationFilter, setGenerationFilter] = useState<'all' | number>('all')
  const [isDropdownVisible, setIsDropdownVisible] = useState(false)
  const deferredQuery = useDeferredValue(confirmedQuery)

  useEffect(() => {
    let active = true

    fetch('/graph-data.json')
      .then(res => res.json())
      .then((data: GraphPayload) => {
        if (!active)
          return

        startTransition(() => {
          setPayload(data)
        })
      })
      .catch((error) => {
        console.error('Failed to load graph data', error)
      })
      
    fetch('/node-details.json')
      .then(res => res.json())
      .then((data: Record<string, NodeDetails>) => {
        setDetails(data)
      })
      .catch(err => console.error('Failed to load node details', err))

    return () => {
      active = false
    }
  }, [])



  const baseNodeMap = useMemo(() => {
    return new Map(payload?.nodes.map(node => [node.i, node]) || [])
  }, [payload])

  const generations = useMemo(() => {
    const values = new Set<number>()
    payload?.nodes.forEach((node) => {
      // Use details for generation if available, but for performance we might want it in graph-data
      // Let's assume for now we might need to keep it or just skip gen filtering if not in graph-data
      // Actually, my script removed it from nodes. Let's check.
      const d = details?.[node.i]
      if (!node.it && d?.generation)
        values.add(d.generation)
    })
    return Array.from(values).sort((a, b) => a - b)
  }, [payload, details])

  const filteredGraph = useMemo(() => {
    if (!payload) {
      return { nodes: [] as GraphNode[], links: [] as GraphLink[] }
    }

    const normalizedLinks = payload.links.map(link => ({
      ...link,
      source: getEndpointId(link.s),
      target: getEndpointId(link.t),
    }))

    const visiblePokemon = new Set(
      payload.nodes
        .filter(node => !node.it && !node.ia)
        .filter(node => {
           if (generationFilter === 'all') return true
           const d = details?.[node.i]
           return d?.generation === generationFilter
        })
        .map(node => node.i),
    )

    // Abilities should be considered visible if the toggle is on, or we'll filter them later based on links
    const visibleAbilities = new Set(
      payload.nodes
        .filter(node => node.ia)
        .map(node => node.i)
    )

    const links = normalizedLinks.filter((link) => {
      if (link.ty === 'type-link' && !showTypeLinks)
        return false
      if (link.ty === 'evolution' && !showEvolutionLinks)
        return false
      if (link.ty === 'ability-link' && !showAbilityLinks)
        return false

      const sourceId = getEndpointId(link.s)
      const targetId = getEndpointId(link.t)
      const sourceNode = baseNodeMap.get(sourceId)
      const targetNode = baseNodeMap.get(targetId)

      if (!sourceNode || !targetNode)
        return false

      if (link.ty === 'type-link') {
        return sourceNode.it ? visiblePokemon.has(targetId) : visiblePokemon.has(sourceId)
      }

      if (link.ty === 'ability-link') {
        // Show ability link if ability toggle is on AND the pokemon is visible
        const pokemonId = sourceNode.ia ? targetId : sourceId
        return showAbilityLinks && visiblePokemon.has(pokemonId)
      }

      return visiblePokemon.has(sourceId) && visiblePokemon.has(targetId)
    })

    const visibleNodeIds = new Set<string>(visiblePokemon)
    if (showAbilityLinks) {
      visibleAbilities.forEach(id => visibleNodeIds.add(id))
    }
    
    links.forEach((link) => {
      visibleNodeIds.add(getEndpointId(link.s))
      visibleNodeIds.add(getEndpointId(link.t))
    })

    const query = deferredQuery.trim().toLowerCase()
    if (query) {
      const matchedNodeIds = new Set<string>()
      payload.nodes.forEach(node => {
        if (visibleNodeIds.has(node.i)) {
          const lowerName = node.n.toLowerCase()
          const lowerId = node.i.toLowerCase()
          if (lowerName === query || lowerId === query) {
            matchedNodeIds.add(node.i)
          }
        }
      })

      // 1. Expand matched nodes through Evolution/Form links
      const matchedAndFamily = new Set<string>(matchedNodeIds)
      const queue = Array.from(matchedNodeIds)
      
      let head = 0
      while (head < queue.length) {
        const currId = queue[head++]
        for (const link of links) {
          const sourceId = getEndpointId(link.s)
          const targetId = getEndpointId(link.t)
          if ((link.ty === 'evolution' || link.ty === 'form-link') && (sourceId === currId || targetId === currId)) {
            const nextId = sourceId === currId ? targetId : sourceId
            if (!matchedAndFamily.has(nextId)) {
              matchedAndFamily.add(nextId)
              queue.push(nextId)
            }
          }
        }
      }

      // 2. Expand to related types/pokemon
      // Rule: 
      // - If a Pokemon is matched (or part of a matched family), show its types.
      // - If a Type is matched, show its Pokemon.
      // - Don't show "types of types" (i.e., don't show secondary types of pokemon that were only found via a type search).
      const visitedSearchNodes = new Set<string>(matchedAndFamily)
      for (const currId of matchedAndFamily) {
        const currNode = baseNodeMap.get(currId)
        for (const link of links) {
          const sourceId = getEndpointId(link.s)
          const targetId = getEndpointId(link.t)
          
          if ((link.ty === 'type-link' || link.ty === 'ability-link') && (sourceId === currId || targetId === currId)) {
            const otherId = sourceId === currId ? targetId : sourceId
            visitedSearchNodes.add(otherId)
          }
        }
      }

      const newVisibleNodeIds = new Set<string>()
      for (const id of visibleNodeIds) {
        if (visitedSearchNodes.has(id)) {
          newVisibleNodeIds.add(id)
        }
      }
      
      // If we found a pokemon via search, make sure its ability links are also included in the final set
      // even if showAbilityLinks is false (optional, but good for focus)
      // Actually, let's just make sure all links between final visible nodes are included.
      
      visibleNodeIds.clear()
      newVisibleNodeIds.forEach(id => visibleNodeIds.add(id))
    }

    const finalNodes = payload.nodes
      .filter(node => visibleNodeIds.has(node.i))
      .map(node => ({ ...node }))

    const finalLinks = links.filter(link => {
       const sourceId = getEndpointId(link.s)
       const targetId = getEndpointId(link.t)
       return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)
    })

    return { nodes: finalNodes, links: finalLinks }
  }, [payload, details, generationFilter, showEvolutionLinks, showTypeLinks, showAbilityLinks, baseNodeMap, deferredQuery])

  const adjacency = useMemo(() => {
    const relationMap = new Map<string, Set<string>>()
    const linkMap = new Map<string, GraphLink[]>()

    filteredGraph.nodes.forEach((node) => {
      relationMap.set(node.i, new Set())
      linkMap.set(node.i, [])
    })

    filteredGraph.links.forEach((link) => {
      const sourceId = getEndpointId(link.s)
      const targetId = getEndpointId(link.t)
      relationMap.get(sourceId)?.add(targetId)
      relationMap.get(targetId)?.add(sourceId)
      linkMap.get(sourceId)?.push(link)
      linkMap.get(targetId)?.push(link)
    })

    return { relationMap, linkMap }
  }, [filteredGraph])

  const visibleNodeMap = useMemo(() => {
    return new Map(filteredGraph.nodes.map(node => [node.i, node]))
  }, [filteredGraph.nodes])

  const stats = useMemo(() => {
    const pokemonCount = filteredGraph.nodes.filter(n => !n.it && !n.ia).length
    const typeCount = filteredGraph.nodes.filter(n => n.it).length
    const abilityCount = filteredGraph.nodes.filter(n => n.ia).length
    return { pokemonCount, typeCount, abilityCount }
  }, [filteredGraph.nodes])



  useEffect(() => {
    if (selectedNodeId && !visibleNodeMap.has(selectedNodeId))
      setSelectedNodeId(null)

    if (selectedLinkId && !filteredGraph.links.some(link => getLinkId(link) === selectedLinkId))
      setSelectedLinkId(null)
  }, [filteredGraph.links, selectedLinkId, selectedNodeId, visibleNodeMap])

  const searchResults = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword)
      return []

    return filteredGraph.nodes
      .filter(node => node.n.toLowerCase().includes(keyword) || node.i.toLowerCase().includes(keyword))
      .sort((a, b) => Number(Boolean(a.it || a.ia)) - Number(Boolean(b.it || b.ia)))
      .slice(0, 8)
  }, [query, filteredGraph.nodes])

  const highlightedNodeIds = useMemo(() => {
    const ids = new Set<string>()
    searchResults.forEach(node => ids.add(node.i))
    if (selectedNodeId) {
      ids.add(selectedNodeId)
      adjacency.relationMap.get(selectedNodeId)?.forEach(id => ids.add(id))
    }
    if (hoveredNodeId)
      ids.add(hoveredNodeId)
    return ids
  }, [adjacency.relationMap, hoveredNodeId, searchResults, selectedNodeId])

  const selectedNode = selectedNodeId ? visibleNodeMap.get(selectedNodeId) ?? null : null
  const selectedLink = selectedLinkId
    ? filteredGraph.links.find(link => getLinkId(link) === selectedLinkId) ?? null
    : null

  const selectedNodeLinks = useMemo(() => {
    if (!selectedNodeId)
      return []
    return adjacency.linkMap.get(selectedNodeId) || []
  }, [adjacency.linkMap, selectedNodeId])

  function focusNode(node: GraphNode) {
    setSelectedNodeId(node.i)
    setSelectedLinkId(null)
  }

  const infoNode = selectedNode
  const infoLink = selectedLink
  const emptyState = !payload

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(70,149,255,0.28),_transparent_34%),radial-gradient(circle_at_82%_12%,_rgba(255,94,61,0.18),_transparent_28%),radial-gradient(circle_at_bottom,_rgba(255,211,71,0.12),_transparent_32%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,18,0.1)_0%,rgba(4,7,18,0.86)_100%)]" />

      <main className="relative z-10 min-h-screen w-full overflow-hidden">
        {/* Full-screen Graph Scene */}
        <div className="absolute inset-0 z-0">
          {emptyState
            ? (
                <div className="flex h-full items-center justify-center">
                  <div className="border border-white/10 bg-black/45 px-6 py-4 text-sm text-white/70 backdrop-blur-xl pointer-events-auto">
                    正在装载图谱数据...
                  </div>
                </div>
              )
            : (
                <PixiGraph
                  nodes={filteredGraph.nodes as unknown as GraphNode[]}
                  links={filteredGraph.links as unknown as GraphLink[]}
                  selectedNodeId={selectedNodeId}
                  onNodeClick={(node) => {
                    if (node) focusNode(node)
                  }}
                  onLinkClick={(link) => {
                    setSelectedNodeId(null)
                    setSelectedLinkId(link ? getLinkId(link as unknown as GraphLink) : null)
                  }}
                />
              )}
        </div>

        {/* Left Panel: App Title, Search & Filters */}
        <section className="pointer-events-none absolute bottom-4 left-4 top-4 z-10 flex w-80 flex-col gap-4 overflow-y-auto hidden-scrollbar">
          <div className="pointer-events-auto flex flex-col gap-4">
          
          <Card className="border border-white/10 bg-black/40 backdrop-blur-xl shadow-xl">
            <CardHeader className="pb-2">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-white">宝可梦图谱</h1>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                  <span className="h-px w-3 bg-white/20" />
                  Relation Atlas
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search Section */}
              <div className="space-y-3">
                <div className="relative group">
                  <input
                    value={query}
                    onChange={event => {
                      setQuery(event.target.value)
                      setIsDropdownVisible(true)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setConfirmedQuery(query)
                        setIsDropdownVisible(false)
                      }
                    }}
                    placeholder="搜索名称或属性..."
                    className="w-full rounded border border-white/10 bg-white/5 pl-3 pr-10 py-2 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#89b4ff] focus:bg-white/10 transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      setConfirmedQuery(query)
                      setIsDropdownVisible(false)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/40 hover:text-[#89b4ff] transition-colors"
                  >
                    <MagnifyingGlass className="size-4" />
                  </button>

                  {isDropdownVisible && searchResults.length > 0 && (
                    <div className="absolute inset-x-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-lg border border-white/12 bg-[#0a1022]/95 p-1 shadow-2xl backdrop-blur-xl">
                      {searchResults.map(node => (
                        <button
                          key={node.i}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-white/78 transition hover:bg-white/8 hover:text-white"
                          onClick={() => {
                            setQuery(node.n)
                            setConfirmedQuery(node.n)
                            focusNode(node)
                            setIsDropdownVisible(false)
                          }}
                        >
                          <span>{node.n}</span>
                          <span className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                            {node.it ? 'Type' : (node.ia ? 'Ability' : (details?.[node.i] ? generationLabel(details[node.i].generation) : ''))}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Filters Section */}
              <div className="space-y-6 pt-2">
                <div className="space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">关系层级</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={showTypeLinks ? 'default' : 'outline'}
                      className={cn('h-8 text-xs border-white/12', showTypeLinks && 'bg-[#ffcf5a] text-black hover:bg-[#ffcf5a]/90')}
                      onClick={() => setShowTypeLinks(value => !value)}
                    >
                      属性关系
                    </Button>
                    <Button
                      variant={showEvolutionLinks ? 'default' : 'outline'}
                      className={cn('h-8 text-xs border-white/12', showEvolutionLinks && 'bg-[#7df2c0] text-black hover:bg-[#7df2c0]/90')}
                      onClick={() => setShowEvolutionLinks(value => !value)}
                    >
                      进化关系
                    </Button>
                    <Button
                      variant={showAbilityLinks ? 'default' : 'outline'}
                      className={cn('h-8 text-xs border-white/12', showAbilityLinks && 'bg-[#a855f7] text-white hover:bg-[#a855f7]/90')}
                      onClick={() => setShowAbilityLinks(value => !value)}
                    >
                      特性关系
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">世代筛选</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={generationFilter === 'all' ? 'default' : 'outline'}
                      className={cn('h-7 text-[10px] border-white/12', generationFilter === 'all' && 'bg-white text-black hover:bg-white/90')}
                      onClick={() => setGenerationFilter('all')}
                    >
                      全部
                    </Button>
                    {generations.map(gen => (
                      <Button
                        key={gen}
                        size="sm"
                        variant={generationFilter === gen ? 'default' : 'outline'}
                        className={cn('h-7 text-[10px] border-white/12', generationFilter === gen && 'bg-[#89b4ff] text-black hover:bg-[#89b4ff]/90')}
                        onClick={() => setGenerationFilter(gen)}
                      >
                        Gen {gen}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <div className="flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">当前宝可梦</div>
                    <div className="mt-0.5 text-lg font-semibold text-white/90">{stats.pokemonCount}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">当前属性</div>
                    <div className="mt-0.5 text-lg font-semibold text-white/90">{stats.typeCount}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">当前特性</div>
                    <div className="mt-0.5 text-lg font-semibold text-white/90">{stats.abilityCount}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">图例</CardTitle>
              <CardDescription className="text-white/55">深色是属性连接，绿色是进化连接。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/72">
              <div className="flex items-center gap-3">
                <span className="inline-block h-px w-10 bg-[#273143]" />
                <span>宝可梦与属性的归属关系</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block h-px w-10 bg-[#7df2c0]" />
                <span>默认宝可梦节点之间的进化投影</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block h-px w-10 bg-[#f59e0b]" />
                <span>形态之间的转换关系</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex size-3 rounded-full bg-white ring-2 ring-white/20" />
                <span>普通宝可梦节点</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex size-3 rotate-45 bg-[#89b4ff]" />
                <span>属性节点</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex size-3 [clip-path:polygon(50%_0%,_61%_35%,_98%_35%,_68%_57%,_79%_91%,_50%_70%,_21%_91%,_32%_57%,_2%_35%,_39%_35%)] bg-[#a855f7]" />
                <span>特性节点</span>
              </div>
            </CardContent>
          </Card>
          </div>
        </section>

        {/* Right Panel: Focus Info */}
        {(infoNode || infoLink) && (
          <section className="pointer-events-none absolute bottom-4 right-4 top-4 z-10 flex w-80 flex-col gap-4 overflow-y-auto hidden-scrollbar">
            <div className="pointer-events-auto flex flex-col gap-4">
          <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader className="relative pb-2">
              <CardTitle className="flex items-center gap-2 text-white">
                {infoNode && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 -ml-2"
                    title="仅显示此节点及其关联"
                    onClick={() => {
                      setQuery(infoNode.n)
                      setConfirmedQuery(infoNode.n)
                    }}
                  >
                    <Target className="size-4" />
                  </Button>
                )}
                <Sparkle className="size-4 text-[#ff91b5]" weight="fill" />
                {infoNode ? (infoNode.it ? 'Type Node' : (infoNode.ia ? 'Ability Node' : 'Pokemon Node')) : 'Relation Link'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">


              {infoNode && (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    {!infoNode.it && !infoNode.ia && infoNode.s && (
                      <img
                        src={getSpriteUrl(infoNode.s)}
                        alt={infoNode.n}
                        className="size-18 border border-white/12 bg-black/30 object-contain p-2"
                      />
                    )}
                    <div className="space-y-2">
                      <div className="text-2xl font-semibold text-white">{infoNode.n}</div>
                      {details?.[infoNode.i] && (
                        <div className="text-sm text-white/55">
                          {details[infoNode.i].pokedexNumber && `#${details[infoNode.i].pokedexNumber}`}
                          {details[infoNode.i].generation && ` · ${generationLabel(details[infoNode.i].generation)}`}
                        </div>
                      )}
                      {infoNode.ia && (
                        <div className="text-sm text-[#a855f7]">特性节点</div>
                      )}
                    </div>
                  </div>

                  {infoNode.ia && details?.[infoNode.i]?.description && (
                    <div className="border-l-2 border-[#a855f7]/40 bg-[#a855f7]/5 p-3 text-xs leading-relaxed text-white/70 italic">
                      {details[infoNode.i].description}
                    </div>
                  )}

                  {details?.[infoNode.i]?.types && (
                    <div className="flex flex-wrap gap-2">
                      {details[infoNode.i].types.map(type => (
                        <span
                          key={type}
                          className="border px-2 py-1 text-xs"
                          style={{
                            borderColor: `${TYPE_COLORS[type] || '#fff'}66`,
                            color: TYPE_COLORS[type] || '#fff',
                            backgroundColor: `${TYPE_COLORS[type] || '#fff'}10`,
                          }}
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-white/10 bg-white/4 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">关系数</div>
                      <div className="mt-2 text-xl font-semibold text-[#ffcf5a]">{selectedNodeLinks.length}</div>
                    </div>
                    <div className="border border-white/10 bg-white/4 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">邻接节点</div>
                      <div className="mt-2 text-xl font-semibold text-[#89b4ff]">
                        {adjacency.relationMap.get(infoNode.i)?.size || 0}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/38">
                      <Lightning className="size-3.5 text-[#ffcf5a]" />
                      相关关系
                    </div>
                    <div className="max-h-[340px] space-y-2 overflow-auto pr-1">
                      {selectedNodeLinks.slice(0, 16).map((link) => {
                        const sourceId = getEndpointId(link.s)
                        const targetId = getEndpointId(link.t)
                        const sourceNode = visibleNodeMap.get(sourceId)
                        const targetNode = visibleNodeMap.get(targetId)

                        if (!sourceNode || !targetNode)
                          return null

                        return (
                          <button
                            key={getLinkId(link)}
                            type="button"
                            className="w-full border border-white/10 bg-white/4 p-3 text-left transition hover:bg-white/8"
                            onClick={() => {
                              setSelectedNodeId(null)
                              setSelectedLinkId(getLinkId(link))
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-white">
                                {sourceNode.n}
                                {' '}
                                →
                                {' '}
                                {targetNode.n}
                              </span>
                              <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                                {link.ty === 'evolution' ? 'evolution' : (link.ty === 'ability-link' ? 'ability' : 'type')}
                              </span>
                            </div>
                            {details?.[getLinkId(link)]?.label && (
                              <div className="mt-2 text-xs text-white/52">{details[getLinkId(link)].label}</div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {infoLink && (
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">Relation Edge</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {visibleNodeMap.get(getEndpointId(infoLink.s))?.n}
                      {' '}
                      →
                      {' '}
                      {visibleNodeMap.get(getEndpointId(infoLink.t))?.n}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="border border-white/10 bg-white/4 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">关系类型</div>
                      <div className="mt-2 text-lg font-semibold text-[#7df2c0]">
                        {infoLink.ty === 'evolution' ? '进化关系' : (infoLink.ty === 'ability-link' ? '特性关联' : '属性归属')}
                      </div>
                    </div>
                    {infoLink.ty === 'evolution' && (
                      <>
                        <div className="border border-white/10 bg-white/4 p-3">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">触发方式</div>
                          <div className="mt-2 text-lg font-semibold text-white">{details?.[getLinkId(infoLink)]?.trigger || '未知'}</div>
                        </div>
                        <div className="border border-white/10 bg-white/4 p-3">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">条件摘要</div>
                          <div className="mt-2 text-sm text-white/72">{details?.[getLinkId(infoLink)]?.label || '无额外说明'}</div>
                        </div>
                      </>
                    )}
                    {infoLink.ty === 'ability-link' && (
                       <div className="border border-white/10 bg-white/4 p-3">
                         <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">特性类型</div>
                         <div className="mt-2 text-lg font-semibold text-white">{details?.[getLinkId(infoLink)]?.isHidden ? '隐藏特性 (梦特)' : '普通特性'}</div>
                       </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

            </div>
          </section>
        )}
      </main>
    </div>
  )
}
