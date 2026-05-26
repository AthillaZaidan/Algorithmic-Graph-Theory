# Graph Theory Visualizer

Interactive graph theory visualizer for Algorithmic Graph Theory coursework. The app combines a Next.js frontend, animated graph visualizations, and a C++ graph engine for core algorithms. It is designed for demos, experimentation, and explaining graph algorithms visually.

## Highlights

- Interactive graph input with manual edge editing, file upload, graph class generators, and task-specific demo templates.
- 2D and 3D graph visualization with highlighted traversal paths, components, cycles, MST edges, TSP tours, and bandwidth-critical edges.
- Algorithm explanation panel for every task, written in short presentation-friendly language.
- TSP support for weighted edge-list mode and coordinate mode, including Indonesia city presets and map visualization.
- Bandwidth visualization with Cuthill-McKee relabeling, D3 arc layout, critical-edge highlighting, and a calculation matrix.
- TypeScript fallback for selected operations so the frontend remains usable when the native C++ binary is unavailable in deployment environments.

## Supported Algorithms

| Group | Feature | Algorithm / Method |
| --- | --- | --- |
| Tugas 1 | DFS | Depth-First Search using stack/recursion behavior |
| Tugas 1 | BFS | Breadth-First Search using queue by distance layer |
| Tugas 1 | Path Check | DFS/BFS reachability with parent reconstruction |
| Tugas 1 | Connectivity | DFS/BFS from one node, then compare reachable count |
| Tugas 2 | Components | DFS/BFS over all unvisited nodes |
| Tugas 2 | Largest Component | Component enumeration + max-size selection |
| Tugas 2 | Islands | Grid flood fill over 4-neighbor cells |
| Tugas 3 | Bipartite Check | BFS two-coloring |
| Tugas 3 | Cycle Check | DFS with parent tracking |
| Tugas 3 | Diameter | BFS from each node, taking maximum shortest-path distance |
| Tugas 3 | Girth | BFS cycle detection from each node, taking shortest cycle |
| Tugas 4 | Shortest Path | Dijkstra for weighted graphs |
| Tugas 4 | MST | Kruskal with DSU / Union-Find |
| Tugas 5 | TSP GRASP | GRASP construction + 2-Opt Swap local search |
| Tugas 6 | Maximum Bipartite Matching | Hopcroft-Karp |
| Tugas 6 | Timetabling | Bipartite edge coloring model |
| Tugas 7 | Bandwidth | Cuthill-McKee relabeling with non-worsening guard |

## Architecture

```text
frontend/                 Next.js App Router UI
  src/app/page.tsx        Main visualizer screen and operation orchestration
  src/components/         Graph, map, input, result, D3, and 3D visual components
  src/lib/                TypeScript helpers, parsers, fallbacks, and tests
  public/                 WebAssembly graph engine artifacts

backend/                  Native C++ graph engine
  graph_engine.cpp        JSON stdin/stdout engine used by the API route
  graph_engine_wasm.cpp   WASM-compatible engine wrapper
  samples/                Example graph files
```

Runtime flow:

1. User creates or loads a graph in the frontend.
2. Frontend prepares a `GraphRequest`.
3. Browser tries WASM where supported.
4. API route can call the native C++ engine as fallback.
5. Selected operations also have TypeScript fallback logic for deployment safety.
6. Result data drives visual highlights, result cards, matrices, and algorithm-specific views.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Bun
- C++17
- Three.js / React Three Fiber for 3D graph mode
- D3 for bandwidth arc visualization
- MapLibre + deck.gl for map-based TSP visualization
- Framer Motion for UI transitions

## Getting Started

### Prerequisites

- Bun
- Node.js compatible with Next.js 16
- `g++` with C++17 support

### 1. Build the C++ engine

```bash
cd backend
make
```

This produces `backend/graph_engine`.

### 2. Install frontend dependencies

```bash
cd frontend
bun install
```

### 3. Start the dev server

```bash
cd frontend
bun run dev
```

Open:

