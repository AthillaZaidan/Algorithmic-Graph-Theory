"use client";

import { useEffect, useMemo, useState } from "react";
import DeckGL from "@deck.gl/react";
import { MapView } from "@deck.gl/core";
import { ArcLayer, ColumnLayer, PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import Map from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";

export type CityMapPoint = {
  name: string;
  lat: number;
  lng: number;
};

interface TspIndonesiaMapProps {
  cities: CityMapPoint[];
  tspTourEdges?: number[][];
  tspStartNode?: number;
  isSearching?: boolean;
}

type RoutePath = {
  path: [number, number][];
  index: number;
};

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: { "raster-saturation": -0.25, "raster-brightness-min": 0.12, "raster-brightness-max": 0.86 },
    },
  ],
};

function initialViewState(cities: CityMapPoint[]) {
  if (cities.length === 0) {
    return { longitude: 118, latitude: -2.5, zoom: 4, pitch: 18, bearing: 0 };
  }

  const minLat = Math.min(...cities.map((city) => city.lat));
  const maxLat = Math.max(...cities.map((city) => city.lat));
  const minLng = Math.min(...cities.map((city) => city.lng));
  const maxLng = Math.max(...cities.map((city) => city.lng));
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  const zoom = span > 34 ? 3.25 : span > 14 ? 4.2 : span > 6 ? 5.15 : 6.25;

  return {
    longitude: (minLng + maxLng) / 2,
    latitude: (minLat + maxLat) / 2,
    zoom,
    pitch: 58,
    bearing: -24,
  };
}

function interpolatePoint(path: RoutePath[], progress: number): [number, number] | null {
  if (path.length === 0) return null;
  const active = path[Math.floor(progress) % path.length];
  const local = progress % 1;
  const [from, to] = active.path;
  return [
    from[0] + (to[0] - from[0]) * local,
    from[1] + (to[1] - from[1]) * local,
  ];
}

function markerRadiusMeters(count: number, kind: "default" | "tour" | "start") {
  const scale = count > 700 ? 0.32 : count > 300 ? 0.45 : count > 120 ? 0.62 : 1;
  const base = kind === "start" ? 9500 : kind === "tour" ? 7000 : 4300;
  return Math.max(900, Math.round(base * scale));
}

