export interface LayerConfig {
  size: number;
  activation: string;
}

export interface NNGraphResult {
  success: true;
  layers: LayerConfig[];
  totalNodes: number;
  totalEdges: number;
  totalParams: number;
  edges: number[][];
  layerNodes: number[][];
  weights: Map<string, number>;
  biases: number[];
}

export function buildNNGraph(layers: LayerConfig[]): NNGraphResult {
  const layerNodes: number[][] = [];
  const edges: number[][] = [];
  const weights = new Map<string, number>();
  const biases: number[] = [];
  let totalParams = 0;
  let offset = 0;

  for (let i = 0; i < layers.length; i++) {
    const nodes: number[] = [];
    for (let j = 0; j < layers[i].size; j++) {
      nodes.push(offset + j);
    }
    layerNodes.push(nodes);

    if (i > 0) {
      for (let j = 0; j < layers[i].size; j++) {
        biases.push(offset + j);
        totalParams++;
      }
    }

    if (i < layers.length - 1) {
      const prevNodes = layerNodes[i];
      const nextSize = layers[i + 1].size;
      for (const u of prevNodes) {
        for (let k = 0; k < nextSize; k++) {
          const v = offset + layers[i].size + k;
          edges.push([u, v]);
          const w = +(Math.random() * 2 - 1).toFixed(3);
          weights.set(`${u},${v}`, w);
          totalParams++;
        }
      }
    }

    offset += layers[i].size;
  }

  const totalNodes = offset;

  return {
    success: true,
    layers,
    totalNodes,
    totalEdges: edges.length,
    totalParams,
    edges,
    layerNodes,
    weights,
    biases,
  };
}
