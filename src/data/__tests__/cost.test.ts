// ======== 成本聚合测试 ========
import { describe, it, expect } from 'vitest'
import { buildCostIndex, computeMaterialTotals } from '../cost'
import type {
  Blueprint,
  Material,
  MaterialCost,
} from '../../types/cost'
import type { Fixture, PlacedItem } from '../../types/editor'

const M = (id: number, type: string, name: string): Material => ({
  id,
  seq: id,
  mysekaiMaterialType: type,
  name,
  pronunciation: name,
  mysekaiMaterialRarityType: 'rarity_1',
  iconAssetbundleName: `icon_${id}`,
})

const F = (id: number): Fixture =>
  ({
    id,
    name: `fix_${id}`,
    assetbundleName: `bundle_${id}`,
    gridSize: { width: 1, depth: 1, height: 1 },
  }) as unknown as Fixture

function makeIndex(
  materials: Material[],
  blueprints: Blueprint[],
  costs: MaterialCost[],
) {
  return buildCostIndex(materials, blueprints, costs)
}

describe('cost.ts', () => {
  it('aggregates per-material totals across multiple placedItems', () => {
    const materials = [M(1, 'wood', '木'), M(2, 'stone', '石')]
    const blueprints: Blueprint[] = [
      { id: 10, mysekaiCraftType: 'mysekai_fixture', craftTargetId: 100 },
      { id: 11, mysekaiCraftType: 'mysekai_fixture', craftTargetId: 200 },
    ]
    const costs: MaterialCost[] = [
      { id: 1, mysekaiBlueprintId: 10, mysekaiMaterialId: 1, seq: 1, quantity: 5 },
      { id: 2, mysekaiBlueprintId: 10, mysekaiMaterialId: 2, seq: 2, quantity: 3 },
      { id: 3, mysekaiBlueprintId: 11, mysekaiMaterialId: 1, seq: 1, quantity: 2 },
    ]
    const index = makeIndex(materials, blueprints, costs)
    const fixtureMap = new Map<number, Fixture>([[100, F(100)], [200, F(200)]])
    const placed: PlacedItem[] = [
      { id: 'a', fixtureId: 100, x: 0, y: 0, rotation: 0, layer: 'furniture' } as PlacedItem,
      { id: 'b', fixtureId: 100, x: 1, y: 0, rotation: 0, layer: 'furniture' } as PlacedItem,
      { id: 'c', fixtureId: 200, x: 2, y: 0, rotation: 0, layer: 'furniture' } as PlacedItem,
    ]
    const rows = computeMaterialTotals(placed, fixtureMap, index, {})
    const wood = rows.find((r) => r.material.id === 1)!
    const stone = rows.find((r) => r.material.id === 2)!
    expect(wood.needed).toBe(5 + 5 + 2)  // 12
    expect(stone.needed).toBe(3 + 3)     // 6
  })

  it('subtracts inventory and reports remaining (clamped >= 0)', () => {
    const materials = [M(1, 'wood', '木')]
    const blueprints: Blueprint[] = [
      { id: 10, mysekaiCraftType: 'mysekai_fixture', craftTargetId: 100 },
    ]
    const costs: MaterialCost[] = [
      { id: 1, mysekaiBlueprintId: 10, mysekaiMaterialId: 1, seq: 1, quantity: 10 },
    ]
    const index = makeIndex(materials, blueprints, costs)
    const fixtureMap = new Map([[100, F(100)]])
    const placed = [
      { id: 'a', fixtureId: 100, x: 0, y: 0, rotation: 0, layer: 'furniture' } as PlacedItem,
    ]
    expect(
      computeMaterialTotals(placed, fixtureMap, index, { 1: 4 })[0].remaining,
    ).toBe(6)
    // owned > needed: remaining clamps to 0, not negative
    expect(
      computeMaterialTotals(placed, fixtureMap, index, { 1: 999 })[0].remaining,
    ).toBe(0)
  })

  it('skips system items (item.isSystem) — they are pre-placed, no cost', () => {
    const materials = [M(1, 'wood', '木')]
    const blueprints: Blueprint[] = [
      { id: 10, mysekaiCraftType: 'mysekai_fixture', craftTargetId: 100 },
    ]
    const costs: MaterialCost[] = [
      { id: 1, mysekaiBlueprintId: 10, mysekaiMaterialId: 1, seq: 1, quantity: 7 },
    ]
    const index = makeIndex(materials, blueprints, costs)
    const fixtureMap = new Map([[100, F(100)]])
    const placed: PlacedItem[] = [
      {
        id: 'a',
        fixtureId: 100,
        x: 0,
        y: 0,
        rotation: 0,
        layer: 'furniture',
        isSystem: true,
      } as PlacedItem,
    ]
    expect(computeMaterialTotals(placed, fixtureMap, index, {})).toEqual([])
  })

  it('returns empty array when nothing placed', () => {
    const index = makeIndex([], [], [])
    expect(computeMaterialTotals([], new Map(), index, {})).toEqual([])
  })

  it('ignores blueprints whose craftType is not mysekai_fixture', () => {
    const materials = [M(1, 'wood', '木')]
    const blueprints: Blueprint[] = [
      // Wrong craftType — should be skipped during index build
      {
        id: 10,
        mysekaiCraftType: 'mysekai_other',
        craftTargetId: 100,
      } as Blueprint,
    ]
    const costs: MaterialCost[] = [
      { id: 1, mysekaiBlueprintId: 10, mysekaiMaterialId: 1, seq: 1, quantity: 5 },
    ]
    const index = makeIndex(materials, blueprints, costs)
    const fixtureMap = new Map([[100, F(100)]])
    const placed = [
      { id: 'a', fixtureId: 100, x: 0, y: 0, rotation: 0, layer: 'furniture' } as PlacedItem,
    ]
    expect(computeMaterialTotals(placed, fixtureMap, index, {})).toEqual([])
  })
})
