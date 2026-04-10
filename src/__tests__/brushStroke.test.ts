// ======== 画刷拖拽测试 ========
// INPUT: 直接调用 placeItem + startStrokeBatch/endStrokeBatch 模拟拖拽
// OUTPUT: 验证多 tile 描边合并为单 undo 步骤，覆盖规则正确，层独立性保持
// POS: src/__tests__/brushStroke.test.ts — Phase 2 ROAD-01 集成测试

import { describe, it, expect, beforeEach } from 'vitest'
import {
  useEditorStore,
  startStrokeBatch,
  endStrokeBatch,
  buildOccupancyGrid,
  checkCanPlace,
} from '../stores/editorStore'
import { rasterizeLine } from '../utils/rasterize'
import type { Fixture } from '../types/editor'

// ======== 测试 Fixture 样本 ========

const road: Fixture = {
  id: 111,
  name: '土の道',
  pronunciation: '',
  assetbundleName: '',
  gridSize: { width: 2, depth: 2 },
  colorCode: '',
  mysekaiFixtureType: 'normal',
  mysekaiFixtureMainGenreId: 12,
  mysekaiFixtureSubGenreId: 22,
  mysekaiFixtureHandleType: 'road',
  mysekaiSettableSiteType: 'home',
  mysekaiSettableLayoutType: 'road',
  mysekaiFixturePutType: 'none',
}
const table: Fixture = {
  ...road,
  id: 300,
  mysekaiFixtureHandleType: 'none',
  mysekaiFixtureMainGenreId: 1,
  mysekaiSettableLayoutType: 'floor',
}
const fixtureMap = new Map<number, Fixture>([
  [road.id, road],
  [table.id, table],
])

// ======== 模拟拖拽画刷（不经过 React，只触发 store） ========
// 使用与 EditorCanvas 相同的 overwrite=OFF 跳过逻辑

function paintStroke(from: [number, number], to: [number, number]) {
  const state = useEditorStore.getState()
  const step = road.gridSize.width
  const tiles = rasterizeLine(from[0], from[1], to[0], to[1], step)
  startStrokeBatch()
  try {
    for (const t of tiles) {
      const occ = buildOccupancyGrid(
        useEditorStore.getState().placedItems,
        fixtureMap,
        'ground',
      )
      if (
        checkCanPlace(
          occ,
          t.x,
          t.y,
          road.gridSize.width,
          road.gridSize.depth,
          state.gridSize.width,
          state.gridSize.depth,
        )
      ) {
        useEditorStore.getState().placeItem({
          fixtureId: road.id,
          x: t.x,
          y: t.y,
          rotation: 0,
          layer: 'ground',
          isSystem: false,
        })
      }
      // overwrite=OFF + 占用 → 跳过此 tile，继续 stroke（RESEARCH Q3）
    }
  } finally {
    endStrokeBatch()
  }
}

describe('brush drag-paint (ROAD-01)', () => {
  beforeEach(() => {
    useEditorStore.setState({
      placedItems: {},
      selectedItemId: null,
      toolMode: 'brush',
      activeFixtureId: road.id,
      overwriteEnabled: false,
      gridSize: { width: 36, depth: 36 },
    })
    useEditorStore.temporal.getState().clear()
  })

  it('5-tile stroke = 1 history entry', () => {
    const before = useEditorStore.temporal.getState().pastStates.length
    paintStroke([0, 0], [8, 0]) // 5 tiles: 0,2,4,6,8
    const after = useEditorStore.temporal.getState().pastStates.length
    expect(after - before).toBe(1)
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(5)
  })

  it('undo after stroke restores empty state; redo restores all tiles', () => {
    paintStroke([0, 0], [8, 0])
    useEditorStore.temporal.getState().undo()
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(0)
    useEditorStore.temporal.getState().redo()
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(5)
  })

  it('overwrite OFF skips occupied tiles but continues stroke (RESEARCH Q3)', () => {
    // 先手动在 (4,0) 放一个 road
    useEditorStore.getState().placeItem({
      fixtureId: road.id,
      x: 4,
      y: 0,
      rotation: 0,
      layer: 'ground',
      isSystem: false,
    })
    const beforeCount = Object.keys(useEditorStore.getState().placedItems).length
    paintStroke([0, 0], [8, 0]) // 0,2,4,6,8 — 4 应跳过
    const added =
      Object.keys(useEditorStore.getState().placedItems).length - beforeCount
    expect(added).toBe(4) // 0,2,6,8 成功，4 跳过
  })

  it('D-41 — painting at tile where furniture exists does NOT block placement', () => {
    // 先在 (0,0) 放 furniture 桌子
    useEditorStore.getState().placeItem({
      fixtureId: table.id,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    const occ = buildOccupancyGrid(
      useEditorStore.getState().placedItems,
      fixtureMap,
      'ground',
    )
    // ground 层应为空（furniture 不在 ground occupancy）
    expect(checkCanPlace(occ, 0, 0, 2, 2, 36, 36)).toBe(true)
    // 画刷应能放置 road 在 (0,0)
    paintStroke([0, 0], [0, 0])
    const items = Object.values(useEditorStore.getState().placedItems)
    expect(
      items.filter((i) => i.layer === 'ground' && i.x === 0 && i.y === 0),
    ).toHaveLength(1)
    expect(
      items.filter((i) => i.layer === 'furniture' && i.x === 0 && i.y === 0),
    ).toHaveLength(1)
  })

  it('single-click stroke (mousedown + mouseup same tile) = 1 history entry', () => {
    const before = useEditorStore.temporal.getState().pastStates.length
    paintStroke([4, 4], [4, 4])
    expect(useEditorStore.temporal.getState().pastStates.length - before).toBe(1)
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(1)
  })
})
