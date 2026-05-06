'use client'

import { GitBranch, Lightning, MagnifyingGlass, ShareNetwork, Sparkle } from '@phosphor-icons/react'
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import PixiGraph, { GraphLink, GraphNode } from './PixiGraph'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const TYPE_COLORS: Record<string, string> = {
  一般: '#d8d2bc',
  格斗: '#ff8f47',
  飞行: '#80c6ff',
  毒: '#b55cff',
  地面: '#bc8d49',
  岩石: '#d1ba70',
  虫: '#98cc4a',
  幽灵: '#8874ff',
  钢: '#88c8d4',
  火: '#ff5b3d',
  水: '#49a6ff',
  草: '#4fd36d',
  电: '#ffd447',
  超能力: '#ff6390',
  冰: '#6ce4ff',
  龙: '#6a7bff',
  恶: '#6e5f57',
  妖精: '#ff9fca',
  未知: '#7a8195',
}

const TYPE_LINE_COLOR = 'rgba(31, 38, 54, 0.6)'
const EVOLUTION_LINE_COLOR = '#7df2c0'
const TYPE_ICON_SIZE = 50
const TYPES_ARRAY = ['一般', '格斗', '飞行', '毒', '地面', '岩石', '虫', '幽灵', '钢', '火', '水', '草', '电', '超能力', '冰', '龙', '恶', '妖精']

type LinkType = 'type-link' | 'evolution'



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

function getEndpointId(endpoint: string | GraphNode) {
  return typeof endpoint === 'string' ? endpoint : endpoint.id
}

