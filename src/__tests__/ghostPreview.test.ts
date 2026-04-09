// ======== 鬼影预览有效性检查测试 ========

import { describe, it, expect } from 'vitest'
import { checkGhostValidity } from '../utils/ghostPreview'
import type { PlacedItem, Fixture, Rotation, ItemLayer, GridSize } from '../types/editor'

// ======== 测试辅助工厂 ========

function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: 100,
    name: 'テスト家具',
    pronunciation: 'てすとかぐ',
    assetbundleName: 'test_fixture',
    gridSize: { width: 1, depth: 1 },
    colorCode: '',
    mysekaiFixtureType: 'normal',
    mysekaiFixtureMainGenreId: 1,
    mysekaiFixtureSubGenreId: 1,
    mysekaiSettableSiteType: 'home',
    mysekaiSettableLayoutType: 'floor',
    mysekaiFixturePutType: 'none',
    ...overrides,
  }
}

function makePlacedItem(overrides: Partial<PlacedItem> = {}): PlacedItem {
  return {
    id: 'item-1',
    fixtureId: 100,
    x: 0,
    y: 0,
    rotation: 0 as Rotation,
    layer: 'furniture' as ItemLayer,
    isSystem: false,
    ...overrides,
  }
}

const DEFAULT_GRID_SIZE: GridSize = { width: 36, depth: 36 }

describe('checkGhostValidity', () => {
  it('空网格上有效放置返回 valid: true', () => {
    const fixture = makeFixture({ gridSize: { width: 2, depth: 1 } })
    const fixtureMap = new Map<number, Fixture>([[100, fixture]])
    const result = checkGhostValidity(
      5, 5, fixture, 0, 'furniture',
      {}, fixtureMap, DEFAULT_GRID_SIZE, false,
    )
    expect(result.valid).toBe(true)
    expect(result.effectiveWidth).toBe(2)
    expect(result.effectiveDepth).toBe(1)
  })

  it('同层已占用格子返回 valid: false', () => {
    const fixture = makeFixture({ gridSize: { width: 1, depth: 1 } })
    const fixtureMap = new Map<number, Fixture>([[100, fixture]])
    const placedItems: Record<string, PlacedItem> = {
      'item-1': makePlacedItem({ x: 5, y: 5 }),
    }
    const result = checkGhostValidity(
      5, 5, fixture, 0, 'furniture',
      placedItems, fixtureMap, DEFAULT_GRID_SIZE, false,
    )
    expect(result.valid).toBe(false)
  })

  it('超出边界返回 valid: false', () => {
    const fixture = makeFixture({ gridSize: { width: 2, depth: 1 } })
    const fixtureMap = new Map<number, Fixture>([[100, fixture]])
    const result = checkGhostValidity(
      35, 0, fixture, 0, 'furniture',
      {}, fixtureMap, DEFAULT_GRID_SIZE, false,
    )
    // 35 + 2 = 37 > 36, 超出边界
    expect(result.valid).toBe(false)
  })

  it('跨层放置（ground 上放 furniture）返回 valid: true', () => {
    const groundFixture = makeFixture({
      id: 200,
      gridSize: { width: 1, depth: 1 },
    })
    const furnitureFixture = makeFixture({
      id: 100,
      gridSize: { width: 1, depth: 1 },
    })
    const fixtureMap = new Map<number, Fixture>([
      [200, groundFixture],
      [100, furnitureFixture],
    ])
    // 地面层已有物品
    const placedItems: Record<string, PlacedItem> = {
      'ground-1': makePlacedItem({
        id: 'ground-1',
        fixtureId: 200,
        x: 5, y: 5,
        layer: 'ground',
      }),
    }
    // 在家具层放置（不同层，应该可以）
    const result = checkGhostValidity(
      5, 5, furnitureFixture, 0, 'furniture',
      placedItems, fixtureMap, DEFAULT_GRID_SIZE, false,
    )
    expect(result.valid).toBe(true)
  })

  it('旋转 90 度后 2x1 物品变为 1x2 占位', () => {
    const fixture = makeFixture({ gridSize: { width: 2, depth: 1 } })
    const fixtureMap = new Map<number, Fixture>([[100, fixture]])
    const result = checkGhostValidity(
      0, 0, fixture, 90, 'furniture',
      {}, fixtureMap, DEFAULT_GRID_SIZE, false,
    )
    expect(result.valid).toBe(true)
    expect(result.effectiveWidth).toBe(1)
    expect(result.effectiveDepth).toBe(2)
  })

  it('覆盖模式下已占用格子仍返回 valid: true（只检查边界）', () => {
    const fixture = makeFixture({ gridSize: { width: 1, depth: 1 } })
    const fixtureMap = new Map<number, Fixture>([[100, fixture]])
    const placedItems: Record<string, PlacedItem> = {
      'item-1': makePlacedItem({ x: 5, y: 5 }),
    }
    const result = checkGhostValidity(
      5, 5, fixture, 0, 'furniture',
      placedItems, fixtureMap, DEFAULT_GRID_SIZE, true,
    )
    expect(result.valid).toBe(true)
  })

  it('覆盖模式下超出边界仍返回 valid: false', () => {
    const fixture = makeFixture({ gridSize: { width: 2, depth: 1 } })
    const fixtureMap = new Map<number, Fixture>([[100, fixture]])
    const result = checkGhostValidity(
      35, 0, fixture, 0, 'furniture',
      {}, fixtureMap, DEFAULT_GRID_SIZE, true,
    )
    expect(result.valid).toBe(false)
  })
})
