export interface ParsedGraph {
  numVertices: number;
  edges: number[][];
  isWeighted: boolean;
  error?: string;
}

/**
 * Parse graph config file (.txt)
 * Format:
 *   Lines starting with # are comments
 *   Line 1: N M  (vertex count, edge count)
 *   Lines 2..M+1: u v [w]  (edge, optional weight)
 */
export function parseGraphFile(content: string): ParsedGraph {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) {
    return { numVertices: 0, edges: [], isWeighted: false, error: "File kosong" };
  }

  const firstParts = lines[0].split(/\s+/);
  if (firstParts.length < 2) {
    return { numVertices: 0, edges: [], isWeighted: false, error: "Baris pertama harus berisi N M" };
  }

  const N = parseInt(firstParts[0]);
  const M = parseInt(firstParts[1]);

  if (isNaN(N) || isNaN(M) || N < 1 || M < 0) {
    return { numVertices: 0, edges: [], isWeighted: false, error: "N dan M harus bilangan bulat positif" };
  }

  if (N > 500) {
    return { numVertices: 0, edges: [], isWeighted: false, error: "N terlalu besar (max 500)" };
  }

  const edges: number[][] = [];
  let isWeighted = false;

  const edgeLines = lines.slice(1);
  for (let i = 0; i < Math.min(M, edgeLines.length); i++) {
    const parts = edgeLines[i].split(/\s+/);
    if (parts.length < 2) continue;

    const u = parseInt(parts[0]);
    const v = parseInt(parts[1]);

    if (isNaN(u) || isNaN(v)) continue;
    if (u < 0 || u >= N || v < 0 || v >= N) continue;
    if (u === v) continue;

    if (parts.length >= 3) {
      const w = parseInt(parts[2]);
      if (!isNaN(w) && w >= 0) {
        isWeighted = true;
        edges.push([u, v, w]);
      } else {
        edges.push([u, v]);
      }
    } else {
      edges.push([u, v]);
    }
  }

  return { numVertices: N, edges, isWeighted };
}
