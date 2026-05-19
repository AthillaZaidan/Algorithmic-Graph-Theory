export interface BandwidthResult {
  success: true;
  bandwidth: number;
  initialBandwidth: number;
  bandwidthEdges: number[][];
  bandwidthOrder: number[];
  bandwidthPositions: number[];
  bandwidthSteps: number[][];
  isOptimal: boolean;
  method: "exact_bruteforce" | "hales_hypercube" | "reverse_cuthill_mckee";
}

export function normalizeEdges(vertexCount: number, edges: number[][]) {
  const seen = new Set<string>();
  const normalized: number[][] = [];

  for (const edge of edges) {
    const u = edge[0];
    const v = edge[1];
    if (
      !Number.isInteger(u) ||
      !Number.isInteger(v) ||
      u < 0 ||
      u >= vertexCount ||
      v < 0 ||
      v >= vertexCount ||
      u === v
    ) {
      continue;
    }

    const a = Math.min(u, v);
    const b = Math.max(u, v);
    const key = `${a}-${b}`;
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push([a, b]);
    }
  }

  return normalized;
}

export function bandwidthForOrder(order: number[], edgeList: number[][]) {
  const pos = new Map<number, number>();
  order.forEach((node, index) => pos.set(node, index));

  return edgeList.reduce((best, [u, v]) => {
    const pu = pos.get(u);
    const pv = pos.get(v);
    if (pu === undefined || pv === undefined) return best;
    return Math.max(best, Math.abs(pu - pv));
  }, 0);
}

export function criticalEdgesForOrder(order: number[], edgeList: number[][], bandwidth: number) {
  const pos = new Map<number, number>();
  order.forEach((node, index) => pos.set(node, index));

  return edgeList.filter(([u, v]) => {
    const pu = pos.get(u);
    const pv = pos.get(v);
    return pu !== undefined && pv !== undefined && Math.abs(pu - pv) === bandwidth;
  });
}

function popcount(value: number) {
  let count = 0;
  let n = value;
  while (n > 0) {
    count += n & 1;
    n >>>= 1;
  }
  return count;
}

function isPowerOfTwo(value: number) {
  return value > 0 && (value & (value - 1)) === 0;
}

export function isHypercubeGraph(vertexCount: number, edgeList: number[][]) {
  if (!isPowerOfTwo(vertexCount)) return false;
  const dim = Math.log2(vertexCount);
  if (!Number.isInteger(dim)) return false;
  if (edgeList.length !== (vertexCount * dim) / 2) return false;

  const edgeSet = new Set(edgeList.map(([u, v]) => `${Math.min(u, v)}-${Math.max(u, v)}`));
  for (let u = 0; u < vertexCount; u++) {
    for (let bit = 0; bit < dim; bit++) {
      const v = u ^ (1 << bit);
      const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
      if (!edgeSet.has(key)) return false;
    }
  }
  return true;
}

export function halesHypercubeOrder(vertexCount: number) {
  return Array.from({ length: vertexCount }, (_, i) => i).sort((a, b) => {
    const byWeight = popcount(a) - popcount(b);
    return byWeight || a - b;
  });
}

export function cuthillMckeeOrder(vertexCount: number, edgeList: number[][]) {
  const adj = Array.from({ length: vertexCount }, () => new Set<number>());
  edgeList.forEach(([u, v]) => {
    adj[u].add(v);
    adj[v].add(u);
  });

  const degree = adj.map((neighbors) => neighbors.size);
  const visited = Array.from({ length: vertexCount }, () => false);
  const order: number[] = [];

  while (order.length < vertexCount) {
    let start = -1;
    for (let i = 0; i < vertexCount; i++) {
      if (!visited[i] && (start === -1 || degree[i] < degree[start] || (degree[i] === degree[start] && i < start))) {
        start = i;
      }
    }

    const queue = [start];
    visited[start] = true;

    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];
      order.push(u);
      const neighbors = Array.from(adj[u]).filter((v) => !visited[v]);
      neighbors.sort((a, b) => degree[a] - degree[b] || a - b);
      neighbors.forEach((v) => {
        visited[v] = true;
        queue.push(v);
      });
    }
  }

  return order;
}

