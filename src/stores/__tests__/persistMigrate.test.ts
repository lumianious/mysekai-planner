// ======== persist v3 → v4 迁移测试 (CATL-08) ========
// INPUT: 预先播种 localStorage 不同版本/形状的 payload
// OUTPUT: 验证 rehydrate 后 activeCategory 形状符合 Phase 9 契约
// POS: src/stores/__tests__/persistMigrate.test.ts — 覆盖 Phase 9 plan 02
//
// 关键契约（CATL-08 + 09-RESEARCH Pitfall §3）：
//   1. persist version === 4
//   2. v3 payload 任意 activeCategory 字符串 → 'all'（兜底，无损迁移）
//   3. v4 payload 数字 activeCategory 直通
//   4. v3 其它字段（placedItems/placedEdges/areaLevel/gridSize/inventory/chrome*）保留
//   5. activeSubGenreId / searchActiveBeforeQuery 默认 null（瞬时态，不入 partialize）

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { DESIGN_STORAGE_KEY } from '../../persistence/storageKey'

async function loadStoreWithSeed(
  seedState: Record<string, unknown>,
  version: number,
) {
  localStorage.clear()
  localStorage.setItem(
    DESIGN_STORAGE_KEY,
    JSON.stringify({ state: seedState, version }),
  )
  vi.resetModules()
  const mod = await import('../editorStore')
  const anyStore = mod.useEditorStore as unknown as {
    persist?: { rehydrate?: () => Promise<void> | void }
  }
  if (typeof anyStore.persist?.rehydrate === 'function') {
    await anyStore.persist.rehydrate()
  }
  return mod
}

