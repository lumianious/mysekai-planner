// ======== 浮动工具栏拖拽手柄（Slot D 左端） ========
// INPUT: onDragMove(deltaX) / onDragEnd 回调（由父组件 FloatbarToolPill 提供）
// OUTPUT: 22×36 拖拽柄；按下后捕获指针、跟随光标平移；首次出现时脉冲提示
// POS: src/components/chrome/FloatbarDragHandle.tsx — Phase 7 浮动工具栏拖拽柄

import { useEffect, useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'

interface FloatbarDragHandleProps {
  onDragStart?: () => void
  onDragMove: (deltaX: number) => void
  onDragEnd: () => void
}

// 注入一次全局 keyframes（idempotent —— 若已存在则跳过）
const KEYFRAMES_ID = 'floatbar-drag-handle-keyframes'
function ensureKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(KEYFRAMES_ID)) return
  const style = document.createElement('style')
  style.id = KEYFRAMES_ID
  style.textContent = `
    @keyframes floatHandleHint {
      0%, 100% { box-shadow: 0 0 0 0 rgba(105,200,255,0); }
      50%      { box-shadow: 0 0 0 6px rgba(105,200,255,.35); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%      { opacity: .6; transform: scale(.92); }
    }
  `
  document.head.appendChild(style)
}

export function FloatbarDragHandle({
  onDragStart,
  onDragMove,
  onDragEnd,
}: FloatbarDragHandleProps) {
  const [dragging, setDragging] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const startXRef = useRef(0)

  useEffect(() => {
    ensureKeyframes()
    // 首次加载提示：sessionStorage 门控两个 1.4s 周期
    if (typeof window === 'undefined') return
    const seen = sessionStorage.getItem('floatDragSeen')
    if (!seen) {
      setShowHint(true)
      const t = window.setTimeout(() => {
        setShowHint(false)
        sessionStorage.setItem('floatDragSeen', '1')
      }, 1400 * 2)
      return () => window.clearTimeout(t)
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    startXRef.current = e.clientX
    setDragging(true)
    onDragStart?.()
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return
    const deltaX = e.clientX - startXRef.current
    onDragMove(deltaX)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // 已释放，忽略
    }
    setDragging(false)
    onDragEnd()
  }

  return (
    <button
      type="button"
      aria-label="ドラッグで移動"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        width: 22,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: 8,
        cursor: dragging ? 'grabbing' : 'grab',
        color: 'var(--color-muted)',
        padding: 0,
        animation: showHint ? 'floatHandleHint 1.4s ease-in-out 2' : undefined,
        transition: 'background .12s ease',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!dragging) e.currentTarget.style.background = 'rgba(105,200,255,.12)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <GripVertical size={16} />
    </button>
  )
}
