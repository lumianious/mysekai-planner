// ======== 编辑器 Store 测试 ========

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { Fixture, Rotation } from '../types/editor'
import { useEditorStore, buildOccupancyGrid, checkCanPlace, undoWithFlash } from '../stores/editorStore'

// ======== 测试前重置 store ========

beforeEach(() => {
  // 重置到初始状态
  useEditorStore.setState({
    areaLevel: 1,
    gridSize: { width: 36, depth: 36 },
    placedItems: {},
    selectedItemId: null,
    toolMode: 'select',
    activeFixtureId: null,
    overwriteEnabled: false,
    previewRotation: 0 as Rotation,
    hotbar: Array(9).fill(null).map(() => ({ fixtureId: null })),
    isEditorReady: false,
    flashItemIds: [],
  })
  // 清除 undo/redo 历史
  useEditorStore.temporal.getState().clear()
})

// ======== 初始状态测试 ========

describe('initial state', () => {
  it('has correct default values', () => {
    const state = useEditorStore.getState()
    expect(state.areaLevel).toBe(1)
    expect(state.gridSize).toEqual({ width: 36, depth: 36 })
    expect(state.placedItems).toEqual({})
    expect(state.toolMode).toBe('select')
    expect(state.isEditorReady).toBe(false)
    expect(state.previewRotation).toBe(0)
  })
})

// ======== placeItem 测试 ========

