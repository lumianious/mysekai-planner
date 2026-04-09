// ======== 编辑器 Zustand Store ========
// 单一状态源：所有编辑器操作（放置、移动、旋转、删除、撤销/重做）均通过此 store 流转
// previewRotation 存储在 store 中，使 GhostPreview、useEditorActions、useKeyboard 均可访问

import { create } from 'zustand'
import { temporal } from 'zundo'
import type {
  EditorState,
  PlacedItem,
  ToolMode,
  AreaLevel,
  Rotation,
  ItemLayer,
  Fixture,
} from '../types/editor'
import { getGridSize } from '../data/areaLevels'
import { tileKey, getEffectiveSize, isInBounds } from '../utils/grid'

// ======== 旋转辅助 ========

const ROTATIONS: Rotation[] = [0, 90, 180, 270]

function cycleRotation(current: Rotation, direction: 'cw' | 'ccw'): Rotation {
  const idx = ROTATIONS.indexOf(current)
  const newIdx = direction === 'cw' ? (idx + 1) % 4 : (idx + 3) % 4
  return ROTATIONS[newIdx]
}

// ======== 占用网格 ========

export type OccupancyGrid = Map<string, string> // tileKey -> itemId

export function buildOccupancyGrid(
  items: Record<string, PlacedItem>,
  fixtureMap: Map<number, Fixture>,
  layer: ItemLayer,
): OccupancyGrid {
  const grid: OccupancyGrid = new Map()
  for (const item of Object.values(items)) {
    if (item.layer !== layer) continue
    const fixture = fixtureMap.get(item.fixtureId)
    if (!fixture) continue
    const [w, d] = getEffectiveSize(fixture.gridSize, item.rotation)
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < d; dy++) {
        grid.set(tileKey(item.x + dx, item.y + dy), item.id)
      }
    }
  }
  return grid
}

export function checkCanPlace(
  occupancyGrid: OccupancyGrid,
  x: number,
  y: number,
  width: number,
  depth: number,
  gridWidth: number,
  gridDepth: number,
  excludeItemId?: string,
): boolean {
  // 边界检查
  if (!isInBounds(x, y, width, depth, gridWidth, gridDepth)) return false
  // 碰撞检查
  for (let dx = 0; dx < width; dx++) {
    for (let dy = 0; dy < depth; dy++) {
      const key = tileKey(x + dx, y + dy)
      const occupant = occupancyGrid.get(key)
      if (occupant && occupant !== excludeItemId) return false
    }
  }
  return true
}

