export interface IslandsResult {
  success: true;
  count: number;
  labels: number[][];
}

function isLand(value: string | undefined) {
  return value === "*" || value === "1";
}

export function solveIslands(grid: string[]): IslandsResult {
  const rows = grid.length;
  if (rows === 0) return { success: true, count: 0, labels: [] };

  const cols = Math.max(0, ...grid.map((row) => row.length));
  const labels = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  let count = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isLand(grid[r]?.[c]) || labels[r][c] !== 0) continue;

      count++;
      const queue: [number, number][] = [[r, c]];
      labels[r][c] = count;

      for (let head = 0; head < queue.length; head++) {
        const [cr, cc] = queue[head];
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (
            nr >= 0 &&
            nr < rows &&
            nc >= 0 &&
            nc < cols &&
            labels[nr][nc] === 0 &&
            isLand(grid[nr]?.[nc])
          ) {
            labels[nr][nc] = count;
            queue.push([nr, nc]);
          }
        }
      }
    }
  }

  return { success: true, count, labels };
}
