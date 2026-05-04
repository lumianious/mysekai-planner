// ======== 浮动工具栏（Slot D） ========
// INPUT: useEditorStore（toolMode, overwriteEnabled, floatbarPosition）+ temporal pastStates/futureStates
// OUTPUT: 底部居中工具药丸；可拖拽快照到 left/center/right
// POS: src/components/chrome/FloatbarToolPill.tsx — Phase 7 浮动工具栏

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MousePointer2,
  Stamp,
  Paintbrush,
  Eraser,
  Replace,
  Undo2,
  Redo2,
} from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  useEditorStore,
  undoWithFlash,
  redoWithFlash,
} from '../../stores/editorStore'
import type { ToolMode } from '../../types/editor'
import { FloatbarDragHandle } from './FloatbarDragHandle'

// ======== temporal 状态订阅 Hook ========
function useTemporalState() {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  useEffect(() => {
    const t = useEditorStore.temporal.getState()
    setCanUndo(t.pastStates.length > 0)
    setCanRedo(t.futureStates.length > 0)
    const unsub = useEditorStore.temporal.subscribe((s) => {
      setCanUndo(s.pastStates.length > 0)
      setCanRedo(s.futureStates.length > 0)
    })
    return unsub
  }, [])
  return { canUndo, canRedo }
}

type SegmentKind = 'tool' | 'overwrite' | 'undo' | 'redo'

interface SegmentSpec {
  kind: SegmentKind
  mode?: ToolMode
  icon: React.ElementType
  kbd: string
  tooltip: string
  ariaLabel: string
}

const TOOL_SEGMENTS: SegmentSpec[] = [
  { kind: 'tool', mode: 'select', icon: MousePointer2, kbd: 'V', tooltip: '选择', ariaLabel: '选择' },
  { kind: 'tool', mode: 'stamp',  icon: Stamp,        kbd: 'B', tooltip: '放置', ariaLabel: '放置' },
  { kind: 'tool', mode: 'brush',  icon: Paintbrush,   kbd: 'P', tooltip: '画刷', ariaLabel: '画刷' },
  { kind: 'tool', mode: 'remove', icon: Eraser,       kbd: 'X', tooltip: '删除', ariaLabel: '删除' },
]
const OVERWRITE_SEGMENT: SegmentSpec = {
  kind: 'overwrite', icon: Replace, kbd: 'O', tooltip: '覆盖', ariaLabel: '覆盖',
}
const UNDO_SEGMENT: SegmentSpec = {
  kind: 'undo', icon: Undo2, kbd: '⌘Z', tooltip: '撤销', ariaLabel: '撤销',
}
const REDO_SEGMENT: SegmentSpec = {
  kind: 'redo', icon: Redo2, kbd: '⌘⇧Z', tooltip: '重做', ariaLabel: '重做',
}

// ======== 段（segment）组件 ========
interface SegmentProps {
  spec: SegmentSpec
  active: boolean
  disabled?: boolean
  onClick: () => void
}

function Segment({ spec, active, disabled = false, onClick }: SegmentProps) {
  const Icon = spec.icon
  const isRemoveActive = active && spec.mode === 'remove'
  const isSkyActive = active && !isRemoveActive

  // ======== 段背景与色调 ========
  const bg = isRemoveActive
    ? 'linear-gradient(180deg, #ff8c8c, #ff6f6f)'
    : isSkyActive
    ? 'linear-gradient(180deg, #9bdcff, #69c8ff)'
    : 'transparent'
  const color = isRemoveActive
    ? '#ffffff'
    : isSkyActive
    ? 'var(--color-ink-on-sky, #0e3955)'
    : 'var(--color-ink-2, #4f6a8e)'
  const insetShadow = isRemoveActive
    ? 'inset 0 -2px 0 rgba(0,0,0,.18)'
    : isSkyActive
    ? 'inset 0 -2px 0 rgba(46,168,238,.4)'
    : 'none'

  // 激活态下 kbd chip 切换为白色半透明
  const chipBg = active ? 'rgba(255,255,255,.32)' : 'rgba(31,53,86,.08)'

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={spec.ariaLabel}
          aria-pressed={active}
          disabled={disabled}
          onClick={disabled ? undefined : onClick}
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-pill-inner, 14px)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: bg,
            color,
            boxShadow: insetShadow,
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.3 : 1,
            transition: 'transform .12s ease, background .12s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (disabled || active) return
            e.currentTarget.style.background = 'rgba(255,255,255,.4)'
          }}
          onMouseLeave={(e) => {
            if (disabled || active) return
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <Icon size={22} strokeWidth={active ? 2.4 : 2} />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 16,
              height: 14,
              padding: '0 4px',
              borderRadius: 'var(--radius-chip, 10px)',
              background: chipBg,
              color: active ? '#ffffff' : 'var(--color-ink, #1f3556)',
              fontFamily: "'M PLUS Rounded 1c', system-ui, sans-serif",
              fontWeight: 800,
              fontSize: 11,
              lineHeight: 1.1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {spec.kbd}
          </span>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={8}
          style={{
            background: '#ffffff',
            border: '1px solid var(--color-panel-edge, rgba(60,80,140,.14))',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 12,
            color: 'var(--color-ink, #1f3556)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {spec.tooltip} ({spec.kbd})
          <Tooltip.Arrow style={{ fill: '#ffffff' }} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

// ======== 分隔线 ========
function Separator() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 1,
        height: 24,
        background: 'rgba(60,80,140,.14)',
        margin: '0 4px',
        flexShrink: 0,
      }}
    />
  )
}