function getLinkId(link: GraphLink) {
  return `${getEndpointId(link.source)}-${getEndpointId(link.target)}-${link.type}`
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showTypeLinks, setShowTypeLinks] = useState(true)
  const [showEvolutionLinks, setShowEvolutionLinks] = useState(true)
  const [generationFilter, setGenerationFilter] = useState<'all' | number>('all')
  const deferredQuery = useDeferredValue(query)

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

    return () => {
      active = false
    }
  }, [])



  const baseNodeMap = useMemo(() => {
    return new Map(payload?.nodes.map(node => [node.id, node]) || [])
  }, [payload])

  const generations = useMemo(() => {
    const values = new Set<number>()
    payload?.nodes.forEach((node) => {
      if (!node.isType && node.generation)
        values.add(node.generation)
    })
    return Array.from(values).sort((a, b) => a - b)
  }, [payload])

  const filteredGraph = useMemo(() => {
    if (!payload) {
      return { nodes: [] as GraphNode[], links: [] as GraphLink[] }
    }

    const normalizedLinks = payload.links.map(link => ({
      ...link,
      source: getEndpointId(link.source),
      target: getEndpointId(link.target),
    }))

    const visiblePokemon = new Set(
      payload.nodes
        .filter(node => !node.isType)
        .filter(node => generationFilter === 'all' || node.generation === generationFilter)
        .map(node => node.id),
    )

    const links = normalizedLinks.filter((link) => {
      if (link.type === 'type-link' && !showTypeLinks)
        return false
      if (link.type === 'evolution' && !showEvolutionLinks)
        return false

      const sourceId = getEndpointId(link.source)
      const targetId = getEndpointId(link.target)
      const sourceNode = baseNodeMap.get(sourceId)
      const targetNode = baseNodeMap.get(targetId)

      if (!sourceNode || !targetNode)
        return false

      if (link.type === 'type-link') {
        return sourceNode.isType ? visiblePokemon.has(targetId) : visiblePokemon.has(sourceId)
      }

      return visiblePokemon.has(sourceId) && visiblePokemon.has(targetId)
    })

    const visibleNodeIds = new Set<string>(visiblePokemon)
    links.forEach((link) => {
      visibleNodeIds.add(getEndpointId(link.source))
      visibleNodeIds.add(getEndpointId(link.target))
    })

    const query = deferredQuery.trim().toLowerCase()
    if (query) {
      const matchedNodeIds = new Set<string>()
      payload.nodes.forEach(node => {
        if (visibleNodeIds.has(node.id)) {
          if (node.name.toLowerCase().includes(query) || node.id.toLowerCase().includes(query)) {
            matchedNodeIds.add(node.id)
          }
        }
      })

      const visitedSearchNodes = new Set<string>(matchedNodeIds)
      const queue = Array.from(matchedNodeIds)
      
      let head = 0
      while (head < queue.length) {
        const currId = queue[head++]
        for (const link of links) {
          const sourceId = getEndpointId(link.source)
          const targetId = getEndpointId(link.target)
          if (link.type === 'evolution' && (sourceId === currId || targetId === currId)) {
            const nextId = sourceId === currId ? targetId : sourceId
            if (!visitedSearchNodes.has(nextId)) {
              visitedSearchNodes.add(nextId)
              queue.push(nextId)
            }
          }
        }
      }

      const nodesWithTypes = Array.from(visitedSearchNodes)
      for (const currId of nodesWithTypes) {
        for (const link of links) {
          const sourceId = getEndpointId(link.source)
          const targetId = getEndpointId(link.target)
          if (link.type === 'type-link' && (sourceId === currId || targetId === currId)) {
            visitedSearchNodes.add(sourceId)
            visitedSearchNodes.add(targetId)
          }
        }
      }

      const newVisibleNodeIds = new Set<string>()
      for (const id of visibleNodeIds) {
        if (visitedSearchNodes.has(id)) {
          newVisibleNodeIds.add(id)
        }
      }
      visibleNodeIds.clear()
      newVisibleNodeIds.forEach(id => visibleNodeIds.add(id))
    }

    const finalNodes = payload.nodes
      .filter(node => visibleNodeIds.has(node.id))
      .map(node => ({ ...node }))

    const finalLinks = links.filter(link => {
       const sourceId = getEndpointId(link.source)
       const targetId = getEndpointId(link.target)
       return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)
    })

    return { nodes: finalNodes, links: finalLinks }
  }, [payload, generationFilter, showEvolutionLinks, showTypeLinks, baseNodeMap, deferredQuery])

  const adjacency = useMemo(() => {
    const relationMap = new Map<string, Set<string>>()
    const linkMap = new Map<string, GraphLink[]>()

    filteredGraph.nodes.forEach((node) => {
      relationMap.set(node.id, new Set())
      linkMap.set(node.id, [])
    })

    filteredGraph.links.forEach((link) => {
      const sourceId = getEndpointId(link.source)
      const targetId = getEndpointId(link.target)
      relationMap.get(sourceId)?.add(targetId)
      relationMap.get(targetId)?.add(sourceId)
      linkMap.get(sourceId)?.push(link)
      linkMap.get(targetId)?.push(link)
    })

    return { relationMap, linkMap }
  }, [filteredGraph])

  const visibleNodeMap = useMemo(() => {
    return new Map(filteredGraph.nodes.map(node => [node.id, node]))
  }, [filteredGraph.nodes])



  useEffect(() => {
    if (selectedNodeId && !visibleNodeMap.has(selectedNodeId))
      setSelectedNodeId(null)

    if (selectedLinkId && !filteredGraph.links.some(link => getLinkId(link) === selectedLinkId))
      setSelectedLinkId(null)
  }, [filteredGraph.links, selectedLinkId, selectedNodeId, visibleNodeMap])

  const searchResults = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase()
    if (!keyword)
      return []

    return filteredGraph.nodes
      .filter(node => node.name.toLowerCase().includes(keyword) || node.id.toLowerCase().includes(keyword))
      .sort((a, b) => Number(Boolean(a.isType)) - Number(Boolean(b.isType)))
      .slice(0, 8)
  }, [deferredQuery, filteredGraph.nodes])

  const highlightedNodeIds = useMemo(() => {
    const ids = new Set<string>()
    searchResults.forEach(node => ids.add(node.id))
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

  const metadataCards = useMemo(() => {
    if (!payload)
      return []

    return [
      {
        label: '可视节点',
        value: filteredGraph.nodes.length,
        accent: 'text-[#ffcf5a]',
      },
      {
        label: '可视关系',
        value: filteredGraph.links.length,
        accent: 'text-[#7df2c0]',
      },
      {
        label: '进化链',
        value: payload.metadata.evolutionChainCount,
        accent: 'text-[#89b4ff]',
      },
      {
        label: '属性数',
        value: payload.metadata.typeCount,
        accent: 'text-[#ff91b5]',
      },
    ]
  }, [filteredGraph.links.length, filteredGraph.nodes.length, payload])

  function focusNode(node: GraphNode) {
    setSelectedNodeId(node.id)
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
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Knowledge Surface</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">属性与进化链视图</h2>
            </div>
            <div className="hidden border border-white/10 bg-black/40 px-3 py-2 text-right text-[11px] text-white/55 md:block">
              <div>拖拽平移，滚轮缩放</div>
              <div>点击节点聚焦，点击连线查看关系说明</div>
            </div>
          </div>

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

        {/* Left Panel: Search & Filters */}
        <section className="pointer-events-none absolute bottom-4 left-4 top-4 z-10 flex w-80 flex-col gap-4 overflow-y-auto hidden-scrollbar">
          <div className="pointer-events-auto flex flex-col gap-4">
          <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center gap-3 text-[#ffcf5a]">
                <ShareNetwork weight="fill" className="size-5" />
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/55">Field Atlas</div>
              </div>
              <CardTitle className="text-2xl font-semibold tracking-[0.02em] text-white">宝可梦关系图鉴</CardTitle>
              <CardDescription className="text-white/60">
                当前可视化只展示默认宝可梦节点，以及它们与属性、进化链的关系。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {metadataCards.map(card => (
                <div key={card.label} className="border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">{card.label}</div>
                  <div className={cn('mt-2 text-2xl font-semibold', card.accent)}>{card.value}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MagnifyingGlass className="size-4 text-[#89b4ff]" />
                搜索与过滤
              </CardTitle>
              <CardDescription className="text-white/55">按名称定位节点，或按世代缩小图谱范围。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="搜索宝可梦或属性"
                  className="w-full border border-white/12 bg-white/6 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#89b4ff]"
                />
                {searchResults.length > 0 && (
                  <div className="absolute inset-x-0 top-[calc(100%+8px)] z-20 border border-white/12 bg-[#0a1022]/95 p-1 shadow-2xl backdrop-blur-xl">
                    {searchResults.map(node => (
                      <button
                        key={node.id}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-white/78 transition hover:bg-white/8"
                        onClick={() => focusNode(node)}
                      >
                        <span>{node.name}</span>
                        <span className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                          {node.isType ? 'Type' : generationLabel(node.generation)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">关系层级</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={showTypeLinks ? 'default' : 'outline'}
                    className={cn('border-white/12', showTypeLinks && 'bg-[#ffcf5a] text-black hover:bg-[#ffcf5a]/90')}
                    onClick={() => setShowTypeLinks(value => !value)}
                  >
                    属性关系
                  </Button>
                  <Button
                    variant={showEvolutionLinks ? 'default' : 'outline'}
                    className={cn('border-white/12', showEvolutionLinks && 'bg-[#7df2c0] text-black hover:bg-[#7df2c0]/90')}
                    onClick={() => setShowEvolutionLinks(value => !value)}
                  >
                    进化关系
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">世代筛选</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={generationFilter === 'all' ? 'default' : 'outline'}
                    className={cn('border-white/12', generationFilter === 'all' && 'bg-white text-black hover:bg-white/90')}
                    onClick={() => setGenerationFilter('all')}
                  >
                    全部
                  </Button>
                  {generations.map(gen => (
                    <Button
                      key={gen}
                      size="sm"
                      variant={generationFilter === gen ? 'default' : 'outline'}
                      className={cn('border-white/12', generationFilter === gen && 'bg-[#89b4ff] text-black hover:bg-[#89b4ff]/90')}
                      onClick={() => setGenerationFilter(gen)}
                    >
                      Gen
                      {' '}
                      {gen}
                    </Button>
                  ))}
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
                <span className="inline-flex size-3 rounded-full bg-white ring-2 ring-white/20" />
                <span>普通宝可梦节点</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex size-3 rotate-45 bg-[#89b4ff]" />
                <span>属性节点</span>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkle className="size-4 text-[#ff91b5]" weight="fill" />
                当前焦点
              </CardTitle>
              <CardDescription className="text-white/55">节点与连线的详细信息会在这里展开。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">


              {infoNode && (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    {!infoNode.isType && infoNode.sprite && (
                      <img
                        src={getSpriteUrl(infoNode.sprite)}
                        alt={infoNode.name}
                        className="size-18 border border-white/12 bg-black/30 object-contain p-2"
                      />
                    )}
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-white/38">
                        {infoNode.isType ? 'Type Node' : 'Pokemon Node'}
                      </div>
                      <div className="text-2xl font-semibold text-white">{infoNode.name}</div>
                      {!infoNode.isType && (
                        <div className="text-sm text-white/55">
                          #
                          {infoNode.pokedexNumber}
                          {' '}
                          ·
                          {' '}
                          {generationLabel(infoNode.generation)}
                        </div>
                      )}
                    </div>
                  </div>

                  {!infoNode.isType && infoNode.types && (
                    <div className="flex flex-wrap gap-2">
                      {infoNode.types.map(type => (
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
                        {adjacency.relationMap.get(infoNode.id)?.size || 0}
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
                        const sourceId = getEndpointId(link.source)
                        const targetId = getEndpointId(link.target)
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
                                {sourceNode.name}
                                {' '}
                                →
                                {' '}
                                {targetNode.name}
                              </span>
                              <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                                {link.type === 'evolution' ? 'evolution' : 'type'}
                              </span>
                            </div>
                            {link.label && (
                              <div className="mt-2 text-xs text-white/52">{link.label}</div>
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
                      {visibleNodeMap.get(getEndpointId(infoLink.source))?.name}
                      {' '}
                      →
                      {' '}
                      {visibleNodeMap.get(getEndpointId(infoLink.target))?.name}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="border border-white/10 bg-white/4 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">关系类型</div>
                      <div className="mt-2 text-lg font-semibold text-[#7df2c0]">
                        {infoLink.type === 'evolution' ? '进化关系' : '属性归属'}
                      </div>
                    </div>
                    {infoLink.type === 'evolution' && (
                      <>
                        <div className="border border-white/10 bg-white/4 p-3">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">触发方式</div>
                          <div className="mt-2 text-lg font-semibold text-white">{formatTrigger(infoLink.trigger)}</div>
                        </div>
                        <div className="border border-white/10 bg-white/4 p-3">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">条件摘要</div>
                          <div className="mt-2 text-sm text-white/72">{infoLink.label || '无额外说明'}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <GitBranch className="size-4 text-[#7df2c0]" />
                数据说明
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/63">
              <p>当前图谱只使用默认宝可梦节点，因此进化边不会连接 Mega、地区形态或其他 form。</p>
              <p>属性来自默认 `pokemon` 实体，进化条件来自 `evolution-chain`，这两层通过默认节点投影到同一张图上。</p>
              <p>
                数据生成时间：
                {payload ? new Date(payload.metadata.generatedAt).toLocaleString() : '加载中'}
              </p>
            </CardContent>
          </Card>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
