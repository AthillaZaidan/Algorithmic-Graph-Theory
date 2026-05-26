import { describe, expect, test } from "bun:test";
import { solveIslands } from "./islands";

describe("solveIslands", () => {
  test("counts islands from star grid used by the UI", () => {
    const result = solveIslands(["**.", ".*.", "..*"]);

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.labels).toEqual([
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 2],
    ]);
  });

  test("also accepts numeric land cells for deployed fallback compatibility", () => {
    const result = solveIslands(["110", "010", "001"]);

    expect(result.count).toBe(2);
    expect(result.labels).toEqual([
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 2],
    ]);
  });
});
