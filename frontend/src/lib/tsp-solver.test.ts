import { describe, expect, test } from "bun:test";
import { haversineKm, solveTspCoordinate } from "./tsp-solver";

describe("tsp coordinate solver", () => {
  test("uses haversine kilometers for geographic coordinates", () => {
    const jakarta = { x: 106.8456, y: -6.2088 };
    const bandung = { x: 107.6191, y: -6.9175 };

    expect(haversineKm(jakarta, bandung)).toBeGreaterThan(110);
    expect(haversineKm(jakarta, bandung)).toBeLessThan(130);
  });

  test("returns kilometer unit when solving a geographic tour", () => {
    const result = solveTspCoordinate([
      { x: 106.8456, y: -6.2088 },
      { x: 107.6191, y: -6.9175 },
      { x: 110.3695, y: -7.7956 },
    ], 0, true);

    expect(result.distanceUnit).toBe("km");
    expect(result.totalCost).toBeGreaterThan(800);
  });

  test("best multi-start is no worse than nearest neighbor on the same points", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 3 },
      { x: 0, y: 3 },
      { x: 1.5, y: 10 },
      { x: 1.5, y: -4 },
    ];

    const nearest = solveTspCoordinate(points, 0, false, "nearest-2opt");
    const best = solveTspCoordinate(points, 0, false, "best-multistart");

    expect(best.algorithm).toBe("best-multistart");
    expect(best.totalCost).toBeLessThanOrEqual(nearest.totalCost + 1e-9);
  });
});
