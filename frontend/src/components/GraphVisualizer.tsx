"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface GraphVisualizerProps {
  numVertices: number;
  edges: number[][];
  highlightNodes?: number[];
  highlightEdges?: number[][];
  componentColors?: Map<number, string>;
  bipartiteColors?: Map<number, string>;
  cyclePathNodes?: number[];
  diameterPathNodes?: number[];
  girthCycleNodes?: number[];
  mstEdges?: number[][];
  bandwidthScanEdge?: number[];
  bandwidthBestEdges?: number[][];
  tspTourNodes?: number[];
  tspTourEdges?: number[][];
  tspStartNode?: number;
  nodePositions?: { x: number; y: number }[];
  nodeLabels?: string[];
  showCoordGrid?: boolean;
  lockNodePositions?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLink = any;

export default function GraphVisualizer({
  numVertices,
  edges,
  highlightNodes = [],
  highlightEdges = [],
  componentColors,
  bipartiteColors,
  cyclePathNodes = [],
  diameterPathNodes = [],
  girthCycleNodes = [],
  mstEdges,
  bandwidthScanEdge,
  bandwidthBestEdges,
  tspTourNodes = [],
  tspTourEdges,
  tspStartNode,
  nodePositions,
  nodeLabels,
  showCoordGrid,
  lockNodePositions = nodePositions != null && nodePositions.length > 0,
}: GraphVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 400 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.height, 350),
        });
      }
    });

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const highlightNodeSet = useMemo(() => new Set(highlightNodes), [highlightNodes]);

  const highlightEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (const [u, v] of highlightEdges) {
      s.add(`${u}-${v}`);
      s.add(`${v}-${u}`);
    }
    return s;
  }, [highlightEdges]);

  const diameterEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < diameterPathNodes.length - 1; i++) {
      const u = diameterPathNodes[i];
      const v = diameterPathNodes[i + 1];
      s.add(`${u}-${v}`);
      s.add(`${v}-${u}`);
    }
    return s;
  }, [diameterPathNodes]);

  const girthEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < girthCycleNodes.length; i++) {
      const u = girthCycleNodes[i];
      const v = girthCycleNodes[(i + 1) % girthCycleNodes.length];
      s.add(`${u}-${v}`);
      s.add(`${v}-${u}`);
    }
    return s;
  }, [girthCycleNodes]);

  const mstEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (const e of mstEdges ?? []) {
      s.add(`${e[0]}-${e[1]}`);
      s.add(`${e[1]}-${e[0]}`);
    }
    return s;
  }, [mstEdges]);

  const bandwidthScanEdgeSet = useMemo(() => {
    const s = new Set<string>();
    if (bandwidthScanEdge && bandwidthScanEdge.length >= 2) {
      const [u, v] = bandwidthScanEdge;
      s.add(`${u}-${v}`);
      s.add(`${v}-${u}`);
    }
    return s;
  }, [bandwidthScanEdge]);

  const bandwidthBestEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (const e of bandwidthBestEdges ?? []) {
      s.add(`${e[0]}-${e[1]}`);
      s.add(`${e[1]}-${e[0]}`);
    }
    return s;
  }, [bandwidthBestEdges]);

  const tspEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (const e of tspTourEdges ?? []) {
      s.add(`${e[0]}-${e[1]}`);
      s.add(`${e[1]}-${e[0]}`);
    }
    return s;
  }, [tspTourEdges]);

  const showGrid = showCoordGrid ?? (nodePositions != null && nodePositions.length > 0);

  const fixedPositionMap = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    if (!lockNodePositions) return map;
    nodePositions?.forEach((pos, index) => {
      map.set(index, pos);
    });
    return map;
  }, [lockNodePositions, nodePositions]);

  const graphData = useMemo(() => {
    const nodes: AnyNode[] = Array.from({ length: numVertices }, (_, i) => {
      const n: AnyNode = { id: i, label: (nodeLabels && i < nodeLabels.length && nodeLabels[i]) ? nodeLabels[i] : `${i}` };
      if (nodePositions && i < nodePositions.length) {
        const pos = nodePositions[i];
        n.x = pos.x;
        n.y = pos.y;
        if (lockNodePositions) {
          n.fx = pos.x;
          n.fy = pos.y;
        }
      }
      return n;
    });
    const links: AnyLink[] = edges.map(([source, target]) => ({ source, target }));
    return { nodes, links };
  }, [numVertices, edges, nodePositions, nodeLabels, lockNodePositions]);

  const gridRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!showGrid || !containerRef.current) return;
    const canvas = gridRef.current;
    if (!canvas) return;
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = Math.max(rect.height, 350);
  }, [showGrid, dimensions, numVertices, edges]);

  return (
    <div ref={containerRef} className="glass overflow-hidden relative" style={{ minHeight: 350 }}>
      {typeof window !== "undefined" && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel={(node: AnyNode) => node.label || `Node ${node.id}`}
          nodeRelSize={6}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(node: AnyNode, ctx: CanvasRenderingContext2D) => {
            const id = node.id ?? 0;
            const fixedPos = fixedPositionMap.get(id);
            const x = fixedPos?.x ?? node.x ?? 0;
            const y = fixedPos?.y ?? node.y ?? 0;
            const isHighlighted = highlightNodeSet.has(id);
            const hasCompColor = componentColors?.has(id) ?? false;
            const hasBipartiteColor = bipartiteColors?.has(id) ?? false;
            const isCyclePath = cyclePathNodes.includes(id);
            const isGirthNode = girthCycleNodes.includes(id);
            const isTspNode = tspTourNodes.includes(id);
            const isTspStart = tspStartNode === id && isTspNode;

            if (showGrid && id === 0) {
              ctx.save();
              ctx.strokeStyle = "rgba(255,255,255,0.06)";
              ctx.lineWidth = 0.5;
              const minX = Math.min(...nodePositions!.map(p => p.x)) - 40;
              const maxX = Math.max(...nodePositions!.map(p => p.x)) + 40;
              const minY = Math.min(...nodePositions!.map(p => p.y)) - 40;
              const maxY = Math.max(...nodePositions!.map(p => p.y)) + 40;
              const originX = 0;
              const originY = 0;
              const step = 50;

              const firstNode = nodePositions![0];
              const ox = firstNode != null ? x - firstNode.x : 0;
              const oy = firstNode != null ? y - firstNode.y : 0;

              for (let gx = Math.ceil(minX / step) * step; gx <= maxX; gx += step) {
                const sx = gx + ox;
                const sy1 = minY + oy;
                const sy2 = maxY + oy;
                ctx.beginPath();
                ctx.moveTo(sx, sy1);
                ctx.lineTo(sx, sy2);
                ctx.stroke();
              }
              for (let gy = Math.ceil(minY / step) * step; gy <= maxY; gy += step) {
                const sx1 = minX + ox;
                const sx2 = maxX + ox;
                ctx.beginPath();
                ctx.moveTo(sx1, gy + oy);
                ctx.lineTo(sx2, gy + oy);
                ctx.stroke();
              }

              ctx.strokeStyle = "rgba(255,255,255,0.2)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(originX + ox, minY + oy);
              ctx.lineTo(originX + ox, maxY + oy);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(minX + ox, originY + oy);
              ctx.lineTo(maxX + ox, originY + oy);
              ctx.stroke();

              ctx.font = "9px monospace";
              ctx.fillStyle = "rgba(255,255,255,0.35)";
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              for (let gx = Math.ceil(minX / step) * step; gx <= maxX; gx += step) {
                if (gx === 0) continue;
                ctx.fillText(`${gx}`, gx + ox, originY + oy + 4);
              }
              ctx.textAlign = "right";
              ctx.textBaseline = "middle";
              for (let gy = Math.ceil(minY / step) * step; gy <= maxY; gy += step) {
                if (gy === 0) continue;
                ctx.fillText(`${gy}`, originX + ox - 4, gy + oy);
              }
              ctx.restore();
            }

            let baseColor = "rgba(255,255,255,0.6)";
            if (hasBipartiteColor) {
              baseColor = bipartiteColors!.get(id)!;
            } else if (isTspStart) {
              baseColor = "#f97316";
            } else if (isTspNode) {
              baseColor = "#fb7185";
            } else if (hasCompColor) {
              baseColor = componentColors!.get(id)!;
            } else if (isGirthNode) {
              baseColor = "#ec4899";
            } else if (isHighlighted) {
              baseColor = "#22d3ee";
            }

            const hasCustomLabel = nodeLabels && nodeLabels.length > 0;
            const radius = isTspNode ? 8.2 : isHighlighted || isCyclePath || isGirthNode ? 9 : hasCustomLabel ? 8 : 7;

            if (isHighlighted || hasCompColor || hasBipartiteColor || isCyclePath || isGirthNode || isTspNode) {
              ctx.beginPath();
              ctx.arc(x, y, radius + (isTspNode ? 4 : 5), 0, 2 * Math.PI);
              ctx.fillStyle = isTspNode ? `${baseColor}20` : `${baseColor}30`;
              ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = baseColor;
            ctx.fill();
            ctx.strokeStyle = isTspStart
              ? "rgba(255,237,213,0.95)"
              : isCyclePath
              ? "rgba(251,191,36,0.8)"
              : "rgba(255,255,255,0.4)";
            ctx.lineWidth = isTspStart ? 2.2 : isCyclePath ? 2.5 : 1.2;
            ctx.stroke();

            const displayLabel = (nodeLabels && id < nodeLabels.length && nodeLabels[id])
              ? (nodeLabels[id].length > 8 ? nodeLabels[id].slice(0, 7) + "…" : nodeLabels[id])
              : `${id}`;
            const fontSize = hasCustomLabel ? (isHighlighted || isCyclePath || isTspNode ? "5px" : "4.5px") : (isHighlighted || isCyclePath || isTspNode ? "7px" : "6px");
            ctx.font = `bold ${fontSize} sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = isHighlighted || hasCompColor || hasBipartiteColor || isTspNode ? "#ffffff" : "rgba(255,255,255,0.95)";
            ctx.fillText(displayLabel, x, y);
          }}
          linkCanvasObject={(link: AnyLink, ctx: CanvasRenderingContext2D) => {
            const src = typeof link.source === "object" ? link.source : undefined;
            const tgt = typeof link.target === "object" ? link.target : undefined;
            if (!src || !tgt) return;

            const sourceId = src.id ?? 0;
            const targetId = tgt.id ?? 0;
            const fixedSrc = fixedPositionMap.get(sourceId);
            const fixedTgt = fixedPositionMap.get(targetId);
            const srcX = fixedSrc?.x ?? src.x;
            const srcY = fixedSrc?.y ?? src.y;
            const tgtX = fixedTgt?.x ?? tgt.x;
            const tgtY = fixedTgt?.y ?? tgt.y;
            if (srcX == null || srcY == null || tgtX == null || tgtY == null) return;
            const key = `${sourceId}-${targetId}`;
            const isDia = diameterEdgeSet.has(key);
            const isGirth = girthEdgeSet.has(key);
            const isHighlighted = highlightEdgeSet.has(key);
            const isMst = mstEdgeSet.has(key);
            const isBandwidthScan = bandwidthScanEdgeSet.has(key);
            const isBandwidthBest = bandwidthBestEdgeSet.has(key);
            const isTsp = tspEdgeSet.has(key);

            ctx.beginPath();
            ctx.moveTo(srcX, srcY);
            ctx.lineTo(tgtX, tgtY);

            if (isBandwidthScan) {
              ctx.strokeStyle = "rgba(34,211,238,0.2)";
              ctx.lineWidth = 7;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(srcX, srcY);
              ctx.lineTo(tgtX, tgtY);
              ctx.strokeStyle = "#22d3ee";
              ctx.lineWidth = 3.5;
            } else if (isBandwidthBest) {
              ctx.strokeStyle = "rgba(250,204,21,0.18)";
              ctx.lineWidth = 6;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(srcX, srcY);
              ctx.lineTo(tgtX, tgtY);
              ctx.strokeStyle = "#facc15";
              ctx.lineWidth = 3;
            } else if (isTsp) {
              ctx.strokeStyle = "rgba(251,113,133,0.12)";
              ctx.lineWidth = 4.5;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(srcX, srcY);
              ctx.lineTo(tgtX, tgtY);
              ctx.strokeStyle = "#fb7185";
              ctx.lineWidth = 2.2;
            } else if (isGirth) {
              ctx.strokeStyle = "rgba(236,72,153,0.15)";
              ctx.lineWidth = 6;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(srcX, srcY);
              ctx.lineTo(tgtX, tgtY);
              ctx.strokeStyle = "#ec4899";
              ctx.lineWidth = 3;
            } else if (isDia) {
              ctx.strokeStyle = "rgba(34,211,238,0.15)";
              ctx.lineWidth = 6;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(srcX, srcY);
              ctx.lineTo(tgtX, tgtY);
              ctx.strokeStyle = "#4ade80";
              ctx.lineWidth = 3;
            } else if (isMst) {
              ctx.strokeStyle = "rgba(245,158,11,0.2)";
              ctx.lineWidth = 6;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(srcX, srcY);
              ctx.lineTo(tgtX, tgtY);
              ctx.strokeStyle = "#f59e0b";
              ctx.lineWidth = 2.5;
            } else if (isHighlighted) {
              ctx.strokeStyle = "rgba(34,211,238,0.25)";
              ctx.lineWidth = 6;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(srcX, srcY);
              ctx.lineTo(tgtX, tgtY);
              ctx.strokeStyle = "#22d3ee";
              ctx.lineWidth = 3;
            } else {
              ctx.strokeStyle = "rgba(255,255,255,0.35)";
              ctx.lineWidth = 2;
            }
            ctx.stroke();

            const edge = edges.find(
              (e) => (e[0] === sourceId && e[1] === targetId) || (e[1] === sourceId && e[0] === targetId)
            );
            const midX = (srcX + tgtX) / 2;
            const midY = (srcY + tgtY) / 2;

            if (edge?.[2] !== undefined) {
              ctx.save();
              ctx.font = "4px sans-serif";
              ctx.fillStyle = "#f59e0b";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(`${edge[2]}`, midX, midY - 4);
              ctx.restore();
            }
          }}
          linkCanvasObjectMode={() => "replace"}
          backgroundColor="rgba(0,0,0,0)"
          cooldownTime={lockNodePositions ? 0 : 2000}
          enableNodeDrag={!lockNodePositions}
          enableZoomInteraction
          enablePanInteraction
        />
      )}
    </div>
  );
}
