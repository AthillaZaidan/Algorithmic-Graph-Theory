# AGENTS.md — Algorithmic Graph Theory

## What this is
A Next.js visualizer frontend that delegates graph algorithms to a local C++ engine via an API route. Course project (Algorithmic Graph Theory).

## Repository layout

| Path | Purpose |
|------|---------|
| `backend/` | C++ engine (`graph_engine.cpp` + `json.hpp`) built with `make`. Reads JSON from stdin, writes JSON to stdout. |
| `frontend/` | Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + TypeScript. |
| `Graph.cpp` | Standalone Tugas-1-only C++ file (not wired to the frontend). |
| `backend/samples/` | Text-format graph fixtures used by the UI file uploader. |

## Running locally

**1. Build the C++ engine (required before frontend graph ops work)**
```bash
cd backend
make        # produces graph_engine (Linux/Mac) or graph_engine.exe (Windows)
```
Requires `g++` with `-std=c++17`.

**2. Start the frontend**
```bash
cd frontend
bun install
bun run dev      # http://localhost:3000
```
Package manager is **bun** (`bun.lock` present). Avoid mixing with `npm`/`yarn`.

## Architecture notes

- **API route:** `frontend/src/app/api/graph/route.ts` proxies requests to the C++ binary.
- **Bridge:** `frontend/src/lib/cpp-bridge.ts` spawns the engine with `child_process`.
  - Default engine path: `../backend/graph_engine` (or `.exe` on Windows).
  - Override with env var `CPP_ENGINE_PATH`.
  - Hard timeout: **10 seconds**.
- **Validation:** `numVertices` capped at **1024** in the API route.
- **WASM client-side:** `frontend/src/lib/wasm-bridge.ts` loads the C++ engine compiled to WebAssembly in the browser.
  - Files: `frontend/public/graph_engine.js` + `frontend/public/graph_engine.wasm`.
  - Frontend tries WASM first, falls back to `/api/graph` if WASM fails (e.g., server-side rendering or load error).

## Supported operations
The C++ engine exposes 15 operations grouped into 5 "tugas":
- Tugas 1: `dfs`, `bfs`, `check_path`, `check_connectivity`
- Tugas 2: `count_components`, `largest_component`, `count_islands`
- Tugas 3: `check_bipartite`, `check_cycle`, `diameter`, `girth`
- Tugas 4: `shortest_path`, `min_spanning_tree`
- Tugas 5: `tsp_grasp_swap` — GRASP + 2-Opt Swap for TSP (supports both edge-list and coordinate modes)

## TSP GRASP+Swap
Single TSP operation replacing old repeated NN and recursive exact methods:
- **Edge mode:** Uses `numVertices` + `edges` (weighted or default weight 1). Max 1024 nodes.
- **Coordinate mode:** Uses `coordinates` array `[{x, y}, ...]`. Euclidean distance computed automatically. Max 1024 nodes.
- Algorithm runs GRASP construction with randomized candidate list + 2-opt local search, looping within a time limit (default 5s, capped at 9s).

## Graph Class Generators
`GraphInput.tsx` includes a dropdown to generate 12 unweighted graph classes:
- Graf Lengkap Kn
- Graf Bipartit Lengkap K(m,n)
- Pohon Tn
- Siklus Cn
- Lintasan Pn
- Graf Roda Wn
- Graf Prisma
- Petersen Graph
- Generalized Petersen P(n,k)
- Circulant Cn(a1,a2)
- Hypercubes H(n)
- Grid Graph G(m,n)

## Sample file format
Text files in `backend/samples/` follow this format:
```
# comments optional
<numVertices> <numEdges>
<u> <v> [<w>]
...
```
Weighted edges include a third column `w`. The frontend file loader parses these.

## Tooling quirks
- **Lint:** `bun run lint` (ESLint 9 + `eslint-config-next`).
- **Build:** `bun run build` (Next.js, `reactCompiler: true` enabled).
- **No tests** and **no CI** in this repo.
- Path alias `@/*` maps to `frontend/src/*`.

## Agent workflow tips
- If graph operations return 500/timeouts, verify the C++ binary exists and is executable.
- On Windows the binary name is `graph_engine.exe`; on Linux/Mac it is `graph_engine`. The Makefile and bridge both handle this.
- When adding new C++ operations, mirror them in:
  1. `backend/graph_engine.cpp` (stdin JSON parser + algorithm)
  2. `backend/graph_engine_wasm.cpp` (WASM wrapper — same algorithms, EMSCRIPTEN_KEEPALIVE entry point)
  3. `frontend/src/lib/cpp-bridge.ts` (`GraphResponse` interface)
  4. `frontend/src/lib/wasm-bridge.ts` (`GraphRequest` / `GraphResponse` interfaces)
  5. `frontend/src/app/api/graph/route.ts` (`VALID_OPERATIONS`)
  6. `frontend/src/app/page.tsx` (tab definition + result rendering)
- When modifying TSP, update both edge-mode and coordinate-mode paths in `runOperation` body.
- `GraphVisualizer.tsx` uses `any` types for `react-force-graph-2d` callbacks to avoid strict TypeScript incompatibility.
- To recompile WASM after C++ changes: `bash backend/build_wasm.sh` (requires emscripten SDK).
