"use client";

import { useState, useCallback } from "react";
import FileUpload from "@/components/FileUpload";

interface GraphInputProps {
  onGraphChange: (numVertices: number, edges: number[][]) => void;
  onFileLoaded?: (numVertices: number, edges: number[][], isWeighted: boolean) => void;
  maxNodes?: number;
}

export default function GraphInput({ onGraphChange, onFileLoaded, maxNodes = 20 }: GraphInputProps) {
  const [numVertices, setNumVertices] = useState(5);
  const [edges, setEdges] = useState<number[][]>([[0, 1], [1, 2], [2, 3], [3, 4]]);

  // Input fields for adding edge
  const [edgeSrc, setEdgeSrc] = useState("");
  const [edgeDest, setEdgeDest] = useState("");
  const [error, setError] = useState("");
  const [edgeWeight, setEdgeWeight] = useState("");
  const [isWeighted, setIsWeighted] = useState(false);

  const emitChange = useCallback(
    (nv: number, e: number[][]) => {
      onGraphChange(nv, e);
    },
    [onGraphChange]
  );

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