// ======== Store 实现 ========

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      // -- 核心状态 --
      areaLevel: 1 as AreaLevel,
      gridSize: { width: 36, depth: 36 },
      placedItems: {},
      selectedItemId: null,
      toolMode: 'select' as ToolMode,
      activeFixtureId: null,
      overwriteEnabled: false,
      previewRotation: 0 as Rotation,
      hotbar: Array(9).fill(null).map(() => ({ fixtureId: null })),
      isEditorReady: false,
      flashItemIds: [],

      // -- 动作 --

      placeItem: (item: Omit<PlacedItem, 'id'>) =>
        set((state) => {
          const id = crypto.randomUUID()
          return {
            placedItems: { ...state.placedItems, [id]: { ...item, id } },
          }
        }),

      moveItem: (id: string, x: number, y: number) =>
        set((state) => {
          const item = state.placedItems[id]
          if (!item) return state
          return {
            placedItems: {
              ...state.placedItems,
              [id]: { ...item, x, y },
            },
          }
        }),

      rotateItem: (id: string, direction: 'cw' | 'ccw') =>
        set((state) => {
          const item = state.placedItems[id]
          if (!item) return state
          return {
            placedItems: {
              ...state.placedItems,
              [id]: { ...item, rotation: cycleRotation(item.rotation, direction) },
            },
          }
        }),

      removeItem: (id: string) =>
        set((state) => {
          // 系统家具不可删除
          if (state.placedItems[id]?.isSystem) return state
          const { [id]: _, ...rest } = state.placedItems
          return { placedItems: rest, selectedItemId: null }
        }),

      setToolMode: (mode: ToolMode) =>
        set({ toolMode: mode, selectedItemId: null }),

      setAreaLevel: (level: AreaLevel) =>
        set({
          areaLevel: level,
          gridSize: getGridSize(level),
        }),

      setActiveFixture: (fixtureId: number | null) =>
        set({
          activeFixtureId: fixtureId,
          toolMode: fixtureId !== null ? 'stamp' : 'select',
          previewRotation: 0 as Rotation, // 新家具重置预览旋转
        }),

      setSelectedItem: (id: string | null) =>
        set({ selectedItemId: id }),

      toggleOverwrite: () =>
        set((state) => ({ overwriteEnabled: !state.overwriteEnabled })),

      rotatePreview: (direction: 'cw' | 'ccw') =>
        set((state) => ({
          previewRotation: cycleRotation(state.previewRotation, direction),
        })),

      assignHotbar: (slot: number, fixtureId: number) =>
        set((state) => {
          const hotbar = [...state.hotbar]
          hotbar[slot - 1] = { fixtureId }
          return { hotbar }
        }),

      activateHotbar: (slot: number) => {
        const state = get()
        const fixtureId = state.hotbar[slot - 1]?.fixtureId
        if (fixtureId !== null && fixtureId !== undefined) {
          set({ activeFixtureId: fixtureId, toolMode: 'stamp' })
        }
      },

      startEditor: (level: AreaLevel) => {
        const grid = getGridSize(level)
        // D-23: 自动放置必要建筑（门和房子）
        // TODO: 从 mysekaiSystemFixtures.json 获取真实 ID
        const gateId = crypto.randomUUID()
        const houseId = crypto.randomUUID()
        const gateX = Math.floor(grid.width / 2) - 1
        const gateY = grid.depth - 3
        const houseX = Math.floor(grid.width / 2) - 2
        const houseY = Math.floor(grid.depth / 2) - 2

        set({
          areaLevel: level,
          gridSize: grid,
          isEditorReady: true,
          placedItems: {
            [gateId]: {
              id: gateId,
              fixtureId: -1, // 占位 ID — 门
              x: gateX,
              y: gateY,
              rotation: 0 as Rotation,
              layer: 'furniture' as const,
              isSystem: true,
            },
            [houseId]: {
              id: houseId,
              fixtureId: -2, // 占位 ID — 房子
              x: houseX,
              y: houseY,
              rotation: 0 as Rotation,
              layer: 'furniture' as const,
              isSystem: true,
            },
          },
        })
      },

      triggerFlash: (ids: string[]) => {
        set({ flashItemIds: ids })
        setTimeout(() => {
          set({ flashItemIds: [] })
        }, 300)
      },
    }),
    {
      limit: 50, // 超过 GRID-09 最低 20 步要求
      // 只追踪 placedItems 变化，不追踪 UI 状态
      partialize: (state) => ({
        placedItems: state.placedItems,
      }),
      // 判断 partialized 状态是否相同，避免非 placedItems 变更产生冗余历史
      equality: (pastState, currentState) =>
        pastState.placedItems === currentState.placedItems,
    },
  ),
)

// ======== 撤销/重做带闪烁动画 ========

function findChangedItemIds(
  before: Record<string, { x: number; y: number; rotation: Rotation }>,
  after: Record<string, { x: number; y: number; rotation: Rotation }>,
): string[] {
  const ids = new Set<string>()
  // 新增或变更的项
  for (const [id, item] of Object.entries(after)) {
    const prev = before[id]
    if (!prev || prev.x !== item.x || prev.y !== item.y || prev.rotation !== item.rotation) {
      ids.add(id)
    }
  }
  // 注意：已删除的项在 after 中不存在，无法对其执行闪烁动画
  return Array.from(ids)
}

export function undoWithFlash() {
  const beforeItems = useEditorStore.getState().placedItems
  useEditorStore.temporal.getState().undo()
  const afterItems = useEditorStore.getState().placedItems
  const changedIds = findChangedItemIds(beforeItems, afterItems)
  if (changedIds.length > 0) {
    useEditorStore.getState().triggerFlash(changedIds)
  }
}

export function redoWithFlash() {
  const beforeItems = useEditorStore.getState().placedItems
  useEditorStore.temporal.getState().redo()
  const afterItems = useEditorStore.getState().placedItems
  const changedIds = findChangedItemIds(beforeItems, afterItems)
  if (changedIds.length > 0) {
    useEditorStore.getState().triggerFlash(changedIds)
  }
}
