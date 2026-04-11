/**
 * ============================================================
 * edgeRasterize.ts —— 边数据模型的纯函数工具
 *
 * INPUT:  格点坐标 (x,y)、方向 'h'|'v'、栅格尺寸 (W,D)
 * OUTPUT: PlacedEdge 数组、边占用 Set、边 key 字符串
 * POS:    src/utils/edgeRasterize.ts
 *
 * 坐标约定（Phase 02.1）：
 *   水平边 (x,y,'h')：格子(x,y)的上边
 *     有效范围 0 ≤ x < W, 0 ≤ y ≤ D
 *   垂直边 (x,y,'v')：格子(x,y)的左边
 *     有效范围 0 ≤ x ≤ W, 0 ≤ y < D
 * ============================================================
 */

import type { EdgeOrientation, PlacedEdge } from '../types/editor'

export function edgeKey(x: number, y: number, o: EdgeOrientation): string {
  return `${x},${y},${o}`
}

/**
 * 轴锁定的支配方向判定
 * 平局时 (|dx| === |dy|) 偏向水平，与 rasterize.ts 的 snapToAxis 约定一致
 */
export function dominantAxis(dx: number, dy: number): EdgeOrientation {
  return Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v'
}

/**
 * 在两个格点之间沿指定轴铺设连续边
 * 注意：边的数量 = |endCoord - startCoord|，而非端点数
 * 例如：水平 (0,0)→(3,0) 产生 3 条边 x=0,1,2
 */
export function rasterizeEdgeLine(
  from: { x: number; y: number },
  to: { x: number; y: number },
  axis: EdgeOrientation,
  fixtureId: number,
): Array<Omit<PlacedEdge, 'id'>> {
  const edges: Array<Omit<PlacedEdge, 'id'>> = []
  if (axis === 'h') {
    const y = from.y
    const x0 = Math.min(from.x, to.x)
    const x1 = Math.max(from.x, to.x)
    for (let x = x0; x < x1; x++) {
      edges.push({ fixtureId, x, y, orientation: 'h' })
    }
  } else {
    const x = from.x
    const y0 = Math.min(from.y, to.y)
    const y1 = Math.max(from.y, to.y)
    for (let y = y0; y < y1; y++) {
      edges.push({ fixtureId, x, y, orientation: 'v' })
    }
  }
  return edges
}

export function buildEdgeOccupancySet(
  edges: Record<string, PlacedEdge>,
): Set<string> {
  const set = new Set<string>()
  for (const e of Object.values(edges)) {
    set.add(edgeKey(e.x, e.y, e.orientation))
  }
  return set
}

/**
 * 边界校验 + 重复校验
 * W = gridSize.width, D = gridSize.depth
 */
export function checkCanPlaceEdge(
  set: Set<string>,
  x: number,
  y: number,
  o: EdgeOrientation,
  gridW: number,
  gridD: number,
): boolean {
  if (o === 'h') {
    if (x < 0 || x >= gridW || y < 0 || y > gridD) return false
  } else {
    if (x < 0 || x > gridW || y < 0 || y >= gridD) return false
  }
  return !set.has(edgeKey(x, y, o))
}
