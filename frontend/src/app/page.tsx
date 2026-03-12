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
  | "count_islands"
  | "check_bipartite"
  | "check_cycle"
  | "diameter"
  | "girth";

interface TabDef {
  id: Operation;
  label: string;
  group: "tugas1" | "tugas2" | "tugas3";
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
  { id: "check_bipartite", label: "Bipartite", group: "tugas3", description: "Cek apakah graf adalah bipartite dengan 2 partisi" },
  { id: "check_cycle", label: "Cycle", group: "tugas3", description: "Cek apakah graf memiliki cycle/siklus" },
  { id: "diameter", label: "Diameter", group: "tugas3", description: "Hitung diameter graf dan jalur terpanjang" },
  { id: "girth", label: "Girth", group: "tugas3", description: "Cari girth (cycle terpendek) dalam graf" },
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
  const [bipartiteColors, setBipartiteColors] = useState<Map<number, string>>(new Map());
  const [cyclePathNodes, setCyclePathNodes] = useState<number[]>([]);
  const [diameterPath, setDiameterPath] = useState<number[]>([]);
  const [diameterLength, setDiameterLength] = useState<number | undefined>();
  const [girthValue, setGirthValue] = useState<number | undefined>();
  const [girthCycle, setGirthCycle] = useState<number[]>([]);

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
    setBipartiteColors(new Map());
    setCyclePathNodes([]);
    setDiameterPath([]);
    setDiameterLength(undefined);
    setGirthValue(undefined);
    setGirthCycle([]);
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
      } else if (activeTab === "check_bipartite") {
        const bipartiteColorMap = new Map<number, string>();
        const partA = (data.partitionA as number[]) || [];
        const partB = (data.partitionB as number[]) || [];
        
        partA.forEach((node: number) => bipartiteColorMap.set(node, "#06b6d4")); // cyan
        partB.forEach((node: number) => bipartiteColorMap.set(node, "#a78bfa")); // violet
        
        setBipartiteColors(bipartiteColorMap);
        setHighlightNodes(Array.from({ length: numVertices }, (_, i) => i));
      } else if (activeTab === "check_cycle") {
        if (data.hasCycle && data.cyclePath) {
          const cycle = data.cyclePath as number[];
          setCyclePathNodes(cycle);
          setHighlightNodes(cycle);
          
          // Highlight edges in the cycle
          const cycleEdges: number[][] = [];
          for (let i = 0; i < cycle.length; i++) {
            const nextIdx = (i + 1) % cycle.length;
            cycleEdges.push([cycle[i], cycle[nextIdx]]);
          }
          setHighlightEdges(cycleEdges);
        }
      } else if (activeTab === "diameter") {
        if (data.path) {
          const path = data.path as number[];
          setDiameterPath(path);
          setHighlightNodes(path);
          const diaEdges: number[][] = [];
          for (let i = 0; i < path.length - 1; i++) {
            diaEdges.push([path[i], path[i + 1]]);
          }
          setHighlightEdges(diaEdges);
          setDiameterLength(data.diameter as number);
        }
      } else if (activeTab === "girth") {
        if (data.girth && data.girth > 0 && data.cycle) {
          const cycle = data.cycle as number[];
          setGirthValue(data.girth as number);
          setGirthCycle(cycle);
          setHighlightNodes(cycle);
          const girthEdges: number[][] = [];
          for (let i = 0; i < cycle.length; i++) {
            const nextIdx = (i + 1) % cycle.length;
            girthEdges.push([cycle[i], cycle[nextIdx]]);
          }
          setHighlightEdges(girthEdges);
        }
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

      case "check_bipartite":
        return (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-lg font-semibold ${result.isBipartite ? "text-emerald-400" : "text-amber-400"}`}>
              {result.isBipartite ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Graf BIPARTITE ✓</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Bukan Graf Bipartite</span>
                </>
              )}
            </div>

            {result.isBipartite && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass p-3 border border-cyan-400/30">
                    <p className="text-cyan-300 font-semibold text-sm mb-2">Partisi A</p>
                    <div className="flex flex-wrap gap-1.5">
                      {((result.partitionA as number[]) || []).map((node: number) => (
                        <span key={node} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 text-sm font-mono font-semibold">
                          {node}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="glass p-3 border border-violet-400/30">
                    <p className="text-violet-300 font-semibold text-sm mb-2">Partisi B</p>
                    <div className="flex flex-wrap gap-1.5">
                      {((result.partitionB as number[]) || []).map((node: number) => (
                        <span key={node} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-400/20 border border-violet-400/40 text-violet-300 text-sm font-mono font-semibold">
                          {node}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-white/40 text-xs">
                  Semua edge hanya terhubung antara Partisi A dan Partisi B (tidak ada edge dalam partisi yang sama)
                </p>
              </div>
            )}
          </div>
        );

      case "check_cycle":
        return (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-lg font-semibold ${result.hasCycle ? "text-amber-400" : "text-emerald-400"}`}>
              {result.hasCycle ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Graf Memiliki CYCLE</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Graf Tidak Memiliki Cycle</span>
                </>
              )}
            </div>

            {result.hasCycle && result.cyclePath && (
              <div className="glass p-4 border-amber-400/30">
                <p className="text-amber-300 font-semibold text-sm mb-2">Cycle Path:</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {((result.cyclePath as number[]) || []).map((node: number, i: number) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 text-sm font-mono font-semibold">
                        {node}
                      </span>
                      {i < ((result.cyclePath as number[]) || []).length - 1 && (
                        <span className="text-amber-400/60">→</span>
                      )}
                    </span>
                  ))}
                  {(result.cyclePath as number[])?.length > 0 && (
                    <span className="text-amber-400/60">↻</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case "diameter":
        return (
          <div className="space-y-3">
            <p className="text-white/60 text-xs uppercase tracking-wide">
              Diameter graf: <span className="text-green-300 font-bold text-lg">{diameterLength ?? 0}</span>
            </p>
            {diameterPath.length > 0 && (
              <>
                <p className="text-white/40 text-xs">
                  Jalur mulai dari <span className="font-mono font-semibold">{diameterPath[0]}</span> ke <span className="font-mono font-semibold">{diameterPath[diameterPath.length - 1]}</span>
                </p>
                <div className="glass p-4 border-green-400/30">
                  <p className="text-green-300 font-semibold text-sm mb-2">Path terpanjang:</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {diameterPath.map((node: number, i: number) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-green-400/20 border border-green-400/40 text-green-300 text-sm font-mono font-semibold">
                          {node}
                        </span>
                        {i < diameterPath.length - 1 && (
                          <span className="text-green-400/60">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case "girth":
        return (
          <div className="space-y-3">
            {girthValue && girthValue > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-xs uppercase tracking-wide">Girth (cycle terpendek):</span>
                  <span className="text-pink-300 font-bold text-lg">{girthValue}</span>
                </div>
                {girthCycle.length > 0 && (
                  <div className="glass p-4 border-pink-400/30">
                    <p className="text-pink-300 font-semibold text-sm mb-2">Cycle:</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {girthCycle.map((node: number, i: number) => (
                        <span key={i} className="flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-pink-400/20 border border-pink-400/40 text-pink-300 text-sm font-mono font-semibold">
                            {node}
                          </span>
                          {i < girthCycle.length - 1 && (
                            <span className="text-pink-400/60">→</span>
                          )}
                        </span>
                      ))}
                      {girthCycle.length > 0 && (
                        <span className="text-pink-400/60">↻</span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-cyan-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Graf tidak memiliki cycle</span>
              </div>
            )}
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
                    setBipartiteColors(new Map());
                    setCyclePathNodes([]);
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
                    setBipartiteColors(new Map());
                    setCyclePathNodes([]);
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

          {/* Tugas 3 */}
          <div className="flex-1">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 px-1">Tugas 3 — Advanced Checks</p>
            <div className="flex flex-wrap gap-1.5">
              {TABS.filter((t) => t.group === "tugas3").map((tab) => (
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
                    setBipartiteColors(new Map());
                    setCyclePathNodes([]);
                    setDiameterPath([]);
                    setDiameterLength(undefined);
                    setGirthValue(undefined);
                    setGirthCycle([]);
                    clearAnimations();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? tab.id === "diameter"
                        ? "bg-green-400/15 border border-green-400/40 text-green-300 shadow-[0_0_12px_rgba(74,222,128,0.12)]"
                        : tab.id === "girth"
                        ? "bg-pink-400/15 border border-pink-400/40 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.12)]"
                        : "bg-violet-400/15 border border-violet-400/40 text-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.12)]"
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
              bipartiteColors={bipartiteColors.size > 0 ? bipartiteColors : undefined}
              cyclePathNodes={cyclePathNodes}
              diameterPathNodes={diameterPath}
              girthCycleNodes={girthCycle}
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
