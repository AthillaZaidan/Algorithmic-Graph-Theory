"use client";

import { useState, useCallback } from "react";
import FileUpload from "@/components/FileUpload";

interface GraphInputProps {
  onGraphChange: (numVertices: number, edges: number[][]) => void;
  onFileLoaded?: (numVertices: number, edges: number[][], isWeighted: boolean) => void;
  maxNodes?: number;
  activeOperation?: string;
}

interface GraphTemplate {
  id: string;
  label: string;
  hint: string;
  operations: string[];
  numVertices: number;
  edges: number[][];
  weighted?: boolean;
  startNode?: number;
}

const GRAPH_TEMPLATES: GraphTemplate[] = [
  { id: "traversal-branch", label: "DFS/BFS Branching Tree", hint: "Tree bercabang buat lihat beda urutan DFS dan BFS.", operations: ["dfs", "bfs", "check_connectivity", "count_components", "largest_component"], numVertices: 9, edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [5, 7], [5, 8]] },
  { id: "path-clear", label: "Clear Path A-B", hint: "Path utama dengan cabang kecil, cocok buat path check.", operations: ["check_path", "shortest_path"], numVertices: 7, edges: [[0, 1, 2], [1, 2, 2], [2, 6, 3], [0, 3, 7], [3, 4, 2], [4, 6, 1], [1, 5, 6]], weighted: true },
  { id: "disconnected", label: "Disconnected Components", hint: "Tiga komponen, bagus buat components/connectivity.", operations: ["check_connectivity", "count_components", "largest_component"], numVertices: 10, edges: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [7, 8]] },
  { id: "bipartite-matching", label: "Bipartite Matching", hint: "Partisi kiri-kanan untuk bipartite dan matching.", operations: ["check_bipartite", "maximum_bipartite_matching", "timetabling_edge_coloring"], numVertices: 8, edges: [[0, 4], [0, 5], [1, 5], [1, 6], [2, 4], [2, 7], [3, 6], [3, 7]] },
  { id: "cycle-girth", label: "Triangle + Square Cycles", hint: "Ada cycle pendek, cocok buat cycle dan girth.", operations: ["check_cycle", "girth"], numVertices: 7, edges: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 2], [5, 6]] },
  { id: "diameter-long", label: "Long Diameter Graph", hint: "Path panjang dengan cabang, diameter gampang kelihatan.", operations: ["diameter", "bfs", "dfs"], numVertices: 10, edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 7], [7, 8], [8, 9]] },
  { id: "weighted-routes", label: "Weighted Route Network", hint: "Edge berbobot untuk Dijkstra dan MST.", operations: ["shortest_path", "min_spanning_tree", "tsp_grasp_swap"], numVertices: 7, edges: [[0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 5], [2, 3, 8], [2, 4, 10], [3, 4, 2], [3, 5, 6], [4, 5, 3], [4, 6, 5], [5, 6, 1]], weighted: true },
  { id: "tsp-small", label: "Small TSP Tour", hint: "Graf lengkap kecil berbobot buat TSP edge mode.", operations: ["tsp_grasp_swap"], numVertices: 6, edges: [[0, 1, 3], [0, 2, 4], [0, 3, 2], [0, 4, 7], [0, 5, 3], [1, 2, 4], [1, 3, 6], [1, 4, 3], [1, 5, 5], [2, 3, 5], [2, 4, 8], [2, 5, 6], [3, 4, 6], [3, 5, 4], [4, 5, 2]], weighted: true },
  { id: "bandwidth-petersen", label: "Petersen Bandwidth Case", hint: "Kasus bandwidth stabil untuk relabel Cuthill-McKee.", operations: ["bandwidth", "check_cycle", "girth"], numVertices: 10, edges: [[0, 1], [0, 5], [5, 7], [1, 2], [1, 6], [6, 8], [2, 3], [2, 7], [7, 9], [3, 4], [3, 8], [8, 5], [4, 0], [4, 9], [9, 6]] },
  { id: "maxflow-network", label: "Max Flow Network", hint: "Directed network dengan source-sink buat Ford-Fulkerson flow.", operations: ["max_flow"], numVertices: 8, edges: [[0, 1, 16], [0, 2, 13], [1, 2, 10], [1, 3, 12], [2, 1, 4], [2, 4, 14], [3, 2, 9], [3, 5, 20], [4, 3, 7], [4, 5, 4]], weighted: true },
  { id: "pagerank-web", label: "Web Page Link Graph", hint: "Directed link antar halaman web untuk simulasi PageRank.", operations: ["pagerank", "strongly_connected"], numVertices: 8, edges: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 0], [3, 4], [4, 5], [4, 6], [5, 6], [6, 7], [7, 4], [0, 7]] },
  { id: "dag-topo", label: "DAG Tasks Topo Sort", hint: "Directed acyclic graph buat simulasi topological sort.", operations: ["topo_sort", "strongly_connected"], numVertices: 7, edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 3], [2, 5], [3, 6], [4, 6], [5, 6]] },
  { id: "eulerian-bridge", label: "Eulerian Bridges Graph", hint: "Graf jembatan Konigsberg-style dengan path Eulerian.", operations: ["eulerian", "check_cycle"], numVertices: 5, edges: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 4], [3, 4]] },
  { id: "coloring-map", label: "Graph Coloring Map", hint: "Graf planar roda+cabang cocok untuk coloring.", operations: ["vertex_coloring", "check_bipartite"], numVertices: 8, edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 7], [1, 2], [2, 3], [3, 4], [4, 1], [5, 1], [5, 4], [6, 2], [6, 3]] },
];

