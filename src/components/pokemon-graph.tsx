'use client'

import type { ReactNode } from 'react'
import type { GraphLink, GraphNode } from './pixi-graph'
import type { NodeDetails } from '@/lib/graph-utils'
import { FunnelSimpleIcon, InfoIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { useTranslations } from 'next-intl'
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TypeTag } from '@/components/ui/type-tag'
import { GENERATIONS_LIST } from '@/lib/constants'
import { generationLabel, getEndpointId, getHomeSpriteUrl, getLinkId } from '@/lib/graph-utils'
import { DetailsPanel } from './details-panel'
import { LegendPanel } from './legend-panel'
import PixiGraph from './pixi-graph'
import { SidebarPanel } from './sidebar-panel'
import { LocaleSwitcher } from './ui/locale-switcher'

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

export default function PokemonGraph({ locale = 'zh' }: { locale?: string }) {
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
  const [mobilePanel, setMobilePanel] = useState<'none' | 'search' | 'filters' | 'legend'>('none')
  const deferredQuery = useDeferredValue(confirmedQuery)
  const t = useTranslations('Common')

  useEffect(() => {
    let active = true

    fetch(`/graph-data-${locale}.json`)
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

    fetch(`/node-details-${locale}.json`)
      .then(res => res.json())
      .then((data: Record<string, NodeDetails>) => {
        if (!active)
          return
        setDetails(data)
      })
      .catch(err => console.error('Failed to load node details', err))

    return () => {
      active = false
    }
  }, [locale])

  const baseNodeMap = useMemo(() => {
    return new Map(payload?.nodes.map(node => [node.i, node]) || [])
  }, [payload])

  const generations = GENERATIONS_LIST

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

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--atlas-bg)] text-[var(--atlas-text)]">
        <div className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-panel)] px-5 py-4 text-sm uppercase tracking-[0.22em] text-[var(--atlas-muted)]">
          {t('stats.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--atlas-bg)] text-[var(--atlas-text)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(226,58,58,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(246,201,69,0.14),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(53,196,106,0.12),transparent_36%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(244,241,232,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(244,241,232,0.12)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,5,7,0.18)_0%,rgba(2,5,7,0.72)_100%)]" />

      <main className="relative z-10 min-h-screen w-full overflow-hidden">
        {/* Full-screen Graph Scene */}
        <div className="absolute inset-0 z-0">
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
        </div>

        {/* Left Sidebar */}
        <section className="pointer-events-none absolute bottom-4 left-4 top-4 z-10 hidden w-80 flex-col justify-between overflow-y-auto lg:flex hidden-scrollbar">
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
          className="hidden lg:flex"
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

        <MobileTopBar
          title={t('title')}
          onSearch={() => setMobilePanel('search')}
          onFilters={() => setMobilePanel('filters')}
          onLegend={() => setMobilePanel('legend')}
        />

        {mobilePanel === 'search' && (
          <MobileOverlay title={t('searchPlaceholder')} onClose={() => setMobilePanel('none')}>
            <MobileSearchPanel
              query={query}
              setQuery={setQuery}
              setConfirmedQuery={setConfirmedQuery}
              searchResults={searchResults}
              focusNode={focusNode}
              details={details}
              onDone={() => setMobilePanel('none')}
            />
          </MobileOverlay>
        )}

        {mobilePanel === 'filters' && (
          <MobileOverlay title={t('relHierarchy')} onClose={() => setMobilePanel('none')}>
            <SidebarPanel
              className="border-0 bg-transparent shadow-none"
              query={query}
              setQuery={setQuery}
              setConfirmedQuery={setConfirmedQuery}
              isDropdownVisible={false}
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
          </MobileOverlay>
        )}

        {mobilePanel === 'legend' && (
          <MobileOverlay title={t('relationLink')} onClose={() => setMobilePanel('none')}>
            <LegendPanel />
          </MobileOverlay>
        )}

        <MobileDetailsSheet
          infoNode={infoNode}
          infoLink={infoLink}
          details={details}
          selectedNodeLinks={selectedNodeLinks}
          visibleNodeMap={visibleNodeMap}
        />
      </main>
    </div>
  )
}

