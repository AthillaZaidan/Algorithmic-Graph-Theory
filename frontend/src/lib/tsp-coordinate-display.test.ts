import { expect, test } from "bun:test";
import { getTspCoordinateDisplayEdges } from "./tsp-coordinate-display";

test("does not build a complete graph for large coordinate presets", () => {
  const coordinates = Array.from({ length: 514 }, (_, i) => ({ x: i, y: i }));

  expect(getTspCoordinateDisplayEdges(coordinates, [])).toEqual([]);
});

test("uses tour edges for large coordinate presets after TSP runs", () => {
  const coordinates = Array.from({ length: 514 }, (_, i) => ({ x: i, y: i }));
  const tourEdges = [[0, 1, 10], [1, 2, 20]];

  expect(getTspCoordinateDisplayEdges(coordinates, [], tourEdges)).toBe(tourEdges);
});

test("keeps complete graph preview for small manual coordinate inputs", () => {
  const coordinates = [{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 6, y: 8 }];

  expect(getTspCoordinateDisplayEdges(coordinates, [])).toEqual([
    [0, 1, 5],
    [0, 2, 10],
    [1, 2, 5],
  ]);
});
