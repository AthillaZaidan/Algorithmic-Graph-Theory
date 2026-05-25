export interface ParsedTspFile {
  name: string;
  dimension: number;
  edgeWeightType: string;
  coordinates: { x: number; y: number }[];
  labels: string[];
  mapPoints?: { name: string; lat: number; lng: number }[];
  error?: string;
}

const SUPPORTED_EDGE_WEIGHT_TYPES = new Set(["EUC_2D"]);
const MAX_TSP_NODES = 1024;
const SCALED_GEO_FACTOR = 1000;

function parseHeaderLine(line: string) {
  const colonIndex = line.indexOf(":");
  if (colonIndex !== -1) {
    const key = line.slice(0, colonIndex).trim().toUpperCase();
    const value = line.slice(colonIndex + 1).trim();
    return { key, value };
  }

  const match = line.match(/^(\S+)\s+(.*)$/);
  if (!match) return null;

  const key = match[1].trim().toUpperCase();
  const value = match[2].trim();
  return { key, value };
}

export function parseTspFile(content: string): ParsedTspFile {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headers = new Map<string, string>();
  const sectionIndex = lines.findIndex((line) => line.toUpperCase() === "NODE_COORD_SECTION");

  if (sectionIndex === -1) {
    return {
      name: "",
      dimension: 0,
      edgeWeightType: "",
      coordinates: [],
      labels: [],
      error: "NODE_COORD_SECTION tidak ditemukan",
    };
  }

  for (const line of lines.slice(0, sectionIndex)) {
    const parsed = parseHeaderLine(line);
    if (parsed) headers.set(parsed.key, parsed.value);
  }

  const name = headers.get("NAME") || "TSP dataset";
  const type = (headers.get("TYPE") || "").toUpperCase();
  const edgeWeightType = (headers.get("EDGE_WEIGHT_TYPE") || "").toUpperCase();
  const dimension = Number.parseInt(headers.get("DIMENSION") || "", 10);

  if (type && type !== "TSP") {
    return { name, dimension: 0, edgeWeightType, coordinates: [], labels: [], error: "TYPE harus TSP" };
  }

  if (!Number.isInteger(dimension) || dimension <= 0) {
    return { name, dimension: 0, edgeWeightType, coordinates: [], labels: [], error: "DIMENSION harus bilangan positif" };
  }

  if (dimension > MAX_TSP_NODES) {
    return {
      name,
      dimension,
      edgeWeightType,
      coordinates: [],
      labels: [],
      error: `DIMENSION terlalu besar (max ${MAX_TSP_NODES})`,
    };
  }

  if (!SUPPORTED_EDGE_WEIGHT_TYPES.has(edgeWeightType)) {
    return {
      name,
      dimension,
      edgeWeightType,
      coordinates: [],
      labels: [],
      error: `EDGE_WEIGHT_TYPE ${edgeWeightType || "(kosong)"} belum didukung. Gunakan EUC_2D.`,
    };
  }

  const coordinates: { x: number; y: number }[] = [];
  const labels: string[] = [];
  const seenIds = new Set<string>();

  for (const line of lines.slice(sectionIndex + 1)) {
    const upper = line.toUpperCase();
    if (upper === "EOF" || upper.endsWith("_SECTION")) break;

    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;

    const id = parts[0];
    const x = Number.parseFloat(parts[1]);
    const y = Number.parseFloat(parts[2]);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return { name, dimension, edgeWeightType, coordinates: [], labels: [], error: `Koordinat tidak valid pada node ${id}` };
    }

    if (seenIds.has(id)) {
      return { name, dimension, edgeWeightType, coordinates: [], labels: [], error: `Node ID duplikat: ${id}` };
    }

    seenIds.add(id);
    labels.push(id);
    coordinates.push({ x, y });
  }

  if (coordinates.length !== dimension) {
    return {
      name,
      dimension,
      edgeWeightType,
      coordinates: [],
      labels: [],
      error: `Jumlah koordinat ${coordinates.length} tidak sesuai DIMENSION ${dimension}`,
    };
  }

  return { name, dimension, edgeWeightType, coordinates, labels, mapPoints: inferScaledGeoPoints(coordinates, labels) };
}

function inferScaledGeoPoints(coordinates: { x: number; y: number }[], labels: string[]) {
  if (coordinates.length === 0) return undefined;

  const points = coordinates.map((coord, index) => ({
    name: labels[index] || `${index + 1}`,
    lat: coord.x / SCALED_GEO_FACTOR,
    lng: coord.y / SCALED_GEO_FACTOR,
  }));

  const validLatLng = points.every((point) =>
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
  if (!validLatLng) return undefined;

  const rawMagnitudeLooksScaled = coordinates.some((coord) =>
    Math.abs(coord.x) > SCALED_GEO_FACTOR ||
    Math.abs(coord.y) > SCALED_GEO_FACTOR
  );
  if (!rawMagnitudeLooksScaled) return undefined;

  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const minLng = Math.min(...points.map((point) => point.lng));
  const maxLng = Math.max(...points.map((point) => point.lng));
  const spanLat = maxLat - minLat;
  const spanLng = maxLng - minLng;

  if (spanLat <= 0 || spanLng <= 0 || spanLat > 10 || spanLng > 20) return undefined;

  return points;
}
