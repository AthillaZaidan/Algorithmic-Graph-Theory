export interface TspPoint {
  x: number;
  y: number;
}

export type TspAlgorithm = "nearest-2opt" | "cheapest-insertion" | "farthest-insertion" | "best-multistart";

export interface TspSolveResult {
  success: true;
  feasible: boolean;
  startNode: number;
  totalCost: number;
  tour: number[];
  tourEdges: number[][];
  distanceUnit: "km" | "unit";
  algorithm: TspAlgorithm;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: TspPoint, b: TspPoint) {
  const earthRadiusKm = 6371;
  const lat1 = toRad(a.y);
  const lat2 = toRad(b.y);
  const dLat = toRad(b.y - a.y);
  const dLng = toRad(b.x - a.x);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function euclidean(a: TspPoint, b: TspPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function tourCost(tour: number[], cost: number[][]) {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) total += cost[tour[i]][tour[i + 1]];
  return total;
}

function twoOpt(tour: number[], cost: number[][]) {
  const best = [...tour];
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 3; i++) {
      for (let j = i + 2; j < best.length - 1; j++) {
        if (i === 0 && j === best.length - 2) continue;
        const oldCost = cost[best[i]][best[i + 1]] + cost[best[j]][best[j + 1]];
        const newCost = cost[best[i]][best[j]] + cost[best[i + 1]][best[j + 1]];
        if (newCost + 1e-9 < oldCost) {
          best.splice(i + 1, j - i, ...best.slice(i + 1, j + 1).reverse());
          improved = true;
        }
      }
    }
  }

  return best;
}

function relocateOpt(tour: number[], cost: number[][]) {
  const best = [...tour];
  let improved = true;

  while (improved) {
    improved = false;
    let bestMove: { from: number; to: number; delta: number } | null = null;

    for (let from = 1; from < best.length - 1; from++) {
      const node = best[from];
      const prev = best[from - 1];
      const next = best[from + 1];
      const removeDelta = cost[prev][next] - cost[prev][node] - cost[node][next];

      for (let to = 1; to < best.length - 1; to++) {
        if (to === from || to === from + 1) continue;
        const before = best[to - 1];
        const after = best[to];
        if (before === node || after === node) continue;
        const insertDelta = cost[before][node] + cost[node][after] - cost[before][after];
        const delta = removeDelta + insertDelta;
        if (delta < (bestMove?.delta ?? -1e-9)) {
          bestMove = { from, to, delta };
        }
      }
    }

    if (bestMove && bestMove.delta < -1e-9) {
      const [node] = best.splice(bestMove.from, 1);
      const insertAt = bestMove.to > bestMove.from ? bestMove.to - 1 : bestMove.to;
      best.splice(insertAt, 0, node);
      improved = true;
    }
  }

  return best;
}

function improveTour(tour: number[], cost: number[][]) {
  return twoOpt(relocateOpt(twoOpt(tour, cost), cost), cost);
}

function nearestTour(start: number, cost: number[][]) {
  const n = cost.length;
  const visited = Array.from({ length: n }, () => false);
  const tour = [start];
  visited[start] = true;

  while (tour.length < n) {
    const current = tour[tour.length - 1];
    let bestNode = -1;
    let bestCost = Number.POSITIVE_INFINITY;
    for (let node = 0; node < n; node++) {
      if (!visited[node] && cost[current][node] < bestCost) {
        bestCost = cost[current][node];
        bestNode = node;
      }
    }
    if (bestNode === -1) return [];
    visited[bestNode] = true;
    tour.push(bestNode);
  }

  tour.push(start);
  return tour;
}

