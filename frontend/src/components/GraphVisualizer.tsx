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
  tspTourNodes?: number[];
  tspTourEdges?: number[][];
  tspStartNode?: number;
}

interface GraphNode {
  id: number;
  label: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: number | GraphNode;
  target: number | GraphNode;
}

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
  tspTourNodes = [],
  tspTourEdges,
  tspStartNode,
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

  const tspEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (const e of tspTourEdges ?? []) {
      s.add(`${e[0]}-${e[1]}`);
      s.add(`${e[1]}-${e[0]}`);
    }
    return s;
  }, [tspTourEdges]);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = Array.from({ length: numVertices }, (_, i) => ({
      id: i,
      label: `${i}`,
    }));
    const links: GraphLink[] = edges.map(([source, target]) => ({ source, target }));
    return { nodes, links };
  }, [numVertices, edges]);

  return (
    <div ref={containerRef} className="glass overflow-hidden" style={{ minHeight: 350 }}>
      {typeof window !== "undefined" && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel={(node: GraphNode) => `Node ${node.id}`}
          nodeRelSize={6}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D) => {
            const id = node.id ?? 0;
            const x = node.x ?? 0;
            const y = node.y ?? 0;
            const isHighlighted = highlightNodeSet.has(id);
            const hasCompColor = componentColors?.has(id) ?? false;
            const hasBipartiteColor = bipartiteColors?.has(id) ?? false;
            const isCyclePath = cyclePathNodes.includes(id);
            const isGirthNode = girthCycleNodes.includes(id);
            const isTspNode = tspTourNodes.includes(id);
            const isTspStart = tspStartNode === id && isTspNode;

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

            const radius = isTspNode ? 8.2 : isHighlighted || isCyclePath || isGirthNode ? 9 : 7;

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

            ctx.font = `bold ${isHighlighted || isCyclePath || isTspNode ? "7px" : "6px"} sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = isHighlighted || hasCompColor || hasBipartiteColor || isTspNode ? "#ffffff" : "rgba(255,255,255,0.95)";
            ctx.fillText(`${id}`, x, y);
          }}
          linkCanvasObject={(link: GraphLink, ctx: CanvasRenderingContext2D) => {
            const src = typeof link.source === "object" ? link.source : undefined;
            const tgt = typeof link.target === "object" ? link.target : undefined;
            if (!src || !tgt || src.x == null || src.y == null || tgt.x == null || tgt.y == null) return;

            const sourceId = src.id ?? 0;
            const targetId = tgt.id ?? 0;
            const key = `${sourceId}-${targetId}`;
            const isDia = diameterEdgeSet.has(key);
            const isGirth = girthEdgeSet.has(key);
            const isHighlighted = highlightEdgeSet.has(key);
            const isMst = mstEdgeSet.has(key);
            const isTsp = tspEdgeSet.has(key);

            ctx.beginPath();
            ctx.moveTo(src.x, src.y);
            ctx.lineTo(tgt.x, tgt.y);

            if (isTsp) {
              ctx.strokeStyle = "rgba(251,113,133,0.12)";
              ctx.lineWidth = 4.5;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(src.x, src.y);
              ctx.lineTo(tgt.x, tgt.y);
              ctx.strokeStyle = "#fb7185";
              ctx.lineWidth = 2.2;
            } else if (isGirth) {
              ctx.strokeStyle = "rgba(236,72,153,0.15)";
              ctx.lineWidth = 6;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(src.x, src.y);
              ctx.lineTo(tgt.x, tgt.y);
              ctx.strokeStyle = "#ec4899";
              ctx.lineWidth = 3;
            } else if (isDia) {
              ctx.strokeStyle = "rgba(34,211,238,0.15)";
              ctx.lineWidth = 6;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(src.x, src.y);
              ctx.lineTo(tgt.x, tgt.y);
              ctx.strokeStyle = "#4ade80";
              ctx.lineWidth = 3;
            } else if (isMst) {
              ctx.strokeStyle = "rgba(245,158,11,0.2)";
              ctx.lineWidth = 6;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(src.x, src.y);
              ctx.lineTo(tgt.x, tgt.y);
              ctx.strokeStyle = "#f59e0b";
              ctx.lineWidth = 2.5;
            } else if (isHighlighted) {
              ctx.strokeStyle = "rgba(34,211,238,0.25)";
              ctx.lineWidth = 6;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(src.x, src.y);
              ctx.lineTo(tgt.x, tgt.y);
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
            const midX = (src.x + tgt.x) / 2;
            const midY = (src.y + tgt.y) / 2;

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
          cooldownTime={2000}
          enableZoomInteraction
          enablePanInteraction
        />
      )}
    </div>
  );
}
