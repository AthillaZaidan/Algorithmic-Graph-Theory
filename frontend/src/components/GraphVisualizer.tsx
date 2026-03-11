"use client";

import { useEffect, useRef, useState, useMemo } from "react";
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
}: GraphVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 400 });

  // Keep stable node references so adding/removing doesn't reset layout
  const nodesRef = useRef<any[]>([]);
  const prevVerticesRef = useRef(0);

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

  const highlightNodeSet = useMemo(
    () => new Set(highlightNodes),
    [highlightNodes]
  );

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

  // Incrementally update nodes to keep existing positions stable
  const graphData = useMemo(() => {
    const prev = nodesRef.current;
    const prevN = prevVerticesRef.current;

    if (numVertices > prevN) {
      // Only add new nodes — keep existing ones with their positions
      const newNodes = [...prev];
      for (let i = prevN; i < numVertices; i++) {
        newNodes.push({ id: i, label: `${i}` });
      }
      nodesRef.current = newNodes;
    } else if (numVertices < prevN) {
      // Trim removed nodes
      nodesRef.current = prev.slice(0, numVertices);
    }
    // else same count — keep as-is

    prevVerticesRef.current = numVertices;

    const links = edges.map(([source, target]) => ({ source, target }));
    return { nodes: nodesRef.current, links };
  }, [numVertices, edges]);

  return (
    <div ref={containerRef} className="glass overflow-hidden" style={{ minHeight: 350 }}>
      {typeof window !== "undefined" && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel={(node: any) => `Node ${node.id}`}
          nodeRelSize={6}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D) => {
            const id = node.id ?? 0;
            const x = node.x ?? 0;
            const y = node.y ?? 0;
            const isHighlighted = highlightNodeSet.has(id);
            const hasCompColor = componentColors && componentColors.has(id);
            const hasBipartiteColor = bipartiteColors && bipartiteColors.has(id);
            const isCyclePath = cyclePathNodes.includes(id);
            const isGirthNode = girthCycleNodes.includes(id);

            let baseColor: string;
            if (hasBipartiteColor) {
              baseColor = bipartiteColors!.get(id)!;
            } else if (hasCompColor) {
              baseColor = componentColors!.get(id)!;
            } else if (isGirthNode) {
              baseColor = "#ec4899"; // pink for girth
            } else if (isHighlighted) {
              baseColor = "#22d3ee";
            } else {
              baseColor = "rgba(255,255,255,0.6)";
            }

            const radius = isHighlighted || isCyclePath || isGirthNode ? 10 : 7;

            // Glow effect for highlighted nodes
            if (isHighlighted || hasCompColor || hasBipartiteColor || isCyclePath || isGirthNode) {
              ctx.beginPath();
              ctx.arc(x, y, radius + 6, 0, 2 * Math.PI);
              ctx.fillStyle = baseColor + "30";
              ctx.fill();
            }

            // Node circle
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = baseColor;
            ctx.fill();
            ctx.strokeStyle = isCyclePath ? "rgba(251,191,36,0.8)" : "rgba(255,255,255,0.4)";
            ctx.lineWidth = isCyclePath ? 3 : 1.5;
            ctx.stroke();

            // Bold label
            ctx.font = `bold ${isHighlighted || isCyclePath ? "7px" : "6px"} sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = isHighlighted || hasCompColor || hasBipartiteColor ? "#ffffff" : "rgba(255,255,255,0.95)";
            ctx.fillText(`${id}`, x, y);
          }}
          linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D) => {
            const src = link.source as { id?: number; x?: number; y?: number };
            const tgt = link.target as { id?: number; x?: number; y?: number };
            if (!src || !tgt || src.x == null || tgt.x == null) return;

            const sourceId = src.id ?? 0;
            const targetId = tgt.id ?? 0;
            const key = `${sourceId}-${targetId}`;
            const isDia = diameterEdgeSet.has(key);
            const isGirth = girthEdgeSet.has(key);
            const isHL = highlightEdgeSet.has(key);

            ctx.beginPath();
            ctx.moveTo(src.x, src.y!);
            ctx.lineTo(tgt.x, tgt.y!);

            if (isGirth) {
              // girth cycle edge appears pink
              ctx.strokeStyle = "rgba(236,72,153,0.15)";
              ctx.lineWidth = 6;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(src.x, src.y!);
              ctx.lineTo(tgt.x, tgt.y!);
              ctx.strokeStyle = "#ec4899"; // pink
              ctx.lineWidth = 3;
            } else if (isDia) {
              // diameter path appears green
              ctx.strokeStyle = "rgba(34,211,238,0.15)"; // light glow
              ctx.lineWidth = 6;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(src.x, src.y!);
              ctx.lineTo(tgt.x, tgt.y!);
              ctx.strokeStyle = "#4ade80"; // green
              ctx.lineWidth = 3;
            } else if (isHL) {
              // Glow for highlighted edges
              ctx.strokeStyle = "rgba(34,211,238,0.25)";
              ctx.lineWidth = 6;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(src.x, src.y!);
              ctx.lineTo(tgt.x, tgt.y!);
              ctx.strokeStyle = "#22d3ee";
              ctx.lineWidth = 3;
            } else {
              ctx.strokeStyle = "rgba(255,255,255,0.35)";
              ctx.lineWidth = 2;
            }
            ctx.stroke();
          }}
          linkCanvasObjectMode={() => "replace"}
          backgroundColor="rgba(0,0,0,0)"
          cooldownTime={2000}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
      )}
    </div>
  );
}
