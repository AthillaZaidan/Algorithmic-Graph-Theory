export interface PageRankResult {
  success: true;
  scores: number[];
  iterations: number;
  converged: boolean;
  dampingFactor: number;
}

export function solvePageRank(
  vertexCount: number,
  edges: number[][],
  dampingFactor = 0.85,
  epsilon = 1e-6,
  maxIterations = 100,
): PageRankResult {
  const adj = new Map<number, number[]>();
  const outDegree = new Array(vertexCount).fill(0);

  for (let i = 0; i < vertexCount; i++) adj.set(i, []);

  for (const edge of edges) {
    const u = edge[0];
    const v = edge[1];
    if (
      !Number.isInteger(u) || !Number.isInteger(v) ||
      u < 0 || u >= vertexCount || v < 0 || v >= vertexCount || u === v
    ) continue;
    if (!adj.get(u)!.includes(v)) {
      adj.get(u)!.push(v);
      outDegree[u]++;
    }
  }

  const teleport = (1 - dampingFactor) / vertexCount;
  let scores = new Array(vertexCount).fill(1 / vertexCount);
  const hasOutEdges = outDegree.map((d) => d > 0);

  let iterations = 0;
  let converged = false;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
    const newScores = new Array(vertexCount).fill(0);

    for (let v = 0; v < vertexCount; v++) {
      let sum = 0;
      for (let u = 0; u < vertexCount; u++) {
        if (adj.get(u)!.includes(v) && outDegree[u] > 0) {
          sum += scores[u] / outDegree[u];
        }
      }
      if (!hasOutEdges[v]) {
        newScores[v] = teleport + dampingFactor * sum + dampingFactor * scores[v] / vertexCount;
      } else {
        newScores[v] = teleport + dampingFactor * sum;
      }
    }

    for (let u = 0; u < vertexCount; u++) {
      if (!hasOutEdges[u]) {
        const dangling = dampingFactor * scores[u] / vertexCount;
        for (let v = 0; v < vertexCount; v++) {
          newScores[v] += dangling;
        }
      }
    }

    const total = newScores.reduce((a, b) => a + b, 0);
    for (let i = 0; i < vertexCount; i++) newScores[i] /= total;

    let maxDiff = 0;
    for (let i = 0; i < vertexCount; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(newScores[i] - scores[i]));
    }

    scores = newScores;
    if (maxDiff < epsilon) {
      converged = true;
      break;
    }
  }

  return { success: true, scores, iterations, converged, dampingFactor };
}
