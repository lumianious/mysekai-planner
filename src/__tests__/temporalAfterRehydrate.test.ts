// ======== persist × temporal 组合不变量测试 ========
// INPUT: 预播种的 localStorage → 模块重新加载（rehydrate）→ stroke + undo/redo
// OUTPUT: 验证 zundo 的 startStrokeBatch/endStrokeBatch 和 undo/redo 在 rehydrate 后仍工作
// POS: src/__tests__/temporalAfterRehydrate.test.ts — Phase 03 RESEARCH §Open Questions 3
//
// 这是关键不变量测试：persist 外层包裹 temporal 后，内层 temporal 的 pause/resume/setState
// 操作必须与 Phase 02.1 stroke-batch 模型保持完全兼容。

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { DESIGN_STORAGE_KEY } from '../persistence/storageKey'

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

const SEED_ITEM_ID = 'seed-1'

function baseSeed() {
  return {
    placedItems: {
      [SEED_ITEM_ID]: {
        id: SEED_ITEM_ID,
        fixtureId: 1,
        x: 10,
        y: 10,
        rotation: 0,
        layer: 'furniture' as const,
        isSystem: false,
      },
    },
    placedEdges: {},
    areaLevel: 1,
    gridSize: { width: 36, depth: 36 },
    isEditorReady: true,
  }
}

describe('temporal composition survives persist rehydrate', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('Test 1: startStrokeBatch + placeItem + endStrokeBatch + undo restores pre-stroke state after rehydrate', async () => {
    const mod = await freshStoreWithLocalStorage(baseSeed())
    // 清空 undo 历史以避免 rehydrate 过程意外塞入 pastStates
    mod.useEditorStore.temporal.getState().clear()

    const preStroke = { ...mod.useEditorStore.getState().placedItems }
    expect(Object.keys(preStroke)).toHaveLength(1)

    mod.startStrokeBatch()
    mod.useEditorStore.getState().placeItem({
      fixtureId: 111,
      x: 0,
      y: 0,
      rotation: 0,
      layer: 'ground',
      isSystem: false,
    })
    mod.useEditorStore.getState().placeItem({
      fixtureId: 111,
      x: 2,
      y: 0,
      rotation: 0,
      layer: 'ground',
      isSystem: false,
    })
    mod.endStrokeBatch()

    expect(Object.keys(mod.useEditorStore.getState().placedItems)).toHaveLength(3)

    mod.useEditorStore.temporal.getState().undo()
    const afterUndo = mod.useEditorStore.getState().placedItems
    expect(Object.keys(afterUndo)).toHaveLength(1)
    expect(afterUndo[SEED_ITEM_ID]).toBeDefined()
  })

  it('Test 2: placing an item after rehydrate writes the new item back to localStorage', async () => {
    const mod = await freshStoreWithLocalStorage(baseSeed())
    mod.useEditorStore.getState().placeItem({
      fixtureId: 222,
      x: 20,
      y: 20,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    const raw = localStorage.getItem(DESIGN_STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    const ids = Object.keys(parsed.state.placedItems)
    expect(ids).toHaveLength(2)
    const hasNew = Object.values(parsed.state.placedItems).some(
      (it) => (it as { fixtureId: number }).fixtureId === 222,
    )
    expect(hasNew).toBe(true)
  })

  it('Test 3: rehydrate → placeItem → undo → redo returns to post-place state', async () => {
    const mod = await freshStoreWithLocalStorage(baseSeed())
    mod.useEditorStore.temporal.getState().clear()

    mod.useEditorStore.getState().placeItem({
      fixtureId: 333,
      x: 5,
      y: 5,
      rotation: 0,
      layer: 'furniture',
      isSystem: false,
    })
    // 等待 zundo 异步记录
    await new Promise((r) => setTimeout(r, 50))
    expect(Object.keys(mod.useEditorStore.getState().placedItems)).toHaveLength(2)

    mod.useEditorStore.temporal.getState().undo()
    expect(Object.keys(mod.useEditorStore.getState().placedItems)).toHaveLength(1)

    mod.useEditorStore.temporal.getState().redo()
    expect(Object.keys(mod.useEditorStore.getState().placedItems)).toHaveLength(2)
  })
})
