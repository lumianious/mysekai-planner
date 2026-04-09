// ======== 放置预览有效性检查 ========
// INPUT: 网格坐标、家具信息、旋转角度、图层、已放置物品
// OUTPUT: GhostValidityResult { valid, effectiveWidth, effectiveDepth }
// POS: src/utils/ghostPreview.ts — 纯函数，判断鬼影预览位置是否可放置

import type { PlacedItem, Fixture, Rotation, ItemLayer, GridSize } from '../types/editor'
import { getEffectiveSize } from './grid'
import { buildOccupancyGrid, checkCanPlace } from '../stores/editorStore'

export interface GhostValidityResult {
  valid: boolean
  effectiveWidth: number
  effectiveDepth: number
}

export function checkGhostValidity(
  gridX: number,
  gridY: number,
  fixture: Fixture,
  rotation: Rotation,
  layer: ItemLayer,
  placedItems: Record<string, PlacedItem>,
  fixtureMap: Map<number, Fixture>,
  gridSize: GridSize,
  overwriteEnabled: boolean,
): GhostValidityResult {
  const [w, d] = getEffectiveSize(fixture.gridSize, rotation)

  if (overwriteEnabled) {
    // 覆盖模式下只检查边界
    const inBounds =
      gridX >= 0 &&
      gridY >= 0 &&
      gridX + w <= gridSize.width &&
      gridY + d <= gridSize.depth
    return { valid: inBounds, effectiveWidth: w, effectiveDepth: d }
  }

  const occupancy = buildOccupancyGrid(placedItems, fixtureMap, layer)
  const canPlace = checkCanPlace(
    occupancy, gridX, gridY, w, d,
    gridSize.width, gridSize.depth,
  )
  return { valid: canPlace, effectiveWidth: w, effectiveDepth: d }
}