describe('placeItem', () => {
  it('adds item to placedItems with generated UUID id', () => {
    useEditorStore.getState().placeItem({
      fixtureId: 1,
      x: 5,
      y: 10,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    const items = useEditorStore.getState().placedItems
    const keys = Object.keys(items)
    expect(keys).toHaveLength(1)
    const item = items[keys[0]]
    expect(item.fixtureId).toBe(1)
    expect(item.x).toBe(5)
    expect(item.y).toBe(10)
    expect(item.id).toBeTruthy()
  })

  it('assigns correct layer based on fixture type', () => {
    useEditorStore.getState().placeItem({
      fixtureId: 1,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'ground',
      isSystem: false,
    })
    const items = useEditorStore.getState().placedItems
    const item = Object.values(items)[0]
    expect(item.layer).toBe('ground')
  })
})

// ======== moveItem 测试 ========

describe('moveItem', () => {
  it('updates x, y of existing item', () => {
    useEditorStore.getState().placeItem({
      fixtureId: 1,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    const id = Object.keys(useEditorStore.getState().placedItems)[0]
    useEditorStore.getState().moveItem(id, 10, 15)
    const item = useEditorStore.getState().placedItems[id]
    expect(item.x).toBe(10)
    expect(item.y).toBe(15)
  })
})

// ======== rotateItem 测试 ========

describe('rotateItem', () => {
  it('cycles clockwise: 0->90->180->270->0', () => {
    useEditorStore.getState().placeItem({
      fixtureId: 1,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    const id = Object.keys(useEditorStore.getState().placedItems)[0]

    useEditorStore.getState().rotateItem(id, 'cw')
    expect(useEditorStore.getState().placedItems[id].rotation).toBe(90)

    useEditorStore.getState().rotateItem(id, 'cw')
    expect(useEditorStore.getState().placedItems[id].rotation).toBe(180)

    useEditorStore.getState().rotateItem(id, 'cw')
    expect(useEditorStore.getState().placedItems[id].rotation).toBe(270)

    useEditorStore.getState().rotateItem(id, 'cw')
    expect(useEditorStore.getState().placedItems[id].rotation).toBe(0)
  })

  it('cycles counter-clockwise: 0->270->180->90->0', () => {
    useEditorStore.getState().placeItem({
      fixtureId: 1,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    const id = Object.keys(useEditorStore.getState().placedItems)[0]

    useEditorStore.getState().rotateItem(id, 'ccw')
    expect(useEditorStore.getState().placedItems[id].rotation).toBe(270)

    useEditorStore.getState().rotateItem(id, 'ccw')
    expect(useEditorStore.getState().placedItems[id].rotation).toBe(180)

    useEditorStore.getState().rotateItem(id, 'ccw')
    expect(useEditorStore.getState().placedItems[id].rotation).toBe(90)

    useEditorStore.getState().rotateItem(id, 'ccw')
    expect(useEditorStore.getState().placedItems[id].rotation).toBe(0)
  })
})

// ======== removeItem 测试 ========

describe('removeItem', () => {
  it('deletes item from placedItems', () => {
    useEditorStore.getState().placeItem({
      fixtureId: 1,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    const id = Object.keys(useEditorStore.getState().placedItems)[0]
    useEditorStore.getState().removeItem(id)
    expect(useEditorStore.getState().placedItems[id]).toBeUndefined()
  })

  it('does NOT remove system item (isSystem=true)', () => {
    useEditorStore.getState().placeItem({
      fixtureId: 99,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'furniture',
      isSystem: true,
    })
    const id = Object.keys(useEditorStore.getState().placedItems)[0]
    useEditorStore.getState().removeItem(id)
    // 系统家具不可删除
    expect(useEditorStore.getState().placedItems[id]).toBeDefined()
  })
})

// ======== setAreaLevel 测试 ========

describe('setAreaLevel', () => {
  it('sets gridSize to 70x70 for level 3', () => {
    useEditorStore.getState().setAreaLevel(3)
    const state = useEditorStore.getState()
    expect(state.areaLevel).toBe(3)
    expect(state.gridSize).toEqual({ width: 70, depth: 70 })
  })
})

// ======== setToolMode 测试 ========

describe('setToolMode', () => {
  it('updates toolMode to stamp', () => {
    useEditorStore.getState().setToolMode('stamp')
    expect(useEditorStore.getState().toolMode).toBe('stamp')
  })
})

// ======== toggleOverwrite 测试 ========

describe('toggleOverwrite', () => {
  it('flips overwriteEnabled', () => {
    expect(useEditorStore.getState().overwriteEnabled).toBe(false)
    useEditorStore.getState().toggleOverwrite()
    expect(useEditorStore.getState().overwriteEnabled).toBe(true)
    useEditorStore.getState().toggleOverwrite()
    expect(useEditorStore.getState().overwriteEnabled).toBe(false)
  })
})

// ======== hotbar 测试 ========

describe('assignHotbar', () => {
  it('sets hotbar slot 0 fixtureId to 42 (slot 1 is user-facing)', () => {
    useEditorStore.getState().assignHotbar(1, 42)
    expect(useEditorStore.getState().hotbar[0].fixtureId).toBe(42)
  })
})

describe('activateHotbar', () => {
  it('sets activeFixtureId from hotbar slot and toolMode to stamp', () => {
    useEditorStore.getState().assignHotbar(1, 42)
    useEditorStore.getState().activateHotbar(1)
    const state = useEditorStore.getState()
    expect(state.activeFixtureId).toBe(42)
    expect(state.toolMode).toBe('stamp')
  })
})

// ======== startEditor 测试 ========

describe('startEditor', () => {
  it('sets areaLevel, gridSize, and isEditorReady', () => {
    useEditorStore.getState().startEditor(3)
    const state = useEditorStore.getState()
    expect(state.areaLevel).toBe(3)
    expect(state.gridSize).toEqual({ width: 70, depth: 70 })
    expect(state.isEditorReady).toBe(true)
  })

  it('auto-places 2 system fixtures (gate and house)', () => {
    useEditorStore.getState().startEditor(3)
    const state = useEditorStore.getState()
    const items = Object.values(state.placedItems)
    expect(items).toHaveLength(2)
    // 两者都是系统物品
    expect(items.every((item) => item.isSystem === true)).toBe(true)
  })

  it('system items have isSystem=true and furniture layer', () => {
    useEditorStore.getState().startEditor(1)
    const items = Object.values(useEditorStore.getState().placedItems)
    for (const item of items) {
      expect(item.isSystem).toBe(true)
      expect(item.layer).toBe('furniture')
    }
  })

  it('system fixtures cannot be removed', () => {
    useEditorStore.getState().startEditor(1)
    const items = Object.values(useEditorStore.getState().placedItems)
    expect(items).toHaveLength(2)
    // 尝试删除每个系统物品
    for (const item of items) {
      useEditorStore.getState().removeItem(item.id)
    }
    // 系统物品仍然存在
    expect(Object.values(useEditorStore.getState().placedItems)).toHaveLength(2)
  })
})

// ======== previewRotation 测试 ========

describe('rotatePreview', () => {
  it('cycles clockwise: 0->90->180->270->0', () => {
    useEditorStore.getState().rotatePreview('cw')
    expect(useEditorStore.getState().previewRotation).toBe(90)

    useEditorStore.getState().rotatePreview('cw')
    expect(useEditorStore.getState().previewRotation).toBe(180)

    useEditorStore.getState().rotatePreview('cw')
    expect(useEditorStore.getState().previewRotation).toBe(270)

    useEditorStore.getState().rotatePreview('cw')
    expect(useEditorStore.getState().previewRotation).toBe(0)
  })

  it('cycles counter-clockwise: 0->270->180->90->0', () => {
    useEditorStore.getState().rotatePreview('ccw')
    expect(useEditorStore.getState().previewRotation).toBe(270)

    useEditorStore.getState().rotatePreview('ccw')
    expect(useEditorStore.getState().previewRotation).toBe(180)

    useEditorStore.getState().rotatePreview('ccw')
    expect(useEditorStore.getState().previewRotation).toBe(90)

    useEditorStore.getState().rotatePreview('ccw')
    expect(useEditorStore.getState().previewRotation).toBe(0)
  })
})

describe('setActiveFixture', () => {
  it('resets previewRotation to 0', () => {
    // 先旋转预览
    useEditorStore.getState().rotatePreview('cw')
    useEditorStore.getState().rotatePreview('cw')
    expect(useEditorStore.getState().previewRotation).toBe(180)

    // 选择新家具应重置预览旋转
    useEditorStore.getState().setActiveFixture(42)
    expect(useEditorStore.getState().previewRotation).toBe(0)
    expect(useEditorStore.getState().activeFixtureId).toBe(42)
    expect(useEditorStore.getState().toolMode).toBe('stamp')
  })
})

// ======== undo/redo 测试 ========

describe('undo/redo', () => {
  it('undo after placeItem restores previous state (empty placedItems)', async () => {
    useEditorStore.getState().placeItem({
      fixtureId: 1,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(1)

    // zundo 的 undo 是异步的，需要等待
    await new Promise((resolve) => setTimeout(resolve, 100))
    useEditorStore.temporal.getState().undo()
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(0)
  })

  it('redo after undo restores the placed item', async () => {
    useEditorStore.getState().placeItem({
      fixtureId: 1,
      x: 5,
      y: 5,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    useEditorStore.temporal.getState().undo()
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(0)

    useEditorStore.temporal.getState().redo()
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(1)
  })

  it('undo/redo only affects placedItems, not toolMode or selectedItemId or previewRotation', async () => {
    // 放置物品
    useEditorStore.getState().placeItem({
      fixtureId: 1,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })

    // 改变不应被 undo 影响的状态
    useEditorStore.getState().setToolMode('stamp')
    useEditorStore.getState().rotatePreview('cw')
    const id = Object.keys(useEditorStore.getState().placedItems)[0]
    useEditorStore.getState().setSelectedItem(id)

    await new Promise((resolve) => setTimeout(resolve, 100))
    useEditorStore.temporal.getState().undo()

    // placedItems 被撤销
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(0)
    // 这些不应被撤销
    expect(useEditorStore.getState().toolMode).toBe('stamp')
    expect(useEditorStore.getState().previewRotation).toBe(90)
  })
})

// ======== 占用网格测试 ========

describe('occupancy grid', () => {
  const mockFixtureMap = new Map<number, Fixture>([
    [1, {
      id: 1,
      name: 'テーブル',
      pronunciation: 'てーぶる',
      assetbundleName: 'table',
      gridSize: { width: 2, depth: 2 },
      colorCode: '#FF0000',
      mysekaiFixtureType: 'normal',
      mysekaiFixtureMainGenreId: 1,
      mysekaiFixtureHandleType: 'none',
      mysekaiFixtureSubGenreId: 1,
      mysekaiSettableSiteType: 'home',
      mysekaiSettableLayoutType: 'floor',
      mysekaiFixturePutType: 'none',
    }],
    [2, {
      id: 2,
      name: 'ラグ',
      pronunciation: 'らぐ',
      assetbundleName: 'rug',
      gridSize: { width: 3, depth: 3 },
      colorCode: '#00FF00',
      mysekaiFixtureType: 'normal',
      mysekaiFixtureMainGenreId: 1,
      mysekaiFixtureHandleType: 'none',
      mysekaiFixtureSubGenreId: 1,
      mysekaiSettableSiteType: 'home',
      mysekaiSettableLayoutType: 'rug',
      mysekaiFixturePutType: 'none',
    }],
  ])

  it('checkCanPlace returns false for occupied tiles', () => {
    const items = {
      'item-1': {
        id: 'item-1',
        fixtureId: 1,
        x: 5,
        y: 5,
        rotation: 0 as Rotation,
        layer: 'furniture' as const,
        isSystem: false,
      },
    }
    const grid = buildOccupancyGrid(items, mockFixtureMap, 'furniture')
    // (5,5) 尺寸 2x2 占据 (5,5),(6,5),(5,6),(6,6)
    // 尝试在重叠位置放置 2x2
    const canPlace = checkCanPlace(grid, 6, 6, 2, 2, 36, 36)
    // (6,6) 已被 item-1 占据，应返回 false
    expect(canPlace).toBe(false)
  })

  it('checkCanPlace returns true for empty tiles', () => {
    const items = {
      'item-1': {
        id: 'item-1',
        fixtureId: 1,
        x: 0,
        y: 0,
        rotation: 0 as Rotation,
        layer: 'furniture' as const,
        isSystem: false,
      },
    }
    const grid = buildOccupancyGrid(items, mockFixtureMap, 'furniture')
    // 在远离已放置物品的位置检查
    const canPlace = checkCanPlace(grid, 10, 10, 2, 2, 36, 36)
    expect(canPlace).toBe(true)
  })

  it('checkCanPlace returns false for out-of-bounds placement', () => {
    const grid = buildOccupancyGrid({}, mockFixtureMap, 'furniture')
    // 放在网格边界外
    const canPlace = checkCanPlace(grid, 35, 35, 2, 2, 36, 36)
    expect(canPlace).toBe(false)
  })

  it('allows ground + furniture overlap on same tile', () => {
    const items = {
      'ground-1': {
        id: 'ground-1',
        fixtureId: 2,
        x: 5,
        y: 5,
        rotation: 0 as Rotation,
        layer: 'ground' as const,
        isSystem: false,
      },
    }
    // 构建 furniture 层的占用网格（不含 ground 层的物品）
    const furnitureGrid = buildOccupancyGrid(items, mockFixtureMap, 'furniture')
    // furniture 层在同一位置应该可以放置
    const canPlace = checkCanPlace(furnitureGrid, 5, 5, 2, 2, 36, 36)
    expect(canPlace).toBe(true)
  })
})

// ======== triggerFlash 测试 ========

describe('triggerFlash', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets flashItemIds and clears after 300ms', () => {
    useEditorStore.getState().triggerFlash(['id-1', 'id-2'])
    expect(useEditorStore.getState().flashItemIds).toEqual(['id-1', 'id-2'])

    // 300ms 后应清除
    vi.advanceTimersByTime(300)
    expect(useEditorStore.getState().flashItemIds).toEqual([])
  })

  it('empty ids array is a no-op for visual but still sets state', () => {
    useEditorStore.getState().triggerFlash([])
    expect(useEditorStore.getState().flashItemIds).toEqual([])
  })
})

// ======== undoWithFlash / redoWithFlash 测试 ========

describe('undoWithFlash / redoWithFlash', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('undoWithFlash triggers flash on items that reappear', async () => {
    useEditorStore.getState().placeItem({
      fixtureId: 1,
      x: 5,
      y: 5,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    const placedId = Object.keys(useEditorStore.getState().placedItems)[0]

    // 移动物品（产生可追踪的变化）
    useEditorStore.getState().moveItem(placedId, 10, 10)

    // 等待 zundo 处理
    vi.useRealTimers()
    await new Promise((r) => setTimeout(r, 100))
    vi.useFakeTimers()

    undoWithFlash()

    // 物品位置被撤销回 (5,5)
    const item = useEditorStore.getState().placedItems[placedId]
    expect(item.x).toBe(5)
    expect(item.y).toBe(5)

    // 闪烁应被触发
    expect(useEditorStore.getState().flashItemIds).toContain(placedId)

    // 300ms 后清除
    vi.advanceTimersByTime(300)
    expect(useEditorStore.getState().flashItemIds).toEqual([])
  })
})
