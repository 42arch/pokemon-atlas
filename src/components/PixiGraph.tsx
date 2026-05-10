'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import * as PIXI from 'pixi.js'
import { POKEMON_COLORS, SPRITE_URL_PREFIX, TYPE_COLORS } from '@/lib/constants'

const TYPES_LIST = ['一般', '格斗', '飞行', '毒', '地面', '岩石', '虫', '幽灵', '钢', '火', '水', '草', '电', '超能力', '冰', '龙', '恶', '妖精']

const TEXT_VISIBILITY_THRESHOLD = 0.4;

function getSpriteUrl(sprite: string) {
  return `${SPRITE_URL_PREFIX}${sprite}.png`
}

export interface GraphNode extends d3.SimulationNodeDatum {
  i: string // id
  n: string // name
  v: number // val
  g: string // group
  it?: boolean // isType
  ia?: boolean // isAbility
  s?: string // sprite
  c?: string // color
  // Internal properties
  radius?: number
  color?: string
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  i?: string // id
  s: string | GraphNode // source
  t: string | GraphNode // target
  ty: string // type
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

  const [isAppReady, setIsAppReady] = useState(false)
  const selectedNodeIdRef = useRef(externalSelectedNodeId);
  useEffect(() => {
    selectedNodeIdRef.current = externalSelectedNodeId;
    updateVisualsRef.current?.();
  }, [externalSelectedNodeId]);

  const appRef = useRef<PIXI.Application | null>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const graphContainerRef = useRef<PIXI.Container | null>(null)
  const linkGraphicsRef = useRef<PIXI.Graphics | null>(null)
  const nodesContainerRef = useRef<PIXI.Container | null>(null)
  const nodeVisualsRef = useRef<Map<string, { container: PIXI.Container, highlight: PIXI.Graphics }>>(new Map())
  const textNodesRef = useRef<PIXI.Text[]>([])
  const updateVisualsRef = useRef<(() => void) | null>(null)

