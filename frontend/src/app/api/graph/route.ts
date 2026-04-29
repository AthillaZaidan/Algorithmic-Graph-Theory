import { NextRequest, NextResponse } from "next/server";
import { callCppEngine } from "@/lib/cpp-bridge";
import { GraphRequest, GraphResponse } from "@/lib/cpp-bridge";

const VALID_OPERATIONS = [
  "dfs", "bfs", "check_path", "check_connectivity",
  "count_components", "largest_component", "count_islands",
  "check_bipartite", "check_cycle", "diameter", "girth",
  "shortest_path", "min_spanning_tree", "tsp_grasp_swap",
  "maximum_bipartite_matching"
];

function maximumBipartiteMatching(body: GraphRequest): GraphResponse {
  const numVertices = body.numVertices ?? 0;
  const edges = (body.edges ?? [])
    .map((edge) => [edge[0], edge[1]])
    .filter(([u, v]) =>
      Number.isInteger(u) &&
      Number.isInteger(v) &&
      u >= 0 &&
      u < numVertices &&
      v >= 0 &&
      v < numVertices &&
      u !== v
    );

  const adj: number[][] = Array.from({ length: numVertices }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    adj[v].push(u);
  }

  const color = Array.from({ length: numVertices }, () => -1);
  const partitionA: number[] = [];
  const partitionB: number[] = [];

  for (let start = 0; start < numVertices; start++) {
    if (color[start] !== -1) continue;

    const queue = [start];
    color[start] = 0;

    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];

      for (const v of adj[u]) {
        if (color[v] === -1) {
          color[v] = 1 - color[u];
          queue.push(v);
        } else if (color[v] === color[u]) {
          return {
            success: true,
            isBipartite: false,
            partitionA: [],
            partitionB: [],
            matchingSize: 0,
            matchingEdges: [],
            unmatchedA: [],
            unmatchedB: [],
          };
        }
      }
    }
  }

  for (let node = 0; node < numVertices; node++) {
    if (color[node] === 0) partitionA.push(node);
    else if (color[node] === 1) partitionB.push(node);
  }

  const pairU = Array.from({ length: numVertices }, () => -1);
  const pairV = Array.from({ length: numVertices }, () => -1);
  const dist = Array.from({ length: numVertices }, () => Number.POSITIVE_INFINITY);

  const bfs = () => {
    const queue: number[] = [];
    let foundFreeRight = false;

    for (const u of partitionA) {
      if (pairU[u] === -1) {
        dist[u] = 0;
        queue.push(u);
      } else {
        dist[u] = Number.POSITIVE_INFINITY;
      }
    }

    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];

      for (const v of adj[u]) {
        if (color[v] !== 1) continue;

        const matchedU = pairV[v];
        if (matchedU === -1) {
          foundFreeRight = true;
        } else if (dist[matchedU] === Number.POSITIVE_INFINITY) {
          dist[matchedU] = dist[u] + 1;
          queue.push(matchedU);
        }
      }
    }

    return foundFreeRight;
  };

  const dfs = (u: number): boolean => {
    for (const v of adj[u]) {
      if (color[v] !== 1) continue;

      const matchedU = pairV[v];
      if (matchedU === -1 || (dist[matchedU] === dist[u] + 1 && dfs(matchedU))) {
        pairU[u] = v;
        pairV[v] = u;
        return true;
      }
    }

    dist[u] = Number.POSITIVE_INFINITY;
    return false;
  };

  let matchingSize = 0;
  while (bfs()) {
    for (const u of partitionA) {
      if (pairU[u] === -1 && dfs(u)) {
        matchingSize++;
      }
    }
  }

  const matchingEdges: number[][] = [];
  const unmatchedA: number[] = [];
  const unmatchedB: number[] = [];

  for (const u of partitionA) {
    if (pairU[u] === -1) unmatchedA.push(u);
    else matchingEdges.push([u, pairU[u]]);
  }
  for (const v of partitionB) {
    if (pairV[v] === -1) unmatchedB.push(v);
  }

  return {
    success: true,
    isBipartite: true,
    partitionA,
    partitionB,
    matchingSize,
    matchingEdges,
    unmatchedA,
    unmatchedB,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: GraphRequest = await request.json();

    if (!body.operation || !VALID_OPERATIONS.includes(body.operation)) {
      return NextResponse.json(
        { success: false, error: `Invalid operation. Valid: ${VALID_OPERATIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const skipNumVerticesCheck =
      body.operation === "count_islands" ||
      (body.operation === "tsp_grasp_swap" && body.mode === "coordinate");

    if (!skipNumVerticesCheck) {
      if (typeof body.numVertices !== "number" || body.numVertices < 0 || body.numVertices > 1024) {
        return NextResponse.json(
          { success: false, error: "numVertices must be a number between 0 and 1024" },
          { status: 400 }
        );
      }
    }

    if (body.operation === "maximum_bipartite_matching") {
      return NextResponse.json(maximumBipartiteMatching(body));
    }

    const result = await callCppEngine(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
