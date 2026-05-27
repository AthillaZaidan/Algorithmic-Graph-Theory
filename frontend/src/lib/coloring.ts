export interface ColoringResult {
  success: true;
  chromaticNumber: number;
  colors: Map<number, number>;
}

export function solveColoring(
  vertexCount: number,
  edges: number[][],
): ColoringResult {
  const adj = new Map<number, number[]>();
  for (let i = 0; i < vertexCount; i++) adj.set(i, []);

  for (const edge of edges) {
    const u = edge[0];
    const v = edge[1];
    if (
      !Number.isInteger(u) || !Number.isInteger(v) ||
      u < 0 || u >= vertexCount || v < 0 || v >= vertexCount || u === v
    ) continue;
    if (!adj.get(u)!.includes(v)) adj.get(u)!.push(v);
    if (!adj.get(v)!.includes(u)) adj.get(v)!.push(u);
  }

  const degrees = Array.from({ length: vertexCount }, (_, i) => ({
    node: i,
    degree: adj.get(i)!.length,
  }));
  degrees.sort((a, b) => b.degree - a.degree);

  const colors = new Map<number, number>();
  for (let i = 0; i < vertexCount; i++) colors.set(i, -1);

  for (const { node } of degrees) {
    const usedColors = new Set<number>();
    for (const neighbor of adj.get(node)!) {
      const c = colors.get(neighbor);
      if (c !== undefined && c !== -1) usedColors.add(c);
    }

    let color = 0;
    while (usedColors.has(color)) color++;
    colors.set(node, color);
  }

  const chromaticNumber = Math.max(0, ...Array.from(colors.values())) + 1;

  return { success: true, chromaticNumber, colors };
}
