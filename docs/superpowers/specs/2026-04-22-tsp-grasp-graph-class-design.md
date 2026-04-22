# Spec: TSP GRASP+Swap + Graph Class Dropdown

## Scope
1. **TSP Backend**: Replace existing `tsp_repeated_nn` and `tsp_recursive_exact` with single `tsp_grasp_swap` operation supporting two input modes.
2. **Frontend TSP UI**: Single TSP tab with Edge List / Coordinate mode toggle.
3. **Graph Class Dropdown**: Add unweighted graph generators for all requested graph classes to `GraphInput`.

## Backend Changes

### Operation: `tsp_grasp_swap`
**Input JSON:**
```json
{
  "operation": "tsp_grasp_swap",
  "mode": "edge" | "coordinate",
  "numVertices": 5,
  "edges": [[0,1,2], [1,2,3]],
  "coordinates": [{"x":0,"y":0}, {"x":1,"y":1}],
  "startNode": 0,
  "timeLimitMs": 5000
}
```
- `mode: "edge"`: uses `numVertices` + `edges` (weighted or default weight 1).
- `mode: "coordinate"`: uses `coordinates` array; `numVertices` inferred from length.

**Algorithm (adapted from mhsendur/TSP-Solver):**
1. Build cost matrix:
   - Edge mode: from provided edges, missing edges = `INT_MAX`.
   - Coordinate mode: Euclidean distance `sqrt((x1-x2)^2 + (y1-y2)^2)`.
2. **GRASP construction**: candidate list = 3 nearest unvisited nodes (randomized pick). Repeat.
3. **2-opt Swap**: after each construction, apply exhaustive 2-opt until no improvement.
4. Loop GRASP+Swap repeatedly within `timeLimitMs` (default 5s, hard engine timeout 10s).

**Output JSON:**
```json
{
  "success": true,
  "feasible": true,
  "startNode": 0,
  "totalCost": 42.5,
  "tour": [0, 2, 1, 0],
  "tourEdges": [[0,2,5], [2,1,5], [1,0,5]]
}
```

### Limits
- TSP max `numVertices` (edge mode): 50 (raised from 14).
- API route max `numVertices`: 1000 (raised from 500).

## Frontend Changes

### page.tsx
- Remove `tsp_repeated_nn` and `tsp_recursive_exact` from `Operation` union and `TABS`.
- Add single `tsp_grasp_swap` tab under Tugas 5.
- Add `tspMode` state: `"edge" | "coordinate"`.
- When `tspMode == "coordinate"`, show coordinate input table instead of edge list.
- Update `runOperation` body to send `mode`, `coordinates`, etc.
- Remove all `tspReplay*` states and rendering (old recursive exact replay).
- Add coordinate-based rendering: if coordinate mode, pass positions to visualizer.

### GraphInput.tsx
- Add dropdown "Generate Graph Class" with options:
  - Complete graph Kn (n)
  - Complete bipartite K(m,n) (m, n)
  - Tree Tn (n)
  - Cycle Cn (n)
  - Path Pn (n)
  - Wheel Wn (n)
  - Prism (n)
  - Petersen (fixed)
  - Generalized Petersen P(n,k) (n, k)
  - Circulant Cn(a1,a2) (n, a1, a2)
  - Hypercube H(n) (n)
  - Grid G(m,n) (m, n)
- Each generator sets `numVertices` and `edges` unweighted.

### cpp-bridge.ts
- Add `mode`, `coordinates` to `GraphRequest`.
- Update `GraphResponse`: remove TSP-old fields no longer needed, keep `feasible`, `startNode`, `totalCost`, `tour`, `tourEdges`.

### api/graph/route.ts
- Update `VALID_OPERATIONS` to replace old TSP ops with `tsp_grasp_swap`.
- Raise `numVertices` cap to 1000.

### GraphVisualizer.tsx
- Accept optional `nodePositions?: {x:number, y:number}[]`.
- If provided, pin nodes to those coordinates (using `fx`/`fy` in force-graph).
- If not provided, use force layout as before.
