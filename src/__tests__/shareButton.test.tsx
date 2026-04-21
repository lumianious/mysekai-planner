// ======== ShareButton 集成测试 (PERS-03) ========
// INPUT: 模拟 navigator.clipboard 与 editorStore 种子数据
// OUTPUT: 验证点击按钮写剪贴板 + 成功/失败 toast 路径 + URL 往返
// POS: src/__tests__/shareButton.test.tsx — Phase 03 Plan 03 Wave 0

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import type { PlacedItem } from '../types/editor'

// ======== sonner mock —— 捕获 toast.success / toast.error 调用 ========
const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
  Toaster: () => null,
}))

// ======== lucide-react 图标轻量 mock（避免 jsdom 渲染 SVG 噪声） ========
vi.mock('lucide-react', () => new Proxy({}, {
  get: () => () => null,
}))

import { ShareButton } from '../components/toolbar/ShareButton'
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

describe('ShareButton', () => {
  it('writes a URL to clipboard starting with origin + pathname + #v1.', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    seedOneItem()

    const { container } = render(<ShareButton />)
    const btn = container.querySelector('button')!
    fireEvent.click(btn)

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const url = writeText.mock.calls[0][0] as string
    const expectedPrefix = `${window.location.origin}${window.location.pathname}#v1.`
    expect(url.startsWith(expectedPrefix)).toBe(true)
    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(toastError).not.toHaveBeenCalled()
  })

  it('shows error toast when clipboard write rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    seedOneItem()

    const { container } = render(<ShareButton />)
    const btn = container.querySelector('button')!
    fireEvent.click(btn)

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1))
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('URL produced decodes back to the same seeded fields (round-trip)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const seed = seedOneItem()

    const { container } = render(<ShareButton />)
    const btn = container.querySelector('button')!
    fireEvent.click(btn)

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const url = writeText.mock.calls[0][0] as string
    const hash = url.split('#')[1]
    const decoded = decodeBlueprint(hash)
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
})
