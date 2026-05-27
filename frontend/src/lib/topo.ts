export interface TopoSortResult {
  success: true;
  isDAG: boolean;
  order: number[];
  cyclePath: number[];
}

export function solveTopoSort(
  vertexCount: number,
  edges: number[][],
): TopoSortResult {
  const adj = new Map<number, number[]>();
  for (let i = 0; i < vertexCount; i++) adj.set(i, []);

  const indegree = new Array(vertexCount).fill(0);

  for (const edge of edges) {
    const u = edge[0];
    const v = edge[1];
    if (
      !Number.isInteger(u) || !Number.isInteger(v) ||
      u < 0 || u >= vertexCount || v < 0 || v >= vertexCount || u === v
    ) continue;
    if (!adj.get(u)!.includes(v)) {
      adj.get(u)!.push(v);
      indegree[v]++;
    }
  }

  const queue: number[] = [];
  for (let i = 0; i < vertexCount; i++) {
    if (indegree[i] === 0) queue.push(i);
  }

  const order: number[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);

    for (const v of adj.get(u)!) {
      indegree[v]--;
      if (indegree[v] === 0) queue.push(v);
    }
  }

  if (order.length === vertexCount) {
    return { success: true, isDAG: true, order, cyclePath: [] };
  }

  const remaining = new Set<number>();
  for (let i = 0; i < vertexCount; i++) {
    if (indegree[i] > 0) remaining.add(i);
  }

  const cyclePath: number[] = [];
  if (remaining.size > 0) {
    const start = Array.from(remaining)[0];
    const seen = new Set<number>();
    let cur = start;
    while (!seen.has(cur)) {
      cyclePath.push(cur);
      seen.add(cur);
      let next = -1;
      for (const v of adj.get(cur)!) {
        if (remaining.has(v)) { next = v; break; }
      }
      if (next === -1) {
        cyclePath.push(start);
        break;
      }
      cur = next;
    }
  }

  return { success: true, isDAG: false, order: [], cyclePath };
}
