// ======== 缩放停靠（Slot F） ========
// INPUT: useEditorStore（stageScale, setStageScale）
// OUTPUT: 右下角药丸 — 缩小 / 100% / 放大
// POS: src/components/chrome/ZoomDock.tsx — Phase 7 缩放控件

import { Minus, Plus } from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'

// 与 src/hooks/useCanvasInteraction.ts 的 MIN_SCALE/MAX_SCALE 对齐 — 调整时同步两处
const MIN_SCALE = 0.15
const MAX_SCALE = 3.0
// 按钮单击的步进；wheel zoom 用 1.05（细粒度），按钮用 1.2（粗粒度）以减少点击次数
const STEP = 1.2

function clamp(v: number) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, v))
}

export function ZoomDock() {
  const stageScale = useEditorStore((s) => s.stageScale)
  const setStageScale = useEditorStore((s) => s.setStageScale)

  const onMinus = () => setStageScale(clamp(stageScale / STEP))
  const onPlus = () => setStageScale(clamp(stageScale * STEP))
  const onReset = () => setStageScale(1)

  const buttonStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-pill-inner)',
    background: 'transparent',
    color: 'var(--color-ink-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background .12s ease, transform .12s ease',
  }

  return (
    <div
      className="flex items-center"
      style={{
        height: 44,
        padding: '0 8px',
        background: 'linear-gradient(180deg, #ffffff, #fbf6ea)',
        borderRadius: 'var(--radius-panel)',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--color-panel-edge)',
        gap: 4,
      }}
    >
      <button
        type="button"
        onClick={onMinus}
        style={buttonStyle}
        aria-label="縮小"
        disabled={stageScale <= MIN_SCALE}
      >
        <Minus size={18} />
      </button>

      <button
        type="button"
        onClick={onReset}
        style={{
          ...buttonStyle,
          width: 56,
          fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: 11,
          lineHeight: 1.3,
          color: 'var(--color-ink)',
        }}
        aria-label="表示倍率をリセット"
      >
        {Math.round(stageScale * 100)}%
      </button>

      <button
        type="button"
        onClick={onPlus}
        style={buttonStyle}
        aria-label="拡大"
        disabled={stageScale >= MAX_SCALE}
      >
        <Plus size={18} />
      </button>
    </div>
  )
}