function insertionTour(start: number, cost: number[][], mode: "cheapest" | "farthest") {
  const n = cost.length;
  const unused = new Set(Array.from({ length: n }, (_, i) => i));
  unused.delete(start);

  let second = -1;
  let secondScore = mode === "farthest" ? -1 : Number.POSITIVE_INFINITY;
  for (const node of unused) {
    const score = cost[start][node];
    if ((mode === "farthest" && score > secondScore) || (mode === "cheapest" && score < secondScore)) {
      secondScore = score;
      second = node;
    }
  }
  if (second === -1) return [start, start];
  unused.delete(second);

  const tour = [start, second, start];

  while (unused.size > 0) {
    let chosenNode = -1;
    let chosenAt = 1;
    let chosenDelta = Number.POSITIVE_INFINITY;
    let chosenDistance = -1;

    for (const node of unused) {
      let bestInsertAt = 1;
      let bestDelta = Number.POSITIVE_INFINITY;
      for (let i = 0; i < tour.length - 1; i++) {
        const delta = cost[tour[i]][node] + cost[node][tour[i + 1]] - cost[tour[i]][tour[i + 1]];
        if (delta < bestDelta) {
          bestDelta = delta;
          bestInsertAt = i + 1;
        }
      }

      const distanceToTour = Math.min(...tour.slice(0, -1).map((tourNode) => cost[node][tourNode]));
      if (
        (mode === "cheapest" && bestDelta < chosenDelta) ||
        (mode === "farthest" && (distanceToTour > chosenDistance || (distanceToTour === chosenDistance && bestDelta < chosenDelta)))
      ) {
        chosenDelta = bestDelta;
        chosenDistance = distanceToTour;
        chosenNode = node;
        chosenAt = bestInsertAt;
      }
    }

    if (chosenNode === -1) break;
    tour.splice(chosenAt, 0, chosenNode);
    unused.delete(chosenNode);
  }

  return tour;
}

function buildResult(
  tour: number[],
  cost: number[][],
  start: number,
  useGeoDistance: boolean,
  algorithm: TspAlgorithm
): TspSolveResult {
  const totalCost = tourCost(tour, cost);
  const tourEdges: number[][] = [];
  for (let i = 0; i < tour.length - 1; i++) {
    const u = tour[i];
    const v = tour[i + 1];
    tourEdges.push([u, v, cost[u][v]]);
  }
  return {
    success: true,
    feasible: true,
    startNode: start,
    totalCost,
    tour,
    tourEdges,
    distanceUnit: useGeoDistance ? "km" : "unit",
    algorithm,
  };
}

export function solveTspCoordinate(
  points: TspPoint[],
  startNode = 0,
  useGeoDistance = false,
  algorithm: TspAlgorithm = "best-multistart"
): TspSolveResult {
  const n = points.length;
  const start = startNode >= 0 && startNode < n ? startNode : 0;
  if (n <= 1) {
    return {
      success: true,
      feasible: true,
      startNode: start,
      totalCost: 0,
      tour: [start, start],
      tourEdges: [],
      distanceUnit: useGeoDistance ? "km" : "unit",
      algorithm,
    };
  }

  const distance = useGeoDistance ? haversineKm : euclidean;
  const cost = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : distance(points[i], points[j])))
  );
  const candidates: { algorithm: TspAlgorithm; tour: number[] }[] = [];

  if (algorithm === "nearest-2opt" || algorithm === "best-multistart") {
    candidates.push({ algorithm: "nearest-2opt", tour: improveTour(nearestTour(start, cost), cost) });
  }
  if (algorithm === "cheapest-insertion" || algorithm === "best-multistart") {
    candidates.push({ algorithm: "cheapest-insertion", tour: improveTour(insertionTour(start, cost, "cheapest"), cost) });
  }
  if (algorithm === "farthest-insertion" || algorithm === "best-multistart") {
    candidates.push({ algorithm: "farthest-insertion", tour: improveTour(insertionTour(start, cost, "farthest"), cost) });
  }

  const validCandidates = candidates.filter((candidate) => candidate.tour.length === n + 1);
  if (validCandidates.length === 0) {
    return {
      success: true,
      feasible: false,
      startNode: start,
      totalCost: -1,
      tour: [],
      tourEdges: [],
      distanceUnit: useGeoDistance ? "km" : "unit",
      algorithm,
    };
  }

  const best = validCandidates.reduce((currentBest, candidate) =>
    tourCost(candidate.tour, cost) < tourCost(currentBest.tour, cost) ? candidate : currentBest
  );

  return buildResult(best.tour, cost, start, useGeoDistance, algorithm === "best-multistart" ? "best-multistart" : best.algorithm);
}
