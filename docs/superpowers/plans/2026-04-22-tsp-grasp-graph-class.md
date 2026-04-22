# TSP GRASP+Swap + Graph Class Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TSP methods with GRASP+Swap (edge & coordinate modes) and add graph class generators.

**Architecture:** Single backend operation `tsp_grasp_swap` handles both modes. Frontend gets one TSP tab with mode toggle. GraphInput gets a dropdown with 12 graph class generators.

**Tech Stack:** C++17 backend, Next.js 16 + React 19 + Tailwind v4 + TypeScript frontend.

---

### Task 1: Backend — Add GRASP+Swap Algorithm

**Files:**
- Modify: `backend/graph_engine.cpp`

- [ ] **Step 1: Add helper functions for GRASP+Swap**
  Above the `solveTSPRepeatedNearestNeighbor` function, add:
  - `double euclideanDist(double x1, double y1, double x2, double y2)`
  - `int candidateListSize(int n)` (3 for ≤25, 5 for ≤100, 10 for ≤500, 15 for >500)
  - `vector<int> graspConstruct(const vector<vector<double>>& cost, int start, int n)` — GRASP construction with randomized candidate list
  - `double tourCost(const vector<int>& tour, const vector<vector<double>>& cost, int n)` — total tour cost
  - `vector<int> twoOptSwap(const vector<int>& tour, const vector<vector<double>>& cost, int n)` — exhaustive 2-opt until no improvement
  - `json solveTSPGraspSwap(int N, const vector<vector<double>>& costMatrix, int startNode, int timeLimitMs)` — runs GRASP+Swap in a loop within time limit

- [ ] **Step 2: Add `tsp_grasp_swap` operation handler in main()**
  Replace the `tsp_repeated_nn` and `tsp_recursive_exact` branches with a single `tsp_grasp_swap` branch.
  
  For `mode == "coordinate"`:
  - Parse `coordinates` array of `{x, y}` objects.
  - Build Euclidean cost matrix.
  - `startNode` defaults to 0.
  
  For `mode == "edge"` (default):
  - Parse `numVertices` and `edges`.
  - Build cost matrix from edges (default weight 1 for unweighted, min weight for duplicates).
  - `startNode` defaults to 0.
  
  Validate: `numVertices` for TSP ≤ 50.
  Call `solveTSPGraspSwap`, build result JSON with `feasible`, `startNode`, `totalCost`, `tour`, `tourEdges`.

- [ ] **Step 3: Remove old TSP functions**
  Delete `solveTSPRepeatedNearestNeighbor`, `solveTSPRecursiveExact`, `tspBacktrackRecursive`.

- [ ] **Step 4: Build and test backend**
  Run:
  ```bash
  cd backend && make
  ```
  Expected: compiles without errors.

---

### Task 2: Frontend API — Update Route and Bridge

**Files:**
- Modify: `frontend/src/app/api/graph/route.ts`
- Modify: `frontend/src/lib/cpp-bridge.ts`

- [ ] **Step 1: Update VALID_OPERATIONS in route.ts**
  Replace `"tsp_repeated_nn"` and `"tsp_recursive_exact"` with `"tsp_grasp_swap"`.
  Raise numVertices cap from 500 to 1000.

- [ ] **Step 2: Update GraphRequest in cpp-bridge.ts**
  ```typescript
  export interface GraphRequest {
    operation: string;
    mode?: "edge" | "coordinate";
    numVertices?: number;
    edges?: number[][];
    coordinates?: { x: number; y: number }[];
    startNode?: number;
    nodeA?: number;
    nodeB?: number;
    grid?: string[];
  }
  ```

- [ ] **Step 3: Update GraphResponse in cpp-bridge.ts**
  Remove old TSP-specific fields (`attemptedStarts`, `validStarts`, `visitedCount`, `recursiveSteps`, `replaySteps`).
  Keep: `feasible`, `startNode`, `totalCost`, `tour`, `tourEdges`.

---

### Task 3: Frontend — Add Graph Class Generators to GraphInput

**Files:**
- Modify: `frontend/src/components/GraphInput.tsx`

- [ ] **Step 1: Add graph class generator functions**
  Add a const object `GRAPH_GENERATORS` mapping graph class IDs to generator functions. Each returns `{ numVertices: number, edges: number[][] }`.
  
  Implement:
  - `complete(n)` → Kn
  - `completeBipartite(m, n)` → K(m,n)
  - `tree(n)` → random tree (spanning tree on n nodes with random extra edges)
  - `cycle(n)` → Cn
  - `path(n)` → Pn
  - `wheel(n)` → Wn (hub 0, rim 1..n-1)
  - `prism(n)` → prism over n-gon (2n nodes)
  - `petersen()` → fixed 10 nodes
  - `generalizedPetersen(n, k)` → P(n,k)
  - `circulant(n, a1, a2)` → Cn(a1,a2)
  - `hypercube(n)` → H(n), 2^n nodes
  - `grid(m, n)` → G(m,n)

