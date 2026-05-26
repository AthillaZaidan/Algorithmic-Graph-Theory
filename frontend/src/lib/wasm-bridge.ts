export interface GraphRequest {
  operation: string;
  mode?: "edge" | "coordinate";
  numVertices?: number;
  edges?: number[][];
  coordinates?: { x: number; y: number }[];
  teacherCount?: number;
  classCount?: number;
  requirements?: number[][];
  roomLimit?: number;
  startNode?: number;
  nodeA?: number;
  nodeB?: number;
  grid?: string[];
  timeLimitMs?: number;
}

export interface TimetableAssignment {
  teacher: number;
  class: number;
  period: number;
  edgeId: number;
}

export interface GraphResponse {
  success: boolean;
  error?: string;
  traversal?: number[];
  found?: boolean;
  path?: number[];
  connected?: boolean;
  reachable?: boolean;
  total?: number;
  count?: number;
  components?: number[][];
  largestIndex?: number;
  largestSize?: number;
  largestNodes?: number[];
  labels?: number[][];
  isBipartite?: boolean;
  partitionA?: number[];
  partitionB?: number[];
  hasCycle?: boolean;
  cyclePath?: number[];
  diameter?: number;
  bandwidth?: number;
  initialBandwidth?: number;
  bandwidthEdges?: number[][];
  bandwidthOrder?: number[];
  bandwidthPositions?: number[];
  bandwidthMatrix?: (number | null)[][];
  bandwidthSteps?: number[][];
  isOptimal?: boolean;
  method?: string;
  girth?: number;
  cycle?: number[];
  distance?: number;
  mstEdges?: number[][];
  totalWeight?: number;
  feasible?: boolean;
  startNode?: number;
  totalCost?: number;
  distanceUnit?: "km" | "unit";
  algorithm?: string;
  tour?: number[];
  tourEdges?: number[][];
  matchingSize?: number;
  matchingEdges?: number[][];
  unmatchedA?: number[];
  unmatchedB?: number[];
  periodCount?: number;
  delta?: number;
  totalLessons?: number;
  roomLimit?: number;
  teacherLoads?: number[];
  classLoads?: number[];
  assignments?: TimetableAssignment[];
  periodSizes?: number[];
}

interface EmscriptenModule {
  ccall: (
    ident: string,
    returnType: string,
    argTypes: string[],
    args: (string | number | null | undefined)[]
  ) => string;
}

type CreateGraphEngine = () => Promise<EmscriptenModule>;

let wasmModulePromise: Promise<EmscriptenModule> | null = null;
const wasmLoadError = false;

function loadWasmScript(): Promise<CreateGraphEngine> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("WASM only available in browser"));
      return;
    }

    const existing = document.getElementById("graph-engine-wasm-script");
    if (existing) {
      const globalEngine = ((window as unknown) as Record<string, unknown>).createGraphEngine as CreateGraphEngine | undefined;
      if (globalEngine) {
        resolve(globalEngine);
      } else {
        existing.addEventListener("load", () => {
          const engine = ((window as unknown) as Record<string, unknown>).createGraphEngine as CreateGraphEngine | undefined;
          if (engine) resolve(engine);
          else reject(new Error("graph_engine.js loaded but createGraphEngine not found"));
        });
        existing.addEventListener("error", () => reject(new Error("Failed to load WASM script")));
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "graph-engine-wasm-script";
    script.src = "/graph_engine.js";
    script.async = true;
    script.onload = () => {
      const engine = ((window as unknown) as Record<string, unknown>).createGraphEngine as CreateGraphEngine | undefined;
      if (engine) {
        resolve(engine);
      } else {
        reject(new Error("graph_engine.js loaded but createGraphEngine not found"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load graph_engine.js"));
    document.head.appendChild(script);
  });
}

export async function callWasmEngine(input: GraphRequest): Promise<GraphResponse> {
  if (!wasmModulePromise && !wasmLoadError) {
    wasmModulePromise = (async () => {
      const createGraphEngine = await loadWasmScript();
      const wasmMod = await createGraphEngine();
      return wasmMod;
    })();
  }

  if (!wasmModulePromise) {
    throw new Error("WASM not available");
  }

  const wasmMod = await wasmModulePromise;
  const inputJson = JSON.stringify(input);

  const resultPtr = wasmMod.ccall(
    "processGraph",
    "string",
    ["string"],
    [inputJson]
  );

  try {
    const result = JSON.parse(resultPtr) as GraphResponse;
    return result;
  } catch {
    throw new Error(`Failed to parse WASM output: ${resultPtr}`);
  }
}