describe('CATL-08: persist v3 → v4 migration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('coerces v3 activeCategory string "shelf" to "all"', async () => {
    const mod = await loadStoreWithSeed(
      {
        placedItems: {},
        placedEdges: {},
        areaLevel: 1,
        gridSize: { width: 36, depth: 36 },
        isEditorReady: false,
        inventory: {},
        catalogCollapsed: false,
        catalogTop: 76,
        costPanelOpen: false,
        floatbarX: 0.5,
        activeCategory: 'shelf',
      },
      3,
    )
    const state = mod.useEditorStore.getState()
    expect(state.activeCategory).toBe('all')
  })

  it('coerces v3 activeCategory string "display" / "rug" / "plant" / "block" / "canvas" / "road" all to "all"', async () => {
    for (const value of ['display', 'rug', 'plant', 'block', 'canvas', 'road']) {
      vi.resetModules()
      const mod = await loadStoreWithSeed(
        {
          placedItems: {},
          placedEdges: {},
          areaLevel: 1,
          gridSize: { width: 36, depth: 36 },
          isEditorReady: false,
          inventory: {},
          catalogCollapsed: false,
          catalogTop: 76,
          costPanelOpen: false,
          floatbarX: 0.5,
          activeCategory: value,
        },
        3,
      )
      const state = mod.useEditorStore.getState()
      expect(state.activeCategory).toBe('all')
    }
  })

  it('preserves all other v3 fields losslessly', async () => {
    const seed = {
      placedItems: {
        a: {
          id: 'a',
          fixtureId: 42,
          x: 5,
          y: 6,
          rotation: 0,
          layer: 'furniture',
          isSystem: false,
        },
      },
      placedEdges: {
        e1: { id: 'e1', fixtureId: 99, x: 3, y: 4, orientation: 'h' },
      },
      areaLevel: 2,
      gridSize: { width: 36, depth: 36 },
      isEditorReady: true,
      inventory: { 7: 5, 8: 12 },
      catalogCollapsed: true,
      catalogTop: 120,
      costPanelOpen: true,
      floatbarX: 0.25,
      activeCategory: 'shelf',
    }
    const mod = await loadStoreWithSeed(seed, 3)
    const state = mod.useEditorStore.getState()
    expect(state.placedItems['a']?.fixtureId).toBe(42)
    expect(state.placedEdges['e1']?.orientation).toBe('h')
    expect(state.areaLevel).toBe(2)
    expect(state.gridSize).toEqual({ width: 36, depth: 36 })
    expect(state.isEditorReady).toBe(true)
    expect(state.inventory).toEqual({ 7: 5, 8: 12 })
    expect(state.catalogCollapsed).toBe(true)
    expect(state.catalogTop).toBe(120)
    expect(state.costPanelOpen).toBe(true)
    expect(state.floatbarX).toBe(0.25)
    expect(state.activeCategory).toBe('all')
  })

  it('passes through v4 numeric activeCategory unchanged', async () => {
    const mod = await loadStoreWithSeed(
      {
        placedItems: {},
        placedEdges: {},
        areaLevel: 1,
        gridSize: { width: 36, depth: 36 },
        isEditorReady: false,
        inventory: {},
        catalogCollapsed: false,
        catalogTop: 76,
        costPanelOpen: false,
        floatbarX: 0.5,
        activeCategory: 2,
      },
      4,
    )
    const state = mod.useEditorStore.getState()
    expect(state.activeCategory).toBe(2)
  })

  it('passes through v4 "all" sentinel unchanged', async () => {
    const mod = await loadStoreWithSeed(
      {
        placedItems: {},
        placedEdges: {},
        areaLevel: 1,
        gridSize: { width: 36, depth: 36 },
        isEditorReady: false,
        inventory: {},
        catalogCollapsed: false,
        catalogTop: 76,
        costPanelOpen: false,
        floatbarX: 0.5,
        activeCategory: 'all',
      },
      4,
    )
    const state = mod.useEditorStore.getState()
    expect(state.activeCategory).toBe('all')
  })

  it('initializes activeSubGenreId as null and excludes from partialize', async () => {
    const mod = await loadStoreWithSeed(
      {
        placedItems: {},
        placedEdges: {},
        areaLevel: 1,
        gridSize: { width: 36, depth: 36 },
        isEditorReady: false,
        inventory: {},
        catalogCollapsed: false,
        catalogTop: 76,
        costPanelOpen: false,
        floatbarX: 0.5,
        activeCategory: 'all',
      },
      4,
    )
    const state = mod.useEditorStore.getState()
    expect(state.activeSubGenreId).toBeNull()
    expect(state.searchActiveBeforeQuery).toBeNull()

    // Trigger a write: activeSubGenreId / searchActiveBeforeQuery must NOT appear in payload
    mod.useEditorStore.getState().setActiveSubGenreId(7)
    mod.useEditorStore
      .getState()
      .setSearchActiveBeforeQuery({ mainId: 2, subId: 3 })
    mod.useEditorStore.getState().setCatalogCollapsed(true) // force a write
    const raw = localStorage.getItem(DESIGN_STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.state).not.toHaveProperty('activeSubGenreId')
    expect(parsed.state).not.toHaveProperty('searchActiveBeforeQuery')
  })

  it('setActiveCategory resets activeSubGenreId to null (RESEARCH pitfall §2)', async () => {
    const mod = await loadStoreWithSeed(
      {
        placedItems: {},
        placedEdges: {},
        areaLevel: 1,
        gridSize: { width: 36, depth: 36 },
        isEditorReady: false,
        inventory: {},
        catalogCollapsed: false,
        catalogTop: 76,
        costPanelOpen: false,
        floatbarX: 0.5,
        activeCategory: 'all',
      },
      4,
    )
    mod.useEditorStore.getState().setActiveSubGenreId(8)
    expect(mod.useEditorStore.getState().activeSubGenreId).toBe(8)
    mod.useEditorStore.getState().setActiveCategory(2)
    const state = mod.useEditorStore.getState()
    expect(state.activeCategory).toBe(2)
    expect(state.activeSubGenreId).toBeNull()
  })

  it('persist version is 4', async () => {
    vi.resetModules()
    const mod = await import('../editorStore')
    // Trigger any write to make persist serialize
    mod.useEditorStore.getState().setCatalogCollapsed(true)
    const raw = localStorage.getItem(DESIGN_STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.version).toBe(4)
  })

  it('legacy v1 payload still flows through full v1→v2→v3→v4 chain', async () => {
    // v1 has no chrome fields, no activeCategory; v2 adds chrome+floatbarPosition;
    // v3 converts floatbarPosition → floatbarX; v4 coerces activeCategory → 'all'.
    const mod = await loadStoreWithSeed(
      {
        placedItems: {},
        placedEdges: {},
        areaLevel: 1,
        gridSize: { width: 36, depth: 36 },
        isEditorReady: false,
        inventory: {},
      },
      1,
    )
    const state = mod.useEditorStore.getState()
    expect(state.activeCategory).toBe('all')
    expect(state.catalogCollapsed).toBe(false)
    expect(state.costPanelOpen).toBe(false)
    expect(typeof state.floatbarX).toBe('number')
    expect(state.catalogTop).toBe(76)
  })
})