- [ ] **Step 2: Add dropdown UI and parameter inputs**
  Add state: `graphClass`, `genParams` (object for params like n, m, k, etc.).
  Add `<select>` dropdown above node controls with all class names.
  When a class is selected, show parameter inputs (e.g., n only for cycle; m,n for bipartite).
  Add "Generate" button that calls the generator, sets `numVertices` and `edges`, calls `emitChange`.

---

### Task 4: Frontend — Rewrite TSP Tab in page.tsx

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Update Operation type and TABS**
  Remove `tsp_repeated_nn` and `tsp_recursive_exact`.
  Add `tsp_grasp_swap` with label "TSP GRASP" under tugas5.

- [ ] **Step 2: Add TSP mode state**
  Add `tspMode` state: `"edge" | "coordinate"`.
  Add `coordinates` state: `{x:number, y:number}[]`.
  When mode switches, reset result and graph state appropriately.

- [ ] **Step 3: Update runOperation body for tsp_grasp_swap**
  If `activeTab === "tsp_grasp_swap"`:
  - `mode: tspMode`
  - If edge mode: send `numVertices`, `edges`, `startNode`
  - If coordinate mode: send `coordinates`, `startNode` (numVertices inferred)

- [ ] **Step 4: Update visualization flags**
  Remove `needsStart` from old TSP. `tsp_grasp_swap` needs `startNode` in both modes.
  Update `needsWeightedHint` to include `tsp_grasp_swap` only in edge mode.

- [ ] **Step 5: Remove old TSP replay states**
  Delete: `tspReplaySteps`, `tspReplayIndex`, `tspReplayPlaying`, `replayTimerRef`, and all `useEffect` related to replay.

- [ ] **Step 6: Add coordinate input UI**
  In the render section (where graph input is shown), if `activeTab === "tsp_grasp_swap"`:
  - Show mode toggle buttons: "Edge List" / "Koordinat"
  - If coordinate mode: show table of inputs `(x, y)` per node, with add/remove node buttons.

- [ ] **Step 7: Add tsp_grasp_swap result rendering**
  Replace old `case "tsp_repeated_nn"` and `case "tsp_recursive_exact"` with single `case "tsp_grasp_swap"`.
  Show: feasible/unfeasible, totalCost, tour nodes, tour edges list.

---

### Task 5: Frontend — Coordinate Visualization

**Files:**
- Modify: `frontend/src/components/GraphVisualizer.tsx`

- [ ] **Step 1: Accept optional nodePositions prop**
  ```typescript
  interface GraphVisualizerProps {
    // ... existing props
    nodePositions?: { x: number; y: number }[];
  }
  ```

- [ ] **Step 2: Pin nodes when positions provided**
  When building graph data for `react-force-graph-2d`, if `nodePositions` is provided and has entry for a node, set `fx: pos.x * scale` and `fy: pos.y * scale` so the node stays at that position.
  If not provided, use force layout as before.

---

### Task 6: Build, Lint, and Verify

**Files:**
- All modified frontend files

- [ ] **Step 1: Build C++ engine**
  ```bash
  cd backend && make
  ```

- [ ] **Step 2: Lint frontend**
  ```bash
  cd frontend && bun run lint
  ```
  Expected: no errors.

- [ ] **Step 3: Build frontend**
  ```bash
  cd frontend && bun run build
  ```
  Expected: builds successfully.

- [ ] **Step 4: Run dev server and smoke test**
  ```bash
  cd frontend && bun run dev
  ```
  Open http://localhost:3000.
  - Test: select "TSP GRASP", edge mode, run on default graph → should return feasible tour.
  - Test: switch to coordinate mode, input (0,0), (1,0), (0,1), run → should return feasible tour with Euclidean costs.
  - Test: GraphInput dropdown → select "Cycle Cn", enter n=6, generate → should show 6-node cycle.

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Backend GRASP+Swap for edge mode | Task 1 |
| Backend GRASP+Swap for coordinate mode | Task 1 |
| Remove old TSP ops | Task 1, Task 2 |
| Single TSP tab with mode toggle | Task 4 |
| Coordinate input UI | Task 4 |
| Graph class dropdown (12 classes) | Task 3 |
| API numVertices cap 1000 | Task 2 |
| TSP max nodes 50 | Task 1 |
| Coordinate visualization | Task 5 |
| Build & lint pass | Task 6 |

No placeholders detected. All tasks have exact file paths and code intent.
