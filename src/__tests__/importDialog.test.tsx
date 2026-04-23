// ======== ImportButton + ImportDialog 集成测试 (PERS-04 重解释) ========
// INPUT: 用户点击工具栏按钮 → dialog 粘贴代码 → 导入 → 确认 → 覆盖 store
// OUTPUT: 覆盖流程、确认对话框、malformed 内联错误、确认-替换/取消路径
// POS: src/__tests__/importDialog.test.tsx — Phase 03 Plan 03 Wave 0 (scope v2)

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import type { PlacedItem } from '../types/editor'

// ======== sonner mock ========
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

// ======== ToolButton 替身 ========
vi.mock('../components/toolbar/ToolButton', () => ({
  ToolButton: (props: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button aria-label={props.label} onClick={props.onClick} disabled={props.disabled}>
      {props.label}
    </button>
  ),
}))

import { ImportButton } from '../components/toolbar/ImportButton'
import { encodeBlueprint } from '../persistence/encodeBlueprint'
import { useEditorStore } from '../stores/editorStore'

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

function validCode() {
  return encodeBlueprint({
    placedItems: { x: makeItem({ fixtureId: 99, x: 5, y: 6 }) },
    placedEdges: {},
    areaLevel: 2,
  })
}

beforeEach(() => {
  useEditorStore.setState({ placedItems: {}, placedEdges: {}, areaLevel: 1 })
})

describe('ImportButton + ImportDialog', () => {
  it('opening the dialog shows an empty paste field', () => {
    render(<ImportButton />)
    expect(screen.queryByRole('textbox')).toBeNull()
    fireEvent.click(screen.getByLabelText('导入代码'))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('')
  })

  it('empty store + valid code: 导入 → confirm dialog → 替换 overwrites store', async () => {
    render(<ImportButton />)
    fireEvent.click(screen.getByLabelText('导入代码'))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: validCode() } })
    fireEvent.click(screen.getByRole('button', { name: '导入' }))

    // ALWAYS shows confirm dialog (even when empty — D-07 relaxed to consistency)
    await waitFor(() => {
      expect(screen.getByText('替换当前设计？')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: '替换' }))

    const state = useEditorStore.getState()
    const items = Object.values(state.placedItems)
    expect(items).toHaveLength(1)
    expect(items[0].fixtureId).toBe(99)
    expect(state.areaLevel).toBe(2)
  })

  it('non-empty store + valid code + 替换: overwrites', async () => {
    const existing = makeItem({ fixtureId: 1 })
    useEditorStore.setState({ placedItems: { [existing.id]: existing } })

    render(<ImportButton />)
    fireEvent.click(screen.getByLabelText('导入代码'))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: validCode() } })
    fireEvent.click(screen.getByRole('button', { name: '导入' }))

    await waitFor(() => {
      expect(screen.getByText('替换当前设计？')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: '替换' }))

    const state = useEditorStore.getState()
    const items = Object.values(state.placedItems)
    expect(items).toHaveLength(1)
    expect(items[0].fixtureId).toBe(99)
  })

  it('取消 on confirm dialog: store unchanged, dialogs closed', async () => {
    const existing = makeItem({ fixtureId: 1 })
    useEditorStore.setState({ placedItems: { [existing.id]: existing } })

    render(<ImportButton />)
    fireEvent.click(screen.getByLabelText('导入代码'))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: validCode() } })
    fireEvent.click(screen.getByRole('button', { name: '导入' }))

    await waitFor(() => {
      expect(screen.getByText('替换当前设计？')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: '取消' }))

    const state = useEditorStore.getState()
    expect(state.placedItems[existing.id]).toBeDefined()
    const items = Object.values(state.placedItems)
    expect(items).toHaveLength(1)
    expect(items[0].fixtureId).toBe(1)
  })

  it('malformed code: inline error shown, dialog stays open, store unchanged', async () => {
    const existing = makeItem({ fixtureId: 1 })
    useEditorStore.setState({ placedItems: { [existing.id]: existing } })

    render(<ImportButton />)
    fireEvent.click(screen.getByLabelText('导入代码'))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'v1.not-a-valid-code' } })
    fireEvent.click(screen.getByRole('button', { name: '导入' }))

    // inline error indicator present (role=alert or aria-invalid semantic)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })
    // confirm dialog NOT shown
    expect(screen.queryByText('替换当前设计？')).toBeNull()
    // textarea still there
    expect(screen.getByRole('textbox')).toBeTruthy()
    // store unchanged
    const state = useEditorStore.getState()
    expect(state.placedItems[existing.id]).toBeDefined()
  })

  it('empty input: inline error, no confirm, no crash', async () => {
    render(<ImportButton />)
    fireEvent.click(screen.getByLabelText('导入代码'))
    fireEvent.click(screen.getByRole('button', { name: '导入' }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })
  })
})
