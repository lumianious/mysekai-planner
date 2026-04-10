// ======== 围栏确认浮层 ========
// INPUT: pixelX/pixelY（容器本地屏幕像素坐标），onConfirm/onCancel 回调
// OUTPUT: 绝对定位的 HTML 按钮组（匹配游戏内「キャンセル」/「決定」内联 UI）
// POS: src/components/canvas/FenceConfirmOverlay.tsx — 围栏 confirming 阶段内联确认 UI
//
// 设计要点：
//   1. DOM 元素而非 Konva —— 父容器需为 position: relative
//   2. 点击事件 stopPropagation 避免冒泡到 Stage 触发 "click-elsewhere" 取消
//   3. 按钮具有键盘辅助 hint：「キャンセル (Esc)」/「決定 (Enter)」
//   4. 颜色采用 Tailwind 设计 token 占位（`bg-surface` 等若未定义则回退为标准色）

import { Check, X } from 'lucide-react'

interface FenceConfirmOverlayProps {
  pixelX: number
  pixelY: number
  onConfirm: () => void
  onCancel: () => void
}

export function FenceConfirmOverlay({
  pixelX,
  pixelY,
  onConfirm,
  onCancel,
}: FenceConfirmOverlayProps) {
  return (
    <div
      className="absolute z-50 flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-2 shadow-xl"
      style={{
        left: `${pixelX}px`,
        top: `${pixelY}px`,
        transform: 'translate(8px, 8px)',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onCancel}
        className="flex h-8 items-center gap-1 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 hover:bg-gray-100"
        aria-label="キャンセル (Escape)"
      >
        <X size={14} />
        <span>キャンセル</span>
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="flex h-8 items-center gap-1 rounded-md bg-emerald-500 px-3 text-sm font-medium text-white hover:bg-emerald-600"
        aria-label="決定 (Enter)"
      >
        <Check size={14} />
        <span>決定</span>
      </button>
    </div>
  )
}
