import type { AreaLevel, GridSize } from '../types/editor'

// ======== 区域等级配置 ========
// gridSize 来源: mysekaiSiteLayouts.json (mysekaiLayoutType=floor)
// putCostLimit 来源: mysekaiFixturePutLimitLevels.json (mysekaiSiteCategory="housing_home")
//   游戏中"放置上限"是按 firstPutCost 累计的硬上限，不是物品数

export const AREA_LEVELS: Record<
  AreaLevel,
  { gridSize: GridSize; label: string; putCostLimit: number }
> = {
  1: { gridSize: { width: 36, depth: 36 }, label: 'Lv.1', putCostLimit: 10000 },
  2: { gridSize: { width: 36, depth: 36 }, label: 'Lv.2', putCostLimit: 11000 },
  3: { gridSize: { width: 70, depth: 70 }, label: 'Lv.3', putCostLimit: 11000 },
  4: { gridSize: { width: 90, depth: 90 }, label: 'Lv.4', putCostLimit: 12000 },
  5: { gridSize: { width: 100, depth: 100 }, label: 'Lv.5', putCostLimit: 13000 },
}

export function getGridSize(level: AreaLevel): GridSize {
  return AREA_LEVELS[level].gridSize
}

export function getPutCostLimit(level: AreaLevel): number {
  return AREA_LEVELS[level].putCostLimit
}
