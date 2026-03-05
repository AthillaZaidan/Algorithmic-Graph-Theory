"use client";

import { useState, useCallback, useRef } from "react";
import GraphInput from "@/components/GraphInput";
import GraphVisualizer from "@/components/GraphVisualizer";
import GridVisualizer from "@/components/GridVisualizer";
import ResultPanel from "@/components/ResultPanel";

type Operation =
  | "dfs"
  | "bfs"
  | "check_path"
  | "check_connectivity"
  | "count_components"
  | "largest_component"
  | "count_islands";

interface TabDef {
  id: Operation;
  label: string;
  group: "tugas1" | "tugas2";
  description: string;
}

const TABS: TabDef[] = [
  { id: "dfs", label: "DFS", group: "tugas1", description: "Depth-First Search traversal dari start node" },
  { id: "bfs", label: "BFS", group: "tugas1", description: "Breadth-First Search traversal dari start node" },
  { id: "check_path", label: "Path Check", group: "tugas1", description: "Cek apakah ada lintasan dari node A ke node B" },
  { id: "check_connectivity", label: "Connectivity", group: "tugas1", description: "Cek apakah graf terhubung (connected)" },
  { id: "count_components", label: "Components", group: "tugas2", description: "Hitung jumlah komponen terhubung dalam graf" },
  { id: "largest_component", label: "Largest", group: "tugas2", description: "Cari komponen terhubung terbesar" },
  { id: "count_islands", label: "Islands", group: "tugas2", description: "Hitung jumlah pulau pada grid" },
];

