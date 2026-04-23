import { NextRequest, NextResponse } from "next/server";
import { callCppEngine } from "@/lib/cpp-bridge";
import { GraphRequest } from "@/lib/cpp-bridge";

const VALID_OPERATIONS = [
  "dfs", "bfs", "check_path", "check_connectivity",
  "count_components", "largest_component", "count_islands",
  "check_bipartite", "check_cycle", "diameter", "girth",
  "shortest_path", "min_spanning_tree", "tsp_grasp_swap"
];

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
