import { spawn } from "child_process";
import path from "path";

export interface GraphRequest {
  operation: string;
  numVertices?: number;
  edges?: number[][];
  startNode?: number;
  nodeA?: number;
  nodeB?: number;
  grid?: string[];
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
  girth?: number;
  cycle?: number[];
  distance?: number;
  mstEdges?: number[][];
  totalWeight?: number;
  feasible?: boolean;
  startNode?: number;
  totalCost?: number;
  tour?: number[];
  tourEdges?: number[][];
  visitedCount?: number;
  attemptedStarts?: number;
  validStarts?: number;
  recursiveSteps?: number;
  replaySteps?: {
    type: string;
    path: number[];
    currentCost: number;
    bestCost: number;
    nextNode: number;
  }[];
}

export async function callCppEngine(input: GraphRequest): Promise<GraphResponse> {
  return new Promise((resolve, reject) => {
    const defaultEngineName = process.platform === "win32" ? "graph_engine.exe" : "graph_engine";
    const enginePath = process.env.CPP_ENGINE_PATH ||
      path.resolve(process.cwd(), "..", "backend", defaultEngineName);

    const child = spawn(enginePath, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("C++ engine timed out after 10s"));
    }, 10000);

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0 && !stdout) {
        reject(new Error(`C++ engine exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result as GraphResponse);
      } catch {
        reject(new Error(`Failed to parse C++ output: ${stdout}`));
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to spawn C++ engine: ${err.message}`));
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}
