export interface SCCResult {
  success: true;
  sccs: number[][];
  condensationEdges: number[][];
}

export function solveSCC(vertexCount: number, edges: number[][]): SCCResult {
  const adj = new Map<number, number[]>();
  for (let i = 0; i < vertexCount; i++) adj.set(i, []);

  for (const edge of edges) {
    const u = edge[0];
    const v = edge[1];
    if (
      !Number.isInteger(u) || !Number.isInteger(v) ||
      u < 0 || u >= vertexCount || v < 0 || v >= vertexCount || u === v
    ) continue;
    if (!adj.get(u)!.includes(v)) adj.get(u)!.push(v);
  }

  let index = 0;
  const stack: number[] = [];
  const onStack = new Set<number>();
  const indices = new Map<number, number>();
  const lowlink = new Map<number, number>();
  const sccs: number[][] = [];

  function strongconnect(v: number) {
    indices.set(v, index);
    lowlink.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    for (const w of adj.get(v)!) {
      if (!indices.has(w)) {
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
      }
    }

    if (lowlink.get(v) === indices.get(v)) {
      const comp: number[] = [];
      let w: number;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      sccs.push(comp);
    }
  }

  for (let i = 0; i < vertexCount; i++) {
    if (!indices.has(i)) strongconnect(i);
  }

  const nodeToSCC = new Map<number, number>();
  sccs.forEach((comp, idx) => {
    comp.forEach((node) => nodeToSCC.set(node, idx));
  });

  const condEdgeSet = new Set<string>();
  const condensationEdges: number[][] = [];

  for (const edge of edges) {
    const u = edge[0];
    const v = edge[1];
    if (u < 0 || u >= vertexCount || v < 0 || v >= vertexCount) continue;
    const cu = nodeToSCC.get(u)!;
    const cv = nodeToSCC.get(v)!;
    if (cu === cv) continue;
    const key = `${cu},${cv}`;
    if (!condEdgeSet.has(key)) {
      condEdgeSet.add(key);
      condensationEdges.push([cu, cv]);
    }
  }

  return { success: true, sccs, condensationEdges };
}
