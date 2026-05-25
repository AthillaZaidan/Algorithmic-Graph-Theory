import { describe, expect, test } from "bun:test";
import { solveBandwidth } from "./bandwidth";

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

describe("solveBandwidth", () => {
  test("uses exact bandwidth for C5", () => {
    const result = solveBandwidth(5, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]);

    expect(result.initialBandwidth).toBe(4);
    expect(result.bandwidth).toBe(2);
    expect(result.isOptimal).toBe(true);
  });

  test("uses Hales ordering for Q4 hypercube", () => {
    const result = solveBandwidth(16, hypercubeEdges(4));

    expect(result.initialBandwidth).toBe(8);
    expect(result.bandwidth).toBe(7);
    expect(result.isOptimal).toBe(true);
    expect(result.method).toBe("hales_hypercube");
  });

  test("uses optimal Hales ordering for Q5 hypercube", () => {
    const result = solveBandwidth(32, hypercubeEdges(5));

    expect(result.bandwidth).toBe(13);
    expect(result.isOptimal).toBe(true);
    expect(result.method).toBe("hales_hypercube");
  });

  test("uses optimal Hales ordering for Q6 hypercube", () => {
    const result = solveBandwidth(64, hypercubeEdges(6));

    expect(result.bandwidth).toBe(23);
    expect(result.isOptimal).toBe(true);
    expect(result.method).toBe("hales_hypercube");
  });
});
