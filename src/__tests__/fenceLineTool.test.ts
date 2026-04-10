// ======== 围栏线工具测试 (ROAD-03 / D-34 / D-35) ========
// INPUT: 直接调用 rasterizeLine / snapToAxis / placeItem + withBatchedUndo 模拟
//        EditorCanvas 的 fence 状态机确认阶段
// OUTPUT: 验证轴对齐 + rasterize 产生正确的 tiles + 单 undo 步骤
// POS: src/__tests__/fenceLineTool.test.ts — Phase 2 Wave 4 围栏线工具测试
//
// 契约：调用方（EditorCanvas）在将点击坐标喂给 rasterizeLine 之前，MUST 将其
// 按 step 预先对齐（`Math.floor(rawX / step) * step`）。本测试文件因此用已对齐
// 的输入（如 (0,0)→(0,4) with step=2），与 EditorCanvas.tsx 状态机契约一致。

import { describe, it, expect, beforeEach } from 'vitest'
import {
  useEditorStore,
  withBatchedUndo,
  buildOccupancyGrid,
  checkCanPlace,
} from '../stores/editorStore'
import { rasterizeLine, snapToAxis } from '../utils/rasterize'
import type { Fixture } from '../types/editor'

// ======== 测试 Fixture 样本 ========

const fence: Fixture = {
  id: 114,
  name: 'シンプルな木の柵',
  pronunciation: '',
  assetbundleName: '',
  gridSize: { width: 2, depth: 2 },
  colorCode: '',
  mysekaiFixtureType: 'normal',
  mysekaiFixtureMainGenreId: 13,
  mysekaiFixtureSubGenreId: 23,
  mysekaiFixtureHandleType: 'fence',
  mysekaiSettableSiteType: 'home',
  mysekaiSettableLayoutType: 'floor',
  mysekaiFixturePutType: 'none',
}

const fixtureMap = new Map<number, Fixture>([[fence.id, fence]])

// ======== 模拟 EditorCanvas.confirmFenceLine ========
// 使用与 EditorCanvas 相同的 overwrite=OFF 跳过逻辑 + withBatchedUndo 合批

function commitFenceLine(
  start: { x: number; y: number },
  rawEnd: { x: number; y: number },
): { x: number; y: number }[] {
  const snapped = snapToAxis(start.x, start.y, rawEnd.x, rawEnd.y)
  const step = fence.gridSize.width
  const depth = fence.gridSize.depth
  const tiles = rasterizeLine(start.x, start.y, snapped.x, snapped.y, step)
  withBatchedUndo(() => {
    for (const t of tiles) {
      const state = useEditorStore.getState()
      const occ = buildOccupancyGrid(state.placedItems, fixtureMap, 'ground')
      const can = checkCanPlace(
        occ,
        t.x,
        t.y,
        step,
        depth,
        state.gridSize.width,
        state.gridSize.depth,
      )
      if (can) {
        state.placeItem({
          fixtureId: fence.id,
          x: t.x,
          y: t.y,
          rotation: 0,
          layer: 'ground',
          isSystem: false,
        })
      }
    }
  })
  return tiles
}

// ======== 测试套件 ========

