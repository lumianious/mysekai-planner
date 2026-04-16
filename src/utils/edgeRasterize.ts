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
import type { OccupancyGrid } from '../stores/editorStore'
import { tileKey } from './grid'

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
 * 返回矩形脚印 (x,y,w,d) 所有相邻边的 edgeKey
 * 用于家具放置时检查是否与已有围栏碰撞
 */
export function getEdgesForTileFootprint(
  x: number, y: number, w: number, d: number,
): string[] {
  const keys: string[] = []
  // 上边 + 下边（水平）
  for (let col = x; col < x + w; col++) {
    keys.push(edgeKey(col, y, 'h'))
    keys.push(edgeKey(col, y + d, 'h'))
  }
  // 左边 + 右边（垂直）
  for (let row = y; row < y + d; row++) {
    keys.push(edgeKey(x, row, 'v'))
    keys.push(edgeKey(x + w, row, 'v'))
  }
  return keys
}

/**
 * 边界校验 + 重复校验 + 可选家具碰撞校验
 * W = gridSize.width, D = gridSize.depth
 * occupancyGrid 传入时额外检查相邻格子是否被家具占据
 */
export function checkCanPlaceEdge(
  set: Set<string>,
  x: number,
  y: number,
  o: EdgeOrientation,
  gridW: number,
  gridD: number,
  occupancyGrid?: OccupancyGrid,
): boolean {
  if (o === 'h') {
    if (x < 0 || x >= gridW || y < 0 || y > gridD) return false
  } else {
    if (x < 0 || x > gridW || y < 0 || y >= gridD) return false
  }
  if (set.has(edgeKey(x, y, o))) return false
  // 家具碰撞：边相邻的两个格子若被家具占据则阻止
  if (occupancyGrid) {
    if (o === 'h') {
      // 水平边 (x,y,'h') 相邻格子 (x,y) 下方 和 (x,y-1) 上方
      if (occupancyGrid.has(tileKey(x, y))) return false
      if (y - 1 >= 0 && occupancyGrid.has(tileKey(x, y - 1))) return false
    } else {
      // 垂直边 (x,y,'v') 相邻格子 (x,y) 右方 和 (x-1,y) 左方
      if (occupancyGrid.has(tileKey(x, y))) return false
      if (x - 1 >= 0 && occupancyGrid.has(tileKey(x - 1, y))) return false
    }
  }
  return true
}
