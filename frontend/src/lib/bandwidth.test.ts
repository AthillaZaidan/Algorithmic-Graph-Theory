import { describe, expect, test } from "bun:test";
import { bandwidthForOrder, cuthillMckeeOrder, solveBandwidth } from "./bandwidth";

function hypercubeEdges(dim: number) {
  const n = 1 << dim;
  const edges: number[][] = [];
  for (let u = 0; u < n; u++) {
    for (let bit = 0; bit < dim; bit++) {
      const v = u ^ (1 << bit);
      if (u < v) edges.push([u, v]);
    }
  }
  return edges;
}

function generalizedPetersenEdges(n: number, k: number) {
  const edges: number[][] = [];
  for (let i = 0; i < n; i++) {
    edges.push([i, (i + 1) % n]);
    edges.push([i, i + n]);
    edges.push([i + n, ((i + k) % n) + n]);
  }
  return edges;
}

describe("solveBandwidth", () => {
  test("uses Cuthill-McKee bandwidth for C5", () => {
    const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]];
    const expectedOrder = cuthillMckeeOrder(5, edges);
    const result = solveBandwidth(5, edges);

    expect(result.initialBandwidth).toBe(4);
    expect(result.bandwidthOrder).toEqual(expectedOrder);
    expect(result.bandwidth).toBe(bandwidthForOrder(expectedOrder, edges));
    expect(result.isOptimal).toBe(false);
    expect(result.method).toBe("cuthill_mckee");
  });

  test("uses Cuthill-McKee for Q4 hypercube instead of Hales ordering", () => {
    const edges = hypercubeEdges(4);
    const expectedOrder = cuthillMckeeOrder(16, edges);
    const result = solveBandwidth(16, edges);

    expect(result.initialBandwidth).toBe(8);
    expect(result.bandwidthOrder).toEqual(expectedOrder);
    expect(result.bandwidth).toBe(bandwidthForOrder(expectedOrder, edges));
    expect(result.isOptimal).toBe(false);
    expect(result.method).toBe("cuthill_mckee");
  });

  test("uses Cuthill-McKee for Q5 hypercube", () => {
    const edges = hypercubeEdges(5);
    const expectedOrder = cuthillMckeeOrder(32, edges);
    const result = solveBandwidth(32, edges);

    expect(result.bandwidthOrder).toEqual(expectedOrder);
    expect(result.bandwidth).toBe(bandwidthForOrder(expectedOrder, edges));
    expect(result.isOptimal).toBe(false);
    expect(result.method).toBe("cuthill_mckee");
  });

  test("uses Cuthill-McKee for Q6 hypercube", () => {
    const edges = hypercubeEdges(6);
    const expectedOrder = cuthillMckeeOrder(64, edges);
    const result = solveBandwidth(64, edges);

    expect(result.bandwidthOrder).toEqual(expectedOrder);
    expect(result.bandwidth).toBe(bandwidthForOrder(expectedOrder, edges));
    expect(result.isOptimal).toBe(false);
    expect(result.method).toBe("cuthill_mckee");
  });

  test("does not return a worse bandwidth when Cuthill-McKee degrades Petersen ordering", () => {
    const edges = generalizedPetersenEdges(5, 2);
    const result = solveBandwidth(10, edges);

    expect(result.initialBandwidth).toBe(5);
    expect(result.bandwidth).toBeLessThanOrEqual(result.initialBandwidth);
    expect(result.method).toBe("cuthill_mckee");
  });

  test("returns a calculation matrix with edge label differences", () => {
    const result = solveBandwidth(4, [[0, 2], [1, 3]]);

    expect(result.bandwidthMatrix).toEqual([
      [null, null, 1, null],
      [null, null, null, 1],
      [1, null, null, null],
      [null, 1, null, null],
    ]);
  });
});
