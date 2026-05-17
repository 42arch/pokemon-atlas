import type { Dispatch, SetStateAction } from 'react'
import type { GraphNode } from './pixi-graph'
import type { NodeDetails } from '@/lib/graph-utils'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LocaleSwitcher } from '@/components/ui/locale-switcher'
import { generationLabel } from '@/lib/graph-utils'
import { cn } from '@/lib/utils'

interface SidebarPanelProps {
  className?: string
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
  className,
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
    <Card className={cn('atlas-panel rounded-lg py-4', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[var(--atlas-text)]">{t('title')}</h1>
          </div>
          <LocaleSwitcher />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Search Section */}
        <div className="flex flex-col gap-3">
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
              className="w-full rounded-md border border-[var(--atlas-border)] bg-black/20 py-2.5 pl-3 pr-10 text-sm text-[var(--atlas-text)] outline-none transition-all placeholder:text-[var(--atlas-faint)] focus:border-[var(--atlas-yellow)]/60 focus:bg-black/30"
            />
            <button
              type="button"
              onClick={() => {
                setConfirmedQuery(query)
                setIsDropdownVisible(false)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-[var(--atlas-faint)] transition-colors hover:text-[var(--atlas-yellow)]"
            >
              <MagnifyingGlassIcon className="size-4" />
            </button>

            {isDropdownVisible && searchResults.length > 0 && (
              <div className="atlas-panel-strong absolute inset-x-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-lg p-1">
                {searchResults.map(node => (
                  <button
                    key={node.i}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-[var(--atlas-muted)] transition hover:bg-white/10 hover:text-[var(--atlas-text)]"
                    onClick={() => {
                      setQuery(node.n)
                      setConfirmedQuery(node.n)
                      focusNode(node)
                      setIsDropdownVisible(false)
                    }}
                  >
                    <span>{node.n}</span>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--atlas-faint)]">
                      {node.it ? t('types') : node.ia ? t('abilities') : node.im ? t('moves') : details?.[node.i] ? generationLabel(details[node.i].generation) : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col gap-6 pt-2">
          <div className="flex flex-col gap-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--atlas-faint)]">{t('relHierarchy')}</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                className={cn('atlas-chip h-8 rounded-md text-xs', showTypeLinks && 'bg-[var(--atlas-type)] text-black hover:bg-[var(--atlas-type)]/90')}
                onClick={() => setShowTypeLinks(value => !value)}
              >
                {t('types')}
              </Button>
              <Button
                variant="ghost"
                className={cn('atlas-chip h-8 rounded-md text-xs', showEvolutionLinks && 'bg-[var(--atlas-green)] text-[#06100a] hover:bg-[var(--atlas-green)]/90')}
                onClick={() => setShowEvolutionLinks(value => !value)}
              >
                {t('evolutions')}
              </Button>
              <Button
                variant="ghost"
                className={cn('atlas-chip h-8 rounded-md text-xs', showAbilityLinks && 'bg-[var(--atlas-purple)] text-white hover:bg-[var(--atlas-purple)]/90')}
                onClick={() => setShowAbilityLinks(value => !value)}
              >
                {t('abilities')}
              </Button>
              <Button
                variant="ghost"
                className={cn('atlas-chip h-8 rounded-md text-xs', showMoveLinks && 'bg-[var(--atlas-orange)] text-[#160603] hover:bg-[var(--atlas-orange)]/90')}
                onClick={() => setShowMoveLinks(value => !value)}
              >
                {t('moves')}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--atlas-faint)]">{t('genFilter')}</div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                className={cn('atlas-chip h-7 rounded-md text-[10px]', generationFilter === 'all' && 'bg-[var(--atlas-yellow)] text-[#14110a] hover:bg-[var(--atlas-yellow)]/90')}
                onClick={() => setGenerationFilter('all')}
              >
                {t('all')}
              </Button>
              {generations.map(gen => (
                <Button
                  key={gen}
                  size="sm"
                  variant="ghost"
                  className={cn('atlas-chip h-7 rounded-md text-[10px]', generationFilter === gen && 'bg-[var(--atlas-yellow)] text-[#14110a] hover:bg-[var(--atlas-yellow)]/90')}
                  onClick={() => setGenerationFilter(gen)}
                >
                  {t('stats.genShort')}
                  {' '}
                  {gen}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 border-t border-[var(--atlas-border)] pt-4">
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--atlas-faint)]">{t('stats.pokemon')}</div>
              <div className="mt-1 text-lg font-bold tracking-tight text-[var(--atlas-text)]">{stats.pokemonCount}</div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--atlas-faint)]">{t('stats.type')}</div>
              <div className="mt-1 text-lg font-bold tracking-tight text-[var(--atlas-type)]">{stats.typeCount}</div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--atlas-faint)]">{t('stats.ability')}</div>
              <div className="mt-1 text-lg font-bold tracking-tight text-[var(--atlas-purple)]">{stats.abilityCount}</div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--atlas-faint)]">{t('stats.move')}</div>
              <div className="mt-1 text-lg font-bold tracking-tight text-[var(--atlas-orange)]">{stats.moveCount}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
