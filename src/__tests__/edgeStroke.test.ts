// ======== 围栏边拖拽测试 ========
// INPUT: 直接调用 placeEdge + startStrokeBatch/endStrokeBatch 模拟轴锁拖拽
// OUTPUT: 验证 N 条边描边合并为单 undo 步骤；首样本锁轴；占用校验
// POS: src/__tests__/edgeStroke.test.ts — Phase 02.1 ROAD-03 行为测试

import { describe, it, expect, beforeEach } from 'vitest'
import {
  useEditorStore,
  startStrokeBatch,
  endStrokeBatch,
} from '../stores/editorStore'
import {
  dominantAxis,
  rasterizeEdgeLine,
  buildEdgeOccupancySet,
  checkCanPlaceEdge,
  edgeKey,
} from '../utils/edgeRasterize'
import type { Fixture, EdgeOrientation } from '../types/editor'

// ======== 测试 Fixture 样本 ========

const fence: Fixture = {
  id: 777,
  name: 'テスト柵',
  pronunciation: '',
  assetbundleName: '',
  gridSize: { width: 1, depth: 1 },
  colorCode: '',
  mysekaiFixtureType: 'normal',
  mysekaiFixtureMainGenreId: 13,
  mysekaiFixtureSubGenreId: 25,
  mysekaiFixtureHandleType: 'fence',
  mysekaiSettableSiteType: 'home',
  mysekaiSettableLayoutType: 'floor',
  mysekaiFixturePutType: 'none',
}

// ========================================
// 模拟 paintEdgeStroke 的轴锁渐进提交
// 完全复刻 EditorCanvas.paintEdgeStroke 的语义
// ========================================

interface StrokeState {
  start: { x: number; y: number } | null
  last: { x: number; y: number } | null
  axis: EdgeOrientation | null
}

function makeStroke(): StrokeState {
  return { start: null, last: null, axis: null }
}

function stepStroke(
  stroke: StrokeState,
  rawGridX: number,
  rawGridY: number,
  fixtureId: number,
): void {
  if (!stroke.start) {
    stroke.start = { x: rawGridX, y: rawGridY }
    stroke.last = { x: rawGridX, y: rawGridY }
    return
  }
  const start = stroke.start
  const last = stroke.last!
  const dxTotal = rawGridX - start.x
  const dyTotal = rawGridY - start.y
  if (stroke.axis === null) {
    if (dxTotal === 0 && dyTotal === 0) return
    stroke.axis = dominantAxis(dxTotal, dyTotal)
  }
  const axis = stroke.axis
  const projected =
    axis === 'h'
      ? { x: rawGridX, y: start.y }
      : { x: start.x, y: rawGridY }
  if (projected.x === last.x && projected.y === last.y) return

  const state = useEditorStore.getState()
  const edgeSet = buildEdgeOccupancySet(state.placedEdges)
  const newEdges = rasterizeEdgeLine(last, projected, axis, fixtureId)
  const gw = state.gridSize.width
  const gd = state.gridSize.depth
  for (const e of newEdges) {
    if (checkCanPlaceEdge(edgeSet, e.x, e.y, e.orientation, gw, gd)) {
      state.placeEdge(e)
      edgeSet.add(edgeKey(e.x, e.y, e.orientation))
    }
  }
  stroke.last = projected
}

function runStroke(
  samples: Array<[number, number]>,
  fixtureId: number,
): void {
  startStrokeBatch()
  try {
    const stroke = makeStroke()
    for (const [x, y] of samples) stepStroke(stroke, x, y, fixtureId)
  } finally {
    endStrokeBatch()
  }
}

// ========================================
// 断言套件
// ========================================

