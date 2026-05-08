// ======== 编辑器 Zustand Store ========
// 单一状态源：所有编辑器操作（放置、移动、旋转、删除、撤销/重做）均通过此 store 流转
// previewRotation 存储在 store 中，使 GhostPreview、useEditorActions、useKeyboard 均可访问
//
// 中间件组合：persist(temporal(creator)) —— 外层 persist 写 localStorage，内层 temporal 管 undo
// 持久化字段（partialize）：placedItems / placedEdges / areaLevel / gridSize / isEditorReady
//                       + chrome（catalogCollapsed/catalogTop/costPanelOpen/floatbarX/activeCategory）
//                       + inventory
// 不持久化：undo 历史、工具模式、选中项、预览旋转、热栏、stageScale、flashItemIds、activeFixtureId、overwriteEnabled
// Phase 9 plan 02 新增运行时瞬态字段（不入 persist，不入 temporal — D-08）：
//   activeSubGenreId / searchActiveBeforeQuery

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { temporal } from 'zundo'
import { DESIGN_STORAGE_KEY } from '../persistence/storageKey'
import type {
  EditorState,
  PlacedItem,
  PlacedEdge,
  ToolMode,
  AreaLevel,
  Rotation,
  ItemLayer,
  Fixture,
} from '../types/editor'
import { getGridSize } from '../data/areaLevels'
import { tileKey, getEffectiveSize, isInBounds } from '../utils/grid'
import { getBrushInteraction, getGroundSubtype } from '../data/fixtures'
import { getEdgesForTileFootprint } from '../utils/edgeRasterize'

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
    // 系统物品（house / gate）占据物理空间，无视层级 —— 任何层放置都要绕开
    if (item.layer !== layer && !item.isSystem) continue
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

/**
 * 围栏碰撞专用占用网格：包含所有占据物理空间的物品，
 * 排除道路、颜色瓷砖、地毯（这些与围栏共存）
 */
