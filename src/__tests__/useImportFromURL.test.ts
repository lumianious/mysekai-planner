// ======== useImportFromURL 集成测试 (PERS-04) ========
// INPUT: 预设 window.location.hash；预播种或清空 editorStore
// OUTPUT: 空设计静默导入；有设计触发 pending 状态；accept/cancel 行为；malformed 容错
// POS: src/__tests__/useImportFromURL.test.ts — Phase 03 Plan 03 Wave 0

import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImportFromURL } from '../hooks/useImportFromURL'
import { encodeBlueprint } from '../persistence/encodeBlueprint'
import { useEditorStore } from '../stores/editorStore'
import type { PlacedItem } from '../types/editor'

function setHash(hash: string) {
  // jsdom 支持直接赋值 location.hash；最保险用 history.replaceState
  history.replaceState(null, '', window.location.pathname + (hash ? `#${hash}` : ''))
}

function makeItem(overrides: Partial<PlacedItem> = {}): PlacedItem {
  return {
    id: overrides.id ?? 'id-' + Math.random().toString(36).slice(2),
    fixtureId: overrides.fixtureId ?? 10,
    x: overrides.x ?? 1,
    y: overrides.y ?? 1,
    rotation: overrides.rotation ?? 0,
    layer: overrides.layer ?? 'furniture',
    isSystem: overrides.isSystem ?? false,
  }
}

function clearStore() {
  useEditorStore.setState({
    placedItems: {},
    placedEdges: {},
    areaLevel: 1,
  })
}

beforeEach(() => {
  clearStore()
  setHash('')
  vi.restoreAllMocks()
})

afterEach(() => {
  setHash('')
})

describe('useImportFromURL', () => {
  it('empty store + valid hash: imports silently and strips hash', () => {
    const payload = encodeBlueprint({
      placedItems: { x: makeItem({ fixtureId: 99, x: 5, y: 6 }) },
      placedEdges: {},
      areaLevel: 2,
    })
    setHash(payload)

    const { result } = renderHook(() => useImportFromURL())
    expect(result.current.pending).toBeNull()
    const state = useEditorStore.getState()
    expect(Object.values(state.placedItems)).toHaveLength(1)
    expect(state.areaLevel).toBe(2)
    expect(window.location.hash).toBe('')
  })

  it('non-empty store + valid hash: sets pending, does NOT overwrite', () => {
    const existing = makeItem({ fixtureId: 1 })
    useEditorStore.setState({ placedItems: { [existing.id]: existing } })
    const payload = encodeBlueprint({
      placedItems: { x: makeItem({ fixtureId: 99 }) },
      placedEdges: {},
      areaLevel: 1,
    })
    setHash(payload)

    const { result } = renderHook(() => useImportFromURL())
    expect(result.current.pending).not.toBeNull()
    const state = useEditorStore.getState()
    // 未覆写：原 item 仍在
    expect(state.placedItems[existing.id]).toBeDefined()
    const items = Object.values(state.placedItems)
    expect(items).toHaveLength(1)
    expect(items[0].fixtureId).toBe(1)
  })

  it('accept(): overwrites store and strips hash', () => {
    const existing = makeItem({ fixtureId: 1 })
    useEditorStore.setState({ placedItems: { [existing.id]: existing } })
    const payload = encodeBlueprint({
      placedItems: { x: makeItem({ fixtureId: 99 }) },
      placedEdges: {},
      areaLevel: 1,
    })
    setHash(payload)

    const { result } = renderHook(() => useImportFromURL())
    expect(result.current.pending).not.toBeNull()

    act(() => result.current.accept())

    const state = useEditorStore.getState()
    const items = Object.values(state.placedItems)
    expect(items).toHaveLength(1)
    expect(items[0].fixtureId).toBe(99)
    expect(window.location.hash).toBe('')
    expect(result.current.pending).toBeNull()
  })

  it('cancel(): leaves store untouched but strips hash (D-07)', () => {
    const existing = makeItem({ fixtureId: 1 })
    useEditorStore.setState({ placedItems: { [existing.id]: existing } })
    const payload = encodeBlueprint({
      placedItems: { x: makeItem({ fixtureId: 99 }) },
      placedEdges: {},
      areaLevel: 1,
    })
    setHash(payload)

    const { result } = renderHook(() => useImportFromURL())
    expect(result.current.pending).not.toBeNull()

    act(() => result.current.cancel())

    const state = useEditorStore.getState()
    expect(state.placedItems[existing.id]).toBeDefined()
    const items = Object.values(state.placedItems)
    expect(items).toHaveLength(1)
    expect(items[0].fixtureId).toBe(1)
    expect(window.location.hash).toBe('')
    expect(result.current.pending).toBeNull()
  })

  it('malformed hash: no throw, no store change', () => {
    setHash('garbage-not-a-blueprint')
    const existing = makeItem({ fixtureId: 1 })
    useEditorStore.setState({ placedItems: { [existing.id]: existing } })

    expect(() => {
      renderHook(() => useImportFromURL())
    }).not.toThrow()

    const state = useEditorStore.getState()
    expect(state.placedItems[existing.id]).toBeDefined()
  })
})
