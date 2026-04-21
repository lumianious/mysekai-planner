// ======== persist 中间件集成测试 (PERS-01 / PERS-02) ========
// INPUT: 通过 useEditorStore 动作触发 setState；或预先播种 localStorage
// OUTPUT: 验证 localStorage 写入与 store rehydrate 行为
// POS: src/__tests__/persist.test.ts — 覆盖 Phase 03 Plan 02 must_haves

import { beforeEach, describe, it, expect, vi } from 'vitest'
import type { Rotation } from '../types/editor'
import { DESIGN_STORAGE_KEY } from '../persistence/storageKey'

// ======== 测试辅助 ========

// 允许的持久化字段白名单（plan 03-02 D-03 + Pitfall 2/7）
const ALLOWED_PERSISTED_KEYS = [
  'placedItems',
  'placedEdges',
  'areaLevel',
  'gridSize',
  'isEditorReady',
]

/**
 * 从干净的 localStorage（或预播种的 state）加载 editorStore 模块。
 * Zustand persist 在同步 storage（localStorage）下会在模块初始化时
 * 同步 rehydrate；若 API 存在 `persist.rehydrate()` 则再显式触发一次以兼容异步情况。
 */
async function freshStoreWithLocalStorage(seedState?: Record<string, unknown>) {
  localStorage.clear()
  if (seedState) {
    localStorage.setItem(
      DESIGN_STORAGE_KEY,
      JSON.stringify({ state: seedState, version: 1 }),
    )
  }
  vi.resetModules()
  const mod = await import('../stores/editorStore')
  const anyStore = mod.useEditorStore as unknown as {
    persist?: { rehydrate?: () => Promise<void> | void }
  }
  if (typeof anyStore.persist?.rehydrate === 'function') {
    await anyStore.persist.rehydrate()
  }
  return mod
}

function resetStoreToDefaults(mod: typeof import('../stores/editorStore')) {
  mod.useEditorStore.setState({
    areaLevel: 1,
    gridSize: { width: 36, depth: 36 },
    placedItems: {},
    placedEdges: {},
    selectedItemId: null,
    toolMode: 'select',
    activeFixtureId: null,
    overwriteEnabled: false,
    previewRotation: 0 as Rotation,
    hotbar: Array(9).fill(null).map(() => ({ fixtureId: null })),
    isEditorReady: false,
    flashItemIds: [],
    stageScale: 1,
  })
  mod.useEditorStore.temporal.getState().clear()
}

// ======== PERS-01 自动保存 ========

