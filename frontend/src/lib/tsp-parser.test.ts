import { expect, test } from "bun:test";
import { parseTspFile } from "./tsp-parser";

test("parses EUC_2D TSPLIB coordinate files", () => {
  const parsed = parseTspFile(`
NAME : mini
TYPE : TSP
DIMENSION : 3
EDGE_WEIGHT_TYPE : EUC_2D
NODE_COORD_SECTION
1 0 13
2 0 26
3 5 26
EOF
`);

  expect(parsed.error).toBeUndefined();
  expect(parsed.name).toBe("mini");
  expect(parsed.edgeWeightType).toBe("EUC_2D");
  expect(parsed.labels).toEqual(["1", "2", "3"]);
  expect(parsed.coordinates).toEqual([
    { x: 0, y: 13 },
    { x: 0, y: 26 },
    { x: 5, y: 26 },
  ]);
});

test("rejects unsupported TSPLIB edge weight types", () => {
  const parsed = parseTspFile(`
NAME : geo
TYPE : TSP
DIMENSION : 1
EDGE_WEIGHT_TYPE : GEO
NODE_COORD_SECTION
1 0 0
EOF
`);

  expect(parsed.error).toContain("belum didukung");
});

test("infers map points from scaled geographic TSPLIB coordinates", () => {
  const parsed = parseTspFile(`
NAME : lu-mini
TYPE : TSP
DIMENSION : 2
EDGE_WEIGHT_TYPE : EUC_2D
NODE_COORD_SECTION
1 49525.5556 5940.5556
2 50155.5556 6053.3333
EOF
`);

  expect(parsed.error).toBeUndefined();
  expect(parsed.mapPoints).toEqual([
    { name: "1", lat: 49.5255556, lng: 5.9405556 },
    { name: "2", lat: 50.1555556, lng: 6.0533333 },
  ]);
});

test("does not infer map points for abstract small EUC_2D coordinates", () => {
  const parsed = parseTspFile(`
NAME : abstract
TYPE : TSP
DIMENSION : 2
EDGE_WEIGHT_TYPE : EUC_2D
NODE_COORD_SECTION
1 0 13
2 107 27
EOF
`);

  expect(parsed.mapPoints).toBeUndefined();
});