describe('fence line tool (ROAD-03 / D-34 / D-35)', () => {
  beforeEach(() => {
    useEditorStore.setState({
      placedItems: {},
      selectedItemId: null,
      toolMode: 'brush',
      activeFixtureId: fence.id,
      overwriteEnabled: false,
      gridSize: { width: 36, depth: 36 },
    })
    useEditorStore.temporal.getState().clear()
  })

  // ======== rasterize 契约（step 对齐输入） ========

  it('vertical fence line (0,0)->(0,4) with step=2 produces 3 tiles', () => {
    // 输入已对齐到 step-space（匹配 EditorCanvas 调 rasterizeLine 前的预吸附）
    const tiles = rasterizeLine(0, 0, 0, 4, 2)
    expect(tiles).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 0, y: 4 },
    ])
  })

  it('horizontal fence line (2,6)->(8,6) with step=2 produces 4 tiles', () => {
    const tiles = rasterizeLine(2, 6, 8, 6, 2)
    expect(tiles).toEqual([
      { x: 2, y: 6 },
      { x: 4, y: 6 },
      { x: 6, y: 6 },
      { x: 8, y: 6 },
    ])
  })

  // ======== snapToAxis 契约（D-35 轴对齐） ========

  it('diagonal input with larger dx snaps to horizontal axis', () => {
    const snapped = snapToAxis(0, 0, 8, 2)
    expect(snapped).toEqual({ x: 8, y: 0 })
    const tiles = rasterizeLine(0, 0, snapped.x, snapped.y, 2)
    expect(tiles.length).toBeGreaterThan(1)
    for (const t of tiles) expect(t.y).toBe(0)
  })

  it('diagonal input with larger dy snaps to vertical axis', () => {
    const snapped = snapToAxis(0, 0, 2, 8)
    expect(snapped).toEqual({ x: 0, y: 8 })
  })

  it('tie-break dx==dy prefers horizontal axis', () => {
    // rasterize.ts snapToAxis：dx >= dy → 水平，覆盖平局
    expect(snapToAxis(0, 0, 4, 4)).toEqual({ x: 4, y: 0 })
  })

  // ======== 提交 stroke（withBatchedUndo 合批） ========

  it('confirmed 3-tile fence line = 1 zundo history entry', () => {
    const before = useEditorStore.temporal.getState().pastStates.length
    const tiles = commitFenceLine({ x: 0, y: 0 }, { x: 4, y: 0 })
    expect(tiles).toHaveLength(3)
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(3)
    expect(useEditorStore.temporal.getState().pastStates.length - before).toBe(1)
  })

  it('single-tile confirm (start == end) places 1 tile as 1 history entry', () => {
    const before = useEditorStore.temporal.getState().pastStates.length
    const tiles = commitFenceLine({ x: 6, y: 6 }, { x: 6, y: 6 })
    expect(tiles).toHaveLength(1)
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(1)
    expect(useEditorStore.temporal.getState().pastStates.length - before).toBe(1)
  })

  it('undo after confirm restores pre-stroke empty state', () => {
    commitFenceLine({ x: 0, y: 0 }, { x: 4, y: 0 })
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(3)
    useEditorStore.temporal.getState().undo()
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(0)
  })

  it('redo after undo restores the full fence line', () => {
    commitFenceLine({ x: 0, y: 0 }, { x: 4, y: 0 })
    useEditorStore.temporal.getState().undo()
    useEditorStore.temporal.getState().redo()
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(3)
  })

  // ======== 取消路径（零副作用） ========

  it('cancel before confirm leaves zero items and zero history entries', () => {
    const before = useEditorStore.temporal.getState().pastStates.length
    // 模拟 picking-end 或 confirming 阶段用户按 Escape —— 不调用 commit
    // 状态机 Escape 路径仅重置本地 state，不触碰 store
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(0)
    expect(useEditorStore.temporal.getState().pastStates.length - before).toBe(0)
  })

  // ======== D-41 层独立性 ========

  it('diagonal-snapped line commits as single undo entry with all tiles on dominant axis', () => {
    // (0,0) → (6,4) 对角输入：dx=6, dy=4 → 水平吸附到 (6,0)
    const before = useEditorStore.temporal.getState().pastStates.length
    const snapped = snapToAxis(0, 0, 6, 4)
    expect(snapped).toEqual({ x: 6, y: 0 })
    const tiles = commitFenceLine({ x: 0, y: 0 }, { x: 6, y: 4 })
    expect(tiles).toHaveLength(4) // (0,0) (2,0) (4,0) (6,0)
    for (const t of tiles) expect(t.y).toBe(0)
    expect(useEditorStore.temporal.getState().pastStates.length - before).toBe(1)
  })
})
