"use client";

import { useState, useCallback } from "react";

interface GridVisualizerProps {
  onGridChange?: (grid: string[]) => void;
  labels?: number[][];
  islandCount?: number;
}

const ISLAND_COLORS = [
  "rgba(34,211,238,0.6)",
  "rgba(45,212,191,0.6)",
  "rgba(167,139,250,0.6)",
  "rgba(244,114,182,0.6)",
  "rgba(251,146,60,0.6)",
  "rgba(250,204,21,0.6)",
  "rgba(74,222,128,0.6)",
  "rgba(96,165,250,0.6)",
  "rgba(232,121,249,0.6)",
  "rgba(52,211,153,0.6)",
];

export default function GridVisualizer({ onGridChange, labels, islandCount }: GridVisualizerProps) {
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [grid, setGrid] = useState<string[]>(() =>
    Array.from({ length: 5 }, () => ".....".split("").join(""))
  );

  const toggleCell = useCallback(
    (r: number, c: number) => {
      setGrid((prev) => {
        const newGrid = [...prev];
        const row = newGrid[r].split("");
        row[c] = row[c] === "*" ? "." : "*";
        newGrid[r] = row.join("");
        onGridChange?.(newGrid);
        return newGrid;
      });
    },
    [onGridChange]
  );

  const handleResize = (newRows: number, newCols: number) => {
    const r = Math.max(1, Math.min(newRows, 20));
    const c = Math.max(1, Math.min(newCols, 20));
    setRows(r);
    setCols(c);
    const newGrid = Array.from({ length: r }, (_, ri) => {
      const existing = grid[ri] || "";
      return existing.padEnd(c, ".").slice(0, c);
    });
    setGrid(newGrid);
    onGridChange?.(newGrid);
  };

  const clearGrid = () => {
    const newGrid = Array.from({ length: rows }, () => ".".repeat(cols));
    setGrid(newGrid);
    onGridChange?.(newGrid);
  };

  const randomize = () => {
    const newGrid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() > 0.6 ? "*" : ".")).join("")
    );
    setGrid(newGrid);
    onGridChange?.(newGrid);
  };

  const getCellColor = (r: number, c: number): string => {
    if (labels && labels[r] && labels[r][c] > 0) {
      const idx = (labels[r][c] - 1) % ISLAND_COLORS.length;
      return ISLAND_COLORS[idx];
    }
    return grid[r]?.[c] === "*" ? "rgba(34,211,238,0.3)" : "rgba(255,255,255,0.04)";
  };

  return (
    <div className="glass p-5 space-y-4">
      <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
        <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
        Grid Input
      </h3>

      <div className="flex gap-4">
        <div>
          <label className="block text-xs text-white/50 mb-1">Rows</label>
          <input
            type="number"
            min={1}
            max={20}
            value={rows}
            onChange={(e) => handleResize(parseInt(e.target.value) || 1, cols)}
            className="glass-input w-20 text-center"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Cols</label>
          <input
            type="number"
            min={1}
            max={20}
            value={cols}
            onChange={(e) => handleResize(rows, parseInt(e.target.value) || 1)}
            className="glass-input w-20 text-center"
          />
        </div>
        <div className="flex gap-2 items-end">
          <button onClick={clearGrid} className="glass-btn px-3 py-2 text-xs text-white/70">
            Clear
          </button>
          <button onClick={randomize} className="glass-btn px-3 py-2 text-xs text-white/70">
            Random
          </button>
        </div>
      </div>

      <div className="text-xs text-white/40 mb-1">
        Click cells to toggle land (*) / water (.)
      </div>

      <div
        className="inline-grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => toggleCell(r, c)}
              className="w-8 h-8 rounded transition-all duration-150 text-xs font-mono border border-white/10 hover:border-white/30"
              style={{ backgroundColor: getCellColor(r, c) }}
            >
              {grid[r]?.[c] === "*" ? "*" : ""}
            </button>
          ))
        )}
      </div>

      {islandCount !== undefined && (
        <div className="mt-3 text-sm">
          <span className="text-white/60">Islands found: </span>
          <span className="text-cyan-300 font-bold text-lg">{islandCount}</span>
        </div>
      )}
    </div>
  );
}
