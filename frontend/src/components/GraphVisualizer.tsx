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

const COLORS = [
  "#22d3ee", "#2dd4bf", "#a78bfa", "#f472b6",
  "#fb923c", "#facc15", "#4ade80", "#60a5fa",
  "#e879f9", "#34d399",
];

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

  const getNodeColor = useCallback(
    (node: { id?: number }) => {
      const id = node.id ?? 0;
      if (componentColors && componentColors.has(id)) {
        return componentColors.get(id)!;
      }
      if (highlightNodeSet.has(id)) return "#22d3ee";
      return "rgba(255,255,255,0.5)";
    },
    [highlightNodeSet, componentColors]
  );

  const getNodeSize = useCallback(
    (node: { id?: number }) => {
      const id = node.id ?? 0;
      return highlightNodeSet.has(id) ? 8 : 5;
    },
    [highlightNodeSet]
  );

  return (
    <div ref={containerRef} className="glass overflow-hidden" style={{ minHeight: 350 }}>
      {typeof window !== "undefined" && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel={(node: { id?: number }) => `Node ${node.id}`}
          nodeColor={getNodeColor}
          nodeRelSize={5}
          nodeVal={getNodeSize}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node: { id?: number; x?: number; y?: number }, ctx: CanvasRenderingContext2D) => {
            const id = node.id ?? 0;
            const x = node.x ?? 0;
            const y = node.y ?? 0;
            ctx.font = "4px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = highlightNodeSet.has(id)
              ? "#ffffff"
              : "rgba(255,255,255,0.7)";
            ctx.fillText(`${id}`, x, y);

            if (highlightNodeSet.has(id)) {
              ctx.beginPath();
              ctx.arc(x, y, 10, 0, 2 * Math.PI);
              ctx.strokeStyle = "rgba(34,211,238,0.3)";
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }}
          linkColor={(link: { source?: { id?: number } | number; target?: { id?: number } | number }) => {
            const sourceId = typeof link.source === "object" ? link.source?.id : link.source;
            const targetId = typeof link.target === "object" ? link.target?.id : link.target;
            const key = `${sourceId}-${targetId}`;
            if (highlightEdgeSet.has(key)) return "#22d3ee";
            return "rgba(255,255,255,0.15)";
          }}
          linkWidth={(link: { source?: { id?: number } | number; target?: { id?: number } | number }) => {
            const sourceId = typeof link.source === "object" ? link.source?.id : link.source;
            const targetId = typeof link.target === "object" ? link.target?.id : link.target;
            const key = `${sourceId}-${targetId}`;
            return highlightEdgeSet.has(key) ? 2 : 0.5;
          }}
          backgroundColor="rgba(0,0,0,0)"
          cooldownTime={2000}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
      )}
    </div>
  );
}
