// ======== 时间旅行批量操作测试 (D-43) ========
// INPUT: 模拟拖拽画刷的多次 placeItem 调用
// OUTPUT: 验证 startStrokeBatch/endStrokeBatch 合并 history 为单步
// POS: src/__tests__/temporalBatch.test.ts — Phase 2 D-43 批处理测试

import { describe, it, expect, beforeEach } from 'vitest'
import {
  useEditorStore,
  startStrokeBatch,
  endStrokeBatch,
  withBatchedUndo,
} from '../stores/editorStore'

describe('stroke batching (D-43)', () => {
  beforeEach(() => {
    // 重置 store 到干净状态
    useEditorStore.setState({
      placedItems: {},
      selectedItemId: null,
      toolMode: 'select',
      activeFixtureId: null,
    })
    useEditorStore.temporal.getState().clear()
  })

  it('startStrokeBatch pauses zundo tracking', () => {
    startStrokeBatch()
    expect(useEditorStore.temporal.getState().isTracking).toBe(false)
    endStrokeBatch() // cleanup
  })

  it('endStrokeBatch resumes zundo tracking', () => {
    startStrokeBatch()
    endStrokeBatch()
    expect(useEditorStore.temporal.getState().isTracking).toBe(true)
  })

  it('batched 5 placeItem calls produce exactly 1 history entry', () => {
    const initialLen = useEditorStore.temporal.getState().pastStates.length
    startStrokeBatch()
    for (let i = 0; i < 5; i++) {
      useEditorStore.getState().placeItem({
        fixtureId: 111,
        x: i * 2,
        y: 0,
        rotation: 0,
        layer: 'ground',
        isSystem: false,
      })
    }
    endStrokeBatch()
    const finalLen = useEditorStore.temporal.getState().pastStates.length
    expect(finalLen - initialLen).toBe(1)
  })

  it('withBatchedUndo wraps pause/resume automatically', () => {
    const initialLen = useEditorStore.temporal.getState().pastStates.length
    withBatchedUndo(() => {
      useEditorStore.getState().placeItem({
        fixtureId: 111, x: 0, y: 0, rotation: 0, layer: 'ground', isSystem: false,
      })
      useEditorStore.getState().placeItem({
        fixtureId: 111, x: 2, y: 0, rotation: 0, layer: 'ground', isSystem: false,
      })
      useEditorStore.getState().placeItem({
        fixtureId: 111, x: 4, y: 0, rotation: 0, layer: 'ground', isSystem: false,
      })
    })
    expect(useEditorStore.temporal.getState().pastStates.length - initialLen).toBe(1)
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(3)
  })

  it('undo of a batched stroke restores the pre-stroke state', () => {
    startStrokeBatch()
    useEditorStore.getState().placeItem({
      fixtureId: 111, x: 0, y: 0, rotation: 0, layer: 'ground', isSystem: false,
    })
    useEditorStore.getState().placeItem({
      fixtureId: 111, x: 2, y: 0, rotation: 0, layer: 'ground', isSystem: false,
    })
    endStrokeBatch()
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(2)
    useEditorStore.temporal.getState().undo()
    expect(Object.keys(useEditorStore.getState().placedItems)).toHaveLength(0)
  })

  it('endStrokeBatch is idempotent on double-call (R-06 cleanup race)', () => {
    const store = useEditorStore
    const before = store.temporal.getState().pastStates.length
    startStrokeBatch()
    store.getState().placeItem({ fixtureId: 111, x: 0, y: 0, rotation: 0, layer: 'ground', isSystem: false })
    endStrokeBatch()
    endStrokeBatch() // 第二次调用必须为 no-op
    const after = store.temporal.getState().pastStates.length
    expect(after - before).toBe(1) // 恰好 1 条 history 条目，而非 2 条
  })
})