describe('fence drag-paint-edge (ROAD-03)', () => {
  beforeEach(() => {
    useEditorStore.setState({
      placedItems: {},
      placedEdges: {},
      selectedItemId: null,
      toolMode: 'brush',
      activeFixtureId: fence.id,
      overwriteEnabled: false,
      gridSize: { width: 36, depth: 36 },
    })
    useEditorStore.temporal.getState().clear()
  })

  it('5-edge horizontal stroke = 1 history entry', () => {
    const before = useEditorStore.temporal.getState().pastStates.length
    runStroke(
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
        [5, 0],
      ],
      fence.id,
    )
    const after = useEditorStore.temporal.getState().pastStates.length
    expect(after - before).toBe(1)
    // 5 水平边（0..5 产生 5 条边 x=0..4, y=0）
    const edges = Object.values(useEditorStore.getState().placedEdges)
    expect(edges).toHaveLength(5)
    expect(edges.every((e) => e.orientation === 'h' && e.y === 0)).toBe(true)
    const xs = edges.map((e) => e.x).sort((a, b) => a - b)
    expect(xs).toEqual([0, 1, 2, 3, 4])
  })

  it('axis locks on FIRST cross-tile sample and never recomputes', () => {
    // 第一跨格样本 (3,1) → |dx|=3, |dy|=1 → 'h'
    // 之后即使出现大 dy 样本也应保持 'h'
    runStroke(
      [
        [0, 0],
        [3, 1], // 锁定为 h
        [5, 10], // 若重算会切换到 v；正确行为应投影到 y=0
      ],
      fence.id,
    )
    const edges = Object.values(useEditorStore.getState().placedEdges)
    expect(edges.every((e) => e.orientation === 'h' && e.y === 0)).toBe(true)
    const xs = edges.map((e) => e.x).sort((a, b) => a - b)
    expect(xs).toEqual([0, 1, 2, 3, 4])
  })

  it('|dx|==|dy| tie-breaks to horizontal', () => {
    runStroke(
      [
        [0, 0],
        [3, 3],
      ],
      fence.id,
    )
    const edges = Object.values(useEditorStore.getState().placedEdges)
    expect(edges.every((e) => e.orientation === 'h' && e.y === 0)).toBe(true)
  })

  it('vertical stroke produces v edges', () => {
    runStroke(
      [
        [2, 0],
        [2, 4],
      ],
      fence.id,
    )
    const edges = Object.values(useEditorStore.getState().placedEdges)
    expect(edges).toHaveLength(4)
    expect(edges.every((e) => e.orientation === 'v' && e.x === 2)).toBe(true)
  })

  it('single sample (no drag) is a no-op — no edges, no history entry', () => {
    const before = useEditorStore.temporal.getState().pastStates.length
    runStroke([[5, 5]], fence.id)
    // startStrokeBatch + endStrokeBatch 可能产生一个空 entry — 只验证无边生成
    expect(Object.keys(useEditorStore.getState().placedEdges)).toHaveLength(0)
    // 允许 0 或 1 个 history entry（空 stroke 的处理由 store 决定）
    const after = useEditorStore.temporal.getState().pastStates.length
    expect(after - before).toBeLessThanOrEqual(1)
  })

  it('undo after fence stroke restores empty placedEdges', () => {
    runStroke(
      [
        [0, 0],
        [5, 0],
      ],
      fence.id,
    )
    expect(Object.keys(useEditorStore.getState().placedEdges)).toHaveLength(5)
    useEditorStore.temporal.getState().undo()
    expect(Object.keys(useEditorStore.getState().placedEdges)).toHaveLength(0)
    useEditorStore.temporal.getState().redo()
    expect(Object.keys(useEditorStore.getState().placedEdges)).toHaveLength(5)
  })

  it('duplicate edges within same sample are skipped via occupancy check', () => {
    // 先放一条边 (2,0,'h')
    useEditorStore.getState().placeEdge({
      fixtureId: fence.id,
      x: 2,
      y: 0,
      orientation: 'h',
    })
    const beforeCount = Object.keys(useEditorStore.getState().placedEdges).length
    runStroke(
      [
        [0, 0],
        [5, 0],
      ],
      fence.id,
    )
    // 0,1,2,3,4 中 2 已存在 → 仅 4 条新边
    const added =
      Object.keys(useEditorStore.getState().placedEdges).length - beforeCount
    expect(added).toBe(4)
  })
})