  // 1. Initialize PIXI App
  useEffect(() => {
    if (!containerRef.current) return

    let isUnmounted = false
    let resizeObserver: ResizeObserver | null = null

    const init = async () => {
      const app = new PIXI.Application()
      await app.init({
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true,
      })

      if (isUnmounted || !containerRef.current) {
        app.destroy(true)
        return
      }

      appRef.current = app
      containerRef.current.appendChild(app.canvas)

      const graphContainer = new PIXI.Container()
      graphContainerRef.current = graphContainer
      app.stage.addChild(graphContainer)

      app.stage.eventMode = 'static'
      app.stage.hitArea = new PIXI.Rectangle(-100000, -100000, 200000, 200000)

      const linkGraphics = new PIXI.Graphics()
      linkGraphics.eventMode = 'static'
      linkGraphicsRef.current = linkGraphics
      graphContainer.addChild(linkGraphics)

      const nodesContainer = new PIXI.Container()
      nodesContainerRef.current = nodesContainer
      graphContainer.addChild(nodesContainer)

      // Default view
      graphContainer.scale.set(0.5)
      graphContainer.x = app.screen.width / 2
      graphContainer.y = app.screen.height / 2

      // Interaction listeners
      let draggedNode: GraphNode | null = null
      let isNodeDragging = false
      let isPanning = false
      let panStart = { x: 0, y: 0 }

      app.stage.on('pointerdown', (e) => {
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
            simulationRef.current?.alphaTarget(0.3).restart()
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
          if (isNodeDragging) simulationRef.current?.alphaTarget(0)
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
        
        const rect = app.canvas.getBoundingClientRect()
        const pointerX = e.clientX - rect.left
        const pointerY = e.clientY - rect.top
        const localX = (pointerX - graphContainer.x) / oldScale
        const localY = (pointerY - graphContainer.y) / oldScale
        
        graphContainer.scale.set(newScale)
        graphContainer.x = pointerX - localX * newScale
        graphContainer.y = pointerY - localY * newScale

        const textVisible = newScale >= TEXT_VISIBILITY_THRESHOLD
        for (const text of textNodesRef.current) {
          text.visible = textVisible
        }
      }
      app.canvas.addEventListener('wheel', handleWheel, { passive: false })

      resizeObserver = new ResizeObserver(() => {
        if (!isUnmounted && containerRef.current && appRef.current) {
          const app = appRef.current
          app.renderer.resize(containerRef.current.clientWidth, containerRef.current.clientHeight)
          simulationRef.current?.force('center', d3.forceCenter(app.screen.width / 2, app.screen.height / 2))
          simulationRef.current?.alpha(0.3).restart()
        }
      })
      resizeObserver.observe(containerRef.current)

      // Add click detection for links
      app.stage.on('pointerdown', (e) => {
        if (e.target !== app.stage) return

        const clickPos = graphContainer.toLocal(e.global)
        let clickedLink: GraphLink | null = null
        let minDistance = 5 

        const links = simulationRef.current?.force<d3.ForceLink<GraphNode, GraphLink>>('link')?.links() || []
        for (const link of links) {
          const source = link.source as GraphNode
          const target = link.target as GraphNode
          if (source.x != null && source.y != null && target.x != null && target.y != null) {
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
          selectedNodeIdRef.current = null
          updateVisualsRef.current?.()
          onNodeClickRef.current(null)
          onLinkClickRef.current(null)
        }
      })

      // Helper to set dragged node from within PIXI event
      const setDraggedNode = (node: GraphNode | null) => {
        draggedNode = node
      }
      (app as any).__setDraggedNode = setDraggedNode
      setIsAppReady(true)
    }

    init()

    return () => {
      isUnmounted = true
      if (resizeObserver) resizeObserver.disconnect()
      if (appRef.current) {
        appRef.current.destroy(true)
        appRef.current = null
      }
      if (simulationRef.current) {
        simulationRef.current.stop()
        simulationRef.current = null
      }
    }
  }, [])

  // 2. Data Update Effect
  useEffect(() => {
    const app = appRef.current
    const graphContainer = graphContainerRef.current
    if (!app || !graphContainer || rawNodes.length === 0) return

    // Clear previous
    nodesContainerRef.current?.removeChildren()
    textNodesRef.current = []
    nodeVisualsRef.current.clear()

    const nodes = rawNodes.map(n => ({
      ...n,
      radius: n.it ? 18 : (n.ia ? 15 : Math.max(12, n.v * 1.5)),
      color: n.it 
        ? (TYPE_COLORS[n.n] || '#89b4ff') 
        : (n.ia ? '#a855f7' : (POKEMON_COLORS[n.c || ''] || TYPE_COLORS[n.g] || '#475569'))
    }))
    const nodeMap = new Map(nodes.map(n => [n.i, n]))
    const validLinks = rawLinks
      .filter(l => {
         const sId = typeof l.s === 'string' ? l.s : (l.s as GraphNode).i
         const tId = typeof l.t === 'string' ? l.t : (l.t as GraphNode).i
         return nodeMap.has(sId) && nodeMap.has(tId)
      })
      .map(l => ({ 
        ...l, 
        source: typeof l.s === 'string' ? l.s : (l.s as GraphNode).i,
        target: typeof l.t === 'string' ? l.t : (l.t as GraphNode).i
      })) as any[]

    // Simulation
    if (simulationRef.current) simulationRef.current.stop()
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, any>(validLinks).id(d => d.i).distance(d => {
        if (d.ty === 'evolution') return 120
        if (d.ty === 'ability-link') return 90
        return 70
      }))
      .force('charge', d3.forceManyBody<GraphNode>().strength(d => d.it ? -500 : (d.ia ? -300 : -200)))
      .force('center', d3.forceCenter(app.screen.width / 2, app.screen.height / 2))
      .force('collide', d3.forceCollide<GraphNode>().radius(d => (d.radius || 12) + 10))
    simulationRef.current = simulation

    // Visuals
    for (const node of nodes) {
      const nodeContainer = new PIXI.Container()
      nodeContainer.eventMode = 'static'
      nodeContainer.cursor = 'pointer'

      const r = node.radius || 12
      const highlightGraphics = new PIXI.Graphics()
      if (node.it) {
        highlightGraphics.poly([0, -r-3, r+3, 0, 0, r+3, -r-3, 0])
      } else if (node.ia) {
        // Star shape for abilities
        const innerR = (r + 3) * 0.5;
        const points = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const currR = i % 2 === 0 ? r + 3 : innerR;
          points.push(Math.cos(angle) * currR, Math.sin(angle) * currR);
        }
        highlightGraphics.poly(points)
      } else {
        highlightGraphics.circle(0, 0, r + 3)
      }
      highlightGraphics.stroke({ width: 3, color: 0xffe81c })
      highlightGraphics.visible = selectedNodeIdRef.current === node.i
      nodeContainer.addChild(highlightGraphics)

      nodeContainer.on('pointerdown', (e) => {
        if ((app as any).__setDraggedNode) (app as any).__setDraggedNode(node)
        node.fx = node.x
        node.fy = node.y
        selectedNodeIdRef.current = node.i
        updateVisualsRef.current?.()
        onNodeClickRef.current(node)
        e.stopPropagation()
      })

      nodesContainerRef.current?.addChild(nodeContainer)
      nodeVisualsRef.current.set(node.i, { container: nodeContainer, highlight: highlightGraphics })

      if (!node.it && node.s) {
        PIXI.Assets.load(getSpriteUrl(node.s)).then((texture) => {
          const sprite = new PIXI.Sprite(texture)
          sprite.anchor.set(0.5)
          const size = (node.radius || 12) * 1.8
          sprite.width = size; sprite.height = size
          const mask = new PIXI.Graphics().circle(0, 0, (node.radius || 12) * 0.9).fill({color: 0xffffff})
          nodeContainer.addChild(mask)
          sprite.mask = mask
          nodeContainer.addChild(sprite)
        }).catch(() => {})
      } else if (node.it) {
        // Load type sprite from types.webp
        const typeIndex = TYPES_LIST.indexOf(node.n)
        if (typeIndex !== -1) {
          PIXI.Assets.load('/types.webp').then((baseTexture) => {
            const frame = new PIXI.Rectangle(0, typeIndex * 50, 50, 50)
            const texture = new PIXI.Texture({
              source: baseTexture.source,
              frame: frame
            })
            const sprite = new PIXI.Sprite(texture)
            sprite.anchor.set(0.5)
            // Scale sprite to fit diamond nicely
            const size = (node.radius || 18) * 1.1
            sprite.width = size
            sprite.height = size
            nodeContainer.addChild(sprite)
          }).catch(() => {})
        }
      }

      const text = new PIXI.Text({
        text: node.it ? node.n + '属性' : (node.ia ? node.n + '特性' : node.n),
        style: { fontFamily: '"JetBrains Mono", monospace', fontSize: node.it ? 14 : (node.ia ? 12 : 10), fill: 0x94a3b8, align: 'center' },
        resolution: window.devicePixelRatio * 2,
      })
      text.anchor.set(0.5, 0); text.y = (node.radius || 12) + 4
      text.visible = graphContainer.scale.x >= TEXT_VISIBILITY_THRESHOLD
      nodeContainer.addChild(text)
      textNodesRef.current.push(text)

      const shape = new PIXI.Graphics()
      if (node.it) {
        shape.poly([0, -r, r, 0, 0, r, -r, 0])
      } else if (node.ia) {
        const innerR = r * 0.5;
        const points = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const currR = i % 2 === 0 ? r : innerR;
          points.push(Math.cos(angle) * currR, Math.sin(angle) * currR);
        }
        shape.poly(points)
      } else {
        shape.circle(0, 0, r)
      }
      shape.fill({ color: node.color })
      if (node.it) shape.stroke({ width: 2, color: 0xffffff })
      nodeContainer.addChild(shape)
    }

    let highlightedLinks = new Set<GraphLink>()
    const drawLinks = () => {
      const linkGraphics = linkGraphicsRef.current
      if (!linkGraphics) return
      linkGraphics.clear()
      for (const link of validLinks) {
        const source = link.source as GraphNode
        const target = link.target as GraphNode
        if (source.x != null && source.y != null && target.x != null && target.y != null) {
           linkGraphics.moveTo(source.x, source.y)
           linkGraphics.lineTo(target.x, target.y)
           let color = 0x60a5fa, alpha = 0.15, width = 1
           if (link.ty === 'evolution') { color = 0x10b981; alpha = 0.4 }
           else if (link.ty === 'form-link') { color = 0xf59e0b; alpha = 0.35; width = 1.2 }
           else if (link.ty === 'ability-link') { color = 0xa855f7; alpha = 0.3; width = 1 }
 
           if (selectedNodeIdRef.current) {
             if (highlightedLinks.has(link)) {
               alpha = Math.min(1.0, alpha * 2.5); width = 2
               color = link.ty === 'evolution' ? 0x34d399 : (link.ty === 'form-link' ? 0xfbcd5d : (link.ty === 'ability-link' ? 0xc084fc : 0x93c5fd))
             } else { alpha *= 0.15 }
           }
           linkGraphics.stroke({ color, alpha, width })
        }
      }
    }

    const updateVisuals = () => {
      const localId = selectedNodeIdRef.current
      nodeVisualsRef.current.forEach((vis, id) => { vis.highlight.visible = id === localId })
      highlightedLinks.clear()
      if (localId) {
        const visited = new Set<string>([localId])
        const queue = [localId]
        let head = 0
        while (head < queue.length) {
          const currId = queue[head++]
          for (const link of validLinks) {
            const sId = (link.source as GraphNode).i, tId = (link.target as GraphNode).i
            if ((link.ty === 'evolution' || link.ty === 'form-link') && (sId === currId || tId === currId)) {
              highlightedLinks.add(link)
              const nextId = sId === currId ? tId : sId
              if (!visited.has(nextId)) { visited.add(nextId); queue.push(nextId) }
            }
          }
        }
        validLinks.forEach(link => {
          const sId = (link.source as GraphNode).i, tId = (link.target as GraphNode).i
          if ((sId === localId || tId === localId) && (link.ty === 'type-link' || link.ty === 'ability-link')) highlightedLinks.add(link)
        })
      }
      drawLinks()
    }
    updateVisualsRef.current = updateVisuals

    simulation.on('tick', () => {
      drawLinks()
      nodes.forEach(node => {
        const visual = nodeVisualsRef.current.get(node.i)
        if (visual && node.x != null && node.y != null) {
          visual.container.x = node.x; visual.container.y = node.y
        }
      })
    })

    updateVisuals()
  }, [rawNodes, rawLinks, isAppReady])

  return <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing bg-[#020617]/0" />
}
