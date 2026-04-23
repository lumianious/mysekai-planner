// ======== ExportButton + ExportDialog 集成测试 (PERS-03 重解释) ========
// INPUT: 模拟 navigator.clipboard + editorStore 种子
// OUTPUT: 点击工具栏按钮打开 dialog；dialog 显示 encodeBlueprint 输出；
//         点击「复制」调用 clipboard.writeText 并弹 toast
// POS: src/__tests__/exportButton.test.tsx — Phase 03 Plan 03 Wave 0 (scope v2)

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import type { PlacedItem } from '../types/editor'

// ======== sonner mock ========
const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
  Toaster: () => null,
}))

// ======== ToolButton 替身，绕开 Radix Tooltip Portal ========
vi.mock('../components/toolbar/ToolButton', () => ({
  ToolButton: (props: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button aria-label={props.label} onClick={props.onClick} disabled={props.disabled}>
      {props.label}
    </button>
  ),
}))

import { ExportButton } from '../components/toolbar/ExportButton'
import { useEditorStore } from '../stores/editorStore'
import { decodeBlueprint } from '../persistence/decodeBlueprint'

function seedOneItem(): PlacedItem {
  const item: PlacedItem = {
    id: 'seed-1',
    fixtureId: 42,
    x: 3,
    y: 4,
    rotation: 90,
    layer: 'furniture',
    isSystem: false,
  }
  useEditorStore.setState({
    placedItems: { [item.id]: item },
    placedEdges: {},
    areaLevel: 1,
  })
  return item
}

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
  useEditorStore.setState({ placedItems: {}, placedEdges: {}, areaLevel: 1 })
})

describe('ExportButton + ExportDialog', () => {
  it('clicking toolbar button opens the export dialog with a v1. code', () => {
    seedOneItem()
    render(<ExportButton />)

    // Dialog 初始关闭 —— textarea 不在 DOM
    expect(screen.queryByRole('textbox')).toBeNull()

    fireEvent.click(screen.getByLabelText('导出代码'))

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea).toBeTruthy()
    expect(textarea.readOnly).toBe(true)
    expect(textarea.value.startsWith('v1.')).toBe(true)
  })

  it('clicking 复制 writes the code to clipboard and fires success toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    seedOneItem()
    render(<ExportButton />)

    fireEvent.click(screen.getByLabelText('导出代码'))
    fireEvent.click(screen.getByRole('button', { name: '复制' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const copied = writeText.mock.calls[0][0] as string
    expect(copied.startsWith('v1.')).toBe(true)
    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(toastError).not.toHaveBeenCalled()
  })

  it('clipboard failure fires error toast, dialog stays open', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    seedOneItem()
    render(<ExportButton />)

    fireEvent.click(screen.getByLabelText('导出代码'))
    fireEvent.click(screen.getByRole('button', { name: '复制' }))

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1))
    expect(toastSuccess).not.toHaveBeenCalled()
    // Dialog still open
    expect(screen.queryByRole('textbox')).not.toBeNull()
  })

  it('exported code round-trips through decodeBlueprint', () => {
    const seed = seedOneItem()
    render(<ExportButton />)
    fireEvent.click(screen.getByLabelText('导出代码'))
    const code = (screen.getByRole('textbox') as HTMLTextAreaElement).value

    const decoded = decodeBlueprint(code)
    expect(decoded).not.toBeNull()
    const items = Object.values(decoded!.placedItems)
    expect(items).toHaveLength(1)
    const [only] = items
    expect(only.fixtureId).toBe(seed.fixtureId)
    expect(only.x).toBe(seed.x)
    expect(only.y).toBe(seed.y)
    expect(only.rotation).toBe(seed.rotation)
    expect(only.layer).toBe(seed.layer)
    expect(only.isSystem).toBe(seed.isSystem)
    expect(decoded!.areaLevel).toBe(1)
  })

  it('does NOT auto-copy on dialog open (user must click 复制)', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    seedOneItem()
    render(<ExportButton />)

    fireEvent.click(screen.getByLabelText('导出代码'))
    // opening alone does not touch clipboard
    expect(writeText).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})