// ======== 主组件 ========
export function FloatbarToolPill() {
  const toolMode = useEditorStore((s) => s.toolMode)
  const setToolMode = useEditorStore((s) => s.setToolMode)
  const overwriteEnabled = useEditorStore((s) => s.overwriteEnabled)
  const toggleOverwrite = useEditorStore((s) => s.toggleOverwrite)
  const floatbarPosition = useEditorStore((s) => s.floatbarPosition)
  const setFloatbarPosition = useEditorStore((s) => s.setFloatbarPosition)

  const { canUndo, canRedo } = useTemporalState()

  const pillRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)

  // ======== 拖拽中：直接修改 inline transform，避免 React re-render ========
  const handleDragMove = useCallback((deltaX: number) => {
    const el = pillRef.current
    if (!el) return
    if (!draggingRef.current) {
      // 暂停 left 过渡，让 transform 跟随光标
      draggingRef.current = true
      el.style.transition = 'none'
    }
    // 在原 floatbarPosition 计算出的 left 基础上叠加 translateX(deltaX)
    // 注意：base translate 已经包含在 style.transform 中（由 React 根据 floatbarPosition 计算），
    // 这里需要重写完整 transform 以叠加 deltaX
    const base = computeBaseTransform(floatbarPosition)
    el.style.transform = `${base} translateX(${deltaX}px)`
  }, [floatbarPosition])

  // ======== 拖拽结束：根据视口三分位选择 snap ========
  const handleDragEnd = useCallback(() => {
    const el = pillRef.current
    if (!el) return
    draggingRef.current = false
    const rect = el.getBoundingClientRect()
    const center = rect.left + rect.width / 2
    const w = window.innerWidth
    let snap: 'left' | 'center' | 'right' = 'center'
    if (center < w / 3) snap = 'left'
    else if (center > (2 * w) / 3) snap = 'right'
    else snap = 'center'
    // 恢复过渡，由 React 重新计算 left/transform（floatbarPosition 触发）
    el.style.transition = 'left .22s cubic-bezier(.5,1.4,.4,1), transform .22s cubic-bezier(.5,1.4,.4,1)'
    el.style.transform = computeBaseTransform(snap)
    setFloatbarPosition(snap)
  }, [setFloatbarPosition])

  // ======== 计算定位 ========
  const { left, transform } = computePosition(floatbarPosition)

  return (
    <Tooltip.Provider delayDuration={300}>
      <div
        ref={pillRef}
        data-floatbar-pill
        style={{
          position: 'absolute',
          bottom: 0,
          left,
          transform,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 8px',
          background: 'linear-gradient(180deg, #ffffff, #fbf6ea)',
          borderRadius: 'var(--radius-panel, 22px)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--color-panel-edge, rgba(60,80,140,.14))',
          transition: 'left .22s cubic-bezier(.5,1.4,.4,1), transform .22s cubic-bezier(.5,1.4,.4,1)',
          pointerEvents: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {/* 拖拽柄 */}
        <FloatbarDragHandle onDragMove={handleDragMove} onDragEnd={handleDragEnd} />

        {/* 工具段 */}
        {TOOL_SEGMENTS.map((spec) => (
          <Segment
            key={spec.mode}
            spec={spec}
            active={toolMode === spec.mode}
            onClick={() => setToolMode(spec.mode!)}
          />
        ))}

        <Separator />

        {/* 覆盖切换 */}
        <Segment
          spec={OVERWRITE_SEGMENT}
          active={overwriteEnabled}
          onClick={toggleOverwrite}
        />

        <Separator />

        {/* 撤销 / 重做 */}
        <Segment
          spec={UNDO_SEGMENT}
          active={false}
          disabled={!canUndo}
          onClick={() => undoWithFlash()}
        />
        <Segment
          spec={REDO_SEGMENT}
          active={false}
          disabled={!canRedo}
          onClick={() => redoWithFlash()}
        />
      </div>
    </Tooltip.Provider>
  )
}

// ======== 定位计算 ========
// left/center/right -> { left, transform } 双值
function computePosition(pos: 'left' | 'center' | 'right') {
  switch (pos) {
    case 'left':
      return { left: '0%', transform: 'translateX(24px)' }
    case 'right':
      return { left: '100%', transform: 'translateX(calc(-100% - 24px))' }
    case 'center':
    default:
      return { left: '50%', transform: 'translateX(-50%)' }
  }
}

function computeBaseTransform(pos: 'left' | 'center' | 'right') {
  return computePosition(pos).transform
}
