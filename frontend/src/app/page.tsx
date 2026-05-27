"use client";

import { useState, useCallback, useRef, useMemo, type ChangeEvent } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import BandwidthD3Visualizer from "@/components/BandwidthD3Visualizer";
import GraphInput from "@/components/GraphInput";
import GraphViewToggle from "@/components/GraphViewToggle";
import GridVisualizer from "@/components/GridVisualizer";
import ResultPanel from "@/components/ResultPanel";
import TimetableVisualizer from "@/components/TimetableVisualizer";
import TimetablingInput, { TimetablingConfig } from "@/components/TimetablingInput";
import type { CityMapPoint } from "@/components/TspIndonesiaMap";
import { GraphResponse } from "@/lib/cpp-bridge";
import { callWasmEngine, GraphRequest } from "@/lib/wasm-bridge";
import { CITY_PRESETS, ALL_INDONESIA_PRESET } from "@/lib/city-data";
import { solveIslands } from "@/lib/islands";
import { getTspCoordinateDisplayEdges } from "@/lib/tsp-coordinate-display";
import { getTspTourFrame } from "@/lib/tsp-search-animation";
import { parseTspFile } from "@/lib/tsp-parser";
import { solveTspCoordinate, type TspAlgorithm } from "@/lib/tsp-solver";
import {
  bandwidthForOrder,
  criticalEdgesForOrder,
  labelsForOrder,
  positionsForOrder,
  solveBandwidth,
} from "@/lib/bandwidth";
import { solveMaxFlow, type MaxFlowResult } from "@/lib/maxflow";
import { solveColoring } from "@/lib/coloring";
import { solveSCC } from "@/lib/scc";
import { solveTopoSort } from "@/lib/topo";
import { solveEulerian } from "@/lib/euler";
import { solvePageRank } from "@/lib/pagerank";
import { buildNNGraph, type NNGraphResult, type LayerConfig } from "@/lib/nn-graph";

const TspIndonesiaMap = dynamic(() => import("@/components/TspIndonesiaMap"), {
  ssr: false,
});

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
  | "timetabling_edge_coloring"
  | "bandwidth"
  | "max_flow"
  | "vertex_coloring"
  | "strongly_connected"
  | "topo_sort"
  | "eulerian"
  | "pagerank"
  | "nn_graph";

interface TabDef {
  id: Operation;
  label: string;
  group: "tugas1" | "tugas2" | "tugas3" | "tugas4" | "tugas5" | "tugas6" | "tugas7" | "tugas8" | "tugas9";
  description: string;
  algorithm: string;
}

const TABS: TabDef[] = [
  { id: "dfs", label: "DFS", group: "tugas1", description: "Depth-First Search traversal dari start node", algorithm: "Pakai stack/rekursi: telusuri sedalam mungkin lewat tetangga belum visited, lalu backtrack saat mentok." },
  { id: "bfs", label: "BFS", group: "tugas1", description: "Breadth-First Search traversal dari start node", algorithm: "Pakai queue: kunjungi node per level jarak dari start, semua tetangga dekat diproses dulu." },
  { id: "check_path", label: "Path Check", group: "tugas1", description: "Cek apakah ada lintasan dari node A ke node B", algorithm: "Jalankan BFS/DFS dari node A dan simpan parent; path ada kalau node B berhasil dikunjungi." },
  { id: "check_connectivity", label: "Connectivity", group: "tugas1", description: "Cek apakah graf terhubung (connected)", algorithm: "DFS/BFS dari satu node, hitung node reachable; connected kalau semua node terjangkau." },
  { id: "count_components", label: "Components", group: "tugas2", description: "Hitung jumlah komponen terhubung dalam graf", algorithm: "Scan semua node; tiap node belum visited memulai DFS/BFS baru dan menambah jumlah komponen." },
  { id: "largest_component", label: "Largest", group: "tugas2", description: "Cari komponen terhubung terbesar", algorithm: "Enumerasi semua komponen dengan DFS/BFS, bandingkan ukuran, ambil komponen dengan node terbanyak." },
  { id: "count_islands", label: "Islands", group: "tugas2", description: "Hitung jumlah pulau pada grid", algorithm: "Grid jadi graf 4-arah; setiap sel daratan belum visited memicu flood fill untuk satu island." },
  { id: "check_bipartite", label: "Bipartite", group: "tugas3", description: "Cek apakah graf adalah bipartite dengan 2 partisi", algorithm: "BFS coloring dua warna; kalau ada edge yang menghubungkan warna sama, graf bukan bipartite." },
  { id: "check_cycle", label: "Cycle", group: "tugas3", description: "Cek apakah graf memiliki cycle/siklus", algorithm: "DFS dengan parent tracking; cycle ditemukan saat ada tetangga visited yang bukan parent." },
  { id: "diameter", label: "Diameter", group: "tugas3", description: "Hitung diameter graf dan jalur terpanjang", algorithm: "BFS dari tiap node untuk shortest path terjauh; diameter adalah jarak maksimum dari semua BFS." },
  { id: "girth", label: "Girth", group: "tugas3", description: "Cari girth (cycle terpendek) dalam graf", algorithm: "BFS dari tiap node sambil simpan parent; saat edge menutup cycle, ambil panjang cycle minimum." },
  { id: "shortest_path", label: "Shortest Path", group: "tugas4", description: "Lintasan terpendek dari node A ke B (Dijkstra, berbobot)", algorithm: "Dijkstra: priority queue pilih jarak terkecil, relax edge, lalu parent dipakai untuk rekonstruksi path." },
  { id: "min_spanning_tree", label: "MST", group: "tugas4", description: "Pohon pembangun minimal (Kruskal)", algorithm: "Kruskal: sort edge dari bobot kecil, ambil edge kalau tidak membentuk cycle memakai DSU." },
  { id: "tsp_grasp_swap", label: "TSP GRASP", group: "tugas5", description: "Travelling Salesman Problem dengan GRASP + 2-Opt Swap", algorithm: "GRASP buat banyak tour semi-random, lalu 2-Opt Swap menukar sisi kalau total cost turun." },
  { id: "maximum_bipartite_matching", label: "Max Matching", group: "tugas6", description: "Matching maksimum pada graf bipartit (Hopcroft-Karp)", algorithm: "Hopcroft-Karp: BFS bikin layer augmenting path, DFS augment banyak path sekaligus sampai mentok." },
  { id: "timetabling_edge_coloring", label: "Timetabling", group: "tugas6", description: "Pewarnaan sisi graf bipartit untuk jadwal guru-kelas", algorithm: "Model guru-kelas sebagai graf bipartit; warna edge = periode, edge incident tidak boleh satu periode." },
  { id: "bandwidth", label: "Bandwidth", group: "tugas7", description: "Optimasi bandwidth graf dengan relabeling node", algorithm: "Cuthill-McKee: mulai dari degree kecil, BFS tetangga urut degree naik, lalu order itu dipakai relabel node." },
  { id: "max_flow", label: "Max Flow", group: "tugas8", description: "Hitung maximum flow dari source ke sink dalam flow network", algorithm: "Ford-Fulkerson: BFS cari augmenting path, update residual capacity, ulangi sampai tidak ada path lagi. Min cut diambil dari node reachable di residual graph." },
  { id: "vertex_coloring", label: "Coloring", group: "tugas8", description: "Pewarnaan vertex graf dengan Welsh-Powell", algorithm: "Welsh-Powell: urutkan node dari degree terbesar, warnai satu per satu dengan warna terkecil yang tidak dipakai tetangga." },
  { id: "strongly_connected", label: "SCC", group: "tugas8", description: "Cari strongly connected components dalam directed graph (Tarjan)", algorithm: "Tarjan: DFS sambil simpan index dan lowlink. Saat lowlink = index, pop stack untuk bentuk komponen SCC. Lalu bangun condensation DAG." },
  { id: "topo_sort", label: "Topo Sort", group: "tugas8", description: "Topological sort untuk directed acyclic graph (Kahn)", algorithm: "Kahn: hitung indegree tiap node, queue node dengan indegree 0, proses satu per satu kurangi indegree tetangga. Kalau tidak semua node terproses, graf punya cycle." },
  { id: "eulerian", label: "Eulerian", group: "tugas8", description: "Cari Eulerian path/circuit dalam graf (Hierholzer)", algorithm: "Hierholzer: cek derajat ganjil (0 = circuit, 2 = path, >2 = tidak eulerian). Mulai dari node ganjil, telusuri edge sembari hapus dari adjacency, backtrack saat mentok." },
  { id: "pagerank", label: "PageRank", group: "tugas9", description: "Hitung skor PageRank tiap node dalam directed graph", algorithm: "PageRank: iterasi power method dengan damping factor 0.85. Tiap node mendistribusikan skornya ke out-neighbor secara merata. Dangling node didistribusikan ke semua node. Konvergen saat delta < 1e-6." },
  { id: "nn_graph", label: "NN Graph", group: "tugas9", description: "Bangun graf layer neural network dari konfigurasi layer", algorithm: "Buat DAG layered: node per layer terhubung fully-connected ke layer berikutnya. Bobot edge random [-1,1]. Hitung total parameter (weights + biases)." },
];

