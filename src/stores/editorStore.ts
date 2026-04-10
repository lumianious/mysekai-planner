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
import { getBrushInteraction } from '../data/fixtures'

// ======== 旋转辅助 ========

const ROTATIONS: Rotation[] = [0, 90, 180, 270]

function cycleRotation(current: Rotation, direction: 'cw' | 'ccw'): Rotation {
  const idx = ROTATIONS.indexOf(current)
  const newIdx = direction === 'cw' ? (idx + 1) % 4 : (idx + 3) % 4
  return ROTATIONS[newIdx]
}

// ======== 目录悬停追踪（模块级，无 re-render） ========

let _hoveredFixtureId: number | null = null
export function setHoveredFixtureId(id: number | null) { _hoveredFixtureId = id }
export function getHoveredFixtureId() { return _hoveredFixtureId }

// ======== 工具模式路由 ========
// INPUT: fixture（可为 null）
// OUTPUT: 'brush' | 'stamp' | 'select'
// POS: src/stores/editorStore.ts — 供 setActiveFixture 和 activateHotbar 共享，
//      保证从目录点击或 1-9 热栏激活走同一路由 (RESEARCH 未决问题 2)
//
// 规则（D-30 / D-39）：
//   道 / カラータイル / 柵 → brush（拖拽画刷或线工具，由后续 Wave 3/4 实现）
//   地毯 / 普通家具      → stamp（保留 Phase 1 行为）
//   null                → select

export function pickToolModeForFixture(fixture: Fixture | null): ToolMode {
  if (!fixture) return 'select'
  const interaction = getBrushInteraction(fixture)
  if (interaction !== null) return 'brush'
  return 'stamp'
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
      stageScale: 1,

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

      // D-30 / D-39: 传入 fixture 以让 store 根据 handleType 自动选择 brush vs stamp 模式。
      // 为保持 Phase 1 兼容：fixture 完全省略（undefined）时回退为 stamp，让尚未更新的
      // 调用点仍按 Phase 1 行为工作。fixture === null 则走 pickToolModeForFixture(null)='select'。
      setActiveFixture: (fixtureId: number | null, fixture?: Fixture | null) =>
        set({
          activeFixtureId: fixtureId,
          toolMode:
            fixtureId !== null
              ? fixture === undefined
                ? 'stamp'
                : pickToolModeForFixture(fixture)
              : 'select',
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

      // 与 setActiveFixture 同样：fixture 省略 → stamp（Phase 1 行为），
      // 传 null → 走路由（select），传 Fixture → 按 handleType 路由 brush/stamp。
      activateHotbar: (slot: number, fixture?: Fixture | null) => {
        const state = get()
        const fixtureId = state.hotbar[slot - 1]?.fixtureId
        if (fixtureId !== null && fixtureId !== undefined) {
          set({
            activeFixtureId: fixtureId,
            toolMode:
              fixture === undefined ? 'stamp' : pickToolModeForFixture(fixture),
          })
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

      setStageScale: (scale: number) => set({ stageScale: scale }),
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

// ======== 时间旅行批量操作 (D-43) ========
// INPUT: 一个 stroke 开始和结束标记（供 EditorCanvas 拖拽画刷 / 围栏线工具使用）
// OUTPUT: 拖拽过程中的多次 placeItem/removeItem 调用合并为单个 undo 步骤
// POS: src/stores/editorStore.ts — 封装 zundo 2.3.0 的 pause/resume API
//
// 原理（见 RESEARCH.md §2）：
//   1. startStrokeBatch 捕获 stroke 开始前的 placedItems 快照，再调 temporal.pause()
//      暂停 history 写入
//   2. 调用方在 stroke 内自由 placeItem/removeItem（因 tracking 暂停，无 history 产生）
//   3. endStrokeBatch 调 temporal.resume()，然后直接将 **stroke 开始前的快照** 作为
//      单条 pastState 推入 temporal 历史，使 undo 正确恢复到 stroke 之前。未来历史被清空。
//      这里不能简单调 setState 触发一次记录 —— 那样 zundo 捕获的 pastState 是
//      stroke 结束后的最新状态，undo 无法回到 stroke 之前（见 temporalBatch.test.ts
//      "undo of a batched stroke" 失败推导）。
//
// 幂等性（R-06 清理竞态）：endStrokeBatch 可能被 mouseup + mouseleave + window.blur
// 多次调用；只有第一次（当 tracking 处于暂停 **且** 存在 stroke 快照时）才真正 commit，
// 后续调用为 no-op，不产生重复 history 条目。

let _preStrokeSnapshot: Record<string, PlacedItem> | null = null

const TEMPORAL_LIMIT = 50 // 必须与上方 temporal({ limit }) 保持一致

export function startStrokeBatch(): void {
  _preStrokeSnapshot = useEditorStore.getState().placedItems
  useEditorStore.temporal.getState().pause()
}

export function endStrokeBatch(): void {
  const temporal = useEditorStore.temporal.getState()
  // 幂等：仅在 tracking 处于暂停 **且** 有活动的 stroke 快照时才 commit
  if (!temporal.isTracking && _preStrokeSnapshot !== null) {
    const snapshot = _preStrokeSnapshot
    _preStrokeSnapshot = null
    temporal.resume()
    // 直接向 temporal store 写入一条 pastState（stroke 开始前的 placedItems 快照）
    // 并清空 futureStates —— 这复刻了 zundo _handleSet 的行为但绕过其 pastState 捕获逻辑
    const current = temporal.pastStates
    const next =
      current.length >= TEMPORAL_LIMIT
        ? [...current.slice(1), { placedItems: snapshot }]
        : [...current, { placedItems: snapshot }]
    useEditorStore.temporal.setState({
      pastStates: next,
      futureStates: [],
    })
  }
}

// 便捷同步包装：在单个同步块内完成多次变更
export function withBatchedUndo(fn: () => void): void {
  startStrokeBatch()
  try {
    fn()
  } finally {
    endStrokeBatch()
  }
}
