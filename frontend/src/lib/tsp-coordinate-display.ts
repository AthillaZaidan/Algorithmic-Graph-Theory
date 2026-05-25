export type CoordinatePoint = { x: number; y: number };

const DEFAULT_COMPLETE_GRAPH_RENDER_LIMIT = 80;

export function getTspCoordinateDisplayEdges(
  coordinates: CoordinatePoint[],
  structuralEdges: number[][],
  tourEdges: number[][] = [],
  completeGraphRenderLimit = DEFAULT_COMPLETE_GRAPH_RENDER_LIMIT
) {
  if (structuralEdges.length > 0) return structuralEdges;
  if (tourEdges.length > 0) return tourEdges;
  if (coordinates.length > completeGraphRenderLimit) return [];

  const edges: number[][] = [];
  for (let i = 0; i < coordinates.length; i++) {
    for (let j = i + 1; j < coordinates.length; j++) {
      const dx = coordinates[i].x - coordinates[j].x;
      const dy = coordinates[i].y - coordinates[j].y;
      const w = Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
      edges.push([i, j, w]);
    }
  }
  return edges;
}