function MobileTopBar({
  title,
  onSearch,
  onFilters,
  onLegend,
}: {
  title: string
  onSearch: () => void
  onFilters: () => void
  onLegend: () => void
}) {
  return (
    <header className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-3 lg:hidden">
      <div className="atlas-panel pointer-events-auto rounded-lg px-3 py-2">
        <div className="mt-0.5 font-heading text-lg font-bold leading-tight text-[var(--atlas-text)]">{title}</div>
        <div className="mt-2">
          <LocaleSwitcher />
        </div>
      </div>
      <div className="atlas-panel pointer-events-auto flex items-center gap-1 rounded-lg p-1.5">
        <Button size="icon-sm" variant="ghost" className="rounded-md text-[var(--atlas-muted)] hover:bg-white/10 hover:text-[var(--atlas-yellow)]" onClick={onSearch} aria-label="Search">
          <MagnifyingGlassIcon className="size-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" className="rounded-md text-[var(--atlas-muted)] hover:bg-white/10 hover:text-[var(--atlas-yellow)]" onClick={onFilters} aria-label="Filters">
          <FunnelSimpleIcon className="size-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" className="rounded-md text-[var(--atlas-muted)] hover:bg-white/10 hover:text-[var(--atlas-yellow)]" onClick={onLegend} aria-label="Legend">
          <InfoIcon className="size-4" />
        </Button>
      </div>
    </header>
  )
}

function MobileOverlay({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/45 px-3 pb-3 pt-20 lg:hidden">
      <section className="atlas-panel-strong max-h-[78vh] w-full overflow-y-auto rounded-xl p-3 hidden-scrollbar">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--atlas-muted)]">{title}</h2>
          <Button size="icon-sm" variant="ghost" className="rounded-md text-[var(--atlas-muted)] hover:bg-white/10 hover:text-[var(--atlas-text)]" onClick={onClose} aria-label="Close">
            <XIcon className="size-4" />
          </Button>
        </div>
        {children}
      </section>
    </div>
  )
}

function MobileSearchPanel({
  query,
  setQuery,
  setConfirmedQuery,
  searchResults,
  focusNode,
  details,
  onDone,
}: {
  query: string
  setQuery: (val: string) => void
  setConfirmedQuery: (val: string) => void
  searchResults: GraphNode[]
  focusNode: (node: GraphNode) => void
  details: Record<string, NodeDetails> | null
  onDone: () => void
}) {
  const t = useTranslations('Common')

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          autoFocus
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              setConfirmedQuery(query)
              onDone()
            }
          }}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-lg border border-[var(--atlas-border)] bg-black/25 py-3 pl-3 pr-11 text-base text-[var(--atlas-text)] outline-none placeholder:text-[var(--atlas-faint)] focus:border-[var(--atlas-yellow)]/60"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-[var(--atlas-muted)]"
          onClick={() => {
            setConfirmedQuery(query)
            onDone()
          }}
        >
          <MagnifyingGlassIcon className="size-4" />
        </button>
      </div>
      <div className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto hidden-scrollbar">
        {searchResults.length === 0
          ? (
              <div className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] p-4 text-sm text-[var(--atlas-muted)]">{t('noResults')}</div>
            )
          : searchResults.map(node => (
              <button
                key={node.i}
                type="button"
                className="flex items-center justify-between rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] px-3 py-3 text-left"
                onClick={() => {
                  setQuery(node.n)
                  setConfirmedQuery(node.n)
                  focusNode(node)
                  onDone()
                }}
              >
                <span className="text-sm font-semibold text-[var(--atlas-text)]">{node.n}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--atlas-faint)]">
                  {node.it ? t('types') : node.ia ? t('abilities') : node.im ? t('moves') : details?.[node.i] ? generationLabel(details[node.i].generation) : ''}
                </span>
              </button>
            ))}
      </div>
    </div>
  )
}

