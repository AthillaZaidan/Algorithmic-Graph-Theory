export interface MaxFlowResult {
  success: true;
  maxFlow: number;
  flowEdges: { u: number; v: number; flow: number; capacity: number }[];
  minCutEdges: number[][];
}

function bfs(
  residual: Map<string, number>,
  adj: Map<number, number[]>,
  s: number,
  t: number,
  parent: Map<number, number>,
): boolean {
  const visited = new Set<number>();
  const queue: number[] = [s];
  visited.add(s);

  while (queue.length > 0) {
    const u = queue.shift()!;
    for (const v of adj.get(u) ?? []) {
      const cap = residual.get(`${u},${v}`) ?? 0;
      if (!visited.has(v) && cap > 0) {
        visited.add(v);
        parent.set(v, u);
        if (v === t) return true;
        queue.push(v);
      }
    }
  }

  return false;
}

export function solveMaxFlow(
  vertexCount: number,
  edges: number[][],
  source: number,
  sink: number,
): MaxFlowResult {
  const residual = new Map<string, number>();
  const adj = new Map<number, number[]>();
  const edgeSet = new Set<string>();

  for (const edge of edges) {
    const u = edge[0];
    const v = edge[1];
    if (
      !Number.isInteger(u) || !Number.isInteger(v) ||
      u < 0 || u >= vertexCount || v < 0 || v >= vertexCount || u === v
    ) continue;

    const key = `${u},${v}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);

    const capacity = edge.length >= 3 && typeof edge[2] === "number" ? edge[2] : 1;
    residual.set(key, capacity);
    residual.set(`${v},${u}`, residual.get(`${v},${u}`) ?? 0);

    if (!adj.has(u)) adj.set(u, []);
    adj.get(u)!.push(v);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(v)!.push(u);
  }

  let maxFlow = 0;
  const parent = new Map<number, number>();

  while (bfs(residual, adj, source, sink, parent)) {
    let pathFlow = Infinity;
    for (let v = sink; v !== source; v = parent.get(v)!) {
      const u = parent.get(v)!;
      pathFlow = Math.min(pathFlow, residual.get(`${u},${v}`) ?? 0);
    }

    for (let v = sink; v !== source; v = parent.get(v)!) {
      const u = parent.get(v)!;
      residual.set(`${u},${v}`, (residual.get(`${u},${v}`) ?? 0) - pathFlow);
      residual.set(`${v},${u}`, (residual.get(`${v},${u}`) ?? 0) + pathFlow);
    }

    maxFlow += pathFlow;
    parent.clear();
  }

  const flowEdges: MaxFlowResult["flowEdges"] = [];
  for (const key of edgeSet) {
    const [u, v] = key.split(",").map(Number);
    const capacity = edges.find((e) => e[0] === u && e[1] === v)?.[2] ?? 1;
    const flow = capacity - (residual.get(key) ?? 0);
    if (flow > 0) {
      flowEdges.push({ u, v, flow: Math.max(0, flow), capacity });
    }
  }

  const minCutEdges: number[][] = [];
  const reachable = new Set<number>();
  const q = [source];
  reachable.add(source);
  while (q.length > 0) {
    const u = q.shift()!;
    for (const v of adj.get(u) ?? []) {
      if ((residual.get(`${u},${v}`) ?? 0) > 0 && !reachable.has(v)) {
        reachable.add(v);
        q.push(v);
      }
    }
  }
  for (const key of edgeSet) {
    const [u, v] = key.split(",").map(Number);
    if (reachable.has(u) && !reachable.has(v)) {
      minCutEdges.push([u, v]);
    }
  }

  return { success: true, maxFlow, flowEdges, minCutEdges };
}
