// ======== 画刷擦除测试 (D-42) ========
// INPUT: 模拟 Remove 模式拖拽（startStrokeBatch + 多次 removeItem + endStrokeBatch）
// OUTPUT: 验证拖拽擦除仅清除 ground 项且合并为单 undo 步骤
// POS: src/__tests__/brushErase.test.ts — Phase 2 D-42 集成测试

import { describe, it, expect, beforeEach } from 'vitest'
import {
  useEditorStore,
  startStrokeBatch,
  endStrokeBatch,
} from '../stores/editorStore'
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

// ======== 模拟拖拽擦除（D-42 仅删除 ground 项） ========

function eraseDrag(groundTiles: Array<[number, number]>) {
  startStrokeBatch()
  try {
    for (const [gx, gy] of groundTiles) {
      const state = useEditorStore.getState()
      for (const item of Object.values(state.placedItems)) {
        if (item.layer !== 'ground') continue
        const f = fixtureMap.get(item.fixtureId)
        if (!f) continue
        const w = f.gridSize.width
        const d = f.gridSize.depth
        if (gx >= item.x && gx < item.x + w && gy >= item.y && gy < item.y + d) {
          useEditorStore.getState().removeItem(item.id)
          break
        }
      }
    }
  } finally {
    endStrokeBatch()
  }
}

describe('brush drag-erase (D-42)', () => {
  beforeEach(() => {
    useEditorStore.setState({
      placedItems: {},
      selectedItemId: null,
      toolMode: 'remove',
      gridSize: { width: 36, depth: 36 },
    })
    useEditorStore.temporal.getState().clear()
  })

  it('removes 3 ground items as single history entry', () => {
    const s = useEditorStore.getState()
    s.placeItem({
      fixtureId: road.id,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'ground',
      isSystem: false,
    })
    s.placeItem({
      fixtureId: road.id,
      x: 2,
      y: 0,
      rotation: 0,
      layer: 'ground',
      isSystem: false,
    })
    s.placeItem({
      fixtureId: road.id,
      x: 4,
      y: 0,
      rotation: 0,
      layer: 'ground',
      isSystem: false,
    })
    const historyBefore = useEditorStore.temporal.getState().pastStates.length
    eraseDrag([
      [0, 0],
      [2, 0],
      [4, 0],
    ])
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(0)
    expect(
      useEditorStore.temporal.getState().pastStates.length - historyBefore,
    ).toBe(1)
  })

  it('ignores furniture items during drag (D-21 preserved)', () => {
    const s = useEditorStore.getState()
    s.placeItem({
      fixtureId: table.id,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    s.placeItem({
      fixtureId: road.id,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'ground',
      isSystem: false,
    })
    eraseDrag([[0, 0]])
    const items = Object.values(useEditorStore.getState().placedItems)
    expect(items.filter((i) => i.layer === 'furniture')).toHaveLength(1) // table 保留
    expect(items.filter((i) => i.layer === 'ground')).toHaveLength(0) // road 擦除
  })

  it('undo restores all erased ground items in one step', () => {
    const s = useEditorStore.getState()
    s.placeItem({
      fixtureId: road.id,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'ground',
      isSystem: false,
    })
    s.placeItem({
      fixtureId: road.id,
      x: 2,
      y: 0,
      rotation: 0,
      layer: 'ground',
      isSystem: false,
    })
    eraseDrag([
      [0, 0],
      [2, 0],
    ])
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(0)
    useEditorStore.temporal.getState().undo()
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(2)
  })
})
