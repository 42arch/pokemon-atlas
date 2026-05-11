'use client'

import type { GraphLink, GraphNode } from './pixi-graph'
import type { NodeDetails } from '@/lib/graph-utils'
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { getEndpointId, getLinkId } from '@/lib/graph-utils'
import { DetailsPanel } from './details-panel'
import { LegendPanel } from './legend-panel'
import PixiGraph from './pixi-graph'
import { SidebarPanel } from './sidebar-panel'

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

export default function PokemonGraph() {
  const [payload, setPayload] = useState<GraphPayload | null>(null)
  const [details, setDetails] = useState<Record<string, NodeDetails> | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [confirmedQuery, setConfirmedQuery] = useState('')
  const [showTypeLinks, setShowTypeLinks] = useState(true)
  const [showEvolutionLinks, setShowEvolutionLinks] = useState(true)
  const [showAbilityLinks, setShowAbilityLinks] = useState(false)
  const [showMoveLinks, setShowMoveLinks] = useState(false)
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
        .filter(node => !node.it && !node.ia && !node.im)
        .filter((node) => {
          if (generationFilter === 'all')
            return true
          const d = details?.[node.i]
          return d?.generation === generationFilter
        })
        .map(node => node.i),
    )

    // Abilities should be considered visible if the toggle is on, or we'll filter them later based on links
    const visibleAbilities = new Set(
      payload.nodes
        .filter(node => node.ia)
        .map(node => node.i),
    )

    // Moves should be considered visible if the toggle is on
    const visibleMoves = new Set(
      payload.nodes
        .filter(node => node.im)
        .map(node => node.i),
    )

    const links = normalizedLinks.filter((link) => {
      if (link.ty === 'type-link' && !showTypeLinks)
        return false
      if (link.ty === 'evolution' && !showEvolutionLinks)
        return false
      if (link.ty === 'ability-link' && !showAbilityLinks)
        return false
      if (link.ty === 'move-link' && !showMoveLinks)
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

      if (link.ty === 'move-link') {
        // Show move link if move toggle is on AND the pokemon is visible
        const pokemonId = sourceNode.im ? targetId : sourceId
        return showMoveLinks && visiblePokemon.has(pokemonId)
      }

      return visiblePokemon.has(sourceId) && visiblePokemon.has(targetId)
    })

    const visibleNodeIds = new Set<string>(visiblePokemon)
    if (showAbilityLinks) {
      visibleAbilities.forEach(id => visibleNodeIds.add(id))
    }
    if (showMoveLinks) {
      visibleMoves.forEach(id => visibleNodeIds.add(id))
    }

    links.forEach((link) => {
      visibleNodeIds.add(getEndpointId(link.s))
      visibleNodeIds.add(getEndpointId(link.t))
    })

    const query = deferredQuery.trim().toLowerCase()
    if (query) {
      const matchedNodeIds = new Set<string>()
      payload.nodes.forEach((node) => {
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
        for (const link of links) {
          const sourceId = getEndpointId(link.s)
          const targetId = getEndpointId(link.t)

          if ((link.ty === 'type-link' || link.ty === 'ability-link' || link.ty === 'move-link') && (sourceId === currId || targetId === currId)) {
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

    const finalLinks = links.filter((link) => {
      const sourceId = getEndpointId(link.s)
      const targetId = getEndpointId(link.t)
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)
    })

    return { nodes: finalNodes, links: finalLinks }
  }, [payload, details, generationFilter, showEvolutionLinks, showTypeLinks, showAbilityLinks, showMoveLinks, baseNodeMap, deferredQuery])

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
    const pokemonCount = filteredGraph.nodes.filter(n => !n.it && !n.ia && !n.im).length
    const typeCount = filteredGraph.nodes.filter(n => n.it).length
    const abilityCount = filteredGraph.nodes.filter(n => n.ia).length
    const moveCount = filteredGraph.nodes.filter(n => n.im).length
    return { pokemonCount, typeCount, abilityCount, moveCount }
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
      .sort((a, b) => Number(Boolean(a.it || a.ia || a.im)) - Number(Boolean(b.it || b.ia || b.im)))
      .slice(0, 8)
  }, [query, filteredGraph.nodes])

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
                    if (node)
                      focusNode(node)
                  }}
                  onLinkClick={(link) => {
                    setSelectedNodeId(null)
                    setSelectedLinkId(link ? getLinkId(link as unknown as GraphLink) : null)
                  }}
                />
              )}
        </div>

        {/* Left Sidebar */}
        <section className="pointer-events-none absolute bottom-4 left-4 top-4 z-10 flex w-80 flex-col justify-between hidden-scrollbar overflow-y-auto">
          <div className="pointer-events-auto flex flex-col gap-4">
            <SidebarPanel
              query={query}
              setQuery={setQuery}
              setConfirmedQuery={setConfirmedQuery}
              isDropdownVisible={isDropdownVisible}
              setIsDropdownVisible={setIsDropdownVisible}
              searchResults={searchResults}
              focusNode={focusNode}
              details={details}
              showTypeLinks={showTypeLinks}
              setShowTypeLinks={setShowTypeLinks}
              showEvolutionLinks={showEvolutionLinks}
              setShowEvolutionLinks={setShowEvolutionLinks}
              showAbilityLinks={showAbilityLinks}
              setShowAbilityLinks={setShowAbilityLinks}
              showMoveLinks={showMoveLinks}
              setShowMoveLinks={setShowMoveLinks}
              generationFilter={generationFilter}
              setGenerationFilter={setGenerationFilter}
              generations={generations}
              stats={stats}
            />

            <LegendPanel />
          </div>
        </section>

        <DetailsPanel
          infoNode={infoNode}
          infoLink={infoLink}
          details={details}
          selectedNodeLinks={selectedNodeLinks}
          visibleNodeMap={visibleNodeMap}
          adjacency={adjacency}
          onFocus={(node) => {
            setQuery(node.n)
            setConfirmedQuery(node.n)
          }}
          onSelectLink={(linkId) => {
            setSelectedNodeId(null)
            setSelectedLinkId(linkId)
          }}
        />
      </main>
    </div>
  )
}