```text
http://localhost:3000
```

If port `3000` is already used, Next.js will choose another available port.

## Verification

Run the frontend test suite:

```bash
cd frontend
bun test
```

Run lint:

```bash
cd frontend
bun run lint
```

Run production build:

```bash
cd frontend
bun run build
```

Rebuild native engine:

```bash
cd backend
make
```

## Graph Input Options

The app supports several ways to create graphs:

- Manual node and edge input.
- Weighted and unweighted edge mode.
- `.txt` graph file upload.
- Built-in graph class generator:
  - Complete graph
  - Complete bipartite graph
  - Tree
  - Cycle
  - Path
  - Wheel
  - Prism
  - Petersen graph
  - Generalized Petersen graph
  - Circulant graph
  - Hypercube
  - Grid graph
- Task templates for quick demos:
  - DFS/BFS branching tree
  - Clear path A-B
  - Disconnected components
  - Bipartite matching
  - Triangle + square cycles
  - Long diameter graph
  - Weighted route network
  - Small TSP tour
  - Petersen bandwidth case

## TSP Modes

### Edge-list mode

Uses graph edges and optional edge weights. Unweighted edges default to weight `1`.

### Coordinate mode

Uses point coordinates and computes Euclidean distances automatically. Coordinate mode supports:

- Manual coordinate editing.
- Generated circular coordinate layout.
- TSPLIB-style `.tsp` coordinate file parsing.
- Indonesia city presets.
- Map visualization for geographic presets.

## Bandwidth View

Bandwidth mode uses Cuthill-McKee ordering to relabel nodes. Because Cuthill-McKee is a heuristic, the app includes a non-worsening guard: if the generated ordering increases bandwidth compared to the original labels, the app keeps the original ordering as the final result.

Bandwidth result includes:

- Initial bandwidth.
- Final bandwidth.
- Before/after node order.
- Relabel mapping.
- Critical edges with maximum label difference.
- D3 bandwidth arc layout.
- Calculation matrix where each edge cell stores `|pos(u) - pos(v)|`.

## Deployment Notes

### Vercel

The frontend can be deployed to Vercel, but the native C++ binary is not a reliable production dependency there.

Reason:

- Vercel serverless runtime may use a different Linux/glibc version.
- A binary built locally can fail with errors such as:

```text
GLIBC_2.38 not found
```

Recommended deployment strategy:

- Keep the Next.js frontend on Vercel.
- Prefer WASM or TypeScript fallbacks for production-safe operations.
- Use a separate backend host for native C++ if full native engine support is required.

Good backend options for native C++:

- VPS
- Railway
- Fly.io
- Render
- Docker-based deployment with a controlled build/runtime image

## Troubleshooting

### C++ engine returns 500 or fails to start

Rebuild the engine:

```bash
cd backend
make
```

If deployed, ensure the binary is built on a compatible Linux runtime.

### Islands returns 0 or native engine fails

The frontend includes a TypeScript fallback for islands. If the API route fails because the C++ binary is unavailable, the browser computes islands directly.

### TSP map does not appear

Map mode appears only when coordinate data can be interpreted as geographic points. Abstract coordinate inputs use graph mode instead.

### Large graphs feel heavy

Use smaller visual examples for animation-heavy operations. TSP coordinate mode intentionally avoids drawing complete graphs for large coordinate presets and focuses on final tour edges.

## Project Structure

```text
.
├── backend
│   ├── graph_engine.cpp
│   ├── graph_engine_wasm.cpp
│   ├── Makefile
│   └── samples
├── frontend
│   ├── src
│   │   ├── app
│   │   ├── components
│   │   └── lib
│   ├── public
│   ├── package.json
│   └── bun.lock
├── docs
├── Graph.cpp
└── README.md
```

## Development Principles

- Keep algorithms explainable, not just functional.
- Prefer deterministic visual output for demos.
- Use TypeScript fallbacks for deployment-sensitive operations.
- Keep visualization state separate from algorithm result data.
- Verify changes with tests, lint, and production build.

