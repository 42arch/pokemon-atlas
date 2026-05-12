'use client'

import { useTranslations, useLocale } from 'next-intl'
import type { GraphLink, GraphNode } from './pixi-graph'
import type { NodeDetails } from '@/lib/graph-utils'
import { FingerprintIcon, LightningIcon, SwordIcon, TargetIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TypeIcon, TypeTag } from '@/components/ui/type-tag'
import { getEndpointId, getLinkId, getSpriteUrl } from '@/lib/graph-utils'
import { cn } from '@/lib/utils'

interface DetailsPanelProps {
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
  const locale = useLocale()

  if (!infoNode && !infoLink)
    return null

  return (
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
                <div className="flex items-start gap-4">
                  {!infoNode.it && !infoNode.ia && infoNode.s && (
                    <img
                      src={getSpriteUrl(infoNode.s)}
                      alt={infoNode.n}
                      className="size-18 border border-white/12 bg-black/30 object-contain p-2"
                    />
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-2xl font-semibold text-white">
                      {infoNode.it && <TypeIcon name={infoNode.n} size={28} />}
                      {infoNode.n}
                    </div>
                    {details?.[infoNode.i] && (
                      <div className="text-sm text-white/55">
                        {details[infoNode.i].pokedexNumber && `${t('pokedex')} #${details[infoNode.i].pokedexNumber}`}
                        {details[infoNode.i].generation && ` · ${t('generation')} ${details[infoNode.i].generation}`}
                      </div>
                    )}
                    {infoNode.ia && (
                      <div className="text-sm text-[#a855f7]">{t('abilityNode')}</div>
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
                    {details[infoNode.i].types?.map(type => (
                      <TypeTag key={type} name={type} />
                    ))}
                  </div>
                )}

                {infoNode.it ? (
                  <div className="border border-white/10 bg-white/4 p-3 transition hover:bg-white/8">
                    <div className="text-[9px] uppercase tracking-[0.15em] text-white/30">{t('stats.pkmCount')}</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <div className="text-xl font-bold font-mono text-[#89b4ff]">
                        {adjacency.relationMap.get(infoNode.i)?.size || 0}
                      </div>
                      <div className="text-[10px] text-white/20">{t('stats.unitPkm')}</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: t('stats.types'), count: details?.[infoNode.i]?.types?.length || 0, color: '#89b4ff' },
                      { label: t('stats.evolutions'), count: selectedNodeLinks.filter(l => l.ty === 'evolution').length, color: '#7df2c0' },
                      { label: t('stats.abilities'), count: details?.[infoNode.i]?.abilities?.length || 0, color: '#a855f7' },
                      { label: t('stats.moves'), count: details?.[infoNode.i]?.moves?.length || 0, color: '#ff5e3d' },
                    ].map((stat) => (
                      <div key={stat.label} className="border border-white/10 bg-white/4 p-2.5 transition hover:bg-white/8">
                        <div className="text-[9px] uppercase tracking-[0.15em] text-white/30">{stat.label}</div>
                        <div className="mt-0.5 flex items-baseline gap-1">
                          <div className="text-lg font-bold font-mono" style={{ color: stat.color }}>{stat.count}</div>
                          <div className="text-[9px] text-white/20">{t('stats.unit')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {infoNode && (details?.[infoNode.i]?.abilities?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/38">
                      <FingerprintIcon className="size-3.5 text-[#a855f7]" />
                      {t('abilities')}
                    </div>
                    <div className="space-y-2">
                      {details?.[infoNode.i]?.abilities?.map((ability) => (
                        <div key={ability.id} className={cn(
                          'border p-3 transition-colors',
                          ability.isHidden ? 'border-[#a855f7]/30 bg-[#a855f7]/5' : 'border-white/10 bg-white/4'
                        )}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold text-white">{ability.name}</span>
                            {ability.isHidden && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30 uppercase font-bold tracking-wider">
                                {t('hidden')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/50 leading-relaxed italic">
                            {ability.description || '...'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {infoNode && details?.[infoNode.i]?.moves && (details[infoNode.i]?.moves?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/38">
                      <SwordIcon className="size-3.5 text-[#ff5e3d]" />
                      {t('moves')}
                    </div>
                    <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                      {details?.[infoNode.i]?.moves?.map((move, idx) => (
                        <div key={`${move.id}-${move.method}-${move.level}-${idx}`} className="group flex items-center justify-between border border-white/5 bg-white/[0.02] p-2 transition hover:bg-white/[0.05]">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-white/90">{move.name}</span>
                              <span className="text-[9px] text-white/30">Lv.{move.level}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] px-1 bg-white/5 text-white/40 uppercase tracking-tighter">
                                {move.damage_class_id === '2' ? t('phys') : move.damage_class_id === '3' ? t('spec') : t('stat')}
                              </span>
                              <span className="text-[9px] text-white/20 font-mono">
                                {move.power && move.power !== '0' ? `ATK:${move.power}` : ''} 
                                {move.accuracy && move.accuracy !== '0' ? ` ACC:${move.accuracy}` : ''}
                              </span>
                            </div>
                          </div>
                          <div className="text-[10px] text-white/40 font-medium">
                            PP {move.pp}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/38">
                    <LightningIcon className="size-3.5 text-[#ffcf5a]" />
                    {t('relationLink')}
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
                          className="w-full border border-white/10 bg-white/4 p-2.5 text-left transition hover:bg-white/8 group"
                          onClick={() => onSelectLink(getLinkId(link))}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[13px] text-white/90 group-hover:text-white transition-colors">
                              {sourceNode.n}
                              <span className="text-white/20 mx-1">→</span>
                              {targetNode.n}
                            </span>
                            <span className="text-[9px] uppercase tracking-[0.15em] text-white/30 font-bold">
                              {tLink(link.ty as any)}
                            </span>
                          </div>
                          {details?.[getLinkId(link)]?.label && (
                            <div className="mt-1.5 text-[11px] leading-relaxed text-white/45 italic line-clamp-1">{details[getLinkId(link)].label}</div>
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
                  <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">{tCommon('relHierarchy')}</div>
                  <div className="mt-2 text-lg font-bold text-white tracking-tight">
                    {visibleNodeMap.get(getEndpointId(infoLink.s))?.n}
                    <span className="text-white/20 mx-1">→</span>
                    {visibleNodeMap.get(getEndpointId(infoLink.t))?.n}
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="border border-white/10 bg-white/4 p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">{tCommon('relationLink')}</div>
                    <div className="mt-1 text-base font-bold text-[#7df2c0]">
                      {tLink(infoLink.ty as any)}
                    </div>
                  </div>
                  {infoLink.ty === 'evolution' && (
                    <>
                      <div className="border border-white/10 bg-white/4 p-3">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                          {locale === 'zh' ? '触发方式' : (locale === 'ja' ? '進化条件' : 'Trigger')}
                        </div>
                        <div className="mt-1 text-base font-medium text-white">{details?.[getLinkId(infoLink)]?.trigger || '...'}</div>
                      </div>
                      <div className="border border-white/10 bg-white/4 p-3">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                          {locale === 'zh' ? '详细条件说明' : (locale === 'ja' ? '詳細条件' : 'Summary')}
                        </div>
                        <div className="mt-1 text-xs leading-relaxed text-white/72">{details?.[getLinkId(infoLink)]?.label || '...'}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
