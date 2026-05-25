import { expect, test } from "bun:test";
import { getTspTourFrame } from "./tsp-search-animation";

test("reveals final TSP tour nodes and edges one frame at a time", () => {
  const tour = [2, 0, 1, 3, 2];
  const tourEdges = [[2, 0], [0, 1], [1, 3], [3, 2]];

  expect(getTspTourFrame(tour, tourEdges, 0)).toEqual({
    nodes: [2, 0],
    edges: [[2, 0]],
  });
  expect(getTspTourFrame(tour, tourEdges, 2)).toEqual({
    nodes: [2, 0, 1, 3],
    edges: [[2, 0], [0, 1], [1, 3]],
  });
});
