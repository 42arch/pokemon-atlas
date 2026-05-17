'use client'

import type { GraphLink, GraphNode } from './pixi-graph'
import type { NodeDetails } from '@/lib/graph-utils'
import { FingerprintIcon, LightningIcon, SwordIcon, TargetIcon } from '@phosphor-icons/react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TypeIcon, TypeTag } from '@/components/ui/type-tag'
import { getEndpointId, getHomeSpriteUrl, getLinkId } from '@/lib/graph-utils'
import { cn } from '@/lib/utils'

interface DetailsPanelProps {
  className?: string
  infoNode: GraphNode | null
  infoLink: GraphLink | null
  details: Record<string, NodeDetails> | null
  selectedNodeLinks: GraphLink[]
  visibleNodeMap: Map<string, GraphNode>
  adjacency: { relationMap: Map<string, Set<string>>, linkMap: Map<string, GraphLink[]> }
  onFocus: (node: GraphNode) => void
  onSelectLink: (linkId: string) => void
}

export function DetailsPanel({
  className,
  infoNode,
  infoLink,
  details,
  selectedNodeLinks,
  visibleNodeMap,
  adjacency,
  onFocus,
  onSelectLink,
}: DetailsPanelProps) {
  const t = useTranslations('Details')
  const tCommon = useTranslations('Common')
  const tLink = useTranslations('LinkTypes')

  if (!infoNode && !infoLink)
    return null

  return (
    <section className={cn('pointer-events-none absolute bottom-4 right-4 top-4 z-10 flex w-80 flex-col gap-4 overflow-y-auto hidden-scrollbar', className)}>
      <div className="pointer-events-auto flex flex-col gap-4">
        <Card className="atlas-panel rounded-lg">
          <CardHeader className="relative pb-2">
            <CardTitle className="flex items-center gap-2 text-[var(--atlas-text)]">
              {infoNode && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="-ml-2 size-8 rounded-md text-[var(--atlas-faint)] hover:bg-white/10 hover:text-[var(--atlas-yellow)]"
                  title={t('focus')}
                  onClick={() => onFocus(infoNode)}
                >
                  <TargetIcon className="size-4" />
                </Button>
              )}
              {infoNode ? (infoNode.it ? t('typeNode') : (infoNode.ia ? t('abilityNode') : t('pokemonNode'))) : t('relationLink')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {infoNode && (
              <div className="space-y-4">
                {!infoNode.it && !infoNode.ia && infoNode.s && (
                  <div className="flex justify-center w-full py-4 bg-white/5 rounded-none border border-white/5 overflow-hidden">
                    <img
                      src={getHomeSpriteUrl(infoNode.s)}
                      alt={infoNode.n}
                      className="size-32 object-contain drop-shadow-[0_0_20px_rgba(246,201,69,0.12)] transition-transform hover:scale-110"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[var(--atlas-text)]">
                    {infoNode.it && <TypeIcon name={infoNode.n} size={28} />}
                    {infoNode.n}
                  </div>
                  {details?.[infoNode.i] && (
                    <div className="text-sm text-[var(--atlas-muted)]">
                      {details[infoNode.i].pokedexNumber && `${t('pokedex')} #${details[infoNode.i].pokedexNumber}`}
                      {details[infoNode.i].generation && ` · ${t('generation')} ${details[infoNode.i].generation}`}
                    </div>
                  )}
                  {infoNode.ia && (
                    <div className="text-sm font-bold uppercase tracking-wider text-[var(--atlas-purple)]">{t('abilityNode')}</div>
                  )}
                </div>

                {infoNode.ia && details?.[infoNode.i]?.description && (
                  <div className="border-l-2 border-[var(--atlas-purple)]/40 bg-[var(--atlas-purple)]/10 p-3 text-xs italic leading-relaxed text-[var(--atlas-muted)]">
                    {details[infoNode.i].description}
                  </div>
                )}

                {details?.[infoNode.i]?.types && (
                  <div className="flex flex-wrap gap-2">
                    {details[infoNode.i].types?.map(type => (
                      <TypeTag key={type} name={type} />
                    ))}
                  </div>
                )}

                {infoNode.it
                  ? (
                      <div className="rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] p-3 transition hover:bg-white/10">
                        <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--atlas-faint)]">{t('stats.pkmCount')}</div>
                        <div className="mt-1 flex items-baseline gap-1">
                          <div className="font-mono text-xl font-bold text-[var(--atlas-text)]">
                            {adjacency.relationMap.get(infoNode.i)?.size || 0}
                          </div>
                          <div className="text-[10px] text-[var(--atlas-faint)]">{t('stats.unitPkm')}</div>
                        </div>
                      </div>
                    )
                  : (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: t('stats.types'), count: details?.[infoNode.i]?.types?.length || 0, color: 'var(--atlas-type)' },
                          { label: t('stats.evolutions'), count: selectedNodeLinks.filter(l => l.ty === 'evolution').length, color: 'var(--atlas-green)' },
                          { label: t('stats.abilities'), count: details?.[infoNode.i]?.abilities?.length || 0, color: 'var(--atlas-purple)' },
                          { label: t('stats.moves'), count: details?.[infoNode.i]?.moves?.length || 0, color: 'var(--atlas-orange)' },
                        ].map(stat => (
                          <div key={stat.label} className="rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] p-2.5 transition hover:bg-white/10">
                            <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--atlas-faint)]">{stat.label}</div>
                            <div className="mt-0.5 flex items-baseline gap-1">
                              <div className="font-mono text-lg font-bold" style={{ color: stat.color }}>{stat.count}</div>
                              <div className="text-[9px] text-[var(--atlas-faint)]">{t('stats.unit')}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                {infoNode && (details?.[infoNode.i]?.abilities?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--atlas-faint)]">
                      <FingerprintIcon className="size-3.5 text-[var(--atlas-purple)]" />
                      {t('abilities')}
                    </div>
                    <div className="space-y-2">
                      {details?.[infoNode.i]?.abilities?.map(ability => (
                        <div
                          key={ability.id}
                          className={cn(
                            'rounded-md border p-3 transition-colors',
                            ability.isHidden ? 'border-[var(--atlas-purple)]/30 bg-[var(--atlas-purple)]/10' : 'border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)]',
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-bold text-[var(--atlas-text)]">{ability.name}</span>
                            {ability.isHidden && (
                              <span className="rounded-sm border border-[var(--atlas-purple)]/30 bg-[var(--atlas-purple)]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--atlas-purple)]">
                                {t('hidden')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs italic leading-relaxed text-[var(--atlas-muted)]">
                            {ability.description || '...'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {infoNode && details?.[infoNode.i]?.moves && (details[infoNode.i]?.moves?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--atlas-faint)]">
                      <SwordIcon className="size-3.5 text-[var(--atlas-orange)]" />
                      {t('moves')}
                    </div>
                    <div className="hidden-scrollbar flex max-h-48 flex-col gap-1.5 overflow-y-auto pr-1">
                      {details?.[infoNode.i]?.moves?.map((move, idx) => (
                        <div key={`${move.id}-${move.method}-${move.level}-${idx}`} className="group flex items-center justify-between rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] p-2 transition hover:bg-white/10">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--atlas-text)]">{move.name}</span>
                              <span className="text-[9px] text-[var(--atlas-faint)]">
                                Lv.
                                {move.level}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-sm border border-[var(--atlas-border)] bg-white/5 px-1 text-[8px] uppercase tracking-tighter text-[var(--atlas-faint)]">
                                {move.damage_class_id === '2' ? t('phys') : move.damage_class_id === '3' ? t('spec') : t('stat')}
                              </span>
                              <span className="font-mono text-[9px] text-[var(--atlas-faint)]">
                                {move.power && move.power !== '0' ? `ATK:${move.power}` : ''}
                                {move.accuracy && move.accuracy !== '0' ? ` ACC:${move.accuracy}` : ''}
                              </span>
                            </div>
                          </div>
                          <div className="text-[10px] font-bold text-[var(--atlas-muted)]">
                            PP
                            {' '}
                            {move.pp}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--atlas-faint)]">
                    <LightningIcon className="size-3.5 text-[var(--atlas-yellow)]" />
                    {t('relationLink')}
                  </div>
                  <div className="hidden-scrollbar flex max-h-[340px] flex-col gap-2 overflow-auto pr-1">
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
                          className="group w-full rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] p-2.5 text-left transition hover:bg-white/10"
                          onClick={() => onSelectLink(getLinkId(link))}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[13px] font-medium text-[var(--atlas-muted)] transition-colors group-hover:text-[var(--atlas-text)]">
                              {sourceNode.n}
                              <span className="mx-1 text-[var(--atlas-faint)]">→</span>
                              {targetNode.n}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--atlas-faint)]">
                              {tLink(link.ty as any)}
                            </span>
                          </div>
                          {details?.[getLinkId(link)]?.label && (
                            <div className="mt-1.5 line-clamp-1 text-[11px] italic leading-relaxed text-[var(--atlas-faint)]">{details[getLinkId(link)].label}</div>
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
                <div className="grid gap-2">
                  <div className="rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--atlas-faint)]">{tCommon('LinkTypes.source')}</div>
                    <div className="mt-1 text-sm font-bold text-[var(--atlas-text)]">
                      {visibleNodeMap.get(getEndpointId(infoLink.s))?.n}
                    </div>
                  </div>
                  <div className="rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--atlas-faint)]">{tCommon('LinkTypes.target')}</div>
                    <div className="mt-1 text-sm font-bold text-[var(--atlas-text)]">
                      {visibleNodeMap.get(getEndpointId(infoLink.t))?.n}
                    </div>
                  </div>
                  <div className="rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--atlas-faint)]">{tCommon('relationLink')}</div>
                    <div className="mt-1 text-sm font-bold text-[var(--atlas-yellow)]">
                      {tLink(infoLink.ty as any)}
                    </div>
                  </div>
                </div>

                {details?.[getLinkId(infoLink)]?.label && (
                  <div className="border-l-2 border-[var(--atlas-yellow)]/40 bg-[var(--atlas-panel-soft)] p-4">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--atlas-faint)]">{t('description')}</div>
                    <div className="text-xs italic leading-relaxed text-[var(--atlas-muted)]">
                      {details[getLinkId(infoLink)].label}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