export default function GraphInput({ onGraphChange, onFileLoaded, maxNodes = 1024, activeOperation }: GraphInputProps) {
  const [numVertices, setNumVertices] = useState(5);
  const [edges, setEdges] = useState<number[][]>([[0, 1], [1, 2], [2, 3], [3, 4]]);

  // Input fields for adding edge
  const [edgeSrc, setEdgeSrc] = useState("");
  const [edgeDest, setEdgeDest] = useState("");
  const [error, setError] = useState("");
  const [edgeWeight, setEdgeWeight] = useState("");
  const [isWeighted, setIsWeighted] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Graph class generator state
  const [graphClass, setGraphClass] = useState("");
  const [genParamN, setGenParamN] = useState(5);
  const [genParamM, setGenParamM] = useState(3);
  const [genParamK, setGenParamK] = useState(2);
  const [genParamA1, setGenParamA1] = useState(1);
  const [genParamA2, setGenParamA2] = useState(2);

  const emitChange = useCallback(
    (nv: number, e: number[][]) => {
      onGraphChange(nv, e);
    },
    [onGraphChange]
  );

  const suggestedTemplates = GRAPH_TEMPLATES.filter((template) => !activeOperation || template.operations.includes(activeOperation));

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = GRAPH_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    setError("");
    setNumVertices(template.numVertices);
    setEdges(template.edges);
    setIsWeighted(Boolean(template.weighted));
    setEdgeSrc("");
    setEdgeDest("");
    setEdgeWeight("");
    emitChange(template.numVertices, template.edges);
  };

  // --- Node Operations ---
  const addNode = () => {
    if (numVertices >= maxNodes) {
      setError(`Max ${maxNodes} nodes`);
      return;
    }
    setError("");
    const newN = numVertices + 1;
    setNumVertices(newN);
    emitChange(newN, edges);
  };

  const removeNode = () => {
    if (numVertices <= 1) {
      setError("Minimal 1 node");
      return;
    }
    setError("");
    const newN = numVertices - 1;
    // Remove edges that reference the deleted node
    const newEdges = edges.filter(([u, v]) => u < newN && v < newN);
    setNumVertices(newN);
    setEdges(newEdges);
    emitChange(newN, newEdges);
  };

  const setNodeCount = (val: string) => {
    const n = parseInt(val) || 0;
    const clamped = Math.max(1, Math.min(n, maxNodes));
    setError("");
    const newEdges = edges.filter(([u, v]) => u < clamped && v < clamped);
    setNumVertices(clamped);
    setEdges(newEdges);
    emitChange(clamped, newEdges);
  };

  // --- Edge Operations ---
  const addEdge = () => {
    const u = parseInt(edgeSrc);
    const v = parseInt(edgeDest);
    if (isNaN(u) || isNaN(v)) {
      setError("Masukkan angka untuk kedua node");
      return;
    }
    if (u < 0 || u >= numVertices || v < 0 || v >= numVertices) {
      setError(`Node harus antara 0 - ${numVertices - 1}`);
      return;
    }
    if (u === v) {
      setError("Self-loop tidak diperbolehkan");
      return;
    }
    if (edges.some(([a, b]) => (a === u && b === v) || (a === v && b === u))) {
      setError(`Edge ${u}-${v} sudah ada`);
      return;
    }
    setError("");
    const w = edgeWeight !== "" ? parseInt(edgeWeight) : undefined;
    const newEdge = (w !== undefined && !isNaN(w) && w >= 0) ? [u, v, w] : [u, v];
    const newEdges = [...edges, newEdge];
    setEdges(newEdges);
    setEdgeSrc("");
    setEdgeDest("");
    setEdgeWeight("");
    emitChange(numVertices, newEdges);
  };

  const removeEdge = (idx: number) => {
    setError("");
    const newEdges = edges.filter((_, i) => i !== idx);
    setEdges(newEdges);
    emitChange(numVertices, newEdges);
  };

  const clearAllEdges = () => {
    setError("");
    setEdges([]);
    emitChange(numVertices, []);
  };

  const resetGraph = () => {
    setError("");
    setNumVertices(5);
    setEdges([[0, 1], [1, 2], [2, 3], [3, 4]]);
    setEdgeSrc("");
    setEdgeDest("");
    emitChange(5, [[0, 1], [1, 2], [2, 3], [3, 4]]);
  };

  const generateRandom = () => {
    setError("");
    const n = numVertices;
    const maxEdgeCount = Math.min(n * (n - 1) / 2, n * 2);
    const edgeCount = Math.max(n - 1, Math.floor(Math.random() * maxEdgeCount) + 1);
    const edgeSet = new Set<string>();
    const newEdges: number[][] = [];

    // Ensure connected: create a spanning tree first
    const shuffled = Array.from({ length: n }, (_, i) => i);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (let i = 1; i < n; i++) {
      const u = shuffled[i - 1];
      const v = shuffled[i];
      const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
      edgeSet.add(key);
      newEdges.push([u, v]);
    }

    // Add extra random edges
    let attempts = 0;
    while (newEdges.length < edgeCount && attempts < 500) {
      const u = Math.floor(Math.random() * n);
      const v = Math.floor(Math.random() * n);
      if (u !== v) {
        const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          newEdges.push([u, v]);
        }
      }
      attempts++;
    }

    setEdges(newEdges);
    emitChange(n, newEdges);
  };

  const handleEdgeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEdge();
    }
  };

  // --- Graph Class Generators ---
  const generateGraphClass = () => {
    setError("");
    let nv = 0;
    const newEdges: number[][] = [];
    const edgeSet = new Set<string>();
    const add = (u: number, v: number) => {
      if (u === v) return;
      const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        newEdges.push([u, v]);
      }
    };

    switch (graphClass) {
      case "complete":
        nv = Math.max(1, Math.min(genParamN, maxNodes));
        for (let i = 0; i < nv; i++) for (let j = i + 1; j < nv; j++) add(i, j);
        break;
      case "completeBipartite": {
        const m = Math.max(1, genParamM);
        const n = Math.max(1, genParamN);
        nv = m + n;
        if (nv > maxNodes) { setError(`Total node ${nv} melebihi batas ${maxNodes}`); return; }
        for (let i = 0; i < m; i++) for (let j = m; j < nv; j++) add(i, j);
        break;
      }
      case "tree":
        nv = Math.max(1, Math.min(genParamN, maxNodes));
        for (let i = 1; i < nv; i++) add(i, Math.floor(Math.random() * i));
        break;
      case "cycle":
        nv = Math.max(3, Math.min(genParamN, maxNodes));
        for (let i = 0; i < nv; i++) add(i, (i + 1) % nv);
        break;
      case "path":
        nv = Math.max(2, Math.min(genParamN, maxNodes));
        for (let i = 0; i < nv - 1; i++) add(i, i + 1);
        break;
      case "wheel":
        nv = Math.max(4, Math.min(genParamN, maxNodes));
        for (let i = 1; i < nv; i++) add(0, i);
        for (let i = 1; i < nv; i++) add(i, ((i % (nv - 1)) + 1));
        break;
      case "prism": {
        const n = Math.max(3, Math.min(genParamN, Math.floor(maxNodes / 2)));
        nv = n * 2;
        for (let i = 0; i < n; i++) {
          add(i, (i + 1) % n);
          add(i + n, ((i + 1) % n) + n);
          add(i, i + n);
        }
        break;
      }
      case "petersen":
        nv = 10;
        for (let i = 0; i < 5; i++) {
          add(i, (i + 1) % 5);
          add(i, i + 5);
          add(i + 5, ((i + 2) % 5) + 5);
        }
        break;
      case "generalizedPetersen": {
        const n = Math.max(3, genParamN);
        const k = Math.max(1, genParamK % n);
        nv = n * 2;
        if (nv > maxNodes) { setError(`Total node ${nv} melebihi batas ${maxNodes}`); return; }
        for (let i = 0; i < n; i++) {
          add(i, (i + 1) % n);
          add(i, i + n);
          add(i + n, ((i + k) % n) + n);
        }
        break;
      }
      case "circulant": {
        const n = Math.max(3, genParamN);
        const a1 = Math.max(1, genParamA1 % n);
        const a2 = Math.max(1, genParamA2 % n);
        nv = n;
        if (nv > maxNodes) { setError(`Total node ${nv} melebihi batas ${maxNodes}`); return; }
        for (let i = 0; i < n; i++) {
          add(i, (i + a1) % n);
          add(i, (i + a2) % n);
        }
        break;
      }
      case "hypercube": {
        const dim = Math.max(1, Math.min(genParamN, 10));
        nv = 1 << dim;
        if (nv > maxNodes) { setError(`Hypercube H(${dim}) = ${nv} node melebihi batas ${maxNodes}`); return; }
        for (let i = 0; i < nv; i++) {
          for (let b = 0; b < dim; b++) {
            const j = i ^ (1 << b);
            if (j > i) add(i, j);
          }
        }
        break;
      }
      case "grid": {
        const m = Math.max(2, genParamM);
        const n = Math.max(2, genParamN);
        nv = m * n;
        if (nv > maxNodes) { setError(`Grid ${m}x${n} = ${nv} node melebihi batas ${maxNodes}`); return; }
        for (let r = 0; r < m; r++) {
          for (let c = 0; c < n; c++) {
            const idx = r * n + c;
            if (c + 1 < n) add(idx, idx + 1);
            if (r + 1 < m) add(idx, idx + n);
          }
        }
        break;
      }
      default:
        setError("Pilih kelas graf terlebih dahulu");
        return;
    }

    setNumVertices(nv);
    setEdges(newEdges);
    setIsWeighted(false);
    emitChange(nv, newEdges);
  };

  return (
    <div className="glass p-5 space-y-4">
      <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="5" r="3" />
          <circle cx="5" cy="19" r="3" />
          <circle cx="19" cy="19" r="3" />
          <path d="M12 8v3M9.5 16.5L7 17M14.5 16.5L17 17" />
        </svg>
        Graph Input
      </h3>

      {/* Task Templates */}
      <div className="space-y-2 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-3">
        <div className="flex items-center justify-between gap-3">
          <label className="block text-xs text-cyan-300/80 uppercase tracking-wider">Template Graf Tugas</label>
          <span className="text-[10px] text-white/35">{suggestedTemplates.length} cocok</span>
        </div>
        <select
          value={selectedTemplate}
          onChange={(e) => applyTemplate(e.target.value)}
          className="glass-input w-full text-sm text-white/80"
        >
          <option value="">Pilih template siap demo...</option>
          {suggestedTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
          <option value="" disabled>────────── Semua template ──────────</option>
          {GRAPH_TEMPLATES.filter((template) => !suggestedTemplates.includes(template)).map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>
        {selectedTemplate && (
          <p className="text-xs leading-relaxed text-white/45">
            {GRAPH_TEMPLATES.find((template) => template.id === selectedTemplate)?.hint}
          </p>
        )}
      </div>

      {/* Generate Graph Class */}
      <div className="space-y-2">
        <label className="block text-xs text-white/50 uppercase tracking-wider">Generate Graph Class</label>
        <select
          value={graphClass}
          onChange={(e) => setGraphClass(e.target.value)}
          className="glass-input w-full text-sm text-white/80"
        >
          <option value="">Pilih kelas graf...</option>
          <option value="complete">Graf Lengkap Kn</option>
          <option value="completeBipartite">Graf Bipartit Lengkap K(m,n)</option>
          <option value="tree">Pohon Tn</option>
          <option value="cycle">Siklus Cn</option>
          <option value="path">Lintasan Pn</option>
          <option value="wheel">Graf Roda Wn</option>
          <option value="prism">Graf Prisma</option>
          <option value="petersen">Petersen Graph</option>
          <option value="generalizedPetersen">Generalized Petersen P(n,k)</option>
          <option value="circulant">Circulant Cn(a1,a2)</option>
          <option value="hypercube">Hypercubes H(n)</option>
          <option value="grid">Grid Graph G(m,n)</option>
        </select>

        {graphClass && (
          <div className="flex flex-wrap gap-2 items-center">
            {(graphClass === "complete" || graphClass === "tree" || graphClass === "cycle" || graphClass === "path" || graphClass === "wheel" || graphClass === "prism" || graphClass === "circulant") && (
              <input
                type="number"
                min={1}
                max={maxNodes}
                value={genParamN}
                onChange={(e) => setGenParamN(parseInt(e.target.value) || 1)}
                placeholder="n"
                className="glass-input w-16 text-center font-mono text-sm"
              />
            )}
            {graphClass === "completeBipartite" && (
              <>
                <input type="number" min={1} max={maxNodes} value={genParamM} onChange={(e) => setGenParamM(parseInt(e.target.value) || 1)} placeholder="m" className="glass-input w-16 text-center font-mono text-sm" />
                <input type="number" min={1} max={maxNodes} value={genParamN} onChange={(e) => setGenParamN(parseInt(e.target.value) || 1)} placeholder="n" className="glass-input w-16 text-center font-mono text-sm" />
              </>
            )}
            {graphClass === "generalizedPetersen" && (
              <>
                <input type="number" min={3} max={maxNodes} value={genParamN} onChange={(e) => setGenParamN(parseInt(e.target.value) || 3)} placeholder="n" className="glass-input w-16 text-center font-mono text-sm" />
                <input type="number" min={1} max={maxNodes} value={genParamK} onChange={(e) => setGenParamK(parseInt(e.target.value) || 1)} placeholder="k" className="glass-input w-16 text-center font-mono text-sm" />
              </>
            )}
            {graphClass === "circulant" && (
              <>
                <input type="number" min={3} max={maxNodes} value={genParamN} onChange={(e) => setGenParamN(parseInt(e.target.value) || 3)} placeholder="n" className="glass-input w-16 text-center font-mono text-sm" />
                <input type="number" min={1} max={maxNodes} value={genParamA1} onChange={(e) => setGenParamA1(parseInt(e.target.value) || 1)} placeholder="a1" className="glass-input w-16 text-center font-mono text-sm" />
                <input type="number" min={1} max={maxNodes} value={genParamA2} onChange={(e) => setGenParamA2(parseInt(e.target.value) || 1)} placeholder="a2" className="glass-input w-16 text-center font-mono text-sm" />
              </>
            )}
            {graphClass === "hypercube" && (
              <input type="number" min={1} max={10} value={genParamN} onChange={(e) => setGenParamN(parseInt(e.target.value) || 1)} placeholder="dim" className="glass-input w-16 text-center font-mono text-sm" />
            )}
            {graphClass === "grid" && (
              <>
                <input type="number" min={2} max={maxNodes} value={genParamM} onChange={(e) => setGenParamM(parseInt(e.target.value) || 2)} placeholder="m" className="glass-input w-16 text-center font-mono text-sm" />
                <input type="number" min={2} max={maxNodes} value={genParamN} onChange={(e) => setGenParamN(parseInt(e.target.value) || 2)} placeholder="n" className="glass-input w-16 text-center font-mono text-sm" />
              </>
            )}
            <button
              onClick={generateGraphClass}
              className="glass-btn px-3 py-1.5 rounded-lg text-cyan-400 text-xs font-semibold hover:bg-cyan-400/15"
            >
              Generate
            </button>
          </div>
        )}
      </div>

      {/* Node Controls */}
      <div>
        <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">Nodes</label>
        <div className="flex items-center gap-2">
          <button onClick={removeNode} className="glass-btn px-3 py-2 rounded-lg text-red-400 font-bold text-lg hover:bg-red-400/15" title="Remove last node">
            −
          </button>
          <input
            type="number"
            min={1}
            max={maxNodes}
            value={numVertices}
            onChange={(e) => setNodeCount(e.target.value)}
            className="glass-input w-20 text-center font-mono font-bold text-lg"
          />
          <button onClick={addNode} className="glass-btn px-3 py-2 rounded-lg text-emerald-400 font-bold text-lg hover:bg-emerald-400/15" title="Add node">
            +
          </button>
          <span className="text-white/30 text-xs ml-1">node (0-{numVertices - 1})</span>
        </div>
      </div>

      {/* Add Edge */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-white/50 uppercase tracking-wider">Add Edge</label>
          <button
            type="button"
            onClick={() => setIsWeighted((v) => !v)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              isWeighted
                ? "border-amber-400/40 text-amber-400 bg-amber-400/10"
                : "border-white/10 text-white/30 hover:text-white/50"
            }`}
          >
            {isWeighted ? "Weighted ✓" : "Unweighted"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={numVertices - 1}
            value={edgeSrc}
            onChange={(e) => setEdgeSrc(e.target.value)}
            onKeyDown={handleEdgeKeyDown}
            placeholder="u"
            className="glass-input w-16 text-center font-mono"
          />
          <span className="text-white/40 font-bold">—</span>
          <input
            type="number"
            min={0}
            max={numVertices - 1}
            value={edgeDest}
            onChange={(e) => setEdgeDest(e.target.value)}
            onKeyDown={handleEdgeKeyDown}
            placeholder="v"
            className="glass-input w-16 text-center font-mono"
          />
          {isWeighted && (
            <input
              type="number"
              min={0}
              value={edgeWeight}
              onChange={(e) => setEdgeWeight(e.target.value)}
              onKeyDown={handleEdgeKeyDown}
              placeholder="w"
              className="glass-input w-16 text-center font-mono"
            />
          )}
          <button
            onClick={addEdge}
            className="glass-btn px-4 py-2 rounded-lg text-cyan-400 text-sm font-semibold hover:bg-cyan-400/15 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
      </div>

      {/* Edge List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-white/50 uppercase tracking-wider">Edges ({edges.length})</label>
          <div className="flex gap-1.5">
            <button onClick={clearAllEdges} className="text-xs text-red-400/70 hover:text-red-400 transition-colors" title="Clear all edges">
              Clear
            </button>
            <span className="text-white/20">|</span>
            <button onClick={generateRandom} className="text-xs text-purple-400/70 hover:text-purple-400 transition-colors" title="Random graph">
              Random
            </button>
            <span className="text-white/20">|</span>
            <button onClick={resetGraph} className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors" title="Reset to default">
              Reset
            </button>
          </div>
        </div>

        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
          {edges.length === 0 ? (
            <p className="text-white/20 text-xs italic py-2">Belum ada edge. Tambahkan dengan form di atas.</p>
          ) : (
            edges.map((e, idx) => (
              <div key={idx} className="flex items-center justify-between py-1 px-2 rounded-md bg-white/[0.03] hover:bg-white/[0.06] group transition-colors">
                <span className="text-sm font-mono text-white/70">
                  <span className="text-cyan-400/80">{e[0]}</span>
                  <span className="text-white/30 mx-2">↔</span>
                  <span className="text-teal-400/80">{e[1]}</span>
                  {e[2] !== undefined && (
                    <span className="text-amber-400/60 ml-2 text-xs">(w={e[2]})</span>
                  )}
                </span>
                <button
                  onClick={() => removeEdge(idx)}
                  className="text-red-400/0 group-hover:text-red-400/70 hover:!text-red-400 transition-all text-xs"
                  title={`Delete edge ${e[0]}-${e[1]}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* File Upload */}
      <div className="pt-2 border-t border-white/[0.06]">
        <FileUpload
          onGraphLoaded={(parsed) => {
            const clamped = Math.min(parsed.numVertices, maxNodes);
            const safeEdges = parsed.edges.filter(([u, v]) => u < clamped && v < clamped);
            setNumVertices(clamped);
            setEdges(safeEdges);
            setIsWeighted(parsed.isWeighted);
            emitChange(clamped, safeEdges);
            onFileLoaded?.(clamped, safeEdges, parsed.isWeighted);
          }}
        />
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-xs text-white/40 pt-1 border-t border-white/[0.06]">
        <span>Nodes: <span className="text-white/60 font-mono">{numVertices}</span></span>
        <span className="text-white/15">|</span>
        <span>Edges: <span className="text-white/60 font-mono">{edges.length}</span></span>
        <span className="text-white/15">|</span>
        <span>Max: <span className="text-white/60 font-mono">{numVertices * (numVertices - 1) / 2}</span></span>
      </div>
    </div>
  );
}
