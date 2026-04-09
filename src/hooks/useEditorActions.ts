// ======== 编辑器复合动作 Hook ========
// INPUT: fixtureMap (家具数据映射)
// OUTPUT: handleCanvasClick (画布点击处理), handleMoveItem (移动验证处理)
// POS: src/hooks/useEditorActions.ts — 组合 store 动作与碰撞验证逻辑

import { useCallback } from 'react'
import { useEditorStore, buildOccupancyGrid, checkCanPlace } from '../stores/editorStore'
import { getEffectiveSize, tileKey } from '../utils/grid'
import { getItemLayer } from '../data/fixtures'
import type { Fixture, PlacedItem } from '../types/editor'

// ======== 辅助函数：查找指定位置的物品 ========

export function findItemAtPosition(
  placedItems: Record<string, PlacedItem>,
  fixtureMap: Map<number, Fixture>,
  gridX: number,
  gridY: number,
): PlacedItem | null {
  // 家具层优先（在上层），再检查地面层
  let groundItem: PlacedItem | null = null

  for (const item of Object.values(placedItems)) {
    const fixture = fixtureMap.get(item.fixtureId)
    if (!fixture) continue
    const [w, d] = getEffectiveSize(fixture.gridSize, item.rotation)
    if (gridX >= item.x && gridX < item.x + w && gridY >= item.y && gridY < item.y + d) {
      if (item.layer === 'furniture') return item // 家具层优先返回
      groundItem = item
    }
  }

  return groundItem
}

// ======== 辅助函数：覆盖模式 — 移除占位物品 ========

function removeItemsInFootprint(
  x: number,
  y: number,
  w: number,
  d: number,
  occupancy: Map<string, string>,
  removeItem: (id: string) => void,
) {
  const idsToRemove = new Set<string>()
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < d; dy++) {
      const key = tileKey(x + dx, y + dy)
      const occupantId = occupancy.get(key)
      if (occupantId) idsToRemove.add(occupantId)
    }
  }
  for (const id of idsToRemove) {
    removeItem(id)
  }
}

// ======== 主 Hook ========

export function useEditorActions(fixtureMap: Map<number, Fixture>) {
  const handleCanvasClick = useCallback(
    (gridX: number, gridY: number) => {
      const state = useEditorStore.getState()
      const { toolMode, activeFixtureId, overwriteEnabled, previewRotation } = state

      if (toolMode === 'stamp' && activeFixtureId !== null) {
        const fixture = fixtureMap.get(activeFixtureId)
        if (!fixture) return
        const layer = getItemLayer(fixture)
        // previewRotation 从 store.getState() 中读取，避免闭包过期
        const [w, d] = getEffectiveSize(fixture.gridSize, previewRotation)
        const occupancy = buildOccupancyGrid(state.placedItems, fixtureMap, layer)

        if (overwriteEnabled) {
          // 覆盖模式：先移除占位物品
          removeItemsInFootprint(gridX, gridY, w, d, occupancy, state.removeItem)
          // 重新构建占用网格（物品已被移除）
          const freshOccupancy = buildOccupancyGrid(
            useEditorStore.getState().placedItems,
            fixtureMap,
            layer,
          )
          if (!checkCanPlace(freshOccupancy, gridX, gridY, w, d, state.gridSize.width, state.gridSize.depth)) {
            return // 系统物品无法被覆盖
          }
        } else {
          if (!checkCanPlace(occupancy, gridX, gridY, w, d, state.gridSize.width, state.gridSize.depth)) {
            return // 被阻挡 — 鬼影为红色
          }
        }

        state.placeItem({
          fixtureId: activeFixtureId,
          x: gridX,
          y: gridY,
          rotation: previewRotation,
          layer,
          isSystem: false,
        })
        // Stamp 模式持续 (D-06) — 不重置 activeFixtureId
      }

      if (toolMode === 'remove') {
        // 查找点击位置的物品
        const itemAtPos = findItemAtPosition(state.placedItems, fixtureMap, gridX, gridY)
        if (itemAtPos) state.removeItem(itemAtPos.id)
      }

      if (toolMode === 'select') {
        // 查找点击位置的物品进行选择
        const itemAtPos = findItemAtPosition(state.placedItems, fixtureMap, gridX, gridY)
        state.setSelectedItem(itemAtPos?.id ?? null)
      }
    },
    [fixtureMap],
  )

  const handleMoveItem = useCallback(
    (itemId: string, newX: number, newY: number) => {
      const state = useEditorStore.getState()
      const item = state.placedItems[itemId]
      if (!item) return
      const fixture = fixtureMap.get(item.fixtureId)
      if (!fixture) return
      const [w, d] = getEffectiveSize(fixture.gridSize, item.rotation)
      const occupancy = buildOccupancyGrid(state.placedItems, fixtureMap, item.layer)
      if (
        checkCanPlace(occupancy, newX, newY, w, d, state.gridSize.width, state.gridSize.depth, itemId)
      ) {
        state.moveItem(itemId, newX, newY)
      }
    },
    [fixtureMap],
  )

  return { handleCanvasClick, handleMoveItem }
}