export function buildFenceCollisionGrid(
  items: Record<string, PlacedItem>,
  fixtureMap: Map<number, Fixture>,
): OccupancyGrid {
  const grid: OccupancyGrid = new Map()
  for (const item of Object.values(items)) {
    const fixture = fixtureMap.get(item.fixtureId)
    if (!fixture) continue
    const sub = getGroundSubtype(fixture)
    if (sub === 'road' || sub === 'color-tile' || sub === 'rug') continue
    // fence 本身不占格子空间（它们在边缘上），也跳过
    if (sub === 'fence') continue
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
  edgeSet?: Set<string>,
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
  // 围栏碰撞：脚印边界上的边若被占据则阻止
  if (edgeSet) {
    const borderEdges = getEdgesForTileFootprint(x, y, width, depth)
    for (const ek of borderEdges) {
      if (edgeSet.has(ek)) return false
    }
  }
  return true
}

// ======== Store 实现 ========

export const useEditorStore = create<EditorState>()(
  persist(
    temporal(
    (set, get) => ({
      // -- 核心状态 --
      areaLevel: 1 as AreaLevel,
      gridSize: { width: 36, depth: 36 },
      placedItems: {},
      // ---------- Phase 02.1 边数据 ----------
      placedEdges: {} as Record<string, PlacedEdge>,
      selectedItemId: null,
      toolMode: 'select' as ToolMode,
      activeFixtureId: null,
      overwriteEnabled: false,
      previewRotation: 0 as Rotation,
      hotbar: Array(9).fill(null).map(() => ({ fixtureId: null })),
      isEditorReady: false,
      flashItemIds: [],
      stageScale: 1,
      inventory: {} as Record<number, number>,

      // Phase 7 chrome state（UI-only，进入 persist，不进入 temporal）
      catalogCollapsed: false,
      catalogTop: 76,
      costPanelOpen: false,
      floatbarX: 0.5,
      activeCategory: 'all' as number | 'all',
      // Phase 9 plan 02: transient（不入 persist，不入 temporal）— D-08
      activeSubGenreId: null as number | null,
      searchActiveBeforeQuery: null as
        | { mainId: number | 'all'; subId: number | null }
        | null,
      // Phase 7 plan 02: 自动保存时间戳（运行时态，由 persist storage 包装器写入；不进入 partialize）
      lastSaveAt: null as number | null,

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

      // ---------- Phase 02.1 边操作 ----------
      placeEdge: (edge: Omit<PlacedEdge, 'id'>) =>
        set((state) => {
          const id = crypto.randomUUID()
          return {
            placedEdges: {
              ...state.placedEdges,
              [id]: { ...edge, id },
            },
          }
        }),

      removeEdge: (id: string) =>
        set((state) => {
          if (!(id in state.placedEdges)) return state
          const next = { ...state.placedEdges }
          delete next[id]
          return { placedEdges: next }
        }),

      clearEdges: () => set({ placedEdges: {} }),

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
        // D-23: 自动放置必要建筑（门和房子）—— 用 mysekaiFixtures.json 的真实 ID
        // 门: id=900002 "ゲート"（mysekaiFixtureType="gate"，gridSize 8×2×6）
        // 房: id=136   "ナチュラルな家"（mysekaiFixtureType="system"，gridSize 12×12×13）
        const SYSTEM_GATE_ID = 900002
        const SYSTEM_HOUSE_ID = 136
        const GATE_W = 8
        const GATE_D = 2
        const HOUSE_W = 12
        const HOUSE_D = 12

        const gateId = crypto.randomUUID()
        const houseId = crypto.randomUUID()
        // 门贴底边居中
        const gateX = Math.floor((grid.width - GATE_W) / 2)
        const gateY = grid.depth - GATE_D
        // 房子在区域上半，水平居中，距门保留缓冲
        const houseX = Math.floor((grid.width - HOUSE_W) / 2)
        const houseY = Math.floor((grid.depth - HOUSE_D) / 2) - 4

        set({
          areaLevel: level,
          gridSize: grid,
          isEditorReady: true,
          // Phase 02.1 Pitfall 6: startEditor 重置必须同步清空 placedEdges
          placedEdges: {},
          placedItems: {
            [gateId]: {
              id: gateId,
              fixtureId: SYSTEM_GATE_ID,
              x: gateX,
              y: gateY,
              rotation: 0 as Rotation,
              layer: 'furniture' as const,
              isSystem: true,
            },
            [houseId]: {
              id: houseId,
              fixtureId: SYSTEM_HOUSE_ID,
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

      // Phase 4：库存条目（quantity<=0 -> 删除该 key 保持对象稀疏）
      setInventoryQuantity: (materialId: number, quantity: number) =>
        set((state) => {
          const next = { ...state.inventory }
          if (!Number.isFinite(quantity) || quantity <= 0) {
            delete next[materialId]
          } else {
            next[materialId] = Math.floor(quantity)
          }
          return { inventory: next }
        }),

      clearInventory: () => set({ inventory: {} }),

      // Phase 7 chrome setters
      setCatalogCollapsed: (collapsed) => set({ catalogCollapsed: collapsed }),
      toggleCatalogCollapsed: () =>
        set((s) => ({ catalogCollapsed: !s.catalogCollapsed })),
      setCatalogTop: (top) => set({ catalogTop: top }),
      setCostPanelOpen: (open) => set({ costPanelOpen: open }),
      toggleCostPanel: () => set((s) => ({ costPanelOpen: !s.costPanelOpen })),
      setFloatbarX: (x) => set({ floatbarX: Math.max(0, Math.min(1, x)) }),
      // Phase 9 plan 02: 切换 mainGenre 时重置 subGenre（避免悬挂 id —— RESEARCH pitfall §2）
      setActiveCategory: (category) =>
        set({ activeCategory: category, activeSubGenreId: null }),
      setActiveSubGenreId: (id) => set({ activeSubGenreId: id }),
      setSearchActiveBeforeQuery: (snap) =>
        set({ searchActiveBeforeQuery: snap }),
    }),
    {
      limit: 50, // 超过 GRID-09 最低 20 步要求
      // 只追踪 placedItems 和 placedEdges 变化，不追踪 UI 状态
      // Phase 02.1 Pitfall 2: partialize 必须同时包含 placedEdges，
      // 否则边操作将从 undo 历史静默丢失
      partialize: (state) => ({
        placedItems: state.placedItems,
        placedEdges: state.placedEdges,
      }),
      // 判断 partialized 状态是否相同，避免 UI 变更产生冗余历史
      equality: (pastState, currentState) =>
        pastState.placedItems === currentState.placedItems &&
        pastState.placedEdges === currentState.placedEdges,
    },
  ),
    {
      name: DESIGN_STORAGE_KEY,
      // Phase 9 plan 02: v3 → v4 — activeCategory 字符串 → number | 'all'
      version: 4,
      // Phase 7 plan 02: 包装 localStorage 以在每次 setItem 后捕获 lastSaveAt
      // 注意：不能让 lastSaveAt 进入 partialize（否则形成 setState→setItem→setState 死循环）
      storage: createJSONStorage(() => ({
        getItem: (name: string) => localStorage.getItem(name),
        setItem: (name: string, value: string) => {
          localStorage.setItem(name, value)
          // 顶栏 AutosavePill 通过 store 订阅读取该字段
          try {
            useEditorStore.setState({ lastSaveAt: Date.now() })
          } catch {
            /* during init: store 未就绪，跳过 */
          }
        },
        removeItem: (name: string) => localStorage.removeItem(name),
      })),
      // Phase 7: 老 payload (version<2) 缺少 chrome 字段时填默认值；
      // version<3 把离散的 floatbarPosition 'left'|'center'|'right' 转换为连续 floatbarX (0..1)，
      // 并补齐 catalogTop 默认值
      migrate: (persistedState: any, fromVersion: number) => {
        let migrated = persistedState ?? {}
        if (fromVersion < 2) {
          migrated = {
            ...migrated,
            catalogCollapsed: migrated.catalogCollapsed ?? false,
            costPanelOpen: migrated.costPanelOpen ?? false,
            floatbarPosition: migrated.floatbarPosition ?? 'center',
            activeCategory: migrated.activeCategory ?? 'all',
          }
        }
        if (fromVersion < 3) {
          const oldPos = migrated.floatbarPosition
          const fraction =
            oldPos === 'left' ? 0.1 : oldPos === 'right' ? 0.9 : 0.5
          // 删除旧字段，写入新字段
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { floatbarPosition: _legacy, ...rest } = migrated
          migrated = {
            ...rest,
            floatbarX: typeof migrated.floatbarX === 'number' ? migrated.floatbarX : fraction,
            catalogTop: typeof migrated.catalogTop === 'number' ? migrated.catalogTop : 76,
          }
        }
        if (fromVersion < 4) {
          // Phase 9 plan 02: Phase 7 Phase7Category 字符串无干净 mainGenreId 映射；
          // 统一兜底到 'all'（D-04 / CATL-08 / RESEARCH Code Example 4）
          migrated = { ...migrated, activeCategory: 'all' as const }
        }
        return migrated
      },
      // 只持久化用户设计数据 —— 不含 undo 历史、UI 临时状态
      // D-03: placedItems + placedEdges + areaLevel
      // 附加 gridSize（Pitfall 7：避免 rehydrate 后 gridSize 与 areaLevel 失配）
      // 附加 isEditorReady（Pitfall 2：有已保存内容时跳过 WelcomeScreen）
      partialize: (state) => ({
        placedItems: state.placedItems,
        placedEdges: state.placedEdges,
        areaLevel: state.areaLevel,
        gridSize: state.gridSize,
        // Phase 4: 库存独立于设计数据持久化（用户的真实背包）
        inventory: state.inventory,
        isEditorReady:
          Object.keys(state.placedItems).length > 0 ||
          Object.keys(state.placedEdges).length > 0
            ? true
            : state.isEditorReady,
        // Phase 7 chrome state（UI-only）
        catalogCollapsed: state.catalogCollapsed,
        catalogTop: state.catalogTop,
        costPanelOpen: state.costPanelOpen,
        floatbarX: state.floatbarX,
        activeCategory: state.activeCategory,
      }),
      // Pitfall 2：rehydrate 后若有设计数据，强制 isEditorReady=true
      // 保护对面：即使旧 payload 里 isEditorReady=false（例如用户首次写入前手动编辑了 localStorage）
      // 也能正确跳过 WelcomeScreen
      onRehydrateStorage: () => (rehydrated) => {
        if (!rehydrated) return
        const hasDesign =
          Object.keys(rehydrated.placedItems ?? {}).length > 0 ||
          Object.keys(rehydrated.placedEdges ?? {}).length > 0
        if (hasDesign && !rehydrated.isEditorReady) {
          rehydrated.isEditorReady = true
        }
      },
      // 预留 migrate 钩子 —— 未来 version=2 时填充
      // migrate: (persistedState, version) => { ... },
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

// Phase 02.1: 快照同时包含 placedItems 和 placedEdges，与 partialize 形状保持一致
interface StrokeSnapshot {
  placedItems: Record<string, PlacedItem>
  placedEdges: Record<string, PlacedEdge>
}

let _preStrokeSnapshot: StrokeSnapshot | null = null

const TEMPORAL_LIMIT = 50 // 必须与上方 temporal({ limit }) 保持一致

export function startStrokeBatch(): void {
  const s = useEditorStore.getState()
  _preStrokeSnapshot = {
    placedItems: s.placedItems,
    placedEdges: s.placedEdges,
  }
  useEditorStore.temporal.getState().pause()
}

export function endStrokeBatch(): void {
  const temporal = useEditorStore.temporal.getState()
  // 幂等：仅在 tracking 处于暂停 **且** 有活动的 stroke 快照时才 commit
  if (!temporal.isTracking && _preStrokeSnapshot !== null) {
    const snapshot = _preStrokeSnapshot
    _preStrokeSnapshot = null
    temporal.resume()
    // 直接向 temporal store 写入一条 pastState（stroke 开始前的快照）
    // 并清空 futureStates —— 这复刻了 zundo _handleSet 的行为但绕过其 pastState 捕获逻辑
    const current = temporal.pastStates
    const next =
      current.length >= TEMPORAL_LIMIT
        ? [...current.slice(1), snapshot]
        : [...current, snapshot]
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
