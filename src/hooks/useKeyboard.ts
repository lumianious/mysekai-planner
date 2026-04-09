// ======== 全局键盘快捷键 Hook ========
// INPUT: containerRef (Stage 容器 div), onNudge, onCycleSelection, isHoveringCatalog
// OUTPUT: 将键盘事件绑定到容器元素，调用 store 动作
// POS: src/hooks/useKeyboard.ts — 编辑器全局键盘事件处理

import { useEffect, useCallback } from 'react'
import { useEditorStore } from '../stores/editorStore'

interface UseKeyboardOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  onNudge?: (itemId: string, newX: number, newY: number) => void
  onCycleSelection?: () => void
  isHoveringCatalog: boolean
}

export function useKeyboard({
  containerRef,
  onNudge,
  onCycleSelection,
  isHoveringCatalog,
}: UseKeyboardOptions) {
  // 键盘事件处理器 — 使用 getState() 避免选择器导致的频繁重渲染
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const state = useEditorStore.getState()
      const { undo, redo } = useEditorStore.temporal.getState()

      // 全局快捷键
      switch (e.key.toLowerCase()) {
        case 'v':
          state.setToolMode('select')
          return
        case 'b':
          state.setToolMode('stamp')
          return
        case 'x':
          state.setToolMode('remove')
          return
        case 'escape':
          state.setSelectedItem(null)
          if (state.toolMode === 'stamp') state.setActiveFixture(null)
          return
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (e.shiftKey) redo()
            else undo()
          }
          return
        case 'y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            redo()
          }
          return
      }

      // 旋转（选中项目或预览）
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        const direction = e.shiftKey ? 'ccw' : 'cw'
        if (state.selectedItemId) {
          state.rotateItem(state.selectedItemId, direction)
        }
        // 旋转预览 — previewRotation 在 store 中，直接调用 rotatePreview
        if (state.toolMode === 'stamp') {
          state.rotatePreview(direction)
        }
        return
      }

      // 热栏数字键（目录悬停时不触发，由 CatalogItem 的 onKeyDown 处理）
      if (e.key >= '1' && e.key <= '9' && !isHoveringCatalog) {
        state.activateHotbar(parseInt(e.key))
        return
      }

      // 删除选中项
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedItemId) {
        e.preventDefault()
        state.removeItem(state.selectedItemId)
        return
      }

      // 方向键微调（选择模式下移动选中项目）
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) &&
        state.selectedItemId
      ) {
        e.preventDefault()
        const item = state.placedItems[state.selectedItemId]
        if (!item) return
        const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
        const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
        onNudge?.(state.selectedItemId, item.x + dx, item.y + dy)
        return
      }

      // Tab 循环选择同一格子上的重叠物品
      if (e.key === 'Tab') {
        e.preventDefault()
        onCycleSelection?.()
        return
      }
    },
    [isHoveringCatalog, onNudge, onCycleSelection],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Safari-safe focus (Pitfall 1 from RESEARCH.md)
    // tabIndex={-1} 允许程序化 focus 但不进入 Tab 顺序
    container.tabIndex = -1
    container.style.outline = 'none'

    container.addEventListener('keydown', handleKeyDown)

    // 点击容器时获取焦点，确保键盘事件被捕获
    const handleClick = () => container.focus()
    container.addEventListener('click', handleClick)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('click', handleClick)
    }
  }, [containerRef, handleKeyDown])
}
