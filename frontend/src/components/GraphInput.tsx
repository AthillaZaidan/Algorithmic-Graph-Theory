"use client";

import { useState, useCallback } from "react";

interface GraphInputProps {
  onGraphChange: (numVertices: number, edges: number[][]) => void;
  maxNodes?: number;
}

export default function GraphInput({ onGraphChange, maxNodes = 20 }: GraphInputProps) {
  const [numVertices, setNumVertices] = useState(5);
  const [edgeText, setEdgeText] = useState("0 1\n1 2\n2 3\n3 4");
  const [error, setError] = useState("");

  const parseAndUpdate = useCallback(
    (nv: number, text: string) => {
      setError("");
      const edges: number[][] = [];
      const lines = text.trim().split("\n").filter((l) => l.trim());

      for (const line of lines) {
        const parts = line.trim().split(/[\s,]+/).map(Number);
        if (parts.length !== 2 || parts.some(isNaN)) {
          setError(`Invalid edge format: "${line}". Use "u v" format.`);
          return;
        }
        const [u, v] = parts;
        if (u < 0 || u >= nv || v < 0 || v >= nv) {
          setError(`Edge ${u}-${v} out of bounds (0 to ${nv - 1})`);
          return;
        }
        if (u === v) {
          setError(`Self-loop not allowed: ${u}-${v}`);
          return;
        }
        edges.push([u, v]);
      }
      onGraphChange(nv, edges);
    },
    [onGraphChange]
  );

  const handleVerticesChange = (val: string) => {
    const n = parseInt(val) || 0;
    const clamped = Math.max(1, Math.min(n, maxNodes));
    setNumVertices(clamped);
    parseAndUpdate(clamped, edgeText);
  };

  const handleEdgeTextChange = (val: string) => {
    setEdgeText(val);
    parseAndUpdate(numVertices, val);
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

      <div>
        <label className="block text-sm text-white/60 mb-1">
          Number of Vertices (max {maxNodes})
        </label>
        <input
          type="number"
          min={1}
          max={maxNodes}
          value={numVertices}
          onChange={(e) => handleVerticesChange(e.target.value)}
          className="glass-input w-full"
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1">
          Edges (one per line, format: &quot;u v&quot;)
        </label>
        <textarea
          rows={6}
          value={edgeText}
          onChange={(e) => handleEdgeTextChange(e.target.value)}
          className="glass-input w-full font-mono text-sm resize-y"
          placeholder={"0 1\n1 2\n2 3"}
        />
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3 text-xs text-white/40">
        <span>Nodes: {numVertices}</span>
        <span>|</span>
        <span>
          Edges: {edgeText.trim().split("\n").filter((l) => l.trim()).length}
        </span>
      </div>
    </div>
  );
}
