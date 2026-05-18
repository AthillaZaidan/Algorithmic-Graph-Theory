import { NextRequest, NextResponse } from "next/server";
import { callCppEngine } from "@/lib/cpp-bridge";
import { GraphRequest, GraphResponse } from "@/lib/cpp-bridge";

const VALID_OPERATIONS = [
  "dfs", "bfs", "check_path", "check_connectivity",
  "count_components", "largest_component", "count_islands",
  "check_bipartite", "check_cycle", "diameter", "girth", "bandwidth",
  "shortest_path", "min_spanning_tree", "tsp_grasp_swap",
  "maximum_bipartite_matching", "timetabling_edge_coloring"
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

interface TimetableEdge {
  teacher: number;
  class: number;
  period: number;
  edgeId: number;
}

function timetablingEdgeColoring(body: GraphRequest): GraphResponse {
  const teacherCount = body.teacherCount ?? 0;
  const classCount = body.classCount ?? 0;
  const rawRequirements = body.requirements ?? [];
  const roomLimit = body.roomLimit ?? 0;

  if (
    !Number.isInteger(teacherCount) ||
    !Number.isInteger(classCount) ||
    teacherCount <= 0 ||
    classCount <= 0 ||
    teacherCount + classCount > 1024
  ) {
    return { success: false, error: "Jumlah guru + kelas harus 1-1024" };
  }

  if (!Array.isArray(rawRequirements) || rawRequirements.length !== teacherCount) {
    return { success: false, error: "Matrix requirements tidak sesuai jumlah guru" };
  }

  const requirements: number[][] = [];
  let totalLessons = 0;

  for (let teacher = 0; teacher < teacherCount; teacher++) {
    const row = rawRequirements[teacher];
    if (!Array.isArray(row) || row.length !== classCount) {
      return { success: false, error: "Matrix requirements tidak sesuai jumlah kelas" };
    }

    requirements[teacher] = [];
    for (let classId = 0; classId < classCount; classId++) {
      const value = row[classId];
      if (!Number.isInteger(value) || value < 0) {
        return { success: false, error: "Nilai p_ij harus integer non-negatif" };
      }
      requirements[teacher][classId] = value;
      totalLessons += value;
    }
  }

  if (totalLessons > 100000) {
    return { success: false, error: "Total kebutuhan mengajar terlalu besar (max 100000)" };
  }
  if (!Number.isInteger(roomLimit) || roomLimit < 0) {
    return { success: false, error: "Kapasitas ruangan tidak boleh negatif" };
  }

  const teacherLoads = Array.from({ length: teacherCount }, () => 0);
  const classLoads = Array.from({ length: classCount }, () => 0);
  const edges: TimetableEdge[] = [];

  for (let teacher = 0; teacher < teacherCount; teacher++) {
    for (let classId = 0; classId < classCount; classId++) {
      const need = requirements[teacher][classId];
      teacherLoads[teacher] += need;
      classLoads[classId] += need;
      for (let count = 0; count < need; count++) {
        edges.push({ teacher, class: classId, period: -1, edgeId: edges.length });
      }
    }
  }

  const delta = Math.max(0, ...teacherLoads, ...classLoads);
  const periodCount = roomLimit > 0 && totalLessons > 0
    ? Math.max(delta, Math.ceil(totalLessons / roomLimit))
    : delta;

  if (totalLessons === 0) {
    return {
      success: true,
      periodCount: 0,
      delta,
      totalLessons,
      roomLimit: roomLimit > 0 ? roomLimit : undefined,
      teacherLoads,
      classLoads,
      assignments: [],
      periodSizes: [],
    };
  }

  const teacherColor = Array.from({ length: teacherCount }, () => Array.from({ length: periodCount }, () => -1));
  const classColor = Array.from({ length: classCount }, () => Array.from({ length: periodCount }, () => -1));

  const assignColor = (edgeId: number, period: number) => {
    const edge = edges[edgeId];
    edge.period = period;
    teacherColor[edge.teacher][period] = edgeId;
    classColor[edge.class][period] = edgeId;
  };

  const firstFreeTeacher = (teacher: number) => teacherColor[teacher].findIndex((edgeId) => edgeId === -1);
  const firstFreeClass = (classId: number) => classColor[classId].findIndex((edgeId) => edgeId === -1);

  for (let edgeId = 0; edgeId < edges.length; edgeId++) {
    const edge = edges[edgeId];
    let directPeriod = -1;

    for (let period = 0; period < periodCount; period++) {
      if (teacherColor[edge.teacher][period] === -1 && classColor[edge.class][period] === -1) {
        directPeriod = period;
        break;
      }
    }

    if (directPeriod !== -1) {
      assignColor(edgeId, directPeriod);
      continue;
    }

    const alpha = firstFreeTeacher(edge.teacher);
    const beta = firstFreeClass(edge.class);
    if (alpha === -1 || beta === -1) {
      return { success: false, error: "Tidak ada warna bebas untuk alternating path" };
    }

    const pathEdges: number[] = [];
    let side: "teacher" | "class" = "class";
    let vertex = edge.class;
    let period = alpha;

    while (true) {
      const nextEdge = side === "teacher" ? teacherColor[vertex][period] : classColor[vertex][period];
      if (nextEdge === -1) break;

      pathEdges.push(nextEdge);
      const next = edges[nextEdge];
      if (side === "teacher") {
        side = "class";
        vertex = next.class;
      } else {
        side = "teacher";
        vertex = next.teacher;
      }
      period = period === alpha ? beta : alpha;
    }

    const recolor: Array<[number, number]> = [];
    for (const pathEdge of pathEdges) {
      const pathItem = edges[pathEdge];
      const oldPeriod = pathItem.period;
      const newPeriod = oldPeriod === alpha ? beta : alpha;
      teacherColor[pathItem.teacher][oldPeriod] = -1;
      classColor[pathItem.class][oldPeriod] = -1;
      recolor.push([pathEdge, newPeriod]);
    }
    for (const [pathEdge, newPeriod] of recolor) {
      const pathItem = edges[pathEdge];
      pathItem.period = newPeriod;
      teacherColor[pathItem.teacher][newPeriod] = pathEdge;
      classColor[pathItem.class][newPeriod] = pathEdge;
    }

    assignColor(edgeId, alpha);
  }

  const periodSizes = Array.from({ length: periodCount }, () => 0);
  const recomputePeriodSizes = () => {
    periodSizes.fill(0);
    for (const edge of edges) {
      if (edge.period >= 0) periodSizes[edge.period]++;
    }
  };
  recomputePeriodSizes();

  const rebalancePair = (highPeriod: number, lowPeriod: number) => {
    const incident: number[][] = Array.from({ length: teacherCount + classCount }, () => []);
    for (const edge of edges) {
      if (edge.period === highPeriod || edge.period === lowPeriod) {
        incident[edge.teacher].push(edge.edgeId);
        incident[teacherCount + edge.class].push(edge.edgeId);
      }
    }

    const visited = Array.from({ length: edges.length }, () => false);
    for (const startEdge of edges) {
      if (visited[startEdge.edgeId] || (startEdge.period !== highPeriod && startEdge.period !== lowPeriod)) {
        continue;
      }

      const componentEdges: number[] = [];
      const queue = [startEdge.edgeId];
      visited[startEdge.edgeId] = true;

      for (let head = 0; head < queue.length; head++) {
        const currentEdgeId = queue[head];
        componentEdges.push(currentEdgeId);
        const current = edges[currentEdgeId];
        const vertices = [current.teacher, teacherCount + current.class];

        for (const vertexId of vertices) {
          for (const nextEdge of incident[vertexId]) {
            if (!visited[nextEdge]) {
              visited[nextEdge] = true;
              queue.push(nextEdge);
            }
          }
        }
      }

      let highCount = 0;
      let lowCount = 0;
      for (const componentEdge of componentEdges) {
        if (edges[componentEdge].period === highPeriod) highCount++;
        else lowCount++;
      }

      if (highCount > lowCount) {
        for (const componentEdge of componentEdges) {
          edges[componentEdge].period = edges[componentEdge].period === highPeriod ? lowPeriod : highPeriod;
        }
        recomputePeriodSizes();
        return true;
      }
    }

    return false;
  };

  if (roomLimit > 0) {
    let guard = Math.max(1, totalLessons * Math.max(1, periodCount));
    while (guard > 0) {
      guard--;
      let highPeriod = 0;
      let lowPeriod = 0;

      for (let period = 1; period < periodCount; period++) {
        if (periodSizes[period] > periodSizes[highPeriod]) highPeriod = period;
        if (periodSizes[period] < periodSizes[lowPeriod]) lowPeriod = period;
      }

      if (periodSizes[highPeriod] <= periodSizes[lowPeriod] + 1) break;
      if (!rebalancePair(highPeriod, lowPeriod)) {
        return { success: false, error: "Balancing Lemma 6.3 gagal menemukan komponen penukar" };
      }
    }
  }

  const assignments = [...edges].sort((a, b) =>
    a.period - b.period ||
    a.teacher - b.teacher ||
    a.class - b.class ||
    a.edgeId - b.edgeId
  );

  return {
    success: true,
    periodCount,
    delta,
    totalLessons,
    roomLimit: roomLimit > 0 ? roomLimit : undefined,
    teacherLoads,
    classLoads,
    assignments,
    periodSizes,
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
      body.operation === "timetabling_edge_coloring" ||
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

    if (body.operation === "timetabling_edge_coloring") {
      return NextResponse.json(timetablingEdgeColoring(body));
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
