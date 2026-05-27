export interface EulerResult {
  success: true;
  isEulerian: boolean;
  isCircuit: boolean;
  path: number[];
  type: "circuit" | "path" | "none";
}

export function solveEulerian(
  vertexCount: number,
  edges: number[][],
): EulerResult {
  const adj = new Map<number, number[]>();
  const edgeMap = new Map<string, number[]>();

  for (let i = 0; i < vertexCount; i++) adj.set(i, []);

  let edgeId = 0;

  for (const edge of edges) {
    const u = edge[0];
    const v = edge[1];
    if (
      !Number.isInteger(u) || !Number.isInteger(v) ||
      u < 0 || u >= vertexCount || v < 0 || v >= vertexCount || u === v
    ) continue;

    adj.get(u)!.push(v);
    adj.get(v)!.push(u);

    const key = `${u},${v}`;
    if (!edgeMap.has(key)) edgeMap.set(key, []);
    edgeMap.get(key)!.push(edgeId);

    const revKey = `${v},${u}`;
    if (!edgeMap.has(revKey)) edgeMap.set(revKey, []);
    edgeMap.get(revKey)!.push(edgeId);

    edgeId++;
  }

  const degrees = new Array(vertexCount).fill(0);
  let edgesWithNodes = 0;
  for (let i = 0; i < vertexCount; i++) {
    degrees[i] = adj.get(i)!.length;
    if (degrees[i] > 0) edgesWithNodes++;
  }

  let oddCount = 0;
  let startNode = 0;
  for (let i = 0; i < vertexCount; i++) {
    if (degrees[i] % 2 !== 0) {
      oddCount++;
      startNode = i;
    }
    if (degrees[i] > 0 && startNode === 0 && oddCount === 0) {
      startNode = i;
    }
  }

  if (oddCount > 2 || edgesWithNodes === 0) {
    return { success: true, isEulerian: false, isCircuit: false, path: [], type: "none" };
  }

  const isCircuit = oddCount === 0;

  const adjList = new Map<number, number[]>();
  for (let i = 0; i < vertexCount; i++) {
    adjList.set(i, [...adj.get(i)!]);
  }

  const path: number[] = [];
  const stack: number[] = [startNode];

  while (stack.length > 0) {
    const v = stack[stack.length - 1];
    const neighbors = adjList.get(v)!;

    if (neighbors.length === 0) {
      path.push(stack.pop()!);
    } else {
      const u = neighbors.pop()!;
      stack.push(u);

      const uNeighbors = adjList.get(u)!;
      const vIdx = uNeighbors.indexOf(v);
      if (vIdx !== -1) uNeighbors.splice(vIdx, 1);
    }
  }

  path.reverse();

  return { success: true, isEulerian: true, isCircuit, path, type: isCircuit ? "circuit" : "path" };
}