describe('PERS-01: auto-save to localStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('Test A: placing an item writes placedItems to localStorage key mysekai:design:v1', async () => {
    const mod = await freshStoreWithLocalStorage()
    resetStoreToDefaults(mod)
    mod.useEditorStore.getState().placeItem({
      fixtureId: 42,
      x: 5,
      y: 6,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    const raw = localStorage.getItem(DESIGN_STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    const ids = Object.keys(parsed.state.placedItems)
    expect(ids.length).toBe(1)
    expect(parsed.state.placedItems[ids[0]].fixtureId).toBe(42)
  })

  it('Test B: placeEdge serializes the edge into localStorage', async () => {
    const mod = await freshStoreWithLocalStorage()
    resetStoreToDefaults(mod)
    mod.useEditorStore.getState().placeEdge({
      fixtureId: 99,
      x: 3,
      y: 4,
      orientation: 'h',
    })
    const raw = localStorage.getItem(DESIGN_STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    const edges = Object.values(parsed.state.placedEdges) as Array<{
      fixtureId: number
      orientation: string
    }>
    expect(edges.length).toBe(1)
    expect(edges[0].fixtureId).toBe(99)
    expect(edges[0].orientation).toBe('h')
  })

  it('Test C: setAreaLevel persists areaLevel AND gridSize together (Pitfall 7)', async () => {
    const mod = await freshStoreWithLocalStorage()
    resetStoreToDefaults(mod)
    mod.useEditorStore.getState().setAreaLevel(3)
    const raw = localStorage.getItem(DESIGN_STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.state.areaLevel).toBe(3)
    // area level 3 -> 70x70 grid per areaLevels
    expect(parsed.state.gridSize).toEqual({ width: 70, depth: 70 })
  })

  it('Test D: transient UI state is NOT persisted (partialize whitelist)', async () => {
    const mod = await freshStoreWithLocalStorage()
    resetStoreToDefaults(mod)
    // 触发一次写入以生成 payload
    mod.useEditorStore.getState().placeItem({
      fixtureId: 1,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    // 改变一组瞬时 UI 状态
    mod.useEditorStore.getState().setToolMode('stamp')
    mod.useEditorStore.getState().setSelectedItem('abc')
    mod.useEditorStore.getState().rotatePreview('cw')
    mod.useEditorStore.getState().toggleOverwrite()
    mod.useEditorStore.getState().assignHotbar(1, 42)
    mod.useEditorStore.getState().setStageScale(2.5)
    mod.useEditorStore.getState().triggerFlash(['x'])

    const raw = localStorage.getItem(DESIGN_STORAGE_KEY)
    const parsed = JSON.parse(raw!)
    const persistedKeys = Object.keys(parsed.state)
    for (const k of persistedKeys) {
      expect(ALLOWED_PERSISTED_KEYS).toContain(k)
    }
    // 关键瞬时字段应不在 payload 中
    expect(parsed.state).not.toHaveProperty('selectedItemId')
    expect(parsed.state).not.toHaveProperty('toolMode')
    expect(parsed.state).not.toHaveProperty('previewRotation')
    expect(parsed.state).not.toHaveProperty('stageScale')
    expect(parsed.state).not.toHaveProperty('flashItemIds')
    expect(parsed.state).not.toHaveProperty('hotbar')
    expect(parsed.state).not.toHaveProperty('activeFixtureId')
    expect(parsed.state).not.toHaveProperty('overwriteEnabled')
  })
})

// ======== PERS-02 自动加载 ========

describe('PERS-02: rehydrate from localStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('Test E: pre-seeded localStorage rehydrates placedItems on module load', async () => {
    const seedId = 'seed-item-1'
    const mod = await freshStoreWithLocalStorage({
      placedItems: {
        [seedId]: {
          id: seedId,
          fixtureId: 77,
          x: 7,
          y: 8,
          rotation: 90,
          layer: 'furniture',
          isSystem: false,
        },
      },
      placedEdges: {},
      areaLevel: 2,
      gridSize: { width: 36, depth: 36 },
      isEditorReady: true,
    })
    const state = mod.useEditorStore.getState()
    expect(state.placedItems[seedId]).toBeDefined()
    expect(state.placedItems[seedId].fixtureId).toBe(77)
    expect(state.areaLevel).toBe(2)
  })

  it('Test F: fresh localStorage leaves store at factory defaults', async () => {
    const mod = await freshStoreWithLocalStorage()
    const state = mod.useEditorStore.getState()
    expect(state.placedItems).toEqual({})
    expect(state.placedEdges).toEqual({})
    expect(state.isEditorReady).toBe(false)
  })

  it('Test G: rehydrate with non-empty placedItems sets isEditorReady=true (Pitfall 2)', async () => {
    const mod = await freshStoreWithLocalStorage({
      placedItems: {
        'x': {
          id: 'x',
          fixtureId: 1,
          x: 0,
          y: 0,
          rotation: 0,
          layer: 'furniture',
          isSystem: false,
        },
      },
      placedEdges: {},
      areaLevel: 1,
      gridSize: { width: 36, depth: 36 },
      // 注意：payload 中未显式设 isEditorReady=true —— 交给 partialize 的自动逻辑
      isEditorReady: false,
    })
    const state = mod.useEditorStore.getState()
    // 有已保存内容时 App 应跳过 WelcomeScreen
    expect(state.isEditorReady).toBe(true)
  })
})
