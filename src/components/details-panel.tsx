import type { GraphLink, GraphNode } from './pixi-graph'
import type { NodeDetails } from '@/lib/graph-utils'
import { LightningIcon, SparkleIcon, SwordIcon, TargetIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TYPE_COLORS } from '@/lib/constants'
import { generationLabel, getEndpointId, getLinkId, getSpriteUrl } from '@/lib/graph-utils'

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
                  title="仅显示此节点及其关联"
                  onClick={() => onFocus(infoNode)}
                >
                  <TargetIcon className="size-4" />
                </Button>
              )}
              <SparkleIcon className="size-4 text-[#ff91b5]" weight="fill" />
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
                    {details[infoNode.i].types?.map(type => (
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
                
                {infoNode && details?.[infoNode.i]?.moves && (details[infoNode.i]?.moves?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/38">
                      <SwordIcon className="size-3.5 text-[#ff5e3d]" />
                      可学招式 (Gen 9)
                    </div>
                    <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                      {details?.[infoNode.i]?.moves?.map((move) => (
                        <div key={move.id} className="group flex items-center justify-between border border-white/5 bg-white/[0.02] p-2 transition hover:bg-white/[0.05]">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-white/90">{move.name}</span>
                              <span className="text-[9px] text-white/30">Lv.{move.level}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] px-1 bg-white/5 text-white/40 uppercase tracking-tighter">
                                {move.damage_class_id === '2' ? '物理' : move.damage_class_id === '3' ? '特殊' : '变化'}
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
                          onClick={() => onSelectLink(getLinkId(link))}
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
  )
}
