"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
}

export default function GraphVisualizer({
  numVertices,
  edges,
  highlightNodes = [],
  highlightEdges = [],
  componentColors,
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

  const graphData = useMemo(() => {
    const nodes = Array.from({ length: numVertices }, (_, i) => ({
      id: i,
      label: `${i}`,
    }));
    const links = edges.map(([source, target]) => ({ source, target }));
    return { nodes, links };
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
            const baseColor = hasCompColor
              ? componentColors!.get(id)!
              : isHighlighted
                ? "#22d3ee"
                : "rgba(255,255,255,0.6)";

            const radius = isHighlighted ? 10 : 7;

            // Glow effect for highlighted nodes
            if (isHighlighted || hasCompColor) {
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
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Bold label
            ctx.font = `bold ${isHighlighted ? "7px" : "6px"} sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = isHighlighted || hasCompColor ? "#ffffff" : "rgba(255,255,255,0.95)";
            ctx.fillText(`${id}`, x, y);
          }}
          linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D) => {
            const src = link.source as { id?: number; x?: number; y?: number };
            const tgt = link.target as { id?: number; x?: number; y?: number };
            if (!src || !tgt || src.x == null || tgt.x == null) return;

            const sourceId = src.id ?? 0;
            const targetId = tgt.id ?? 0;
            const key = `${sourceId}-${targetId}`;
            const isHL = highlightEdgeSet.has(key);

            ctx.beginPath();
            ctx.moveTo(src.x, src.y!);
            ctx.lineTo(tgt.x, tgt.y!);

            if (isHL) {
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
