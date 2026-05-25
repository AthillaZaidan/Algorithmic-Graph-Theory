"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

interface Graph3DVisualizerProps {
  numVertices: number;
  edges: number[][];
  highlightNodes?: number[];
  highlightEdges?: number[][];
  tspTourNodes?: number[];
  tspTourEdges?: number[][];
  nodePositions?: { x: number; y: number }[];
  height?: number;
  framed?: boolean;
}

function edgeKey(u: number, v: number) {
  return `${Math.min(u, v)}-${Math.max(u, v)}`;
}

function seededUnit(index: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function makePositions(numVertices: number, nodePositions?: { x: number; y: number }[]) {
  if (nodePositions && nodePositions.length >= numVertices) {
    return nodePositions.slice(0, numVertices).map((pos) => new THREE.Vector3(pos.x / 70, -pos.y / 70, 0));
  }

  const radius = Math.max(3.2, Math.min(6.2, Math.sqrt(numVertices) * 0.7));
  return Array.from({ length: numVertices }, (_, i) => {
    const t = numVertices <= 1 ? 0 : i / (numVertices - 1);
    const y = 1 - 2 * t;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * Math.PI * (3 - Math.sqrt(5));
    return new THREE.Vector3(
      Math.cos(theta) * r * radius,
      y * radius,
      Math.sin(theta) * r * radius,
    );
  });
}

function Scene({
  numVertices,
  edges,
  highlightNodes = [],
  highlightEdges = [],
  tspTourNodes = [],
  tspTourEdges = [],
  nodePositions,
}: Graph3DVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const highlightNodeSet = useMemo(() => new Set(highlightNodes), [highlightNodes]);
  const tspNodeSet = useMemo(() => new Set(tspTourNodes), [tspTourNodes]);
  const highlightEdgeSet = useMemo(() => new Set(highlightEdges.map(([u, v]) => edgeKey(u, v))), [highlightEdges]);
  const tspEdgeSet = useMemo(() => new Set(tspTourEdges.map(([u, v]) => edgeKey(u, v))), [tspTourEdges]);
  const positions = useMemo(() => makePositions(numVertices, nodePositions), [nodePositions, numVertices]);
  const stars = useMemo(() => {
    const data: number[] = [];
    for (let i = 0; i < 220; i++) {
      const radius = 7 + seededUnit(i * 3) * 9;
      const theta = seededUnit(i * 3 + 1) * Math.PI * 2;
      const phi = Math.acos(2 * seededUnit(i * 3 + 2) - 1);
      data.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      );
    }
    return new Float32Array(data);
  }, []);

  const lineData = useMemo(() => {
    const normal: number[] = [];
    const hot: number[] = [];
    for (const [u, v] of edges) {
      const source = positions[u];
      const target = positions[v];
      if (!source || !target) continue;
      const bucket = highlightEdgeSet.has(edgeKey(u, v)) || tspEdgeSet.has(edgeKey(u, v)) ? hot : normal;
      bucket.push(source.x, source.y, source.z, target.x, target.y, target.z);
    }
    return {
      normal: new Float32Array(normal),
      hot: new Float32Array(hot),
    };
  }, [edges, highlightEdgeSet, positions, tspEdgeSet]);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.18;
    groupRef.current.rotation.x = Math.sin(Date.now() / 1800) * 0.08;
  });

  return (
    <>
      <color attach="background" args={["#14123d"]} />
      <ambientLight intensity={1.25} />
      <pointLight position={[4, 5, 6]} intensity={2.2} color="#67e8f9" />
      <pointLight position={[-5, -4, -3]} intensity={1.4} color="#fb7185" />
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#c4b5fd" size={0.035} transparent opacity={0.58} />
      </points>
      <gridHelper args={[12, 24, "#22d3ee", "#312e81"]} position={[0, -3.6, 0]} />
      <group ref={groupRef} scale={1.18}>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[lineData.normal, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#bae6fd" transparent opacity={0.62} />
        </lineSegments>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[lineData.hot, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#fb7185" transparent opacity={1} />
        </lineSegments>
        {positions.map((position, node) => {
          const isHot = highlightNodeSet.has(node) || tspNodeSet.has(node);
          return (
            <mesh key={node} position={position}>
              <sphereGeometry args={[isHot ? 0.24 : 0.17, 24, 24]} />
              <meshStandardMaterial
                color={tspNodeSet.has(node) ? "#fb7185" : highlightNodeSet.has(node) ? "#22d3ee" : "#94a3b8"}
                emissive={isHot ? "#fb7185" : "#0f172a"}
                emissiveIntensity={isHot ? 0.55 : 0.15}
                roughness={0.28}
                metalness={0.18}
              />
            </mesh>
          );
        })}
      </group>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enableZoom
        enablePan
        minDistance={3.2}
        maxDistance={24}
        rotateSpeed={0.58}
        zoomSpeed={0.82}
        panSpeed={0.42}
      />
    </>
  );
}

export default function Graph3DVisualizer({ height = 420, framed = true, ...props }: Graph3DVisualizerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen]);

  const viewHeight = isFullscreen ? "calc(100vh - 2.5rem)" : height;

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-950 p-3 sm:p-5"
          : `${framed ? "glass" : ""} relative overflow-hidden`
      }
    >
      <div
        className={isFullscreen ? "relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950" : "relative overflow-hidden"}
        style={{ height: viewHeight, minHeight: viewHeight }}
      >
        <Canvas camera={{ position: [0, 0, 8.8], fov: 45 }} dpr={[1, 1.7]}>
          <Scene {...props} />
        </Canvas>
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-slate-950/72 px-3 py-2 text-xs text-white/65 shadow-lg backdrop-blur">
          Three.js 3D mode - scroll zoom, drag orbit
        </div>
        <button
          type="button"
          onClick={() => setIsFullscreen((value) => !value)}
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-slate-950/80 text-lg font-semibold text-white/85 shadow-lg backdrop-blur transition hover:bg-slate-900 hover:text-white"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label={isFullscreen ? "Exit fullscreen 3D graph" : "Open fullscreen 3D graph"}
        >
          {isFullscreen ? "x" : "+"}
        </button>
      </div>
    </div>
  );
}
