"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import GraphInput from "@/components/GraphInput";
import GraphVisualizer from "@/components/GraphVisualizer";
import GridVisualizer from "@/components/GridVisualizer";
import ResultPanel from "@/components/ResultPanel";
import TimetableVisualizer from "@/components/TimetableVisualizer";
import TimetablingInput, { TimetablingConfig } from "@/components/TimetablingInput";
import { GraphResponse } from "@/lib/cpp-bridge";
import { callWasmEngine, GraphRequest } from "@/lib/wasm-bridge";
import { CITY_PRESETS, ALL_INDONESIA_PRESET } from "@/lib/city-data";

type Operation =
  | "dfs"
  | "bfs"
  | "check_path"
  | "check_connectivity"
  | "count_components"
  | "largest_component"
  | "count_islands"
  | "check_bipartite"
  | "check_cycle"
  | "diameter"
  | "girth"
  | "shortest_path"
  | "min_spanning_tree"
  | "tsp_grasp_swap"
  | "maximum_bipartite_matching"
  | "timetabling_edge_coloring";

interface TabDef {
  id: Operation;
  label: string;
  group: "tugas1" | "tugas2" | "tugas3" | "tugas4" | "tugas5" | "tugas6";
  description: string;
}

const TABS: TabDef[] = [
  { id: "dfs", label: "DFS", group: "tugas1", description: "Depth-First Search traversal dari start node" },
  { id: "bfs", label: "BFS", group: "tugas1", description: "Breadth-First Search traversal dari start node" },
  { id: "check_path", label: "Path Check", group: "tugas1", description: "Cek apakah ada lintasan dari node A ke node B" },
  { id: "check_connectivity", label: "Connectivity", group: "tugas1", description: "Cek apakah graf terhubung (connected)" },
  { id: "count_components", label: "Components", group: "tugas2", description: "Hitung jumlah komponen terhubung dalam graf" },
  { id: "largest_component", label: "Largest", group: "tugas2", description: "Cari komponen terhubung terbesar" },
  { id: "count_islands", label: "Islands", group: "tugas2", description: "Hitung jumlah pulau pada grid" },
  { id: "check_bipartite", label: "Bipartite", group: "tugas3", description: "Cek apakah graf adalah bipartite dengan 2 partisi" },
  { id: "check_cycle", label: "Cycle", group: "tugas3", description: "Cek apakah graf memiliki cycle/siklus" },
  { id: "diameter", label: "Diameter", group: "tugas3", description: "Hitung diameter graf dan jalur terpanjang" },
  { id: "girth", label: "Girth", group: "tugas3", description: "Cari girth (cycle terpendek) dalam graf" },
  { id: "shortest_path", label: "Shortest Path", group: "tugas4", description: "Lintasan terpendek dari node A ke B (Dijkstra, berbobot)" },
  { id: "min_spanning_tree", label: "MST", group: "tugas4", description: "Pohon pembangun minimal (Kruskal)" },
  { id: "tsp_grasp_swap", label: "TSP GRASP", group: "tugas5", description: "Travelling Salesman Problem dengan GRASP + 2-Opt Swap" },
  { id: "maximum_bipartite_matching", label: "Max Matching", group: "tugas6", description: "Matching maksimum pada graf bipartit (Hopcroft-Karp)" },
  { id: "timetabling_edge_coloring", label: "Timetabling", group: "tugas6", description: "Pewarnaan sisi graf bipartit untuk jadwal guru-kelas" },
];

const COMPONENT_COLORS = [
  "#22d3ee", "#2dd4bf", "#a78bfa", "#f472b6",
  "#fb923c", "#facc15", "#4ade80", "#60a5fa",
  "#e879f9", "#34d399",
];

