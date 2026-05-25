"use client";

import { useState } from "react";
import Graph3DVisualizer from "@/components/Graph3DVisualizer";
import GraphVisualizer from "@/components/GraphVisualizer";

interface GraphViewToggleProps {
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

export default function GraphViewToggle(props: GraphViewToggleProps) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const height = 560;

  return (
    <div className="glass relative min-h-[560px] overflow-hidden">
      <div className="absolute right-3 top-3 z-30 flex rounded-xl border border-white/15 bg-slate-950/75 p-1 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={() => setMode("2d")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            mode === "2d" ? "bg-cyan-400 text-slate-950" : "text-white/60 hover:bg-white/10 hover:text-white"
          }`}
        >
          2D
        </button>
        <button
          type="button"
          onClick={() => setMode("3d")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            mode === "3d" ? "bg-cyan-400 text-slate-950" : "text-white/60 hover:bg-white/10 hover:text-white"
          }`}
        >
          3D
        </button>
      </div>

      {mode === "2d" ? (
        <GraphVisualizer {...props} height={height} framed={false} />
      ) : (
        <Graph3DVisualizer
          numVertices={props.numVertices}
          edges={props.edges}
          highlightNodes={props.highlightNodes}
          highlightEdges={props.highlightEdges}
          tspTourNodes={props.tspTourNodes}
          tspTourEdges={props.tspTourEdges}
          nodePositions={props.nodePositions}
          height={height}
          framed={false}
        />
      )}
    </div>
  );
}
