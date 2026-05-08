'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import * as PIXI from 'pixi.js'

export const TYPE_COLORS: Record<string, string> = {
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

const TEXT_VISIBILITY_THRESHOLD = 0.4;

function getSpriteUrl(sprite: string) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${sprite}.png`
}

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  val: number
  group: string
  isType?: boolean
  sprite?: string
  types?: string[]
  generation?: number
  pokedexNumber?: string
  radius?: number
  color?: string
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
  value: number
  type: string
  trigger?: string | null
  minLevel?: number | null
  label?: string
}

interface PixiGraphProps {
  nodes: GraphNode[]
  links: GraphLink[]
  selectedNodeId: string | null
  onNodeClick: (node: GraphNode | null) => void
  onLinkClick: (link: GraphLink | null) => void
}

export default function PixiGraph({ nodes: rawNodes, links: rawLinks, selectedNodeId: externalSelectedNodeId, onNodeClick, onLinkClick }: PixiGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const onNodeClickRef = useRef(onNodeClick)
  const onLinkClickRef = useRef(onLinkClick)
  useEffect(() => {
    onNodeClickRef.current = onNodeClick
    onLinkClickRef.current = onLinkClick
  }, [onNodeClick, onLinkClick])

  const selectedNodeIdRef = useRef(externalSelectedNodeId);
  useEffect(() => {
    selectedNodeIdRef.current = externalSelectedNodeId;
  }, [externalSelectedNodeId]);

  const updateVisualsRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    updateVisualsRef.current?.();
  }, [externalSelectedNodeId]);

  useEffect(() => {
    if (!containerRef.current || rawNodes.length === 0) return

    let isUnmounted = false
    let app: PIXI.Application | null = null
    let simulation: d3.Simulation<GraphNode, GraphLink> | null = null

    let isInitialized = false
    let resizeObserver: ResizeObserver | null = null
    const initPixi = async () => {
      app = new PIXI.Application()
      await app.init({
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true,
      })

      isInitialized = true

      if (isUnmounted || !containerRef.current) {
        app.destroy(true)
        return
      }

      resizeObserver = new ResizeObserver(() => {
        if (!isUnmounted && containerRef.current && app) {
          app.renderer.resize(containerRef.current.clientWidth, containerRef.current.clientHeight)
          if (simulation) {
             simulation.force('center', d3.forceCenter(app.screen.width / 2, app.screen.height / 2))
             simulation.alpha(0.3).restart()
          }
        }
      })
      resizeObserver.observe(containerRef.current)

      containerRef.current.appendChild(app.canvas)

      const graphContainer = new PIXI.Container()
      app.stage.addChild(graphContainer)

      app.stage.eventMode = 'static'
      app.stage.hitArea = new PIXI.Rectangle(-100000, -100000, 200000, 200000)

      // Setup Nodes and Links based on existing graph structure
      const nodes = rawNodes.map(n => ({
        ...n,
        radius: n.isType ? 25 : Math.max(12, n.val * 1.5),
        color: n.isType ? '#89b4ff' : (TYPE_COLORS[n.types?.[0] || n.group] || '#475569')
      }))
      
      const nodeMap = new Map(nodes.map(n => [n.id, n]))
      
      const links = rawLinks
        .filter(l => {
           const sId = typeof l.source === 'string' ? l.source : l.source.id
           const tId = typeof l.target === 'string' ? l.target : l.target.id
           return nodeMap.has(sId) && nodeMap.has(tId)
        })
        .map(l => ({ ...l }))

      const validLinks = links as GraphLink[]

      // Force Layout
      simulation = d3.forceSimulation<GraphNode>(nodes)
        .force('link', d3.forceLink<GraphNode, GraphLink>(validLinks).id(d => d.id).distance((d) => {
           return d.type === 'evolution' ? 120 : 70;
        }))
        .force('charge', d3.forceManyBody<GraphNode>().strength(d => d.isType ? -500 : -200))
        .force('center', d3.forceCenter(app.screen.width / 2, app.screen.height / 2))
        .force('collide', d3.forceCollide<GraphNode>().radius(d => (d.radius || 12) + 8))

      // Pixi Structure
      const linkGraphics = new PIXI.Graphics()
      linkGraphics.eventMode = 'static'
      graphContainer.addChild(linkGraphics)

      const nodesContainer = new PIXI.Container()
      graphContainer.addChild(nodesContainer)

      const nodeVisuals = new Map<string, { container: PIXI.Container, highlight: PIXI.Graphics }>()
      let localSelectedNodeId: string | null = selectedNodeIdRef.current;

      const textNodes: PIXI.Text[] = []

      for (const node of nodes) {
        const nodeContainer = new PIXI.Container()
        nodeContainer.eventMode = 'static'
        nodeContainer.cursor = 'pointer'

        const highlightGraphics = new PIXI.Graphics()
        highlightGraphics.circle(0, 0, (node.radius || 12) + 3)
        highlightGraphics.stroke({ width: 3, color: 0xffe81c }) // Yellow highlight
        highlightGraphics.visible = localSelectedNodeId === node.id
        nodeContainer.addChild(highlightGraphics)

        nodeContainer.on('pointerdown', (e) => {
          draggedNode = node
          node.fx = node.x
          node.fy = node.y

          selectedNodeIdRef.current = node.id
          updateVisualsRef.current?.()

          onNodeClickRef.current(node)
          e.stopPropagation()
        })

        nodesContainer.addChild(nodeContainer)
        nodeVisuals.set(node.id, { container: nodeContainer, highlight: highlightGraphics })

        const circle = new PIXI.Graphics()
        circle.circle(0, 0, node.radius || 12)
        circle.fill({ color: node.color })
        
        if (node.isType) {
          circle.stroke({ width: 2, color: 0xffffff })
        }
        nodeContainer.addChild(circle)

        if (!node.isType && node.sprite) {
          PIXI.Assets.load(getSpriteUrl(node.sprite)).then((texture) => {
            if (isUnmounted) return
            const sprite = new PIXI.Sprite(texture)
            sprite.anchor.set(0.5)
            const size = (node.radius || 12) * 1.8
            sprite.width = size
            sprite.height = size
            
            const mask = new PIXI.Graphics()
            mask.circle(0, 0, (node.radius || 12) * 0.9)
            mask.fill({color: 0xffffff})
            
            nodeContainer.addChild(mask)
            sprite.mask = mask
            nodeContainer.addChild(sprite)
          }).catch(() => {})
        } else if (node.isType) {
          // type label inside circle can be done too, but text is fine.
        }

        const labelStr = node.isType ? node.name + '属性' : node.name
        const text = new PIXI.Text({
          text: labelStr,
          style: {
            fontFamily: '"JetBrains Mono", monospace, sans-serif',
            fontSize: node.isType ? 14 : 10,
            fill: 0x94a3b8,
            align: 'center',
          },
          resolution: window.devicePixelRatio * 2,
        })
        text.anchor.set(0.5, 0)
        text.y = (node.radius || 12) + 4
        nodeContainer.addChild(text)
        textNodes.push(text)
      }

      let highlightedLinks = new Set<GraphLink>()
      const drawLinks = () => {
        linkGraphics.clear()
        for (const link of validLinks) {
          const source = link.source as GraphNode
          const target = link.target as GraphNode
          if (source.x != null && source.y != null && target.x != null && target.y != null) {
             linkGraphics.moveTo(source.x, source.y)
             linkGraphics.lineTo(target.x, target.y)
             
             let color = 0x60a5fa // blue
             let alpha = 0.15
             let width = 1
                          if (link.type === 'evolution') {
                  color = 0x10b981 // emerald
                  alpha = 0.4
              } else if (link.type === 'form-link') {
                  color = 0xf59e0b // amber/orange
                  alpha = 0.35
                  width = 1.2
              }

             if (localSelectedNodeId) {
               if (highlightedLinks.has(link)) {
                 alpha = Math.min(1.0, alpha * 2.5)
                 width = 2
                  if (link.type === 'evolution') {
                    color = 0x34d399 // lighter emerald
                  } else if (link.type === 'form-link') {
                    color = 0xfbcd5d // lighter amber
                  } else {
                    color = 0x93c5fd // lighter blue
                  }
               } else {
                 alpha *= 0.15
               }
             }

             linkGraphics.stroke({ 
               color, 
               alpha, 
               width 
             })
          }
        }
      }

      const updateVisuals = () => {
        // Sync local selection visual state
        if (localSelectedNodeId && localSelectedNodeId !== selectedNodeIdRef.current) {
          const oldVisual = nodeVisuals.get(localSelectedNodeId)
          if (oldVisual) oldVisual.highlight.visible = false
        }
        localSelectedNodeId = selectedNodeIdRef.current
        if (localSelectedNodeId) {
          const newVisual = nodeVisuals.get(localSelectedNodeId)
          if (newVisual) newVisual.highlight.visible = true
        }

        highlightedLinks.clear()

        // 1. Calculate selection highlights (dimming unrelated)
        if (localSelectedNodeId) {
          const visitedNodes = new Set<string>()
          const queue: string[] = [localSelectedNodeId]
          visitedNodes.add(localSelectedNodeId)

          let head = 0
          while (head < queue.length) {
            const currId = queue[head++]
            for (const link of validLinks) {
              const sourceId = (link.source as GraphNode).id || (link.source as string)
              const targetId = (link.target as GraphNode).id || (link.target as string)
              
              if ((link.type === 'evolution' || link.type === 'form-link') && (sourceId === currId || targetId === currId)) {
                highlightedLinks.add(link)
                const nextId = sourceId === currId ? targetId : sourceId
                if (!visitedNodes.has(nextId)) {
                  visitedNodes.add(nextId)
                  queue.push(nextId)
                }
              }
            }
          }

          for (const link of validLinks) {
             const sourceId = (link.source as GraphNode).id || (link.source as string)
             const targetId = (link.target as GraphNode).id || (link.target as string)
             if ((sourceId === localSelectedNodeId || targetId === localSelectedNodeId) && link.type === 'type-link') {
               highlightedLinks.add(link)
             }
          }
         }

        // Apply visibility
        for (const node of nodes) {
          const visual = nodeVisuals.get(node.id)
          if (visual) {
            visual.container.visible = true
          }
        }

        drawLinks()
      }

      updateVisualsRef.current = updateVisuals
      updateVisuals()

      // Add click detection for links by finding the nearest link when user clicks background
      app.stage.on('pointerdown', (e) => {
        const clickPos = graphContainer.toLocal(e.global)
        let clickedLink: GraphLink | null = null
        let minDistance = 5 // click threshold in local coords

        for (const link of validLinks) {
          const source = link.source as GraphNode
          const target = link.target as GraphNode
          if (source.x != null && source.y != null && target.x != null && target.y != null) {
            // Distance from point to line segment
            const l2 = Math.pow(source.x - target.x, 2) + Math.pow(source.y - target.y, 2);
            if (l2 === 0) continue;
            let t = ((clickPos.x - source.x) * (target.x - source.x) + (clickPos.y - source.y) * (target.y - source.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            const projX = source.x + t * (target.x - source.x);
            const projY = source.y + t * (target.y - source.y);
            const dist = Math.sqrt(Math.pow(clickPos.x - projX, 2) + Math.pow(clickPos.y - projY, 2));

            if (dist < minDistance) {
              minDistance = dist;
              clickedLink = link;
            }
          }
        }

        if (clickedLink) {
          onLinkClickRef.current(clickedLink)
        } else {
          // Normal background click, deselect
          selectedNodeIdRef.current = null
          updateVisualsRef.current?.()
          
          onNodeClickRef.current(null)
          onLinkClickRef.current(null)
        }
      })

      simulation.on('tick', () => {
        drawLinks()

        for (const node of nodes) {
          const visual = nodeVisuals.get(node.id)
          if (visual && node.x != null && node.y != null) {
            visual.container.x = node.x
            visual.container.y = node.y
          }
        }
      })

      // Interactions (Pan, Drag, Zoom)
      let draggedNode: GraphNode | null = null
      let isNodeDragging = false
      let isPanning = false
      let panStart = { x: 0, y: 0 }

      app.stage.on('pointerdown', (e) => {
        // Handled in the loop above for background clicks
        isPanning = true
        panStart.x = e.global.x - graphContainer.x
        panStart.y = e.global.y - graphContainer.y
      })

      app.stage.on('pointermove', (e) => {
        if (isPanning) {
          graphContainer.position.set(e.global.x - panStart.x, e.global.y - panStart.y)
        } else if (draggedNode) {
          const newPos = graphContainer.toLocal(e.global)
          
          const dx = (draggedNode.fx ?? draggedNode.x ?? 0) - newPos.x
          const dy = (draggedNode.fy ?? draggedNode.y ?? 0) - newPos.y
          
          if (!isNodeDragging && (dx * dx + dy * dy > 4)) {
            isNodeDragging = true
            simulation?.alphaTarget(0.3).restart()
          }

          if (isNodeDragging) {
            draggedNode.fx = newPos.x
            draggedNode.fy = newPos.y
          }
        }
      })

      const handlePointerUp = () => {
        isPanning = false
        if (draggedNode) {
          if (isNodeDragging) {
            simulation?.alphaTarget(0)
          }
          draggedNode = null
          isNodeDragging = false
        }
      }

      app.stage.on('pointerup', handlePointerUp)
      app.stage.on('pointerupoutside', handlePointerUp)

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault()
        const zoomFactor = -e.deltaY * 0.001
        const oldScale = graphContainer.scale.x
        let newScale = oldScale * Math.exp(zoomFactor)
        newScale = Math.max(0.1, Math.min(newScale, 10))
        
        const rect = app!.canvas.getBoundingClientRect()
        const pointerX = e.clientX - rect.left
        const pointerY = e.clientY - rect.top
        
        const localX = (pointerX - graphContainer.x) / oldScale
        const localY = (pointerY - graphContainer.y) / oldScale
        
        graphContainer.scale.set(newScale)
        graphContainer.x = pointerX - localX * newScale
        graphContainer.y = pointerY - localY * newScale

        const textVisible = newScale >= TEXT_VISIBILITY_THRESHOLD
        for (const text of textNodes) {
          text.visible = textVisible
        }
      }

      app.canvas.addEventListener('wheel', handleWheel, { passive: false })
      
      // Initial zoom fit to screen size
      setTimeout(() => {
        if (!isUnmounted && app) {
            const targetScale = 0.5;
            graphContainer.scale.set(targetScale);
            graphContainer.x = app.screen.width / 2;
            graphContainer.y = app.screen.height / 2;
            
            const textVisible = targetScale >= TEXT_VISIBILITY_THRESHOLD;
            for (const text of textNodes) {
              text.visible = textVisible;
            }
        }
      }, 500)
    }

    initPixi()

    return () => {
      isUnmounted = true
      if (resizeObserver) resizeObserver.disconnect()
      if (simulation) simulation.stop()
      if (app && isInitialized) {
        try {
          app.destroy(true)
        } catch (e) {
          console.error('Failed to destroy PIXI app', e)
        }
      }
    }
  }, [rawNodes, rawLinks]) // Re-run effect if data changes

  return <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing bg-[#020617]/0" />
}
