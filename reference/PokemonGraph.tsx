import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as PIXI from 'pixi.js';
import { PokemonData } from '../api';
import { TYPE_COLORS } from '../constants';

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  group: 'pokemon' | 'type';
  name: string;
  image?: string;
  pokemonData?: PokemonData;
  color?: string;
  radius: number;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  color: string;
  type?: 'type' | 'form' | 'evolution';
}

interface PokemonGraphProps {
  pokemons: PokemonData[];
  onNodeClick: (node: GraphNode | null) => void;
}

export default function PokemonGraph({ pokemons, onNodeClick }: PokemonGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use a ref so the effect doesn't re-run every time onNodeClick changes
  const onNodeClickRef = useRef(onNodeClick);
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  useEffect(() => {
    if (!containerRef.current || pokemons.length === 0) return;

    let isUnmounted = false;
    let app: PIXI.Application | null = null;
    let simulation: d3.Simulation<GraphNode, GraphLink> | null = null;

    let isInitialized = false;
    let resizeObserver: ResizeObserver | null = null;
    const initPixi = async () => {
      app = new PIXI.Application();
      await app.init({
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true,
      });

      isInitialized = true;

      if (isUnmounted || !containerRef.current) {
        app.destroy(true);
        return;
      }

      resizeObserver = new ResizeObserver(() => {
        if (!isUnmounted && containerRef.current && app) {
          app.renderer.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
          if (simulation) {
             simulation.force('center', d3.forceCenter(app.screen.width / 2, app.screen.height / 2));
             simulation.alpha(0.3).restart();
          }
        }
      });
      resizeObserver.observe(containerRef.current);

      containerRef.current.appendChild(app.canvas);

      const graphContainer = new PIXI.Container();
      app.stage.addChild(graphContainer);

      app.stage.eventMode = 'static';
      app.stage.hitArea = new PIXI.Rectangle(-100000, -100000, 200000, 200000);

      // Setup Nodes and Links
      const typeNodesMap = new Map<string, GraphNode>();
      const nodeMap = new Map<string, GraphNode>();
      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];

      pokemons.forEach((p) => p.types.forEach((t) => {
        if (!typeNodesMap.has(t)) {
          const typeNode: GraphNode = {
            id: `type-${t}`,
            group: 'type',
            name: t,
            radius: 25,
            color: TYPE_COLORS[t] || '#fff',
          };
          typeNodesMap.set(t, typeNode);
          nodes.push(typeNode);
          nodeMap.set(typeNode.id, typeNode);
        }
      }));

      const speciesToDefaultId = new Map<number, string>();
      pokemons.forEach(p => {
        if (!speciesToDefaultId.has(p.speciesId) || p.isDefault) {
           speciesToDefaultId.set(p.speciesId, `pokemon-${p.id}`);
        }
      });

      pokemons.forEach((p) => {
        const id = `pokemon-${p.id}`;
        const primaryTypeColor = TYPE_COLORS[p.types[0]] || '#475569';
        
        const node: GraphNode = {
          id,
          group: 'pokemon',
          name: p.name,
          image: p.image,
          pokemonData: p,
          radius: 12,
          color: primaryTypeColor,
        };
        nodes.push(node);
        nodeMap.set(id, node);

        p.types.forEach((t) => {
          links.push({
            source: id,
            target: `type-${t}`,
            color: 'rgba(96,165,250,0.25)',
            type: 'type',
          });
        });

        if (!p.isDefault) {
          const defaultId = speciesToDefaultId.get(p.speciesId);
          if (defaultId && defaultId !== id) {
            links.push({
              source: id,
              target: defaultId,
              color: 'rgba(236,72,153,0.3)', // Pinkish color for form relations
              type: 'form',
            });
          }
        }

        if (p.isDefault && p.evolvesFromSpeciesId) {
          const fromId = speciesToDefaultId.get(p.evolvesFromSpeciesId);
          if (fromId) {
            links.push({
              source: id,
              target: fromId,
              color: 'rgba(52,211,153,0.4)', // Emerald color for evolution
              type: 'evolution',
            });
          }
        }
      });

      const validLinks = links.filter(l => nodeMap.has(l.source as string) && nodeMap.has(l.target as string));

      // Force Layout
      simulation = d3.forceSimulation<GraphNode>(nodes)
        .force('link', d3.forceLink<GraphNode, GraphLink>(validLinks).id(d => d.id).distance((d) => {
           return (d.source as GraphNode).group === 'pokemon' && (d.target as GraphNode).group === 'pokemon' ? 70 : 120;
        }))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(app.screen.width / 2, app.screen.height / 2))
        .force('collide', d3.forceCollide().radius(d => d.radius + 8));

      // Pixi Structure
      const linkGraphics = new PIXI.Graphics();
      graphContainer.addChild(linkGraphics);

      const nodesContainer = new PIXI.Container();
      graphContainer.addChild(nodesContainer);

      const nodeVisuals = new Map<string, { container: PIXI.Container, highlight: PIXI.Graphics }>();
      let selectedNodeId: string | null = null;

      const textNodes: PIXI.Text[] = [];

      for (const node of nodes) {
        const nodeContainer = new PIXI.Container();
        nodeContainer.eventMode = 'static';
        nodeContainer.cursor = 'pointer';

        const highlightGraphics = new PIXI.Graphics();
        highlightGraphics.circle(0, 0, node.radius + 3);
        highlightGraphics.stroke({ width: 3, color: 0xffe81c }); // Yellow highlight
        highlightGraphics.visible = false;
        nodeContainer.addChild(highlightGraphics);

        nodeContainer.on('pointerdown', (e) => {
          draggedNode = node;
          // We don't restart the simulation here to avoid moving other nodes on a simple click.
          // Fixing the node's position prevents it from drifting if physics is still active.
          node.fx = node.x;
          node.fy = node.y;

          if (selectedNodeId && nodeVisuals.has(selectedNodeId)) {
            const oldVisual = nodeVisuals.get(selectedNodeId)!;
            oldVisual.highlight.visible = false;
          }
          selectedNodeId = node.id;
          highlightGraphics.visible = true;
          updateHighlightedLinks();
          drawLinks(); // redraw links based on new selection

          onNodeClickRef.current(node);
          e.stopPropagation(); // Don't trigger stage pan
        });

        nodesContainer.addChild(nodeContainer);
        nodeVisuals.set(node.id, { container: nodeContainer, highlight: highlightGraphics });

        const circle = new PIXI.Graphics();
        circle.circle(0, 0, node.radius);
        circle.fill({ color: node.color });
        
        if (node.group === 'type') {
          circle.stroke({ width: 2, color: 0xffffff });
        }
        nodeContainer.addChild(circle);

        if (node.image) {
          PIXI.Assets.load(node.image).then((texture) => {
            if (isUnmounted) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.anchor.set(0.5);
            // scale image to fit nicely within circle
            const size = node.radius * 1.8;
            sprite.width = size;
            sprite.height = size;
            
            const mask = new PIXI.Graphics();
            mask.circle(0, 0, node.radius * 0.9);
            mask.fill({color: 0xffffff});
            
            nodeContainer.addChild(mask);
            sprite.mask = mask;
            nodeContainer.addChild(sprite);
          }).catch(() => {});
        }

        const labelStr = node.group === 'type' ? node.name.toUpperCase() + ' TYPE' : node.name;
        const text = new PIXI.Text({
          text: labelStr,
          style: {
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: node.group === 'type' ? 14 : 10,
            fill: 0x94a3b8,
            align: 'center',
          },
          resolution: window.devicePixelRatio * 2,
        });
        text.anchor.set(0.5, 0);
        text.y = node.radius + 4;
        nodeContainer.addChild(text);
        textNodes.push(text);
      }

      // Helper to compute highlighted links for the full evolution/form chain & immediate property links
      let highlightedLinks = new Set<GraphLink>();
      const updateHighlightedLinks = () => {
        highlightedLinks.clear();
        if (!selectedNodeId) return;

        const visitedNodes = new Set<string>();
        const queue: string[] = [selectedNodeId];
        visitedNodes.add(selectedNodeId);

        // BFS to find the whole evolution/form chain
        let head = 0;
        while (head < queue.length) {
          const currId = queue[head++];
          for (const link of validLinks) {
            const sourceId = (link.source as GraphNode).id || (link.source as string);
            const targetId = (link.target as GraphNode).id || (link.target as string);
            
            // If it's a structural link connecting to current chain node
            if ((link.type === 'form' || link.type === 'evolution') && (sourceId === currId || targetId === currId)) {
              highlightedLinks.add(link);
              const nextId = sourceId === currId ? targetId : sourceId;
              if (!visitedNodes.has(nextId)) {
                visitedNodes.add(nextId);
                queue.push(nextId);
              }
            }
          }
        }

        // Also add immediate property (type) links of the originally selected node
        for (const link of validLinks) {
           const sourceId = (link.source as GraphNode).id || (link.source as string);
           const targetId = (link.target as GraphNode).id || (link.target as string);
           if ((sourceId === selectedNodeId || targetId === selectedNodeId) && link.type === 'type') {
             highlightedLinks.add(link);
           }
        }
      };

      const drawLinks = () => {
        linkGraphics.clear();
        for (const link of validLinks) {
          const source = link.source as GraphNode;
          const target = link.target as GraphNode;
          if (source.x != null && source.y != null && target.x != null && target.y != null) {
             linkGraphics.moveTo(source.x, source.y);
             linkGraphics.lineTo(target.x, target.y);
             
             let color = 0x60a5fa; // blue
             let alpha = 0.15;
             let width = 1;
             
             if (link.type === 'form') {
                 color = 0xec4899; // pink
                 alpha = 0.3;
             } else if (link.type === 'evolution') {
                 color = 0x10b981; // emerald
                 alpha = 0.4;
             }

             if (selectedNodeId) {
               if (highlightedLinks.has(link)) {
                 // highlight
                 alpha = Math.min(1.0, alpha * 2.5);
                 width = 2;
                 if (link.type === 'form') {
                   color = 0xf472b6; // lighter pink
                 } else if (link.type === 'evolution') {
                   color = 0x34d399; // lighter emerald
                 } else {
                   color = 0x93c5fd; // lighter blue
                 }
               } else {
                 // dim
                 alpha *= 0.15;
               }
             }

             linkGraphics.stroke({ 
               color, 
               alpha, 
               width 
             });
          }
        }
      };

      simulation.on('tick', () => {
        drawLinks();

        for (const node of nodes) {
          const visual = nodeVisuals.get(node.id);
          if (visual && node.x != null && node.y != null) {
            visual.container.x = node.x;
            visual.container.y = node.y;
          }
        }
      });

      // Interactions (Pan, Drag, Zoom)
      let draggedNode: GraphNode | null = null;
      let isNodeDragging = false;
      let isPanning = false;
      let panStart = { x: 0, y: 0 };

      app.stage.on('pointerdown', (e) => {
        isPanning = true;
        panStart.x = e.global.x - graphContainer.x;
        panStart.y = e.global.y - graphContainer.y;
        
        if (selectedNodeId && nodeVisuals.has(selectedNodeId)) {
          nodeVisuals.get(selectedNodeId)!.highlight.visible = false;
        }
        selectedNodeId = null;
        updateHighlightedLinks();
        drawLinks(); // redraw links based on cleared selection
        onNodeClickRef.current(null);
      });

      app.stage.on('pointermove', (e) => {
        if (isPanning) {
          graphContainer.position.set(e.global.x - panStart.x, e.global.y - panStart.y);
        } else if (draggedNode) {
          const newPos = graphContainer.toLocal(e.global);
          
          const dx = (draggedNode.fx ?? draggedNode.x ?? 0) - newPos.x;
          const dy = (draggedNode.fy ?? draggedNode.y ?? 0) - newPos.y;
          
          if (!isNodeDragging && (dx * dx + dy * dy > 4)) {
            isNodeDragging = true;
            simulation?.alphaTarget(0.3).restart();
          }

          if (isNodeDragging) {
            draggedNode.fx = newPos.x;
            draggedNode.fy = newPos.y;
          }
        }
      });

      const handlePointerUp = () => {
        isPanning = false;
        if (draggedNode) {
          // Keep fx and fy to fix the node position
          if (isNodeDragging) {
            simulation?.alphaTarget(0);
          }
          draggedNode = null;
          isNodeDragging = false;
        }
      };

      app.stage.on('pointerup', handlePointerUp);
      app.stage.on('pointerupoutside', handlePointerUp);

      // Wheel to zoom
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const zoomFactor = -e.deltaY * 0.001;
        const oldScale = graphContainer.scale.x;
        let newScale = oldScale * Math.exp(zoomFactor);
        newScale = Math.max(0.1, Math.min(newScale, 10));
        
        const rect = app!.canvas.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;
        
        const localX = (pointerX - graphContainer.x) / oldScale;
        const localY = (pointerY - graphContainer.y) / oldScale;
        
        graphContainer.scale.set(newScale);
        graphContainer.x = pointerX - localX * newScale;
        graphContainer.y = pointerY - localY * newScale;

        // Hide text when zoomed out or zoomed in too much
        const textVisible = newScale >= 0.5 && newScale < 1.5;
        for (const text of textNodes) {
          text.visible = textVisible;
        }
      };

      app.canvas.addEventListener('wheel', handleWheel, { passive: false });
    };

    initPixi();

    return () => {
      isUnmounted = true;
      if (resizeObserver) resizeObserver.disconnect();
      if (simulation) simulation.stop();
      if (app && isInitialized) {
        try {
          app.destroy(true);
        } catch (e) {
          console.error('Failed to destroy PIXI app', e);
        }
      }
    };
  }, [pokemons]);

  return <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing bg-[#020617]/0" />;
}