function exactOrder(vertexCount: number, edgeList: number[][], initialOrder: number[]) {
  let bestOrder = [...initialOrder];
  let bestBandwidth = bandwidthForOrder(bestOrder, edgeList);
  const steps: number[][] = [initialOrder];
  const perm = [...initialOrder];

  const permute = (start: number) => {
    if (start === perm.length) {
      const bw = bandwidthForOrder(perm, edgeList);
      if (bw < bestBandwidth) {
        bestBandwidth = bw;
        bestOrder = [...perm];
        if (steps.length < 24) steps.push([...perm]);
      }
      return;
    }

    for (let i = start; i < perm.length; i++) {
      [perm[start], perm[i]] = [perm[i], perm[start]];
      permute(start + 1);
      [perm[start], perm[i]] = [perm[i], perm[start]];
    }
  };

  permute(0);
  return { bestOrder, bestBandwidth, steps };
}

export function solveBandwidth(vertexCount: number, edges: number[][]): BandwidthResult {
  const edgeList = normalizeEdges(vertexCount, edges);
  const initialOrder = Array.from({ length: vertexCount }, (_, i) => i);
  const initialBandwidth = bandwidthForOrder(initialOrder, edgeList);
  let bestOrder = [...initialOrder];
  let bestBandwidth = initialBandwidth;
  let bandwidthSteps: number[][] = [initialOrder];
  let isOptimal = vertexCount <= 9;
  let method: BandwidthResult["method"] = isOptimal ? "exact_bruteforce" : "reverse_cuthill_mckee";

  if (isOptimal) {
    const exact = exactOrder(vertexCount, edgeList, initialOrder);
    bestOrder = exact.bestOrder;
    bestBandwidth = exact.bestBandwidth;
    bandwidthSteps = exact.steps;
  } else if (isHypercubeGraph(vertexCount, edgeList)) {
    bestOrder = halesHypercubeOrder(vertexCount);
    bestBandwidth = bandwidthForOrder(bestOrder, edgeList);
    bandwidthSteps = [initialOrder, bestOrder];
    isOptimal = true;
    method = "hales_hypercube";
  } else {
    const cm = cuthillMckeeOrder(vertexCount, edgeList);
    const rcm = [...cm].reverse();
    const candidates = [cm, rcm];
    bandwidthSteps = [initialOrder, cm, rcm];

    candidates.forEach((order) => {
      const bw = bandwidthForOrder(order, edgeList);
      if (bw < bestBandwidth) {
        bestBandwidth = bw;
        bestOrder = [...order];
      }
    });
  }

  const bandwidthPositions = Array.from({ length: vertexCount }, () => 0);
  bestOrder.forEach((node, index) => {
    bandwidthPositions[node] = index;
  });

  if (bandwidthSteps[bandwidthSteps.length - 1].join(",") !== bestOrder.join(",")) {
    bandwidthSteps.push(bestOrder);
  }

  return {
    success: true,
    bandwidth: bestBandwidth,
    initialBandwidth,
    bandwidthEdges: criticalEdgesForOrder(bestOrder, edgeList, bestBandwidth),
    bandwidthOrder: bestOrder,
    bandwidthPositions,
    bandwidthSteps,
    isOptimal,
    method,
  };
}

export function positionsForOrder(order: number[]) {
  const radius = Math.max(75, Math.min(155, order.length * 18));
  const positions = Array.from({ length: order.length }, () => ({ x: 0, y: 0 }));
  order.forEach((node, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(order.length, 1);
    positions[node] = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });
  return positions;
}

export function labelsForOrder(order: number[]) {
  const labels = Array.from({ length: order.length }, () => "");
  order.forEach((node, index) => {
    labels[node] = `${index + 1}`;
  });
  return labels;
}