function MobileDetailsSheet({
  infoNode,
  infoLink,
  details,
  selectedNodeLinks,
  visibleNodeMap,
}: {
  infoNode: GraphNode | null
  infoLink: GraphLink | null
  details: Record<string, NodeDetails> | null
  selectedNodeLinks: GraphLink[]
  visibleNodeMap: Map<string, GraphNode>
}) {
  const t = useTranslations('Details')
  const tCommon = useTranslations('Common')
  const tLink = useTranslations('LinkTypes')

  if (!infoNode && !infoLink) {
    return (
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 lg:hidden">
        <div className="atlas-panel rounded-xl px-4 py-3 text-xs text-[var(--atlas-muted)]">
          {tCommon('inspectHint')}
        </div>
      </div>
    )
  }

  const nodeDetails = infoNode ? details?.[infoNode.i] : null
  const relationLabel = infoLink ? tLink(infoLink.ty as any) : null

  return (
    <section className="pointer-events-none absolute inset-x-3 bottom-3 z-20 lg:hidden">
      <div className="atlas-panel pointer-events-auto max-h-[44vh] overflow-y-auto rounded-xl p-3 hidden-scrollbar">
        {infoNode && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {!infoNode.it && !infoNode.ia && infoNode.s && (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-[var(--atlas-border)] bg-white/5">
                  <img src={getHomeSpriteUrl(infoNode.s)} alt={infoNode.n} className="size-14 object-contain" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-heading text-xl font-bold text-[var(--atlas-text)]">{infoNode.n}</div>
                {nodeDetails && (
                  <div className="mt-1 text-xs text-[var(--atlas-muted)]">
                    {nodeDetails.pokedexNumber && `${t('pokedex')} #${nodeDetails.pokedexNumber}`}
                    {nodeDetails.generation && ` · ${t('generation')} ${nodeDetails.generation}`}
                  </div>
                )}
              </div>
            </div>
            {nodeDetails?.types && (
              <div className="flex flex-wrap gap-2">
                {nodeDetails.types.map(type => <TypeTag key={type} name={type} />)}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <MobileStat label={t('stats.evolutions')} value={selectedNodeLinks.filter(link => link.ty === 'evolution').length} color="var(--atlas-green)" />
              <MobileStat label={t('stats.abilities')} value={nodeDetails?.abilities?.length || 0} color="var(--atlas-purple)" />
              <MobileStat label={t('stats.moves')} value={nodeDetails?.moves?.length || 0} color="var(--atlas-orange)" />
            </div>
            {selectedNodeLinks.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--atlas-faint)]">{t('relationLink')}</div>
                {selectedNodeLinks.slice(0, 5).map((link) => {
                  const source = visibleNodeMap.get(getEndpointId(link.s))
                  const target = visibleNodeMap.get(getEndpointId(link.t))
                  if (!source || !target)
                    return null
                  return (
                    <div key={getLinkId(link)} className="rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] px-3 py-2 text-xs text-[var(--atlas-muted)]">
                      <span className="text-[var(--atlas-text)]">{source.n}</span>
                      <span className="mx-1 text-[var(--atlas-faint)]">→</span>
                      <span className="text-[var(--atlas-text)]">{target.n}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {infoLink && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--atlas-yellow)]">{relationLabel}</div>
              <div className="mt-1 font-heading text-lg font-bold text-[var(--atlas-text)]">
                {visibleNodeMap.get(getEndpointId(infoLink.s))?.n}
                <span className="mx-2 text-[var(--atlas-faint)]">→</span>
                {visibleNodeMap.get(getEndpointId(infoLink.t))?.n}
              </div>
            </div>
            {details?.[getLinkId(infoLink)]?.label && (
              <p className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] p-3 text-xs italic leading-relaxed text-[var(--atlas-muted)]">
                {details[getLinkId(infoLink)].label}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function MobileStat({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] p-2">
      <div className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--atlas-faint)]">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  )
}