export default function Home() {
  const allCityPresets = useMemo(() => [...CITY_PRESETS, ALL_INDONESIA_PRESET], []);

  const [activeTab, setActiveTab] = useState<Operation>("dfs");
  const [numVertices, setNumVertices] = useState(5);
  const [edges, setEdges] = useState<number[][]>([[0, 1], [1, 2], [2, 3], [3, 4]]);
  const [startNode, setStartNode] = useState(0);
  const [nodeA, setNodeA] = useState(0);
  const [nodeB, setNodeB] = useState(4);
  const [grid, setGrid] = useState<string[]>(Array.from({ length: 5 }, () => "....."));
  const [timetabling, setTimetabling] = useState<TimetablingConfig>({
    teacherCount: 4,
    classCount: 5,
    requirements: [
      [2, 0, 1, 1, 0],
      [0, 1, 0, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 1, 2],
    ],
    limitedRooms: false,
    roomLimit: 2,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GraphResponse | null>(null);
  const [error, setError] = useState("");

  // Visualization state
  const [highlightNodes, setHighlightNodes] = useState<number[]>([]);
  const [highlightEdges, setHighlightEdges] = useState<number[][]>([]);
  const [componentColors, setComponentColors] = useState<Map<number, string>>(new Map());
  const [islandLabels, setIslandLabels] = useState<number[][] | undefined>();
  const [islandCount, setIslandCount] = useState<number | undefined>();
  const [bipartiteColors, setBipartiteColors] = useState<Map<number, string>>(new Map());
  const [cyclePathNodes, setCyclePathNodes] = useState<number[]>([]);
  const [diameterPath, setDiameterPath] = useState<number[]>([]);
  const [diameterLength, setDiameterLength] = useState<number | undefined>();
  const [girthValue, setGirthValue] = useState<number | undefined>();
  const [girthCycle, setGirthCycle] = useState<number[]>([]);
  const [mstEdges, setMstEdges] = useState<number[][]>([]);
  const [, setMstTotalWeight] = useState<number | undefined>();
  const [tspTour, setTspTour] = useState<number[]>([]);
  const [tspTourEdges, setTspTourEdges] = useState<number[][]>([]);
  const [tspTotalCost, setTspTotalCost] = useState<number | undefined>();
  const [tspStartNode, setTspStartNode] = useState<number | undefined>();
  const [tspMode, setTspMode] = useState<"edge" | "coordinate">("edge");
  const [coordinates, setCoordinates] = useState<{ x: number; y: number }[]>([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 50, y: 87 },
  ]);
  const [cityNames, setCityNames] = useState<string[]>([]);
  const [coordPreset, setCoordPreset] = useState("");
  const [graphPreset, setGraphPreset] = useState("");
  const [coordN, setCoordN] = useState(6);
  const [coordM, setCoordM] = useState(3);
  const [coordK, setCoordK] = useState(2);
  const [coordA1, setCoordA1] = useState(1);
  const [coordA2, setCoordA2] = useState(2);
  const [isWeightedMode, setIsWeightedMode] = useState(false);

  const [coordStructEdges, setCoordStructEdges] = useState<number[][]>([]);

  const coordDisplayEdges = useMemo(() => {
    if (activeTab !== "tsp_grasp_swap" || tspMode !== "coordinate") return [];
    if (coordStructEdges.length > 0) return coordStructEdges;
    const n = coordinates.length;
    const result: number[][] = [];
    const edgeSet = new Set<string>();
    const add = (u: number, v: number) => {
      if (u === v) return;
      const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        const dx = coordinates[u].x - coordinates[v].x;
        const dy = coordinates[u].y - coordinates[v].y;
        const w = Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
        result.push([u, v, w]);
      }
    };
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        add(i, j);
      }
    }
    return result;
  }, [activeTab, tspMode, coordinates, coordStructEdges]);

  const generateCoordPreset = () => {
    const preset = allCityPresets.find(p => p.id === coordPreset);
    if (preset) {
      const minLat = Math.min(...preset.cities.map(c => c.lat));
      const maxLat = Math.max(...preset.cities.map(c => c.lat));
      const minLng = Math.min(...preset.cities.map(c => c.lng));
      const maxLng = Math.max(...preset.cities.map(c => c.lng));
      const rangeX = maxLng - minLng || 1;
      const rangeY = maxLat - minLat || 1;
      const pts = preset.cities.map(c => ({
        x: Math.round(((c.lng - minLng) / rangeX) * 200 - 100) * 100 / 100,
        y: Math.round((1 - (c.lat - minLat) / rangeY) * 200 - 100) * 100 / 100,
      }));
      setCoordinates(pts);
      setCityNames(preset.cities.map(c => c.name));
      setCoordStructEdges([]);
      setStartNode(0);
      return;
    }

    let pts: { x: number; y: number }[] = [];
    const structEdges: number[][] = [];
    const R = 100;
    const n = coordN;

    const poly = (i: number, total: number, cx = 0, cy = 0, r = R) => ({
      x: Math.round((cx + r * Math.cos((2 * Math.PI * i) / total - Math.PI / 2)) * 100) / 100,
      y: Math.round((cy + r * Math.sin((2 * Math.PI * i) / total - Math.PI / 2)) * 100) / 100,
    });

    const add = (u: number, v: number) => {
      if (u === v || u < 0 || v < 0) return;
      const dx = pts[u].x - pts[v].x;
      const dy = pts[u].y - pts[v].y;
      const w = Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
      structEdges.push([u, v, w]);
    };

    switch (graphPreset) {
      case "complete":
        pts = Array.from({ length: n }, (_, i) => poly(i, n));
        for (let i = 0; i < pts.length; i++)
          for (let j = i + 1; j < pts.length; j++) add(i, j);
        break;
      case "completeBipartite": {
        const m = coordM;
        for (let i = 0; i < m; i++) pts.push({ x: -60, y: Math.round((i - (m - 1) / 2) * 60 * 100) / 100 });
        for (let i = 0; i < n; i++) pts.push({ x: 60, y: Math.round((i - (n - 1) / 2) * 60 * 100) / 100 });
        for (let i = 0; i < m; i++)
          for (let j = m; j < pts.length; j++) add(i, j);
        break;
      }
      case "tree":
        pts = Array.from({ length: n }, (_, i) => {
          if (i === 0) return { x: 0, y: 0 };
          const yOff = (Math.floor(Math.log2(i + 1)) + 1) * 60;
          const siblings = 1 << Math.floor(Math.log2(i + 1));
          const idxInLevel = i - siblings;
          const spread = (siblings > 1 ? 200 / (siblings - 1) : 0);
          return {
            x: Math.round((idxInLevel * spread - 100) * 100) / 100,
            y: Math.round(yOff * 100) / 100,
          };
        });
        for (let i = 1; i < pts.length; i++) add(Math.floor((i - 1) / 2), i);
        break;
      case "cycle":
        pts = Array.from({ length: n }, (_, i) => poly(i, n));
        for (let i = 0; i < pts.length; i++) add(i, (i + 1) % pts.length);
        break;
      case "path":
        pts = Array.from({ length: n }, (_, i) => ({
          x: Math.round((i * (200 / Math.max(1, n - 1)) - 100) * 100) / 100,
          y: 0,
        }));
        for (let i = 0; i < pts.length - 1; i++) add(i, i + 1);
        break;
      case "wheel": {
        pts.push({ x: 0, y: 0 });
        for (let i = 0; i < n; i++) pts.push(poly(i, n));
        for (let i = 1; i < pts.length; i++) add(0, i);
        for (let i = 1; i < pts.length; i++) add(i, i < pts.length - 1 ? i + 1 : 1);
        break;
      }
      case "prism": {
        const half = n;
        for (let i = 0; i < half; i++) pts.push(poly(i, half, 0, 0, R));
        for (let i = 0; i < half; i++) pts.push(poly(i, half, 0, 0, R * 0.6));
        for (let i = 0; i < half; i++) {
          add(i, (i + 1) % half);
          add(i + half, ((i + 1) % half) + half);
          add(i, i + half);
        }
        break;
      }
      case "petersen": {
        for (let i = 0; i < 5; i++) pts.push(poly(i, 5, 0, 0, R));
        for (let i = 0; i < 5; i++) {
          const a = (4 * Math.PI * i) / 5 - Math.PI / 2;
          pts.push({
            x: Math.round(R * 0.4 * Math.cos(a) * 100) / 100,
            y: Math.round(R * 0.4 * Math.sin(a) * 100) / 100,
          });
        }
        for (let i = 0; i < 5; i++) {
          add(i, (i + 1) % 5);
          add(i, i + 5);
          add(i + 5, ((i + 2) % 5) + 5);
        }
        break;
      }
      case "generalizedPetersen":
        for (let i = 0; i < n; i++) pts.push(poly(i, n, 0, 0, R));
        for (let i = 0; i < n; i++) pts.push(poly(i, n, 0, 0, R * 0.45));
        for (let i = 0; i < n; i++) {
          add(i, (i + 1) % n);
          add(i, i + n);
          add(i + n, ((i + coordK) % n) + n);
        }
        break;
      case "circulant":
        pts = Array.from({ length: n }, (_, i) => poly(i, n));
        for (let i = 0; i < n; i++) {
          add(i, (i + coordA1) % n);
          add(i, (i + coordA2) % n);
        }
        break;
      case "hypercube": {
        const dim = Math.max(1, Math.min(coordN, 6));
        const total = 1 << dim;
        const spacing = 200 / Math.max(1, dim);
        for (let i = 0; i < total; i++) {
          if (dim <= 1) {
            pts.push({ x: i * 200 - 100, y: 0 });
          } else if (dim <= 2) {
            pts.push({ x: ((i & 1) * 2 - 1) * 80, y: ((i >> 1 & 1) * 2 - 1) * 80 });
          } else {
            const col = i & ((1 << (dim / 2)) - 1 || 1);
            const row = i >> Math.floor(dim / 2);
            pts.push({
              x: Math.round((col - (1 << Math.floor(dim / 2)) / 2) * spacing * 100) / 100,
              y: Math.round((row - (1 << Math.ceil(dim / 2)) / 2) * spacing * 100) / 100,
            });
          }
        }
        for (let i = 0; i < total; i++) {
          for (let b = 0; b < dim; b++) {
            const j = i ^ (1 << b);
            if (j > i) add(i, j);
          }
        }
        break;
      }
      case "grid": {
        const m = coordM;
        const cols = n;
        for (let r = 0; r < m; r++) {
          for (let c = 0; c < cols; c++) {
            pts.push({
              x: Math.round((c * 50 - (cols - 1) * 25) * 100) / 100,
              y: Math.round((r * 50 - (m - 1) * 25) * 100) / 100,
            });
          }
        }
        for (let r = 0; r < m; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            if (c + 1 < cols) add(idx, idx + 1);
            if (r + 1 < m) add(idx, idx + cols);
          }
        }
        break;
      }
      default:
        return;
    }
    setCoordinates(pts);
    setCityNames([]);
    setCoordStructEdges(structEdges);
    setStartNode(0);
  };

  const animationRef = useRef<NodeJS.Timeout[]>([]);

  const clearAnimations = () => {
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];
  };



  const handleGraphChange = useCallback((nv: number, e: number[][]) => {
    setNumVertices(nv);
    setEdges(e);
    setIsWeightedMode(e.some((edge) => edge[2] !== undefined));
  }, []);

  const handleFileLoaded = useCallback((nv: number, e: number[][], weighted: boolean) => {
    setNumVertices(nv);
    setEdges(e);
    setIsWeightedMode(weighted);
  }, []);

  const runOperation = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setHighlightNodes([]);
    setHighlightEdges([]);
    setComponentColors(new Map());
    setIslandLabels(undefined);
    setIslandCount(undefined);
    setBipartiteColors(new Map());
    setCyclePathNodes([]);
    setDiameterPath([]);
    setDiameterLength(undefined);
    setGirthValue(undefined);
    setGirthCycle([]);
    setMstEdges([]);
    setMstTotalWeight(undefined);
    setTspTour([]);
    setTspTourEdges([]);
    setTspTotalCost(undefined);
    setTspStartNode(undefined);
    clearAnimations();

    const body: GraphRequest = { operation: activeTab };

    if (activeTab === "timetabling_edge_coloring") {
      body.teacherCount = timetabling.teacherCount;
      body.classCount = timetabling.classCount;
      body.requirements = timetabling.requirements;
      if (timetabling.limitedRooms) {
        body.roomLimit = timetabling.roomLimit;
      }
    } else if (activeTab === "tsp_grasp_swap") {
      body.mode = tspMode;
      body.startNode = startNode;
      if (tspMode === "coordinate") {
        body.coordinates = coordinates;
      } else {
        body.numVertices = numVertices;
        body.edges = edges;
      }
    } else if (activeTab !== "count_islands") {
      body.numVertices = numVertices;
      body.edges = edges;
    }

    if (activeTab === "dfs" || activeTab === "bfs") {
      body.startNode = startNode;
    } else if (activeTab === "check_path" || activeTab === "shortest_path") {
      body.nodeA = nodeA;
      body.nodeB = nodeB;
    } else if (activeTab === "count_islands") {
      body.grid = grid;
    }

    try {
      let data: GraphResponse;
      const callApiRoute = async () => {
        const res = await fetch("/api/graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return (await res.json()) as GraphResponse;
      };

      try {
        data = await callWasmEngine(body);
        if (
          (activeTab === "maximum_bipartite_matching" || activeTab === "timetabling_edge_coloring") &&
          !data.success &&
          (data.error || "").toLowerCase().includes("operasi tidak dikenal")
        ) {
          data = await callApiRoute();
        }
      } catch {
        data = await callApiRoute();
      }

      if (!data.success) {
        setError(data.error || "Unknown error from engine");
        setLoading(false);
        return;
      }

      setResult(data);

      // Apply visualization based on operation
      if ((activeTab === "dfs" || activeTab === "bfs") && data.traversal) {
        // Step-by-step traversal animation
        const traversal = data.traversal as number[];
        traversal.forEach((node: number, i: number) => {
          const t = setTimeout(() => {
            setHighlightNodes((prev) => [...prev, node]);
          }, i * 300);
          animationRef.current.push(t);
        });
      } else if (activeTab === "check_path" && data.path) {
        const p = data.path as number[];
        setHighlightNodes(p);
        const pathEdges: number[][] = [];
        for (let i = 0; i < p.length - 1; i++) {
          pathEdges.push([p[i], p[i + 1]]);
        }
        setHighlightEdges(pathEdges);
      } else if (activeTab === "check_connectivity") {
        if (data.connected) {
          setHighlightNodes(Array.from({ length: numVertices }, (_, i) => i));
        }
      } else if ((activeTab === "count_components" || activeTab === "largest_component") && data.components) {
        const comps = data.components as number[][];
        const colorMap = new Map<number, string>();
        comps.forEach((comp: number[], idx: number) => {
          const color = COMPONENT_COLORS[idx % COMPONENT_COLORS.length];
          comp.forEach((node: number) => colorMap.set(node, color));
        });
        setComponentColors(colorMap);
        setHighlightNodes(Array.from({ length: numVertices }, (_, i) => i));

        if (activeTab === "largest_component" && data.largestNodes) {
          // Pulse largest after short delay
          const t = setTimeout(() => {
            setHighlightNodes(data.largestNodes as number[]);
          }, 1500);
          animationRef.current.push(t);
        }
      } else if (activeTab === "count_islands") {
        setIslandLabels(data.labels as number[][]);
        setIslandCount(data.count as number);
      } else if (activeTab === "check_bipartite") {
        const bipartiteColorMap = new Map<number, string>();
        const partA = (data.partitionA as number[]) || [];
        const partB = (data.partitionB as number[]) || [];
        
        partA.forEach((node: number) => bipartiteColorMap.set(node, "#06b6d4")); // cyan
        partB.forEach((node: number) => bipartiteColorMap.set(node, "#a78bfa")); // violet
        
        setBipartiteColors(bipartiteColorMap);
        setHighlightNodes(Array.from({ length: numVertices }, (_, i) => i));
      } else if (activeTab === "maximum_bipartite_matching") {
        const bipartiteColorMap = new Map<number, string>();
        const partA = (data.partitionA as number[]) || [];
        const partB = (data.partitionB as number[]) || [];
        const matching = (data.matchingEdges as number[][]) || [];

        partA.forEach((node: number) => bipartiteColorMap.set(node, "#06b6d4"));
        partB.forEach((node: number) => bipartiteColorMap.set(node, "#a78bfa"));

        setBipartiteColors(bipartiteColorMap);
        setHighlightEdges(matching.map(([u, v]) => [u, v]));
        setHighlightNodes(Array.from(new Set(matching.flatMap(([u, v]) => [u, v]))));
      } else if (activeTab === "check_cycle") {
        if (data.hasCycle && data.cyclePath) {
          const cycle = data.cyclePath as number[];
          setCyclePathNodes(cycle);
          setHighlightNodes(cycle);
          
          // Highlight edges in the cycle
          const cycleEdges: number[][] = [];
          for (let i = 0; i < cycle.length; i++) {
            const nextIdx = (i + 1) % cycle.length;
            cycleEdges.push([cycle[i], cycle[nextIdx]]);
          }
          setHighlightEdges(cycleEdges);
        }
      } else if (activeTab === "diameter") {
        if (data.path) {
          const path = data.path as number[];
          setDiameterPath(path);
          setHighlightNodes(path);
          const diaEdges: number[][] = [];
          for (let i = 0; i < path.length - 1; i++) {
            diaEdges.push([path[i], path[i + 1]]);
          }
          setHighlightEdges(diaEdges);
          setDiameterLength(data.diameter as number);
        }
      } else if (activeTab === "girth") {
        if (data.girth && data.girth > 0 && data.cycle) {
          const cycle = data.cycle as number[];
          setGirthValue(data.girth as number);
          setGirthCycle(cycle);
          setHighlightNodes(cycle);
          const girthEdges: number[][] = [];
          for (let i = 0; i < cycle.length; i++) {
            const nextIdx = (i + 1) % cycle.length;
            girthEdges.push([cycle[i], cycle[nextIdx]]);
          }
          setHighlightEdges(girthEdges);
        }
      } else if (activeTab === "shortest_path") {
        if (data.reachable && data.path) {
          const p = data.path as number[];
          setHighlightNodes(p);
          const pathEdges: number[][] = [];
          for (let i = 0; i < p.length - 1; i++) {
            pathEdges.push([p[i], p[i + 1]]);
          }
          setHighlightEdges(pathEdges);
        }
      } else if (activeTab === "min_spanning_tree") {
        if (data.mstEdges) {
          const mst = data.mstEdges as number[][];
          setMstEdges(mst);
          setMstTotalWeight(data.totalWeight as number);
          const mstNodes = new Set<number>();
          mst.forEach(([u, v]) => { mstNodes.add(u); mstNodes.add(v); });
          setHighlightNodes(Array.from(mstNodes));
          setHighlightEdges(mst.map(([u, v]) => [u, v]));
        }
      } else if (activeTab === "tsp_grasp_swap") {
        if (data.feasible && data.tour && data.tourEdges) {
          const tour = data.tour as number[];
          const tourEdges = data.tourEdges as number[][];
          setTspTour(tour);
          setTspTourEdges(tourEdges);
          setTspTotalCost(data.totalCost as number);
          setTspStartNode(data.startNode as number);
          setHighlightNodes(Array.from(new Set(tour)));
          setHighlightEdges(tourEdges.map(([u, v]) => [u, v]));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to call API");
    } finally {
      setLoading(false);
    }
  };

  const isTimetabling = activeTab === "timetabling_edge_coloring";
  const isGraphOp = activeTab !== "count_islands" && !isTimetabling;
  const needsStart = activeTab === "dfs" || activeTab === "bfs" || activeTab === "tsp_grasp_swap";
  const needsAB = activeTab === "check_path" || activeTab === "shortest_path";
  const needsWeightedHint = activeTab === "shortest_path" || activeTab === "min_spanning_tree" || (activeTab === "tsp_grasp_swap" && tspMode === "edge");
  const isWeightedGraph = isWeightedMode || edges.some((edge) => edge[2] !== undefined);

  const renderResult = () => {
    if (error) {
      return (
        <div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      );
    }
    if (!result) {
      return <p className="text-white/30 text-sm italic">Klik &quot;Run&quot; untuk menjalankan algoritma.</p>;
    }

    switch (activeTab) {
      case "dfs":
      case "bfs":
        return (
          <div className="space-y-2">
            <p className="text-white/60 text-xs uppercase tracking-wide">Traversal Order</p>
            <div className="flex flex-wrap gap-1.5">
              {((result.traversal as number[]) || []).map((node: number, i: number) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 300 }}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-sm font-mono font-semibold"
                >
                  {node}
                </motion.span>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-2">
              Visited {((result.traversal as number[]) || []).length} / {numVertices} nodes
            </p>
          </div>
        );

      case "check_path":
        return (
          <div className="space-y-2">
            {result.found ? (
              <>
                <div className="flex items-center gap-2 text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold">Path found!</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {((result.path as number[]) || []).map((node: number, i: number) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-sm font-mono">
                        {node}
                      </span>
                      {i < ((result.path as number[]) || []).length - 1 && (
                        <span className="text-white/30">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="font-semibold">No path exists from {nodeA} to {nodeB}</span>
              </div>
            )}
          </div>
        );

      case "check_connectivity":
        return (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 ${result.connected ? "text-emerald-400" : "text-amber-400"}`}>
              <span className={`w-3 h-3 rounded-full ${result.connected ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="font-semibold text-lg">
                {result.connected ? "Graf TERHUBUNG" : "Graf TIDAK TERHUBUNG"}
              </span>
            </div>
            {result.reachable && (
              <p className="text-white/50 text-sm">
                Total {result.total as number} node dalam graf
              </p>
            )}
          </div>
        );

      case "count_components":
        return (
          <div className="space-y-3">
            <p className="text-white/60 text-xs uppercase tracking-wide">
              Ditemukan <span className="text-cyan-300 font-bold text-lg">{result.count as number}</span> komponen
            </p>
            {((result.components as number[][]) || []).map((comp: number[], i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COMPONENT_COLORS[i % COMPONENT_COLORS.length] }}
                />
                <span className="text-white/50 text-xs">K{i + 1}:</span>
                <div className="flex flex-wrap gap-1">
                  {comp.map((node: number) => (
                    <span
                      key={node}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono"
                      style={{
                        backgroundColor: COMPONENT_COLORS[i % COMPONENT_COLORS.length] + "25",
                        borderColor: COMPONENT_COLORS[i % COMPONENT_COLORS.length] + "50",
                        borderWidth: 1,
                        color: COMPONENT_COLORS[i % COMPONENT_COLORS.length],
                      }}
                    >
                      {node}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case "largest_component":
        return (
          <div className="space-y-3">
            <p className="text-white/60 text-xs uppercase tracking-wide">
              Total komponen: {result.count as number}
            </p>
            <div className="glass p-4 border-cyan-400/30">
              <p className="text-cyan-300 font-semibold mb-2">
                Komponen Terbesar (K{(result.largestIndex as number) + 1}) — {result.largestSize as number} nodes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {((result.largestNodes as number[]) || []).map((node: number) => (
                  <span key={node} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-sm font-mono font-semibold">
                    {node}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case "count_islands":
        return (
          <div className="space-y-2">
            <p className="text-white/60 text-xs uppercase tracking-wide">
              Total islands: <span className="text-cyan-300 font-bold text-lg">{result.count as number}</span>
            </p>
            <p className="text-white/40 text-xs">
              Setiap warna pada grid merepresentasikan satu island yang berbeda.
            </p>
          </div>
        );

      case "check_bipartite":
        return (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-lg font-semibold ${result.isBipartite ? "text-emerald-400" : "text-amber-400"}`}>
              {result.isBipartite ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Graf BIPARTITE ✓</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Bukan Graf Bipartite</span>
                </>
              )}
            </div>

            {result.isBipartite && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass p-3 border border-cyan-400/30">
                    <p className="text-cyan-300 font-semibold text-sm mb-2">Partisi A</p>
                    <div className="flex flex-wrap gap-1.5">
                      {((result.partitionA as number[]) || []).map((node: number) => (
                        <span key={node} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 text-sm font-mono font-semibold">
                          {node}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="glass p-3 border border-violet-400/30">
                    <p className="text-violet-300 font-semibold text-sm mb-2">Partisi B</p>
                    <div className="flex flex-wrap gap-1.5">
                      {((result.partitionB as number[]) || []).map((node: number) => (
                        <span key={node} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-400/20 border border-violet-400/40 text-violet-300 text-sm font-mono font-semibold">
                          {node}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-white/40 text-xs">
                  Semua edge hanya terhubung antara Partisi A dan Partisi B (tidak ada edge dalam partisi yang sama)
                </p>
              </div>
            )}
          </div>
        );

      case "maximum_bipartite_matching":
        return (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-lg font-semibold ${result.isBipartite ? "text-emerald-400" : "text-amber-400"}`}>
              {result.isBipartite ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Matching maksimum ditemukan</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Graf bukan bipartit</span>
                </>
              )}
            </div>

            {result.isBipartite ? (
              <>
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Ukuran Matching</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-emerald-300">{result.matchingSize as number}</p>
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-white/50">
                    Pasangan edge terpilih ({((result.matchingEdges as number[][]) || []).length})
                  </p>
                  <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                    {((result.matchingEdges as number[][]) || []).map(([u, v], i) => (
                      <motion.div
                        key={`${u}-${v}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.18 }}
                        className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs font-mono"
                      >
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                          {i + 1}
                        </span>
                        <span className="text-cyan-400">{u}</span>
                        <span className="text-white/25">{"<->"}</span>
                        <span className="text-violet-300">{v}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {(((result.unmatchedA as number[]) || []).length > 0 || ((result.unmatchedB as number[]) || []).length > 0) && (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-white/60">
                    <p className="font-semibold text-amber-300">Node tidak terpilih</p>
                    <p className="mt-1 text-xs">
                      {[...((result.unmatchedA as number[]) || []), ...((result.unmatchedB as number[]) || [])].join(", ") || "-"}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-white/45">
                Maximum bipartite matching hanya dapat dijalankan pada graf bipartit. Gunakan generator graf bipartit lengkap atau hapus edge yang membuat konflik partisi.
              </p>
            )}
          </div>
        );

      case "timetabling_edge_coloring": {
        const assignments = result.assignments ?? [];
        const periodCount = result.periodCount ?? 0;
        const schedule = Array.from({ length: timetabling.teacherCount }, () =>
          Array.from({ length: periodCount }, () => "")
        );

        assignments.forEach((assignment) => {
          if (schedule[assignment.teacher]?.[assignment.period] !== undefined) {
            schedule[assignment.teacher][assignment.period] = `Y${assignment.class + 1}`;
          }
        });

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Periode</p>
                <p className="mt-1 font-mono text-2xl font-bold text-cyan-300">{periodCount}</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Delta</p>
                <p className="mt-1 font-mono text-2xl font-bold text-emerald-300">{result.delta ?? 0}</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Total</p>
                <p className="mt-1 font-mono text-2xl font-bold text-amber-300">{result.totalLessons ?? 0}</p>
              </div>
              <div className="rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Ruangan</p>
                <p className="mt-1 font-mono text-2xl font-bold text-violet-300">{result.roomLimit ?? "All"}</p>
              </div>
            </div>

            {(result.periodSizes ?? []).length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Ukuran matching per periode</p>
                <div className="flex flex-wrap gap-1.5">
                  {(result.periodSizes ?? []).map((size, period) => (
                    <span
                      key={period}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs"
                    >
                      <span className="font-mono text-cyan-200">P{period + 1}</span>
                      <span className="text-white/35">=</span>
                      <span className="font-mono text-white/75">{size}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-auto rounded-xl border border-white/[0.08]">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-white/[0.04]">
                    <th className="sticky left-0 z-10 bg-[#0b1220] px-3 py-2 text-left text-xs font-semibold text-white/45">
                      Guru
                    </th>
                    {Array.from({ length: periodCount }, (_, period) => (
                      <th key={period} className="px-3 py-2 text-center text-xs font-semibold text-cyan-100/70">
                        P{period + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row, teacher) => (
                    <tr key={teacher} className="border-t border-white/[0.06]">
                      <th className="sticky left-0 z-10 bg-[#0b1220] px-3 py-2 text-left text-xs font-semibold text-cyan-200/70">
                        X{teacher + 1}
                      </th>
                      {row.map((classLabel, period) => (
                        <td key={period} className="px-3 py-2 text-center">
                          {classLabel ? (
                            <span className="inline-flex min-w-10 justify-center rounded-lg border border-violet-400/25 bg-violet-400/15 px-2 py-1 font-mono text-violet-100">
                              {classLabel}
                            </span>
                          ) : (
                            <span className="text-white/18">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case "check_cycle":
        return (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-lg font-semibold ${result.hasCycle ? "text-amber-400" : "text-emerald-400"}`}>
              {result.hasCycle ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Graf Memiliki CYCLE</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Graf Tidak Memiliki Cycle</span>
                </>
              )}
            </div>

            {result.hasCycle && result.cyclePath && (
              <div className="glass p-4 border-amber-400/30">
                <p className="text-amber-300 font-semibold text-sm mb-2">Cycle Path:</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {((result.cyclePath as number[]) || []).map((node: number, i: number) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 text-sm font-mono font-semibold">
                        {node}
                      </span>
                      {i < ((result.cyclePath as number[]) || []).length - 1 && (
                        <span className="text-amber-400/60">→</span>
                      )}
                    </span>
                  ))}
                  {(result.cyclePath as number[])?.length > 0 && (
                    <span className="text-amber-400/60">↻</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case "diameter":
        return (
          <div className="space-y-3">
            <p className="text-white/60 text-xs uppercase tracking-wide">
              Diameter graf: <span className="text-green-300 font-bold text-lg">{diameterLength ?? 0}</span>
            </p>
            {diameterPath.length > 0 && (
              <>
                <p className="text-white/40 text-xs">
                  Jalur mulai dari <span className="font-mono font-semibold">{diameterPath[0]}</span> ke <span className="font-mono font-semibold">{diameterPath[diameterPath.length - 1]}</span>
                </p>
                <div className="glass p-4 border-green-400/30">
                  <p className="text-green-300 font-semibold text-sm mb-2">Path terpanjang:</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {diameterPath.map((node: number, i: number) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-green-400/20 border border-green-400/40 text-green-300 text-sm font-mono font-semibold">
                          {node}
                        </span>
                        {i < diameterPath.length - 1 && (
                          <span className="text-green-400/60">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case "girth":
        return (
          <div className="space-y-3">
            {girthValue && girthValue > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-xs uppercase tracking-wide">Girth (cycle terpendek):</span>
                  <span className="text-pink-300 font-bold text-lg">{girthValue}</span>
                </div>
                {girthCycle.length > 0 && (
                  <div className="glass p-4 border-pink-400/30">
                    <p className="text-pink-300 font-semibold text-sm mb-2">Cycle:</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {girthCycle.map((node: number, i: number) => (
                        <span key={i} className="flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-pink-400/20 border border-pink-400/40 text-pink-300 text-sm font-mono font-semibold">
                            {node}
                          </span>
                          {i < girthCycle.length - 1 && (
                            <span className="text-pink-400/60">→</span>
                          )}
                        </span>
                      ))}
                      {girthCycle.length > 0 && (
                        <span className="text-pink-400/60">↻</span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-cyan-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Graf tidak memiliki cycle</span>
              </div>
            )}
          </div>
        );

      case "shortest_path":
        return (
          <div className="space-y-2">
            {result.reachable ? (
              <>
                <div className="flex items-center gap-2 text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold">Path ditemukan!</span>
                </div>
                <p className="text-white/60 text-xs">
                  Jarak terpendek: <span className="text-amber-400 font-mono font-bold">{result.distance as number}</span>
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  {((result.path as number[]) || []).map((node: number, i: number) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-sm font-mono">
                        {node}
                      </span>
                      {i < ((result.path as number[]) || []).length - 1 && (
                        <span className="text-white/30">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="font-semibold">Tidak ada jalur dari {nodeA} ke {nodeB}</span>
              </div>
            )}
          </div>
        );

      case "min_spanning_tree":
        return (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 ${result.connected ? "text-emerald-400" : "text-amber-400"}`}>
              <span className="font-semibold">{result.connected ? "MST berhasil dibuat" : "Graf tidak terhubung — Forest MST"}</span>
            </div>
            <p className="text-white/60 text-xs">
              Total bobot: <span className="text-amber-400 font-mono font-bold">{result.totalWeight as number}</span>
            </p>
            <p className="text-white/50 text-xs uppercase tracking-wide mt-2">Edge MST ({(result.mstEdges as number[][])?.length || 0})</p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {((result.mstEdges as number[][]) || []).map(([u, v, w], i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="flex items-center gap-2 text-xs font-mono bg-white/[0.03] rounded px-2 py-1"
                >
                  <span className="text-cyan-400">{u}</span>
                  <span className="text-white/30">↔</span>
                  <span className="text-teal-400">{v}</span>
                  {w !== undefined && (
                    <span className="text-amber-400/70 ml-auto">w={w}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        );

      case "tsp_grasp_swap":
        return (
          <div className="space-y-3">
            {result.feasible ? (
              <>
                <div className="rounded-xl border border-orange-400/20 bg-orange-400/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Total Cost</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-orange-300">{tspTotalCost ?? 0}</p>
                </div>

                <div className="glass border border-orange-400/20 p-4">
                  <p className="mb-3 text-sm font-semibold text-orange-300">Jalur hasil TSP GRASP+Swap</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tspTour.map((node: number, i: number) => (
                      <span key={`${node}-${i}`} className="flex items-center gap-1.5">
                        <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-mono font-semibold ${
                          i === 0
                            ? "border-orange-400/40 bg-orange-400/20 text-orange-300"
                            : i === tspTour.length - 1
                            ? "border-rose-400/30 bg-rose-400/15 text-rose-200"
                            : "border-orange-400/30 bg-orange-400/15 text-orange-300"
                        }`}>
                          {node}
                        </span>
                        {i < tspTour.length - 1 && (
                          <span className="text-orange-300/70">{">"}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Tour edges</p>
                  <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                    {tspTourEdges.map(([u, v, w], i) => (
                      <motion.div
                        key={`${u}-${v}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.18 }}
                        className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs font-mono"
                      >
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-400/15 text-orange-300">
                          {i + 1}
                        </span>
                        <span className="text-cyan-400">{u}</span>
                        <span className="text-white/25">{">"}</span>
                        <span className="text-teal-400">{v}</span>
                        <span className="ml-auto text-amber-400/80">w={typeof w === "number" ? w.toFixed(2) : w}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-white/40">
                  GRASP (Greedy Randomized Adaptive Search Procedure) membangun solusi awal secara greedy-random, lalu diperbaiki dengan 2-opt Swap.
                </p>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 3c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
                  </svg>
                  <span className="font-semibold">Tour TSP tidak ditemukan</span>
                </div>
                <p className="text-sm text-white/45">
                  {tspMode === "coordinate"
                    ? "Tidak dapat membentuk tour dari koordinat yang diberikan. Pastikan minimal ada 2 node."
                    : "Graph ini belum membentuk Hamiltonian cycle yang valid. Coba lengkapi edge antar node."}
                </p>
              </div>
            )}
          </div>
        );

    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pt-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Graph Theory{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Visualizer
          </span>
        </h1>
      </div>

      {/* Operation Tabs */}
      <div className="glass p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Tugas 1 */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0 }}
          >
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 px-1">Tugas 1 — Traversal &amp; Analysis</p>
            <div className="flex flex-wrap gap-1.5">
              {TABS.filter((t) => t.group === "tugas1").map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setResult(null);
                    setError("");
                    setHighlightNodes([]);
                    setHighlightEdges([]);
                    setComponentColors(new Map());
                    setIslandLabels(undefined);
                    setIslandCount(undefined);
                    setBipartiteColors(new Map());
                    setCyclePathNodes([]);
                    setTspTour([]);
                    setTspTourEdges([]);
                    setTspTotalCost(undefined);
                    setTspStartNode(undefined);
                    clearAnimations();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-cyan-400/15 border border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                      : "glass-btn text-white/60 hover:text-white/90"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tugas 2 */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 px-1">Tugas 2 — Components &amp; Islands</p>
            <div className="flex flex-wrap gap-1.5">
              {TABS.filter((t) => t.group === "tugas2").map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setResult(null);
                    setError("");
                    setHighlightNodes([]);
                    setHighlightEdges([]);
                    setComponentColors(new Map());
                    setIslandLabels(undefined);
                    setIslandCount(undefined);
                    setBipartiteColors(new Map());
                    setCyclePathNodes([]);
                    setTspTour([]);
                    setTspTourEdges([]);
                    setTspTotalCost(undefined);
                    setTspStartNode(undefined);
                    clearAnimations();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-teal-400/15 border border-teal-400/40 text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.12)]"
                      : "glass-btn text-white/60 hover:text-white/90"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tugas 3 */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.16 }}
          >
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 px-1">Tugas 3 — Advanced Checks</p>
            <div className="flex flex-wrap gap-1.5">
              {TABS.filter((t) => t.group === "tugas3").map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setResult(null);
                    setError("");
                    setHighlightNodes([]);
                    setHighlightEdges([]);
                    setComponentColors(new Map());
                    setIslandLabels(undefined);
                    setIslandCount(undefined);
                    setBipartiteColors(new Map());
                    setCyclePathNodes([]);
                    setDiameterPath([]);
                    setDiameterLength(undefined);
                    setGirthValue(undefined);
                    setGirthCycle([]);
                    setTspTour([]);
                    setTspTourEdges([]);
                    setTspTotalCost(undefined);
                    setTspStartNode(undefined);
                    clearAnimations();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? tab.id === "diameter"
                        ? "bg-green-400/15 border border-green-400/40 text-green-300 shadow-[0_0_12px_rgba(74,222,128,0.12)]"
                        : tab.id === "girth"
                        ? "bg-pink-400/15 border border-pink-400/40 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.12)]"
                        : "bg-violet-400/15 border border-violet-400/40 text-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.12)]"
                      : "glass-btn text-white/60 hover:text-white/90"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tugas 4 */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.24 }}
          >
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 px-1">Tugas 4 — Weighted Graph</p>
            <div className="flex flex-wrap gap-1.5">
              {TABS.filter((t) => t.group === "tugas4").map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setResult(null);
                    setError("");
                    setHighlightNodes([]);
                    setHighlightEdges([]);
                    setComponentColors(new Map());
                    setIslandLabels(undefined);
                    setIslandCount(undefined);
                    setBipartiteColors(new Map());
                    setCyclePathNodes([]);
                    setDiameterPath([]);
                    setDiameterLength(undefined);
                    setGirthValue(undefined);
                    setGirthCycle([]);
                    setMstEdges([]);
                    setMstTotalWeight(undefined);
                    setTspTour([]);
                    setTspTourEdges([]);
                    setTspTotalCost(undefined);
                    setTspStartNode(undefined);
                    clearAnimations();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-amber-400/15 border border-amber-400/40 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.12)]"
                      : "glass-btn text-white/60 hover:text-white/90"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tugas 5 */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.32 }}
          >
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 px-1">Tugas 5 â€” Routing Heuristic</p>
            <div className="flex flex-wrap gap-1.5">
              {TABS.filter((t) => t.group === "tugas5").map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setResult(null);
                    setError("");
                    setHighlightNodes([]);
                    setHighlightEdges([]);
                    setComponentColors(new Map());
                    setIslandLabels(undefined);
                    setIslandCount(undefined);
                    setBipartiteColors(new Map());
                    setCyclePathNodes([]);
                    setDiameterPath([]);
                    setDiameterLength(undefined);
                    setGirthValue(undefined);
                    setGirthCycle([]);
                    setMstEdges([]);
                    setMstTotalWeight(undefined);
                    setTspTour([]);
                    setTspTourEdges([]);
                    setTspTotalCost(undefined);
                    setTspStartNode(undefined);
                    clearAnimations();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-rose-400/15 border border-rose-400/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.16)]"
                      : "glass-btn text-white/60 hover:text-white/90"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tugas 6 */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2 px-1">Tugas 6 - Matching</p>
            <div className="flex flex-wrap gap-1.5">
              {TABS.filter((t) => t.group === "tugas6").map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setResult(null);
                    setError("");
                    setHighlightNodes([]);
                    setHighlightEdges([]);
                    setComponentColors(new Map());
                    setIslandLabels(undefined);
                    setIslandCount(undefined);
                    setBipartiteColors(new Map());
                    setCyclePathNodes([]);
                    setDiameterPath([]);
                    setDiameterLength(undefined);
                    setGirthValue(undefined);
                    setGirthCycle([]);
                    setMstEdges([]);
                    setMstTotalWeight(undefined);
                    setTspTour([]);
                    setTspTourEdges([]);
                    setTspTotalCost(undefined);
                    setTspStartNode(undefined);
                    clearAnimations();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-emerald-400/15 border border-emerald-400/40 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.16)]"
                      : "glass-btn text-white/60 hover:text-white/90"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Description */}
        <p className="text-white/40 text-xs mt-3 px-1">
          {TABS.find((t) => t.id === activeTab)?.description}
        </p>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          {isTimetabling ? (
            <TimetablingInput
              value={timetabling}
              onChange={(next) => {
                setTimetabling(next);
                setResult(null);
                setError("");
              }}
            />
          ) : isGraphOp ? (
            <>
              {activeTab === "tsp_grasp_swap" && (
                <div className="glass p-4">
                  <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">TSP Input Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTspMode("edge")}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        tspMode === "edge"
                          ? "bg-cyan-400/15 border border-cyan-400/40 text-cyan-300"
                          : "glass-btn text-white/50 hover:text-white/80"
                      }`}
                    >
                      Edge List
                    </button>
                    <button
                      onClick={() => setTspMode("coordinate")}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        tspMode === "coordinate"
                          ? "bg-cyan-400/15 border border-cyan-400/40 text-cyan-300"
                          : "glass-btn text-white/50 hover:text-white/80"
                      }`}
                    >
                      Koordinat
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "tsp_grasp_swap" && tspMode === "coordinate" ? (
                <div className="glass p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white/90">Koordinat Node</h3>
                    <span className="text-xs text-white/40 font-mono bg-white/[0.05] px-2 py-1 rounded">
                      {coordinates.length} node
                    </span>
                  </div>

                  {/* Coordinate Preset */}
                  <div className="space-y-2">
                    <label className="block text-xs text-white/50 uppercase tracking-wider">Preset Kota / Kabupaten</label>
                    <div className="flex gap-2">
                      <select
                        value={allCityPresets.some(p => p.id === coordPreset) ? coordPreset : ""}
                        onChange={(e) => {
                          setCoordPreset(e.target.value);
                          setGraphPreset("");
                        }}
                        className="glass-input flex-1 text-sm text-white/80"
                      >
                        <option value="">Pilih kota/kabupaten...</option>
                        <option value={ALL_INDONESIA_PRESET.id}>{ALL_INDONESIA_PRESET.label}</option>
                        {(() => {
                          const groups = [...new Set(CITY_PRESETS.map(p => p.group))];
                          return groups.map(g => (
                            <optgroup key={g} label={g}>
                              {CITY_PRESETS.filter(p => p.group === g).map(p => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                              ))}
                            </optgroup>
                          ));
                        })()}
                      </select>
                      {allCityPresets.some(p => p.id === coordPreset) && (
                        <button onClick={generateCoordPreset} className="glass-btn px-3 py-1.5 rounded-lg text-cyan-400 text-xs font-semibold hover:bg-cyan-400/15">
                          Load
                        </button>
                      )}
                    </div>
                    {allCityPresets.some(p => p.id === coordPreset) && (
                      <p className="text-[11px] text-white/30">
                        {allCityPresets.find(p => p.id === coordPreset)?.cities.length} lokasi
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-white/20 text-xs">
                    <div className="flex-1 border-t border-white/10" />
                    <span>atau</span>
                    <div className="flex-1 border-t border-white/10" />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-white/50 uppercase tracking-wider">Preset Graf Geometri</label>
                    <div className="flex gap-2">
                      <select
                        value={graphPreset}
                        onChange={(e) => {
                          setGraphPreset(e.target.value);
                          setCoordPreset("");
                        }}
                        className="glass-input flex-1 text-sm text-white/80"
                      >
                        <option value="">Pilih preset graf...</option>
                        <option value="complete">Graf Lengkap Kn</option>
                        <option value="completeBipartite">Graf Bipartit K(m,n)</option>
                        <option value="cycle">Siklus Cn</option>
                        <option value="path">Lintasan Pn</option>
                        <option value="wheel">Graf Roda Wn</option>
                        <option value="prism">Graf Prisma</option>
                        <option value="petersen">Petersen Graph</option>
                        <option value="generalizedPetersen">Generalized Petersen P(n,k)</option>
                        <option value="circulant">Circulant Cn(a₁,a₂)</option>
                        <option value="hypercube">Hypercube H(n)</option>
                        <option value="grid">Grid G(m,n)</option>
                      </select>
                    </div>
                    {graphPreset && (
                      <div className="flex flex-wrap gap-2 items-center">
                        {(graphPreset === "complete" || graphPreset === "cycle" || graphPreset === "path" || graphPreset === "wheel" || graphPreset === "prism" || graphPreset === "circulant") && (
                          <input type="number" min={2} value={coordN} onChange={(e) => setCoordN(parseInt(e.target.value) || 3)} placeholder="n" className="glass-input w-16 text-center font-mono text-sm" />
                        )}
                        {graphPreset === "completeBipartite" && (
                          <>
                            <input type="number" min={1} value={coordM} onChange={(e) => setCoordM(parseInt(e.target.value) || 1)} placeholder="m" className="glass-input w-16 text-center font-mono text-sm" />
                            <input type="number" min={1} value={coordN} onChange={(e) => setCoordN(parseInt(e.target.value) || 1)} placeholder="n" className="glass-input w-16 text-center font-mono text-sm" />
                          </>
                        )}
                        {graphPreset === "generalizedPetersen" && (
                          <>
                            <input type="number" min={3} value={coordN} onChange={(e) => setCoordN(parseInt(e.target.value) || 3)} placeholder="n" className="glass-input w-16 text-center font-mono text-sm" />
                            <input type="number" min={1} value={coordK} onChange={(e) => setCoordK(parseInt(e.target.value) || 1)} placeholder="k" className="glass-input w-16 text-center font-mono text-sm" />
                          </>
                        )}
                        {graphPreset === "circulant" && (
                          <>
                            <input type="number" min={3} value={coordN} onChange={(e) => setCoordN(parseInt(e.target.value) || 3)} placeholder="n" className="glass-input w-16 text-center font-mono text-sm" />
                            <input type="number" min={1} value={coordA1} onChange={(e) => setCoordA1(parseInt(e.target.value) || 1)} placeholder="a1" className="glass-input w-16 text-center font-mono text-sm" />
                            <input type="number" min={1} value={coordA2} onChange={(e) => setCoordA2(parseInt(e.target.value) || 1)} placeholder="a2" className="glass-input w-16 text-center font-mono text-sm" />
                          </>
                        )}
                        {graphPreset === "hypercube" && (
                          <input type="number" min={1} max={6} value={coordN} onChange={(e) => setCoordN(parseInt(e.target.value) || 1)} placeholder="dim" className="glass-input w-16 text-center font-mono text-sm" />
                        )}
                        {graphPreset === "grid" && (
                          <>
                            <input type="number" min={2} value={coordM} onChange={(e) => setCoordM(parseInt(e.target.value) || 2)} placeholder="m (baris)" className="glass-input w-16 text-center font-mono text-sm" />
                            <input type="number" min={2} value={coordN} onChange={(e) => setCoordN(parseInt(e.target.value) || 2)} placeholder="n (kolom)" className="glass-input w-16 text-center font-mono text-sm" />
                          </>
                        )}
                        <button onClick={generateCoordPreset} className="glass-btn px-3 py-1.5 rounded-lg text-cyan-400 text-xs font-semibold hover:bg-cyan-400/15">
                          Generate
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Table Header */}
                  <div className="grid grid-cols-[2.5rem_1fr_1fr_2rem] gap-2 text-[10px] uppercase tracking-wider text-white/30 px-1">
                    <span>Node</span>
                    <span className="text-center">X</span>
                    <span className="text-center">Y</span>
                    <span></span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {coordinates.map((coord, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[2.5rem_1fr_1fr_2rem] gap-2 items-center bg-white/[0.03] hover:bg-white/[0.06] rounded-lg px-1 py-1.5 transition-colors"
                      >
                        <span className="text-xs font-mono text-white/50 text-center" title={cityNames[idx] || undefined}>{cityNames[idx] ? cityNames[idx].slice(0, 6) : idx}</span>
                        <input
                          type="number"
                          step="any"
                          inputMode="decimal"
                          value={coord.x}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newCoords = [...coordinates];
                            newCoords[idx] = { ...newCoords[idx], x: val === "" ? 0 : parseFloat(val) };
                            setCoordinates(newCoords);
                          }}
                          className="glass-input w-full text-center text-sm font-mono py-1.5"
                        />
                        <input
                          type="number"
                          step="any"
                          inputMode="decimal"
                          value={coord.y}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newCoords = [...coordinates];
                            newCoords[idx] = { ...newCoords[idx], y: val === "" ? 0 : parseFloat(val) };
                            setCoordinates(newCoords);
                          }}
                          className="glass-input w-full text-center text-sm font-mono py-1.5"
                        />
                        <button
                          onClick={() => { setCoordinates(coordinates.filter((_, i) => i !== idx)); setCoordStructEdges([]); setCityNames(cityNames.filter((_, i) => i !== idx)); }}
                          className="flex items-center justify-center text-red-400/40 hover:text-red-400 transition-colors"
                          title="Hapus node"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setCoordinates([...coordinates, { x: 0, y: 0 }]); setCoordStructEdges([]); setCityNames([...cityNames, ""]); }}
                      className="flex-1 glass-btn px-3 py-2 rounded-lg text-cyan-400 text-xs font-semibold hover:bg-cyan-400/15 flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Tambah Node
                    </button>
                    <button
                      onClick={() => {
                        const n = coordinates.length;
                        const newCoords = Array.from({ length: Math.max(3, n) }, (_, i) => ({
                          x: Math.round(Math.cos((2 * Math.PI * i) / Math.max(3, n)) * 100 * 100) / 100,
                          y: Math.round(Math.sin((2 * Math.PI * i) / Math.max(3, n)) * 100 * 100) / 100,
                        }));
                        setCoordinates(newCoords);
                      }}
                      className="flex-1 glass-btn px-3 py-2 rounded-lg text-purple-400 text-xs font-semibold hover:bg-purple-400/15 flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset Lingkaran
                    </button>
                  </div>
                </div>
              ) : (
                <GraphInput
                  onGraphChange={handleGraphChange}
                  onFileLoaded={handleFileLoaded}
                />
              )}

              {needsWeightedHint && (
                <div className="glass border border-amber-400/15 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Weighted graph mode</p>
                  <p className="mt-2 text-sm text-white/60">
                    {isWeightedGraph
                      ? "Graf saat ini sudah memiliki bobot dan siap dipakai untuk shortest path, MST, dan TSP."
                      : "Belum ada bobot eksplisit pada edge. Sistem akan memperlakukan semua edge sebagai bobot 1."}
                  </p>
                  {activeTab === "tsp_grasp_swap" && tspMode === "edge" && (
                    <p className="mt-2 text-xs text-white/40">
                      TSP edge-list mode: bobot diambil dari edge yang diinput. Jika tidak ada bobot, default = 1.
                    </p>
                  )}
                </div>
              )}

              {/* Extra params */}
              {needsStart && (
                <div className="glass p-4">
                  <label className="block text-sm text-white/60 mb-1">Start Node</label>
                  <input
                    type="number"
                    min={0}
                    max={
                      activeTab === "tsp_grasp_swap" && tspMode === "coordinate"
                        ? coordinates.length - 1
                        : numVertices - 1
                    }
                    value={startNode}
                    onChange={(e) =>
                      setStartNode(
                        Math.max(
                          0,
                          Math.min(
                            parseInt(e.target.value) || 0,
                            activeTab === "tsp_grasp_swap" && tspMode === "coordinate"
                              ? coordinates.length - 1
                              : numVertices - 1
                          )
                        )
                      )
                    }
                    className="glass-input w-full"
                  />
                </div>
              )}

              {needsAB && (
                <div className="glass p-4 space-y-3">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Node A (source)</label>
                    <input
                      type="number"
                      min={0}
                      max={numVertices - 1}
                      value={nodeA}
                      onChange={(e) => setNodeA(Math.max(0, Math.min(parseInt(e.target.value) || 0, numVertices - 1)))}
                      className="glass-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Node B (destination)</label>
                    <input
                      type="number"
                      min={0}
                      max={numVertices - 1}
                      value={nodeB}
                      onChange={(e) => setNodeB(Math.max(0, Math.min(parseInt(e.target.value) || 0, numVertices - 1)))}
                      className="glass-input w-full"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <GridVisualizer
              onGridChange={setGrid}
              labels={islandLabels}
              islandCount={islandCount}
            />
          )}

          {/* Run Button */}
          <button
            onClick={runOperation}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all
              bg-gradient-to-r from-cyan-500 to-teal-500 text-black
              hover:from-cyan-400 hover:to-teal-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Run ${TABS.find((t) => t.id === activeTab)?.label}`
            )}
          </button>

          {activeTab === "tsp_grasp_swap" && (
            <div className="rounded-xl border border-rose-400/15 bg-rose-400/8 px-4 py-3 text-sm text-white/55">
              {tspMode === "coordinate"
                ? "TSP koordinat mode: jarak dihitung dari Euclidean distance antar titik. Backend membatasi maksimum 50 node."
                : "GRASP + 2-Opt Swap membangun tour heuristic. Backend membatasi TSP edge mode ke maksimum 50 node."}
            </div>
          )}
        </div>

        {/* Right: Visualization + Results */}
        <div className="lg:col-span-3 space-y-4">
          {/* Graph Visualizer (for graph operations) */}
          {isGraphOp && (
            <GraphVisualizer
              numVertices={activeTab === "tsp_grasp_swap" && tspMode === "coordinate" ? coordinates.length : numVertices}
              edges={activeTab === "tsp_grasp_swap" && tspMode === "coordinate" ? coordDisplayEdges : edges}
              highlightNodes={highlightNodes}
              highlightEdges={highlightEdges}
              componentColors={componentColors.size > 0 ? componentColors : undefined}
              bipartiteColors={bipartiteColors.size > 0 ? bipartiteColors : undefined}
              cyclePathNodes={cyclePathNodes}
              diameterPathNodes={diameterPath}
              girthCycleNodes={girthCycle}
              mstEdges={mstEdges}
              tspTourNodes={tspTour}
              tspTourEdges={tspTourEdges}
              tspStartNode={tspStartNode}
              nodePositions={activeTab === "tsp_grasp_swap" && tspMode === "coordinate" ? coordinates : undefined}
              nodeLabels={activeTab === "tsp_grasp_swap" && tspMode === "coordinate" && cityNames.length > 0 ? cityNames : undefined}
            />
          )}

          {isTimetabling && (
            <TimetableVisualizer
              teacherCount={timetabling.teacherCount}
              classCount={timetabling.classCount}
              assignments={result?.success ? result.assignments ?? [] : []}
              periodCount={result?.success ? result.periodCount ?? 0 : 0}
            />
          )}

          {/* Result Panel */}
          <ResultPanel title={`Result — ${TABS.find((t) => t.id === activeTab)?.label}`} loading={loading}>
            {renderResult()}
          </ResultPanel>
        </div>
      </div>
    </div>
  );
}