export default function TspIndonesiaMap({ cities, tspTourEdges = [], tspStartNode, isSearching = false }: TspIndonesiaMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tick, setTick] = useState(0);

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

  useEffect(() => {
    if (!isSearching && tspTourEdges.length === 0) return;

    let frame = 0;
    let raf = 0;
    const animate = () => {
      frame += 0.018;
      setTick(frame);
      raf = window.requestAnimationFrame(animate);
    };
    raf = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(raf);
  }, [isSearching, tspTourEdges.length]);

  const routePaths = useMemo<RoutePath[]>(() => {
    return tspTourEdges
      .map(([u, v], index) => {
        const source = cities[u];
        const target = cities[v];
        if (!source || !target) return null;
        return {
          index,
          path: [[source.lng, source.lat], [target.lng, target.lat]] as [number, number][],
        };
      })
      .filter((path): path is RoutePath => path != null);
  }, [cities, tspTourEdges]);

  const tourNodeSet = useMemo(() => {
    const set = new Set<number>();
    for (const [u, v] of tspTourEdges) {
      set.add(u);
      set.add(v);
    }
    return set;
  }, [tspTourEdges]);

  const probePoint = useMemo(() => interpolatePoint(routePaths, tick * Math.max(1, routePaths.length * 0.55)), [routePaths, tick]);
  const viewState = useMemo(() => initialViewState(cities), [cities]);

  const layers = useMemo(() => {
    const routeArcs = new ArcLayer<RoutePath>({
      id: "tsp-route-3d-arcs",
      data: routePaths,
      getSourcePosition: (route) => route.path[0],
      getTargetPosition: (route) => route.path[1],
      getSourceColor: [34, 211, 238, 180],
      getTargetColor: [251, 113, 133, 210],
      getWidth: isSearching ? 2.4 : 1.8,
      greatCircle: true,
      pickable: false,
    });

    const routeGlow = new PathLayer<RoutePath>({
      id: "tsp-route-glow",
      data: routePaths,
      getPath: (route) => route.path,
      getColor: () => [251, 113, 133, 58],
      getWidth: () => 8,
      widthUnits: "pixels",
      rounded: true,
    });

    const routeLine = new PathLayer<RoutePath>({
      id: "tsp-route-line",
      data: routePaths,
      getPath: (route) => route.path,
      getColor: (route) => {
        const pulse = isSearching ? 120 + Math.round(90 * Math.sin(tick * 9 + route.index * 0.7)) : 230;
        return [251, 113, 133, pulse];
      },
      getWidth: () => (isSearching ? 3.5 : 2.8),
      widthUnits: "pixels",
      rounded: true,
    });

    const points = new ScatterplotLayer<CityMapPoint>({
      id: "tsp-city-points",
      data: cities,
      getPosition: (city) => [city.lng, city.lat],
      getRadius: (_city, { index }) => {
        const isStart = tspStartNode === index;
        const isTourNode = tourNodeSet.has(index);
        const pulse = isSearching && isTourNode ? 1.8 * Math.sin(tick * 8 + index * 0.2) : 0;
        const kind = isStart ? "start" : isTourNode ? "tour" : "default";
        return markerRadiusMeters(cities.length, kind) + pulse * markerRadiusMeters(cities.length, kind) * 0.1;
      },
      radiusUnits: "meters",
      getFillColor: (_city, { index }) => {
        if (tspStartNode === index) return [249, 115, 22, 235];
        if (tourNodeSet.has(index)) return [37, 99, 235, 220];
        return [14, 116, 144, 170];
      },
      getLineColor: [255, 255, 255, 210],
      lineWidthMinPixels: cities.length > 300 ? 0.35 : 1,
      stroked: true,
      pickable: true,
    });

    const cityColumns = new ColumnLayer<CityMapPoint>({
      id: "tsp-city-3d-columns",
      data: cities,
      getPosition: (city) => [city.lng, city.lat],
      radius: markerRadiusMeters(cities.length, "default") * 0.55,
      diskResolution: 18,
      elevationScale: 1,
      getElevation: (_city, { index }) => {
        if (tspStartNode === index) return 78000;
        if (tourNodeSet.has(index)) return 52000;
        return 18000;
      },
      getFillColor: (_city, { index }) => {
        if (tspStartNode === index) return [249, 115, 22, 180];
        if (tourNodeSet.has(index)) return [34, 211, 238, 145];
        return [15, 118, 110, 85];
      },
      getLineColor: [255, 255, 255, 60],
      lineWidthMinPixels: 0.5,
      extruded: true,
      stroked: true,
      pickable: false,
    });

    const labels = new TextLayer<CityMapPoint>({
      id: "tsp-city-labels",
      data: cities.length <= 120 ? cities : [],
      getPosition: (city) => [city.lng, city.lat],
      getText: (city, { index }) => `${index}. ${city.name}`,
      getSize: 11,
      getPixelOffset: [0, -16],
      getColor: [255, 255, 255, 210],
      background: true,
      getBackgroundColor: [2, 6, 23, 160],
      backgroundPadding: [4, 2],
      fontFamily: "Inter, Arial, sans-serif",
      pickable: false,
    });

    const probe = new ScatterplotLayer<[number, number]>({
      id: "tsp-route-probe",
      data: probePoint ? [probePoint] : [],
      getPosition: (point) => point,
      getRadius: () => 13000,
      radiusUnits: "meters",
      getFillColor: [250, 204, 21, isSearching ? 245 : 0],
      getLineColor: [255, 255, 255, 240],
      lineWidthMinPixels: 1,
      stroked: true,
    });

    return [cityColumns, routeGlow, routeArcs, routeLine, probe, points, labels];
  }, [cities, isSearching, probePoint, routePaths, tick, tourNodeSet, tspStartNode]);

  if (cities.length === 0) {
    return (
      <div className="glass flex min-h-[350px] items-center justify-center text-sm text-white/45">
        Pilih preset kota/kabupaten untuk menampilkan peta.
      </div>
    );
  }

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-950 p-3 sm:p-5"
          : "glass overflow-hidden relative min-h-[350px]"
      }
    >
      <div
        className={
          isFullscreen
            ? "relative h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl border border-white/15 bg-slate-950 sm:h-[calc(100vh-2.5rem)]"
            : "relative h-[350px]"
        }
      >
        <DeckGL
          views={new MapView({ repeat: true })}
          initialViewState={viewState}
          controller
          layers={layers}
          getTooltip={({ object, index }) => {
            if (!object || index == null) return null;
            const city = object as CityMapPoint;
            return `${index}. ${city.name}\n${city.lat.toFixed(4)}, ${city.lng.toFixed(4)}`;
          }}
        >
          <Map
            mapLib={maplibregl}
            mapStyle={MAP_STYLE}
            attributionControl={false}
            reuseMaps
          />
        </DeckGL>

        <button
          type="button"
          onClick={() => setIsFullscreen((value) => !value)}
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-slate-950/80 text-lg font-semibold text-white/85 shadow-lg backdrop-blur transition hover:bg-slate-900 hover:text-white"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label={isFullscreen ? "Exit fullscreen map" : "Open fullscreen map"}
        >
          {isFullscreen ? "x" : "+"}
        </button>

        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-lg border border-slate-900/10 bg-slate-950/75 px-3 py-2 text-xs text-white/75 shadow-lg">
          3D WebGL map - {cities.length} lokasi
          {tspTourEdges.length > 0 ? ` - ${tspTourEdges.length} edge tour` : ""}
        </div>

        {isSearching && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 rounded-xl border border-rose-300/25 bg-slate-950/82 p-4 text-white shadow-2xl backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-200/80">Searching TSP</p>
                <p className="text-sm text-white/70">GRASP route probe is connecting candidate nodes</p>
              </div>
              <div className="h-8 w-8 rounded-full border-2 border-rose-300/25 border-t-rose-300 animate-spin" />
            </div>
            <div className="tsp-search-route">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