const COMPONENT_COLORS = [
  "#22d3ee", "#2dd4bf", "#a78bfa", "#f472b6",
  "#fb923c", "#facc15", "#4ade80", "#60a5fa",
  "#e879f9", "#34d399",
];

export default function Home() {
  const allCityPresets = useMemo(() => [...CITY_PRESETS, ALL_INDONESIA_PRESET], []);

  const [hasStarted, setHasStarted] = useState(false);
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
  const [bandwidthScanEdge, setBandwidthScanEdge] = useState<number[] | undefined>();
  const [bandwidthBestEdges, setBandwidthBestEdges] = useState<number[][]>([]);
  const [bandwidthBestValue, setBandwidthBestValue] = useState<number | undefined>();
  const [bandwidthNodePositions, setBandwidthNodePositions] = useState<{ x: number; y: number }[] | undefined>();
  const [bandwidthAnimatedOrder, setBandwidthAnimatedOrder] = useState<number[]>([]);
  const [graphLayoutVersion, setGraphLayoutVersion] = useState(0);
  const [tspTour, setTspTour] = useState<number[]>([]);
  const [tspTourEdges, setTspTourEdges] = useState<number[][]>([]);
  const [tspTotalCost, setTspTotalCost] = useState<number | undefined>();
  const [tspStartNode, setTspStartNode] = useState<number | undefined>();
  const [isTspTourAnimating, setIsTspTourAnimating] = useState(false);
  const [tspMode, setTspMode] = useState<"edge" | "coordinate">("edge");
  const [tspAlgorithm, setTspAlgorithm] = useState<TspAlgorithm>("best-multistart");
  const [tspCoordinateView, setTspCoordinateView] = useState<"graph" | "map">("graph");
  const [coordinates, setCoordinates] = useState<{ x: number; y: number }[]>([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 50, y: 87 },
  ]);
  const [cityNames, setCityNames] = useState<string[]>([]);
  const [cityMapPoints, setCityMapPoints] = useState<CityMapPoint[]>([]);
  const [coordPreset, setCoordPreset] = useState("");
  const [graphPreset, setGraphPreset] = useState("");
  const [coordN, setCoordN] = useState(6);
  const [coordM, setCoordM] = useState(3);
  const [coordK, setCoordK] = useState(2);
  const [coordA1, setCoordA1] = useState(1);
  const [coordA2, setCoordA2] = useState(2);
  const [isWeightedMode, setIsWeightedMode] = useState(false);
  const [tspFileStatus, setTspFileStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [coordStructEdges, setCoordStructEdges] = useState<number[][]>([]);

  const animationRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tspFinalTourRef = useRef<{ tour: number[]; tourEdges: number[][] } | null>(null);
  const [flowEdges, setFlowEdges] = useState<MaxFlowResult["flowEdges"]>([]);
  const [minCutEdges, setMinCutEdges] = useState<number[][]>([]);
  const [maxFlowValue, setMaxFlowValue] = useState<number | undefined>();
  const [coloringColors, setColoringColors] = useState<Map<number, number>>(new Map());
  const [chromaticNumber, setChromaticNumber] = useState<number | undefined>();
  const [sccComponents, setSccComponents] = useState<number[][]>([]);
  const [condensationEdgeList, setCondensationEdgeList] = useState<number[][]>([]);
  const [topoOrder, setTopoOrder] = useState<number[]>([]);
  const [topoIsDAG, setTopoIsDAG] = useState<boolean | undefined>();
  const [topoCyclePath, setTopoCyclePath] = useState<number[]>([]);
  const [eulerPath, setEulerPath] = useState<number[]>([]);
  const [, setEulerIsCircuit] = useState<boolean | undefined>();
  const [eulerType, setEulerType] = useState<"circuit" | "path" | "none" | undefined>();
  const [pagerankScores, setPagerankScores] = useState<number[]>([]);
  const [pagerankIterations, setPagerankIterations] = useState<number | undefined>();
  const [pagerankConverged, setPagerankConverged] = useState<boolean | undefined>();
  const [pagerankDamping, setPagerankDamping] = useState(0.85);
  const [nnResult, setNnResult] = useState<NNGraphResult | null>(null);
  const [nnLayers, setNnLayers] = useState<LayerConfig[]>([
    { size: 4, activation: "input" },
    { size: 6, activation: "relu" },
    { size: 4, activation: "relu" },
    { size: 2, activation: "softmax" },
  ]);

  const clearAnimations = useCallback(() => {
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];
  }, []);

  const skipTspTourAnimation = useCallback(() => {
    const finalTour = tspFinalTourRef.current;
    if (!finalTour) return;

    clearAnimations();
    setTspTour(finalTour.tour);
    setTspTourEdges(finalTour.tourEdges);
    setHighlightNodes(Array.from(new Set(finalTour.tour)));
    setHighlightEdges(finalTour.tourEdges.map(([u, v]) => [u, v]));
    setIsTspTourAnimating(false);
  }, [clearAnimations]);

  const clearBandwidthLayout = useCallback(() => {
    setBandwidthScanEdge(undefined);
    setBandwidthBestEdges([]);
    setBandwidthBestValue(undefined);
    setBandwidthNodePositions(undefined);
    setBandwidthAnimatedOrder([]);
    setGraphLayoutVersion((v) => v + 1);
  }, []);

  const clearResultState = useCallback(() => {
    clearAnimations();
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
    setBandwidthScanEdge(undefined);
    setBandwidthBestEdges([]);
    setBandwidthBestValue(undefined);
    setBandwidthNodePositions(undefined);
    setBandwidthAnimatedOrder([]);
    setTspTour([]);
    setTspTourEdges([]);
    setIsTspTourAnimating(false);
    tspFinalTourRef.current = null;
    setTspTotalCost(undefined);
    setTspStartNode(undefined);
    setFlowEdges([]);
    setMinCutEdges([]);
    setMaxFlowValue(undefined);
    setColoringColors(new Map());
    setChromaticNumber(undefined);
    setSccComponents([]);
    setCondensationEdgeList([]);
    setTopoOrder([]);
    setTopoIsDAG(undefined);
    setTopoCyclePath([]);
    setEulerPath([]);
    setEulerIsCircuit(undefined);
    setEulerType(undefined);
    setPagerankScores([]);
    setPagerankIterations(undefined);
    setPagerankConverged(undefined);
    setNnResult(null);
  }, [clearAnimations]);

  const coordDisplayEdges = useMemo(() => {
    if (activeTab !== "tsp_grasp_swap" || tspMode !== "coordinate") return [];
    return getTspCoordinateDisplayEdges(coordinates, coordStructEdges, tspTourEdges);
  }, [activeTab, tspMode, coordinates, coordStructEdges, tspTourEdges]);

  const canShowCoordinateMap =
    activeTab === "tsp_grasp_swap" &&
    tspMode === "coordinate" &&
    cityMapPoints.length > 0 &&
    cityMapPoints.length === coordinates.length;

  const generateCoordPreset = () => {
    clearResultState();
    setTspFileStatus(null);

    const preset = allCityPresets.find(p => p.id === coordPreset);
    if (preset) {
      const pts = preset.cities.map(c => ({
        x: c.lng,
        y: c.lat,
      }));
      setCoordinates(pts);
      setCityNames(preset.cities.map(c => c.name));
      setCityMapPoints(preset.cities.map(c => ({ name: c.name, lat: c.lat, lng: c.lng })));
      setCoordStructEdges([]);
      setStartNode(0);
      setTspCoordinateView("map");
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
    setCityMapPoints([]);
    setCoordStructEdges(structEdges);
    setStartNode(0);
    setTspCoordinateView("graph");
  };

  const handleTspFileUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".tsp") && !lowerName.endsWith(".txt")) {
      setTspFileStatus({ type: "error", message: "Hanya file .tsp atau .txt TSPLIB yang didukung" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseTspFile(String(reader.result ?? ""));
      if (parsed.error) {
        setTspFileStatus({ type: "error", message: parsed.error });
        return;
      }

      clearResultState();
      setCoordinates(parsed.coordinates);
      setCityNames(parsed.labels);
      setCityMapPoints(parsed.mapPoints ?? []);
      setCoordStructEdges([]);
      setCoordPreset("");
      setGraphPreset("");
      setStartNode(0);
      setTspCoordinateView(parsed.mapPoints ? "map" : "graph");
      setTspFileStatus({
        type: "success",
        message: `Loaded ${parsed.name}: ${parsed.dimension} node (${parsed.edgeWeightType})${parsed.mapPoints ? " + peta" : ""}`,
      });
    };
    reader.onerror = () => {
      setTspFileStatus({ type: "error", message: "Gagal membaca file TSP" });
    };
    reader.readAsText(file);
  }, [clearResultState]);

  const handleGraphChange = useCallback((nv: number, e: number[][]) => {
    clearResultState();
    setNumVertices(nv);
    setEdges(e);
    setIsWeightedMode(e.some((edge) => edge[2] !== undefined));
    clearBandwidthLayout();
  }, [clearBandwidthLayout, clearResultState]);

  const handleFileLoaded = useCallback((nv: number, e: number[][], weighted: boolean) => {
    clearResultState();
    setNumVertices(nv);
    setEdges(e);
    setIsWeightedMode(weighted);
    clearBandwidthLayout();
  }, [clearBandwidthLayout, clearResultState]);

  const runOperation = async () => {
    setLoading(true);
    clearResultState();

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

      if (activeTab === "max_flow") {
        const r = solveMaxFlow(numVertices, edges, nodeA, nodeB);
        setFlowEdges(r.flowEdges); setMinCutEdges(r.minCutEdges); setMaxFlowValue(r.maxFlow);
        setResult(r as unknown as GraphResponse);
        setHighlightNodes(Array.from(new Set(r.flowEdges.flatMap(e => [e.u, e.v]))));
        setHighlightEdges(r.flowEdges.map(e => [e.u, e.v]));
        setLoading(false); return;
      }
      if (activeTab === "vertex_coloring") {
        const r = solveColoring(numVertices, edges);
        setColoringColors(r.colors); setChromaticNumber(r.chromaticNumber);
        setResult(r as unknown as GraphResponse);
        setHighlightNodes(Array.from({length: numVertices}, (_, i) => i));
        setLoading(false); return;
      }
      if (activeTab === "strongly_connected") {
        const r = solveSCC(numVertices, edges);
        setSccComponents(r.sccs); setCondensationEdgeList(r.condensationEdges);
        setResult(r as unknown as GraphResponse);
        const cm = new Map<number, string>();
        r.sccs.forEach((comp, idx) => { const c = COMPONENT_COLORS[idx % COMPONENT_COLORS.length]; comp.forEach(n => cm.set(n, c)); });
        setComponentColors(cm);
        setHighlightNodes(Array.from({length: numVertices}, (_, i) => i));
        setLoading(false); return;
      }
      if (activeTab === "topo_sort") {
        const r = solveTopoSort(numVertices, edges);
        setTopoOrder(r.order); setTopoIsDAG(r.isDAG); setTopoCyclePath(r.cyclePath);
        setResult(r as unknown as GraphResponse);
        if (r.isDAG) { setHighlightNodes(r.order); }
        else { setCyclePathNodes(r.cyclePath); setHighlightNodes(r.cyclePath); }
        setLoading(false); return;
      }
      if (activeTab === "pagerank") {
        const r = solvePageRank(numVertices, edges, pagerankDamping);
        setPagerankScores(r.scores);
        setPagerankIterations(r.iterations);
        setPagerankConverged(r.converged);
        setResult(r as unknown as GraphResponse);
        setHighlightNodes(Array.from({length: numVertices}, (_, i) => i));
        setLoading(false); return;
      }
      if (activeTab === "nn_graph") {
        const r = buildNNGraph(nnLayers);
        setNnResult(r);
        setResult(r as unknown as GraphResponse);
        setLoading(false); return;
      }
      if (activeTab === "eulerian") {
        const r = solveEulerian(numVertices, edges);
        setEulerPath(r.path); setEulerIsCircuit(r.isCircuit); setEulerType(r.type);
        setResult(r as unknown as GraphResponse);
        if (r.path.length > 0) {
          setHighlightNodes(r.path);
          const pe: number[][] = [];
          for (let i = 0; i < r.path.length - 1; i++) pe.push([r.path[i], r.path[i+1]]);
          setHighlightEdges(pe);
        }
        setLoading(false); return;
      }

      try {
        if (activeTab === "bandwidth") {
          data = solveBandwidth(numVertices, edges);
        } else if (activeTab === "count_islands") {
          data = await callApiRoute();
          if (!data.success) data = solveIslands(grid);
        } else if (activeTab === "tsp_grasp_swap" && tspMode === "coordinate") {
          data = solveTspCoordinate(coordinates, startNode, cityMapPoints.length === coordinates.length, tspAlgorithm);
        } else {
          data = await callWasmEngine(body);
          if (
            (
              activeTab === "maximum_bipartite_matching" ||
              activeTab === "timetabling_edge_coloring" ||
              activeTab === "tsp_grasp_swap"
            ) &&
            !data.success &&
            (data.error || "").toLowerCase().includes("operasi tidak dikenal")
          ) {
            data = await callApiRoute();
          }
        }
      } catch {
        if (activeTab === "bandwidth") {
          data = solveBandwidth(numVertices, edges);
        } else if (activeTab === "count_islands") {
          data = solveIslands(grid);
        } else {
          data = await callApiRoute();
        }
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
      } else if (activeTab === "bandwidth") {
        const bwEdges = (data.bandwidthEdges as number[][]) || [];
        const validEdges = edges
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
        const steps = ((data.bandwidthSteps as number[][]) || []).filter((step) => step.length === numVertices);
        const finalOrder = (data.bandwidthOrder as number[]) || Array.from({ length: numVertices }, (_, i) => i);
        const animationSteps = steps.length > 0 ? steps : [finalOrder];

        animationSteps.forEach((order, i) => {
          const t = setTimeout(() => {
            const currentBandwidth = bandwidthForOrder(order, validEdges);
            const currentCriticalEdges = criticalEdgesForOrder(order, validEdges, currentBandwidth);
            setBandwidthScanEdge(undefined);
            setBandwidthAnimatedOrder(order);
            setBandwidthNodePositions(positionsForOrder(order));
            setBandwidthBestValue(currentBandwidth);
            setBandwidthBestEdges(currentCriticalEdges);
            setHighlightEdges(currentCriticalEdges);
            setHighlightNodes(order);
          }, i * 700);
          animationRef.current.push(t);
        });

        const finish = setTimeout(() => {
          setBandwidthScanEdge(undefined);
          setBandwidthBestValue(data.bandwidth as number);
          setBandwidthBestEdges(bwEdges);
          setBandwidthAnimatedOrder(finalOrder);
          setBandwidthNodePositions(undefined);
          setGraphLayoutVersion((v) => v + 1);
          setHighlightEdges(bwEdges);
          setHighlightNodes(Array.from(new Set(bwEdges.flatMap(([u, v]) => [u, v]))));
        }, animationSteps.length * 700 + 250);
        animationRef.current.push(finish);
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
          clearAnimations();
          tspFinalTourRef.current = { tour, tourEdges };
          setTspTour([]);
          setTspTourEdges([]);
          setTspTotalCost(data.distanceUnit === "km" ? Math.round(data.totalCost as number) : data.totalCost as number);
          setTspStartNode(data.startNode as number);
          setIsTspTourAnimating(true);

          tourEdges.forEach((_edge, i) => {
            const t = setTimeout(() => {
              const frame = getTspTourFrame(tour, tourEdges, i);
              setTspTour(frame.nodes);
              setTspTourEdges(frame.edges);
              setHighlightNodes(frame.nodes);
              setHighlightEdges(frame.edges.map(([u, v]) => [u, v]));
            }, i * 90);
            animationRef.current.push(t);
          });

          const finish = setTimeout(() => {
            setTspTour(tour);
            setTspTourEdges(tourEdges);
            setHighlightNodes(Array.from(new Set(tour)));
            setHighlightEdges(tourEdges.map(([u, v]) => [u, v]));
            setIsTspTourAnimating(false);
          }, tourEdges.length * 90 + 80);
          animationRef.current.push(finish);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to call API");
    } finally {
      setLoading(false);
    }
  };

  const isTimetabling = activeTab === "timetabling_edge_coloring";
  const isGraphOp = activeTab !== "count_islands" && !isTimetabling && activeTab !== "nn_graph";
  const activeTabDef = TABS.find((t) => t.id === activeTab);
  const needsStart = activeTab === "dfs" || activeTab === "bfs" || activeTab === "tsp_grasp_swap";
  const needsAB = activeTab === "check_path" || activeTab === "shortest_path" || activeTab === "max_flow";
  const needsWeightedHint = activeTab === "shortest_path" || activeTab === "min_spanning_tree" || (activeTab === "tsp_grasp_swap" && tspMode === "edge");
  const isWeightedGraph = isWeightedMode || edges.some((edge) => edge[2] !== undefined);
  const bandwidthDisplayOrder =
    activeTab === "bandwidth" && bandwidthAnimatedOrder.length === numVertices
      ? bandwidthAnimatedOrder
      : ((result?.bandwidthOrder as number[]) || []);
  const bandwidthDisplayLabels =
    activeTab === "bandwidth" && bandwidthDisplayOrder.length === numVertices
      ? labelsForOrder(bandwidthDisplayOrder)
      : undefined;

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

      case "bandwidth": {
        const bwEdges = (result.bandwidthEdges as number[][]) || [];
        const beforeOrder = Array.from({ length: numVertices }, (_, i) => i);
        const afterOrder = (result.bandwidthOrder as number[]) || beforeOrder;
        const finalPositions = (result.bandwidthPositions as number[]) || beforeOrder;
        const bandwidthMatrix = (result.bandwidthMatrix as (number | null)[][]) || [];
        const relabelMap = afterOrder.map((node, index) => `${node}->${index}`);
        const methodLabel = "Cuthill-McKee heuristic";
        const matrixLimit = 14;
        const showMatrix = bandwidthMatrix.length > 0 && bandwidthMatrix.length <= matrixLimit;
        return (
          <div className="space-y-3">
            <p className="text-white/60 text-xs uppercase tracking-wide">
              Bandwidth awal: <span className="text-white/80 font-bold text-lg">{result.initialBandwidth ?? 0}</span>
              <span className="mx-2 text-white/30">→</span>
              Bandwidth terbaik: <span className="text-cyan-300 font-bold text-lg">{result.bandwidth ?? 0}</span>
            </p>
            <p className="text-white/40 text-xs">
              Metode: {methodLabel}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="glass p-3 border-white/10">
                <p className="text-white/45 text-xs uppercase tracking-wide mb-2">Before</p>
                <p className="font-mono text-sm text-white/80 break-words">{beforeOrder.join(" - ")}</p>
              </div>
              <div className="glass p-3 border-cyan-400/25">
                <p className="text-cyan-300 text-xs uppercase tracking-wide mb-2">After</p>
                <p className="font-mono text-sm text-cyan-100 break-words">{afterOrder.join(" - ")}</p>
                <p className="mt-2 text-xs text-white/45 break-words">
                  Relabel: {relabelMap.join(", ")}
                </p>
              </div>
            </div>
            {(bandwidthAnimatedOrder.length > 0 || bandwidthBestValue !== undefined) && (
              <div className="glass p-3 border-yellow-400/20">
                <p className="text-sm text-white/70">
                  Susunan animasi:{" "}
                  <span className="font-mono text-yellow-300">
                    {(bandwidthAnimatedOrder.length > 0 ? bandwidthAnimatedOrder : (result.bandwidthOrder as number[]) || []).join(" - ")}
                  </span>
                </p>
                <p className="text-xs text-white/45 mt-1">
                  Bandwidth susunan ini: <span className="font-mono text-yellow-300">{bandwidthBestValue ?? result.bandwidth ?? 0}</span>
                </p>
              </div>
            )}
            {showMatrix && (
              <div className="glass p-4 border-violet-400/20">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-violet-300 font-semibold text-sm">Matrix hasil perhitungan bandwidth</p>
                    <p className="text-xs text-white/45 mt-1">
                      Isi sel = |pos(u)-pos(v)| untuk edge setelah relabel. Nilai terbesar adalah bandwidth.
                    </p>
                  </div>
                  <span className="rounded-lg bg-violet-400/15 border border-violet-400/25 px-2 py-1 text-xs text-violet-200">
                    max {result.bandwidth ?? 0}
                  </span>
                </div>
                <div className="max-w-full overflow-auto">
                  <table className="min-w-max border-separate border-spacing-1 text-xs">
                    <thead>
                      <tr>
                        <th className="h-8 w-8 text-white/35">u\v</th>
                        {beforeOrder.map((node) => (
                          <th key={node} className="h-8 w-8 rounded bg-white/[0.04] text-white/50 font-mono">
                            {node}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bandwidthMatrix.map((row, u) => (
                        <tr key={u}>
                          <th className="h-8 w-8 rounded bg-white/[0.04] text-white/50 font-mono">{u}</th>
                          {row.map((value, v) => {
                            const isMax = value !== null && value === result.bandwidth;
                            return (
                              <td
                                key={`${u}-${v}`}
                                className={`h-8 w-8 rounded text-center font-mono ${
                                  isMax
                                    ? "bg-cyan-400/25 text-cyan-100 border border-cyan-300/40"
                                    : value !== null
                                      ? "bg-violet-400/15 text-violet-100"
                                      : "bg-white/[0.025] text-white/15"
                                }`}
                              >
                                {value ?? "·"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {bandwidthMatrix.length > matrixLimit && (
              <div className="glass p-3 border-violet-400/15 text-xs text-white/50">
                Matrix bandwidth disembunyikan karena graf punya {bandwidthMatrix.length} node. Batas tampilan matrix: {matrixLimit} node.
              </div>
            )}
            <div className="glass p-4 border-cyan-400/30">
              <p className="text-cyan-300 font-semibold text-sm mb-2">Edge dengan selisih label maksimum:</p>
              {bwEdges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {bwEdges.map(([u, v], i) => (
                    <span key={`${u}-${v}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400/15 border border-cyan-400/30 px-3 py-2 text-cyan-100 text-sm font-mono">
                      {finalPositions[u] ?? u}
                      <span className="text-cyan-400/60">-</span>
                      {finalPositions[v] ?? v}
                      <span className="text-white/40 text-xs">|{Math.abs((finalPositions[u] ?? u) - (finalPositions[v] ?? v))}|</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-white/45 text-sm">Tidak ada edge pada graf.</p>
              )}
            </div>
          </div>
        );
      }

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
                  <p className="mt-1 font-mono text-2xl font-bold text-orange-300">
                    {tspTotalCost ?? 0}
                    {result.distanceUnit === "km" && <span className="ml-2 text-sm text-orange-200/70">km</span>}
                  </p>
                  {result.algorithm && (
                    <p className="mt-1 text-xs text-white/45">Algoritma: {String(result.algorithm).replaceAll("-", " ")}</p>
                  )}
                </div>

                <div className="glass border border-orange-400/20 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-orange-300">Jalur hasil TSP GRASP+Swap</p>
                    {isTspTourAnimating && (
                      <button
                        type="button"
                        onClick={skipTspTourAnimation}
                        className="rounded-lg border border-orange-300/25 bg-orange-300/10 px-3 py-1.5 text-xs font-semibold text-orange-200 transition hover:bg-orange-300/18"
                      >
                        Skip animasi
                      </button>
                    )}
                  </div>
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
                        <span className="ml-auto text-amber-400/80">
                          {result.distanceUnit === "km" ? "km" : "w"}={typeof w === "number" ? (result.distanceUnit === "km" ? Math.round(w) : w.toFixed(2)) : w}
                        </span>
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

      case "max_flow":
        return (
          <div className="space-y-3">
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Maximum Flow</p>
              <p className="mt-1 font-mono text-2xl font-bold text-cyan-300">{maxFlowValue ?? 0}</p>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Flow Edges ({flowEdges.length})</p>
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {flowEdges.map((e, i) => (
                  <motion.div key={`${e.u}-${e.v}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.18 }} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs font-mono">
                    <span className="text-cyan-400">{e.u}</span>
                    <span className="text-white/25">→ {e.flow}/{e.capacity}</span>
                    <span className="text-violet-300">{e.v}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            {minCutEdges.length > 0 && (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Min Cut Edges ({minCutEdges.length})</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {minCutEdges.map(([u, v], i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-400/15 px-2 py-1 text-xs font-mono text-rose-300">{u}&rarr;{v}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "vertex_coloring":
        return (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Chromatic Number</p>
              <p className="mt-1 font-mono text-2xl font-bold text-amber-300">{chromaticNumber ?? 0}</p>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Warna per node</p>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: numVertices }, (_, i) => {
                  const c = coloringColors.get(i) ?? -1;
                  const palette = ["#22d3ee","#2dd4bf","#a78bfa","#f472b6","#fb923c","#facc15","#4ade80","#60a5fa","#e879f9","#34d399","#fb7185","#38bdf8","#a3e635","#fbbf24","#c084fc"];
                  return (
                    <span key={i} className="inline-flex items-center justify-center w-full h-9 rounded-lg text-xs font-mono font-semibold"
                      style={{backgroundColor: c>=0 ? palette[c%palette.length]+"30" : "rgba(255,255,255,0.05)", border: c>=0 ? `1px solid ${palette[c%palette.length]}50` : "1px solid rgba(255,255,255,0.08)", color: c>=0 ? palette[c%palette.length] : "rgba(255,255,255,0.3)"}}>
                      {c>=0 ? `${i}` : "?"}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "strongly_connected":
        return (
          <div className="space-y-3">
            <p className="text-white/60 text-xs uppercase tracking-wide">Ditemukan <span className="text-cyan-300 font-bold text-lg">{sccComponents.length}</span> SCC</p>
            {sccComponents.map((comp, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COMPONENT_COLORS[i % COMPONENT_COLORS.length] }}/>
                <span className="text-white/50 text-xs">SCC{i + 1}:</span>
                <div className="flex flex-wrap gap-1">
                  {comp.map((node) => (
                    <span key={node} className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono"
                      style={{backgroundColor: COMPONENT_COLORS[i%COMPONENT_COLORS.length]+"25", borderColor: COMPONENT_COLORS[i%COMPONENT_COLORS.length]+"50", borderWidth: 1, color: COMPONENT_COLORS[i%COMPONENT_COLORS.length]}}>
                      {node}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {condensationEdgeList.length > 0 && (
              <div className="glass p-3 border-violet-400/20">
                <p className="text-xs text-white/50 mb-1">Condensation DAG</p>
                <div className="flex flex-wrap gap-1.5">
                  {condensationEdgeList.map(([u, v], i) => (
                    <span key={i} className="text-xs font-mono text-violet-300 bg-violet-400/10 px-2 py-0.5 rounded">SCC{u+1}&rarr;SCC{v+1}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "topo_sort":
        return (
          <div className="space-y-3">
            {topoIsDAG ? (
              <>
                <div className="flex items-center gap-2 text-emerald-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg><span className="font-semibold">Graf adalah DAG</span></div>
                <div><p className="mb-2 text-xs uppercase tracking-wide text-white/50">Topological Order</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {topoOrder.map((node, i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 text-sm font-mono font-semibold">{node}</span>
                        {i < topoOrder.length - 1 && <span className="text-emerald-400/60">&rarr;</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-amber-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg><span className="font-semibold">Graf BUKAN DAG &mdash; terdapat cycle</span></div>
                {topoCyclePath.length > 0 && (
                  <div className="glass p-4 border-amber-400/30">
                    <p className="text-amber-300 font-semibold text-sm mb-2">Cycle Path:</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {topoCyclePath.map((node, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 text-sm font-mono font-semibold">{node}</span>
                          {i < topoCyclePath.length - 1 && <span className="text-amber-400/60">&rarr;</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case "eulerian":
        return (
          <div className="space-y-3">
            {eulerType === "circuit" ? (
              <div className="flex items-center gap-2 text-emerald-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg><span className="font-semibold">Eulerian Circuit</span></div>
            ) : eulerType === "path" ? (
              <div className="flex items-center gap-2 text-cyan-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg><span className="font-semibold">Eulerian Path</span></div>
            ) : (
              <div className="flex items-center gap-2 text-red-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg><span className="font-semibold">Graf tidak Eulerian</span></div>
            )}
            {eulerPath.length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Path ({eulerPath.length} edges)</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {eulerPath.map((node, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-mono font-semibold border ${i===0?"bg-emerald-400/20 border-emerald-400/40 text-emerald-300":i===eulerPath.length-1&&eulerType==="path"?"bg-amber-400/20 border-amber-400/40 text-amber-300":"bg-white/[0.05] border-white/10 text-white/70"}`}>{node}</span>
                      {i < eulerPath.length - 1 && <span className="text-white/30">&rarr;</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "pagerank":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Iterasi</p>
                <p className="mt-1 font-mono text-2xl font-bold text-cyan-300">{pagerankIterations ?? 0}</p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${pagerankConverged ? "border-emerald-400/20 bg-emerald-400/10" : "border-amber-400/20 bg-amber-400/10"}`}>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Status</p>
                <p className={`mt-1 font-semibold text-lg ${pagerankConverged ? "text-emerald-300" : "text-amber-300"}`}>{pagerankConverged ? "Converged" : "Max iter"}</p>
              </div>
              <div className="rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Damping</p>
                <p className="mt-1 font-mono text-2xl font-bold text-violet-300">{pagerankDamping}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">PageRank Score</p>
              <div className="grid grid-cols-5 gap-1.5">
                {pagerankScores.map((score, i) => {
                  const pct = score * 100;
                  const intensity = Math.min(pct / (pagerankScores.length > 0 ? Math.max(...pagerankScores) * 100 : 1), 1);
                  return (
                    <span key={i} className="inline-flex items-center justify-center w-full h-10 rounded-lg text-xs font-mono font-semibold"
                      style={{
                        backgroundColor: `rgba(34,211,238,${0.05 + intensity * 0.25})`,
                        border: `1px solid rgba(34,211,238,${0.2 + intensity * 0.4})`,
                        color: `rgba(34,211,238,${0.5 + intensity * 0.5})`,
                        transform: `scale(${0.8 + intensity * 0.4})`,
                      }}>
                      {score.toFixed(3)}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "nn_graph":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Total Nodes</p>
                <p className="mt-1 font-mono text-2xl font-bold text-cyan-300">{nnResult?.totalNodes ?? 0}</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Total Edges</p>
                <p className="mt-1 font-mono text-2xl font-bold text-emerald-300">{nnResult?.totalEdges ?? 0}</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Total Params</p>
                <p className="mt-1 font-mono text-2xl font-bold text-amber-300">{nnResult?.totalParams ?? 0}</p>
              </div>
            </div>
            <div className="glass p-4 border-white/10">
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Layer Architecture</p>
              <div className="flex flex-wrap items-center gap-2">
                {nnResult?.layers.map((layer, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className="inline-flex flex-col items-center rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 py-1.5">
                      <span className="text-sm font-mono font-bold text-violet-300">{layer.size}</span>
                      <span className="text-[9px] uppercase text-violet-400/60">{layer.activation}</span>
                    </span>
                    {i < (nnResult?.layers.length ?? 0) - 1 && (
                      <span className="text-white/25">&rarr;</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

    }
  };

  if (!hasStarted) {
    const heroNodes = [
      { x: "16%", y: "28%", size: "h-4 w-4", delay: 0 },
      { x: "31%", y: "18%", size: "h-6 w-6", delay: 0.1 },
      { x: "48%", y: "31%", size: "h-5 w-5", delay: 0.2 },
      { x: "68%", y: "20%", size: "h-7 w-7", delay: 0.3 },
      { x: "82%", y: "39%", size: "h-4 w-4", delay: 0.4 },
      { x: "24%", y: "62%", size: "h-7 w-7", delay: 0.15 },
      { x: "44%", y: "72%", size: "h-4 w-4", delay: 0.25 },
      { x: "62%", y: "59%", size: "h-5 w-5", delay: 0.35 },
      { x: "78%", y: "74%", size: "h-6 w-6", delay: 0.45 },
    ];
    const heroEdges = [
      [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [2, 7], [3, 7],
    ];

    return (
      <section className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/35">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_75%_72%,rgba(45,212,191,0.16),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.2),rgba(8,47,73,0.3))]" />
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="absolute inset-0">
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            {heroEdges.map(([from, to], index) => {
              const a = heroNodes[from];
              const b = heroNodes[to];
              return (
                <motion.line
                  key={`${from}-${to}-svg`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="rgba(103,232,249,0.42)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.15 + index * 0.05, duration: 0.75 }}
                />
              );
            })}
          </svg>
          {heroNodes.map((node, index) => (
            <motion.div
              key={index}
              className={`absolute ${node.size} -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/70 bg-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.75)]`}
              style={{ left: node.x, top: node.y }}
              initial={{ opacity: 0, scale: 0.25 }}
              animate={{ opacity: 1, scale: [1, 1.18, 1] }}
              transition={{ opacity: { delay: node.delay, duration: 0.35 }, scale: { delay: node.delay, duration: 2.8, repeat: Infinity } }}
            />
          ))}
        </div>

        <div className="relative z-10 flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center px-6 py-16 text-center">
          <motion.p
            className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/75"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            Algorithmic Graph Theory
          </motion.p>
          <motion.h1
            className="max-w-4xl text-5xl font-black tracking-tight text-white sm:text-7xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            Graph Theory{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">
              Visualizer
            </span>
          </motion.h1>
          <motion.p
            className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Visualisasi traversal, connectivity, shortest path, MST, TSP, matching, timetabling, dan bandwidth dalam satu dashboard interaktif.
          </motion.p>

          <motion.button
            type="button"
            onClick={() => setHasStarted(true)}
            className="group mt-10 inline-flex items-center justify-center rounded-full border border-cyan-200/50 bg-cyan-300 px-10 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-950 shadow-[0_0_45px_rgba(34,211,238,0.35)] transition hover:bg-white hover:shadow-[0_0_70px_rgba(34,211,238,0.55)]"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.45 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
          >
            Start
            <span className="ml-3 transition-transform group-hover:translate-x-1">→</span>
          </motion.button>

          <motion.div
            className="mt-10 grid w-full max-w-3xl grid-cols-3 gap-3 text-left"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            {[
              ["17", "graph operations"],
              ["2D/3D", "visual modes"],
              ["C++/WASM", "engine bridge"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <p className="text-2xl font-black text-cyan-200">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-white/45">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    );
  }

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

      <div className="flex gap-0 min-h-[calc(100vh-10rem)]">
        {/* Sidebar */}
        <aside className="sidebar w-[220px] flex-shrink-0 flex flex-col gap-1 p-3 overflow-y-auto">
          {(() => {
            const switchTab = (id: Operation) => {
              setActiveTab(id);
              clearResultState();
            };

            const groups = [
              { key: "tugas1", label: "Traversal", color: "#22d3ee" },
              { key: "tugas2", label: "Components & Islands", color: "#2dd4bf" },
              { key: "tugas3", label: "Structure & Metrics", color: "#a78bfa" },
              { key: "tugas4", label: "Weighted Graphs", color: "#f59e0b" },
              { key: "tugas5", label: "TSP", color: "#fb7185" },
              { key: "tugas6", label: "Matching & Scheduling", color: "#34d399" },
              { key: "tugas7", label: "Bandwidth", color: "#06b6d4" },
              { key: "tugas8", label: "Flow & Ordering", color: "#f472b6" },
              { key: "tugas9", label: "AI & Learning", color: "#38bdf8" },
            ] as const;

            return groups.map((g) => (
              <div key={g.key} className="sidebar-group">
                <p className="sidebar-group-label">{g.label}</p>
                {TABS.filter((t) => t.group === g.key).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`sidebar-item ${activeTab === tab.id ? "active" : ""}`}
                    style={{ "--accent": g.color } as React.CSSProperties}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ));
          })()}
        </aside>

        {/* Content */}
        <div className="flex-1 space-y-4 p-4 overflow-y-auto">
          {/* Description */}
          <div className="px-1 space-y-2">
            <p className="text-white/40 text-xs">
              {activeTabDef?.description}
            </p>
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-cyan-300/70 mb-1">Cara algoritma</p>
              <p className="text-xs leading-relaxed text-white/70">{activeTabDef?.algorithm}</p>
            </div>
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
          ) : activeTab === "nn_graph" ? (
            <div className="glass p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white/90">Neural Network Layers</h3>
                <select
                  value=""
                  onChange={(e) => {
                    const presets: Record<string, LayerConfig[]> = {
                      "mlp-4-6-4-2": [
                        { size: 4, activation: "input" },
                        { size: 6, activation: "relu" },
                        { size: 4, activation: "relu" },
                        { size: 2, activation: "softmax" },
                      ],
                      "deep-8-12-8-4": [
                        { size: 8, activation: "input" },
                        { size: 12, activation: "relu" },
                        { size: 8, activation: "relu" },
                        { size: 4, activation: "softmax" },
                      ],
                      "cnn-flat-28-16-10": [
                        { size: 28, activation: "input" },
                        { size: 16, activation: "relu" },
                        { size: 10, activation: "softmax" },
                      ],
                      "autoenc-10-5-10": [
                        { size: 10, activation: "input" },
                        { size: 5, activation: "relu" },
                        { size: 10, activation: "sigmoid" },
                      ],
                      "wide-6-16-16-4": [
                        { size: 6, activation: "input" },
                        { size: 16, activation: "relu" },
                        { size: 16, activation: "relu" },
                        { size: 4, activation: "softmax" },
                      ],
                    };
                    if (e.target.value && presets[e.target.value]) {
                      setNnLayers([...presets[e.target.value]]);
                      setResult(null);
                    }
                  }}
                  className="glass-input w-40 text-xs">
                  <option value="">Preset...</option>
                  <option value="mlp-4-6-4-2">MLP (4-6-4-2)</option>
                  <option value="deep-8-12-8-4">Deep (8-12-8-4)</option>
                  <option value="cnn-flat-28-16-10">CNN-Flat (28-16-10)</option>
                  <option value="autoenc-10-5-10">Autoencoder (10-5-10)</option>
                  <option value="wide-6-16-16-4">Wide (6-16-16-4)</option>
                </select>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {nnLayers.map((layer, i) => (
                  <div key={i} className="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-2 items-center">
                    <span className="text-xs text-white/30 font-mono">L{i}</span>
                    <input type="number" min={1} max={64} value={layer.size}
                      onChange={(e) => {
                        const next = [...nnLayers];
                        next[i] = { ...next[i], size: Math.max(1, parseInt(e.target.value) || 1) };
                        setNnLayers(next);
                      }}
                      className="glass-input text-center text-sm font-mono" placeholder="size"/>
                    <select value={layer.activation}
                      onChange={(e) => {
                        const next = [...nnLayers];
                        next[i] = { ...next[i], activation: e.target.value };
                        setNnLayers(next);
                      }}
                      className="glass-input text-sm">
                      <option value="input">input</option>
                      <option value="relu">relu</option>
                      <option value="sigmoid">sigmoid</option>
                      <option value="tanh">tanh</option>
                      <option value="softmax">softmax</option>
                      <option value="linear">linear</option>
                    </select>
                    <button onClick={() => { if (nnLayers.length > 2) setNnLayers(nnLayers.filter((_, j) => j !== i)); }}
                      className="text-red-400/40 hover:text-red-400 text-lg leading-none">&times;</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setNnLayers([...nnLayers, { size: 3, activation: "relu" }])}
                className="w-full glass-btn px-3 py-2 rounded-lg text-cyan-400 text-xs font-semibold">
                + Add Layer
              </button>
            </div>
          ) : isGraphOp ? (
            <>
              {activeTab === "pagerank" && (
                <div className="glass p-4 space-y-3">
                  <label className="block text-xs text-white/50 uppercase tracking-wider">Damping Factor</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={0.5} max={0.99} step={0.01} value={pagerankDamping}
                      onChange={(e) => setPagerankDamping(parseFloat(e.target.value))}
                      className="flex-1 accent-cyan-400"/>
                    <span className="text-sm font-mono text-cyan-300 w-12 text-right">{pagerankDamping}</span>
                  </div>
                  <p className="text-[11px] text-white/35">d = 0.85 (default Google). Makin tinggi, makin sensitif ke struktur link.</p>
                </div>
              )}
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

                  <div className="space-y-2">
                    <label className="block text-xs text-white/50 uppercase tracking-wider">Algoritma TSP</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["best-multistart", "Best Multi-Start"],
                        ["farthest-insertion", "Farthest + 2-Opt"],
                        ["cheapest-insertion", "Cheapest + 2-Opt"],
                        ["nearest-2opt", "Nearest + 2-Opt"],
                      ] as [TspAlgorithm, string][]).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            clearResultState();
                            setTspAlgorithm(id);
                          }}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            tspAlgorithm === id
                              ? "border border-orange-300/45 bg-orange-300/15 text-orange-200"
                              : "glass-btn text-white/55 hover:text-white/85"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] leading-relaxed text-white/35">
                      Preset kota/kabupaten dihitung dengan Haversine kilometer. Best Multi-Start mencoba beberapa konstruksi awal lalu ambil tour terbaik.
                    </p>
                  </div>

                  {canShowCoordinateMap && (
                    <div className="space-y-2">
                      <label className="block text-xs text-white/50 uppercase tracking-wider">Tampilan Visualisasi</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setTspCoordinateView("map")}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            tspCoordinateView === "map"
                              ? "bg-cyan-400/15 border border-cyan-400/40 text-cyan-300"
                              : "glass-btn text-white/50 hover:text-white/80"
                          }`}
                        >
                          Peta
                        </button>
                        <button
                          type="button"
                          onClick={() => setTspCoordinateView("graph")}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            tspCoordinateView === "graph"
                              ? "bg-cyan-400/15 border border-cyan-400/40 text-cyan-300"
                              : "glass-btn text-white/50 hover:text-white/80"
                          }`}
                        >
                          Graf
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Coordinate Preset */}
                  <div className="space-y-2">
                    <label className="block text-xs text-white/50 uppercase tracking-wider">Preset Kota / Kabupaten</label>
                    <div className="flex gap-2">
                      <select
                        value={allCityPresets.some(p => p.id === coordPreset) ? coordPreset : ""}
                        onChange={(e) => {
                          clearResultState();
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

                  <div className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <label htmlFor="tsp-file-upload" className="block text-xs uppercase tracking-wider text-white/50">
                          Upload File TSP
                        </label>
                        <p className="mt-1 text-[11px] text-white/32">
                          Format TSPLIB NODE_COORD_SECTION, EDGE_WEIGHT_TYPE EUC_2D
                        </p>
                      </div>
                      <label
                        htmlFor="tsp-file-upload"
                        className="glass-btn cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/15"
                      >
                        Pilih .tsp
                      </label>
                      <input
                        id="tsp-file-upload"
                        type="file"
                        accept=".tsp,.txt"
                        className="hidden"
                        onChange={handleTspFileUpload}
                      />
                    </div>
                    {tspFileStatus && (
                      <div className={`rounded-lg border px-3 py-2 text-xs ${
                        tspFileStatus.type === "success"
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                          : "border-red-400/20 bg-red-400/10 text-red-300"
                      }`}>
                        {tspFileStatus.message}
                      </div>
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
                          clearResultState();
                          setGraphPreset(e.target.value);
                          setCoordPreset("");
                          setCityMapPoints([]);
                          setTspCoordinateView("graph");
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
                          onClick={() => {
                            setCoordinates(coordinates.filter((_, i) => i !== idx));
                            setCoordStructEdges([]);
                            setCityNames(cityNames.filter((_, i) => i !== idx));
                            setCityMapPoints(cityMapPoints.filter((_, i) => i !== idx));
                          }}
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
                      onClick={() => {
                        setCoordinates([...coordinates, { x: 0, y: 0 }]);
                        setCoordStructEdges([]);
                        setCityNames([...cityNames, ""]);
                        setCityMapPoints([]);
                        setTspCoordinateView("graph");
                      }}
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
                        setCityMapPoints([]);
                        setTspCoordinateView("graph");
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
                  activeOperation={activeTab}
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
                ? "TSP koordinat mode: jarak dihitung dari Euclidean distance antar titik. Visualisasi besar hanya menggambar node dan edge tour hasil algoritma."
                : "GRASP + 2-Opt Swap membangun tour heuristic dari edge berbobot yang diinput."}
            </div>
          )}
        </div>

        {/* Right: Visualization + Results */}
        <div className="lg:col-span-3 space-y-4">
          {/* Graph Visualizer (for graph operations) */}
          {isGraphOp && canShowCoordinateMap && tspCoordinateView === "map" ? (
            <TspIndonesiaMap
              cities={cityMapPoints}
              tspTourEdges={tspTourEdges}
              tspStartNode={tspStartNode}
            />
          ) : isGraphOp && (
            <div>
              <GraphViewToggle
                key={`${activeTab}-${graphLayoutVersion}`}
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
                bandwidthScanEdge={bandwidthScanEdge}
                bandwidthBestEdges={bandwidthBestEdges}
                tspTourNodes={tspTour}
                tspTourEdges={tspTourEdges}
                tspStartNode={tspStartNode}
                nodePositions={
                  activeTab === "bandwidth"
                    ? bandwidthNodePositions
                    : activeTab === "tsp_grasp_swap" && tspMode === "coordinate"
                    ? coordinates
                    : undefined
                }
                nodeLabels={
                  activeTab === "bandwidth"
                    ? bandwidthDisplayLabels
                    : activeTab === "tsp_grasp_swap" && tspMode === "coordinate" && cityNames.length > 0
                    ? cityNames
                    : undefined
                }
                showCoordGrid={activeTab === "bandwidth" ? false : undefined}
                lockNodePositions={activeTab === "tsp_grasp_swap" && tspMode === "coordinate"}
              />
              {activeTab === "bandwidth" && (
                <div className="mt-4">
                  <BandwidthD3Visualizer
                    numVertices={numVertices}
                    edges={edges}
                    order={bandwidthDisplayOrder}
                    criticalEdges={bandwidthBestEdges.length > 0 ? bandwidthBestEdges : (result?.bandwidthEdges as number[][]) || []}
                    bandwidth={bandwidthBestValue ?? (result?.bandwidth as number | undefined)}
                  />
                </div>
              )}
            </div>
          )}

          {isTimetabling && (
            <TimetableVisualizer
              teacherCount={timetabling.teacherCount}
              classCount={timetabling.classCount}
              assignments={result?.success ? result.assignments ?? [] : []}
              periodCount={result?.success ? result.periodCount ?? 0 : 0}
            />
          )}

          {activeTab === "nn_graph" && nnResult && (
            <div>
              <GraphViewToggle
                numVertices={nnResult.totalNodes}
                edges={nnResult.edges}
                highlightNodes={Array.from({length: nnResult.totalNodes}, (_, i) => i)}
                highlightEdges={[]}
                nodePositions={(() => {
                  const positions: {x: number; y: number}[] = [];
                  nnResult.layerNodes.forEach((layerNodes, layerIdx) => {
                    const y = layerIdx * 80 - (nnResult.layers.length - 1) * 40;
                    layerNodes.forEach((nodeId, nodeIdx) => {
                      const x = (nodeIdx - (layerNodes.length - 1) / 2) * 60;
                      positions[nodeId] = { x, y };
                    });
                  });
                  return positions;
                })()}
                lockNodePositions={true}
              />
            </div>
          )}

          {/* Result Panel */}
          <ResultPanel title={`Result — ${TABS.find((t) => t.id === activeTab)?.label}`} loading={loading}>
            {renderResult()}
          </ResultPanel>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
