// ======== 顶栏自动保存药丸（Slot A） ========
// INPUT: useEditorStore.lastSaveAt（persist storage 包装器写入）, props.saveError?
// OUTPUT: 三态指示 —— 保存中…/自動保存 · Ns/保存エラー — 再試行
// POS: src/components/chrome/AutosavePill.tsx — Phase 7 plan 02 自动保存指示器

import { useEffect, useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'

interface AutosavePillProps {
  saveError?: boolean
  onRetry?: () => void
}

// ======== 相对时间格式化 ========
// INPUT: 秒数（>=0）
// OUTPUT: 中文+日文混排的紧凑相对时间字符串
function formatRelative(secondsAgo: number): string {
  if (secondsAgo < 60) return `${secondsAgo}s`
  const min = Math.floor(secondsAgo / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  return `${hr}h`
}

export function AutosavePill({ saveError = false, onRetry }: AutosavePillProps) {
  const lastSaveAt = useEditorStore((s) => s.lastSaveAt)
  // 通过 tick state 强制每秒重渲染以更新相对时间
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // ======== 三态决策 ========
  // 1. 错误（最优先）→ 红点 + 可点击重试
  // 2. lastSaveAt 为 null → 保存中…
  // 3. 其余 → idle，绿色脉冲点 + 相对时间
  const isError = saveError
  const isSaving = !isError && lastSaveAt === null
  const secondsAgo =
    lastSaveAt !== null ? Math.max(0, Math.floor((Date.now() - lastSaveAt) / 1000)) : 0

  const containerStyle: React.CSSProperties = {
    height: 32,
    padding: '0 16px',
    gap: 8,
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(180deg, #fff8e7, #ecdfb8)',
    borderRadius: 'var(--radius-pill-inner)',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--color-tan-edge)',
    fontFamily: 'Nunito, system-ui, sans-serif',
    fontWeight: 700,
    fontSize: 13,
    color: 'var(--color-ink)',
    cursor: isError ? 'pointer' : 'default',
  }

  // 错误态：渲染为 button 以便点击重试
  if (isError) {
    return (
      <>
        <style>{AUTOSAVE_PULSE_KEYFRAMES}</style>
        <button
          type="button"
          onClick={onRetry}
          aria-label="保存を再試行"
          style={{ ...containerStyle, border: '1px solid var(--color-danger)' }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-danger)',
            }}
          />
          <span>保存エラー — 再試行</span>
        </button>
      </>
    )
  }

  if (isSaving) {
    return (
      <>
        <style>{AUTOSAVE_PULSE_KEYFRAMES}</style>
        <div style={containerStyle}>
          <span>保存中…</span>
        </div>
      </>
    )
  }

  // idle：脉冲绿点 + 自動保存 · Ns
  return (
    <>
      <style>{AUTOSAVE_PULSE_KEYFRAMES}</style>
      <div style={containerStyle}>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--color-green)',
            animation: 'autosave-pulse 2s ease-in-out infinite',
          }}
        />
        <span>自動保存 · {formatRelative(secondsAgo)}</span>
      </div>
    </>
  )
}

// 内联 keyframes 避免修改 index.css 全局表（复用风险低，且单组件持有）
const AUTOSAVE_PULSE_KEYFRAMES = `
@keyframes autosave-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}
`
