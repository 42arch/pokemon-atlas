import { useTranslations } from 'next-intl'
import type { Dispatch, SetStateAction } from 'react'
import type { GraphNode } from './pixi-graph'
import type { NodeDetails } from '@/lib/graph-utils'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LocaleSwitcher } from '@/components/ui/locale-switcher'
import { generationLabel } from '@/lib/graph-utils'
import { cn } from '@/lib/utils'

interface SidebarPanelProps {
  query: string
  setQuery: (val: string) => void
  setConfirmedQuery: (val: string) => void
  isDropdownVisible: boolean
  setIsDropdownVisible: (val: boolean) => void
  searchResults: GraphNode[]
  focusNode: (node: GraphNode) => void
  details: Record<string, NodeDetails> | null
  showTypeLinks: boolean
  setShowTypeLinks: Dispatch<SetStateAction<boolean>>
  showEvolutionLinks: boolean
  setShowEvolutionLinks: Dispatch<SetStateAction<boolean>>
  showAbilityLinks: boolean
  setShowAbilityLinks: Dispatch<SetStateAction<boolean>>
  showMoveLinks: boolean
  setShowMoveLinks: Dispatch<SetStateAction<boolean>>
  generationFilter: number | 'all'
  setGenerationFilter: (val: number | 'all') => void
  generations: number[]
  stats: {
    pokemonCount: number
    typeCount: number
    abilityCount: number
    moveCount: number
  }
}

export function SidebarPanel({
  query,
  setQuery,
  setConfirmedQuery,
  isDropdownVisible,
  setIsDropdownVisible,
  searchResults,
  focusNode,
  details,
  showTypeLinks,
  setShowTypeLinks,
  showEvolutionLinks,
  setShowEvolutionLinks,
  showAbilityLinks,
  setShowAbilityLinks,
  showMoveLinks,
  setShowMoveLinks,
  generationFilter,
  setGenerationFilter,
  generations,
  stats,
}: SidebarPanelProps) {
  const t = useTranslations('Common')

  return (
    <Card className="border border-white/10 bg-black/40 backdrop-blur-xl shadow-xl">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">{t('title')}</h1>
          <LocaleSwitcher />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Section */}
        <div className="space-y-3">
          <div className="relative group">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setIsDropdownVisible(true)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setConfirmedQuery(query)
                  setIsDropdownVisible(false)
                }
              }}
              placeholder={t('searchPlaceholder')}
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
              <MagnifyingGlassIcon className="size-4" />
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
                      {node.it ? t('types') : node.ia ? t('abilities') : node.im ? t('moves') : details?.[node.i] ? generationLabel(details[node.i].generation) : ''}
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
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">{t('relHierarchy')}</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={showTypeLinks ? 'default' : 'outline'}
                className={cn('h-8 text-xs border-white/12', showTypeLinks && 'bg-[#ffcf5a] text-black hover:bg-[#ffcf5a]/90')}
                onClick={() => setShowTypeLinks(value => !value)}
              >
                {t('types')}
              </Button>
              <Button
                variant={showEvolutionLinks ? 'default' : 'outline'}
                className={cn('h-8 text-xs border-white/12', showEvolutionLinks && 'bg-[#7df2c0] text-black hover:bg-[#7df2c0]/90')}
                onClick={() => setShowEvolutionLinks(value => !value)}
              >
                {t('evolutions')}
              </Button>
              <Button
                variant={showAbilityLinks ? 'default' : 'outline'}
                className={cn('h-8 text-xs border-white/12', showAbilityLinks && 'bg-[#a855f7] text-white hover:bg-[#a855f7]/90')}
                onClick={() => setShowAbilityLinks(value => !value)}
              >
                {t('abilities')}
              </Button>
              <Button
                variant={showMoveLinks ? 'default' : 'outline'}
                className={cn('h-8 text-xs border-white/12', showMoveLinks && 'bg-[#ff5e3d] text-white hover:bg-[#ff5e3d]/90')}
                onClick={() => setShowMoveLinks(value => !value)}
              >
                {t('moves')}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">{t('genFilter')}</div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={generationFilter === 'all' ? 'default' : 'outline'}
                className={cn('h-7 text-[10px] border-white/12', generationFilter === 'all' && 'bg-[#89b4ff] text-black hover:bg-[#89b4ff]/90 shadow-[0_0_12px_rgba(137,180,255,0.3)]')}
                onClick={() => setGenerationFilter('all')}
              >
                {t('all')}
              </Button>
              {generations.map(gen => (
                <Button
                  key={gen}
                  size="sm"
                  variant={generationFilter === gen ? 'default' : 'outline'}
                  className={cn('h-7 text-[10px] border-white/12', generationFilter === gen && 'bg-[#89b4ff] text-black hover:bg-[#89b4ff]/90')}
                  onClick={() => setGenerationFilter(gen)}
                >
                  {t('stats.genShort')} {gen}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-white/5">
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">{t('stats.pokemon')}</div>
              <div className="mt-0.5 text-lg font-semibold text-white/90">{stats.pokemonCount}</div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">{t('stats.type')}</div>
              <div className="mt-0.5 text-lg font-semibold text-white/90">{stats.typeCount}</div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">{t('stats.ability')}</div>
              <div className="mt-0.5 text-lg font-semibold text-white/90">{stats.abilityCount}</div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">{t('stats.move')}</div>
              <div className="mt-0.5 text-lg font-semibold text-white/90">{stats.moveCount}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