const COMPONENT_COLORS = [
  "#22d3ee", "#2dd4bf", "#a78bfa", "#f472b6",
  "#fb923c", "#facc15", "#4ade80", "#60a5fa",
  "#e879f9", "#34d399",
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Operation>("dfs");
  const [numVertices, setNumVertices] = useState(5);
  const [edges, setEdges] = useState<number[][]>([[0, 1], [1, 2], [2, 3], [3, 4]]);
  const [startNode, setStartNode] = useState(0);
  const [nodeA, setNodeA] = useState(0);
  const [nodeB, setNodeB] = useState(4);
  const [grid, setGrid] = useState<string[]>(Array.from({ length: 5 }, () => "....."));

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  // Visualization state
  const [highlightNodes, setHighlightNodes] = useState<number[]>([]);
  const [highlightEdges, setHighlightEdges] = useState<number[][]>([]);
  const [componentColors, setComponentColors] = useState<Map<number, string>>(new Map());
  const [islandLabels, setIslandLabels] = useState<number[][] | undefined>();
  const [islandCount, setIslandCount] = useState<number | undefined>();

  const animationRef = useRef<NodeJS.Timeout[]>([]);

  const clearAnimations = () => {
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];
  };

  const handleGraphChange = useCallback((nv: number, e: number[][]) => {
    setNumVertices(nv);
    setEdges(e);
  }, []);

  const runOperation = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setHighlightNodes([]);
    setHighlightEdges([]);
    setComponentColors(new Map());
    setIslandLabels(undefined);
    setIslandCount(undefined);
    clearAnimations();

    const body: Record<string, unknown> = { operation: activeTab };

    if (activeTab !== "count_islands") {
      body.numVertices = numVertices;
      body.edges = edges;
    }

    if (activeTab === "dfs" || activeTab === "bfs") {
      body.startNode = startNode;
    } else if (activeTab === "check_path") {
      body.nodeA = nodeA;
      body.nodeB = nodeB;
    } else if (activeTab === "count_islands") {
      body.grid = grid;
    }

    try {
      const res = await fetch("/api/graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Unknown error from engine");
        setLoading(false);
        return;
      }

      setResult(data);

      // Apply visualization based on operation
      if ((activeTab === "dfs" || activeTab === "bfs") && data.traversal) {
        // Step-by-step traversal animation
        const traversal = data.traversal as number[];
        traversal.forEach((node: number, i: number) => {
          const t = setTimeout(() => {
            setHighlightNodes((prev) => [...prev, node]);
          }, i * 300);
          animationRef.current.push(t);
        });
      } else if (activeTab === "check_path" && data.path) {
        const p = data.path as number[];
        setHighlightNodes(p);
        const pathEdges: number[][] = [];
        for (let i = 0; i < p.length - 1; i++) {
          pathEdges.push([p[i], p[i + 1]]);
        }
        setHighlightEdges(pathEdges);
      } else if (activeTab === "check_connectivity") {
        if (data.connected) {
          setHighlightNodes(Array.from({ length: numVertices }, (_, i) => i));
        }
      } else if ((activeTab === "count_components" || activeTab === "largest_component") && data.components) {
        const comps = data.components as number[][];
        const colorMap = new Map<number, string>();
        comps.forEach((comp: number[], idx: number) => {
          const color = COMPONENT_COLORS[idx % COMPONENT_COLORS.length];
          comp.forEach((node: number) => colorMap.set(node, color));
        });
        setComponentColors(colorMap);
        setHighlightNodes(Array.from({ length: numVertices }, (_, i) => i));

        if (activeTab === "largest_component" && data.largestNodes) {
          // Pulse largest after short delay
          const t = setTimeout(() => {
            setHighlightNodes(data.largestNodes as number[]);
          }, 1500);
          animationRef.current.push(t);
        }
      } else if (activeTab === "count_islands") {
        setIslandLabels(data.labels as number[][]);
        setIslandCount(data.count as number);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to call API");
    } finally {
      setLoading(false);
    }
  };

  const isGraphOp = activeTab !== "count_islands";
  const needsStart = activeTab === "dfs" || activeTab === "bfs";
  const needsAB = activeTab === "check_path";

  const renderResult = () => {
    if (error) {
      return (
        <div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      );
    }
    if (!result) {
      return <p className="text-white/30 text-sm italic">Klik &quot;Run&quot; untuk menjalankan algoritma.</p>;
    }

    switch (activeTab) {
      case "dfs":
      case "bfs":
        return (
          <div className="space-y-2">
            <p className="text-white/60 text-xs uppercase tracking-wide">Traversal Order</p>
            <div className="flex flex-wrap gap-1.5">
              {((result.traversal as number[]) || []).map((node: number, i: number) => (
                <span key={i} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-sm font-mono font-semibold">
                  {node}
                </span>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-2">
              Visited {((result.traversal as number[]) || []).length} / {numVertices} nodes
            </p>
          </div>
        );

      case "check_path":
        return (
          <div className="space-y-2">
            {result.found ? (
              <>
                <div className="flex items-center gap-2 text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold">Path found!</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {((result.path as number[]) || []).map((node: number, i: number) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-sm font-mono">
                        {node}
                      </span>
                      {i < ((result.path as number[]) || []).length - 1 && (
                        <span className="text-white/30">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="font-semibold">No path exists from {nodeA} to {nodeB}</span>
              </div>
            )}
          </div>
        );

      case "check_connectivity":
        return (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 ${result.connected ? "text-emerald-400" : "text-amber-400"}`}>
              <span className={`w-3 h-3 rounded-full ${result.connected ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="font-semibold text-lg">
                {result.connected ? "Graf TERHUBUNG" : "Graf TIDAK TERHUBUNG"}
              </span>
            </div>
            <p className="text-white/50 text-sm">
              {result.reachable as number} dari {result.total as number} node terjangkau dari node 0
            </p>
          </div>
        );

      case "count_components":
        return (
          <div className="space-y-3">
            <p className="text-white/60 text-xs uppercase tracking-wide">
              Ditemukan <span className="text-cyan-300 font-bold text-lg">{result.count as number}</span> komponen
            </p>
            {((result.components as number[][]) || []).map((comp: number[], i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COMPONENT_COLORS[i % COMPONENT_COLORS.length] }}
                />
                <span className="text-white/50 text-xs">K{i + 1}:</span>
                <div className="flex flex-wrap gap-1">
                  {comp.map((node: number) => (
                    <span
                      key={node}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono"
                      style={{
                        backgroundColor: COMPONENT_COLORS[i % COMPONENT_COLORS.length] + "25",
                        borderColor: COMPONENT_COLORS[i % COMPONENT_COLORS.length] + "50",
                        borderWidth: 1,
                        color: COMPONENT_COLORS[i % COMPONENT_COLORS.length],
                      }}
                    >
                      {node}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case "largest_component":
        return (
          <div className="space-y-3">
            <p className="text-white/60 text-xs uppercase tracking-wide">
              Total komponen: {result.count as number}
            </p>
            <div className="glass p-4 border-cyan-400/30">
              <p className="text-cyan-300 font-semibold mb-2">
                Komponen Terbesar (K{(result.largestIndex as number) + 1}) — {result.largestSize as number} nodes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {((result.largestNodes as number[]) || []).map((node: number) => (
                  <span key={node} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-sm font-mono font-semibold">
                    {node}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case "count_islands":
        return (
          <div className="space-y-2">
            <p className="text-white/60 text-xs uppercase tracking-wide">
              Total islands: <span className="text-cyan-300 font-bold text-lg">{result.count as number}</span>
            </p>
            <p className="text-white/40 text-xs">
              Setiap warna pada grid merepresentasikan satu island yang berbeda.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pt-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Graph Theory{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Visualizer
          </span>
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Algorithmic Graph Theory — Tugas 1 &amp; 2
        </p>
      </div>

      {/* Operation Tabs */}
      <div className="glass p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Tugas 1 */}
          <div className="flex-1">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 px-1">Tugas 1 — Traversal &amp; Analysis</p>
            <div className="flex flex-wrap gap-1.5">
              {TABS.filter((t) => t.group === "tugas1").map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setResult(null);
                    setError("");
                    setHighlightNodes([]);
                    setHighlightEdges([]);
                    setComponentColors(new Map());
                    setIslandLabels(undefined);
                    setIslandCount(undefined);
                    clearAnimations();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-cyan-400/15 border border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                      : "glass-btn text-white/60 hover:text-white/90"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tugas 2 */}
          <div className="flex-1">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 px-1">Tugas 2 — Components &amp; Islands</p>
            <div className="flex flex-wrap gap-1.5">
              {TABS.filter((t) => t.group === "tugas2").map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setResult(null);
                    setError("");
                    setHighlightNodes([]);
                    setHighlightEdges([]);
                    setComponentColors(new Map());
                    setIslandLabels(undefined);
                    setIslandCount(undefined);
                    clearAnimations();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-teal-400/15 border border-teal-400/40 text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.12)]"
                      : "glass-btn text-white/60 hover:text-white/90"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-white/40 text-xs mt-3 px-1">
          {TABS.find((t) => t.id === activeTab)?.description}
        </p>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          {isGraphOp ? (
            <>
              <GraphInput onGraphChange={handleGraphChange} />

              {/* Extra params */}
              {needsStart && (
                <div className="glass p-4">
                  <label className="block text-sm text-white/60 mb-1">Start Node</label>
                  <input
                    type="number"
                    min={0}
                    max={numVertices - 1}
                    value={startNode}
                    onChange={(e) => setStartNode(Math.max(0, Math.min(parseInt(e.target.value) || 0, numVertices - 1)))}
                    className="glass-input w-full"
                  />
                </div>
              )}

              {needsAB && (
                <div className="glass p-4 space-y-3">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Node A (source)</label>
                    <input
                      type="number"
                      min={0}
                      max={numVertices - 1}
                      value={nodeA}
                      onChange={(e) => setNodeA(Math.max(0, Math.min(parseInt(e.target.value) || 0, numVertices - 1)))}
                      className="glass-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Node B (destination)</label>
                    <input
                      type="number"
                      min={0}
                      max={numVertices - 1}
                      value={nodeB}
                      onChange={(e) => setNodeB(Math.max(0, Math.min(parseInt(e.target.value) || 0, numVertices - 1)))}
                      className="glass-input w-full"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <GridVisualizer
              onGridChange={setGrid}
              labels={islandLabels}
              islandCount={islandCount}
            />
          )}

          {/* Run Button */}
          <button
            onClick={runOperation}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all
              bg-gradient-to-r from-cyan-500 to-teal-500 text-black
              hover:from-cyan-400 hover:to-teal-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Run ${TABS.find((t) => t.id === activeTab)?.label}`
            )}
          </button>
        </div>

        {/* Right: Visualization + Results */}
        <div className="lg:col-span-3 space-y-4">
          {/* Graph Visualizer (for graph operations) */}
          {isGraphOp && (
            <GraphVisualizer
              numVertices={numVertices}
              edges={edges}
              highlightNodes={highlightNodes}
              highlightEdges={highlightEdges}
              componentColors={componentColors.size > 0 ? componentColors : undefined}
            />
          )}

          {/* Result Panel */}
          <ResultPanel title={`Result — ${TABS.find((t) => t.id === activeTab)?.label}`} loading={loading}>
            {renderResult()}
          </ResultPanel>
        </div>
      </div>
    </div>
  );
}
