export function getTspTourFrame(tour: number[], tourEdges: number[][], frame: number) {
  if (tour.length === 0 || tourEdges.length === 0) {
    return { nodes: [], edges: [] };
  }

  const count = Math.min(frame + 1, tourEdges.length);
  const edges = tourEdges.slice(0, count);
  const nodes = Array.from(new Set([
    tour[0],
    ...edges.flatMap(([u, v]) => [u, v]),
  ]));

  return { nodes, edges };
}
