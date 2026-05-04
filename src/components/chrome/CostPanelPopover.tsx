// ======== 成本面板浮层（Slot C） ========
// INPUT: useEditorStore（costPanelOpen, setCostPanelOpen, placedItems）, fixtureMap, costIndex
// OUTPUT: 仅在 costPanelOpen=true 时挂载的浮层；包裹 CostPanel body
// POS: src/components/chrome/CostPanelPopover.tsx — Phase 7 成本面板外壳

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { CostPanel } from '../costs/CostPanel'
import { useEditorStore } from '../../stores/editorStore'
import type { Fixture } from '../../types/editor'
import type { CostIndex } from '../../data/cost'

interface CostPanelPopoverProps {
  fixtureMap: Map<number, Fixture>
  costIndex: CostIndex | null
}

// 18000 是 UI-SPEC 副标题里固定的 cap 引用，与游戏内放置上限对齐（参考值）
const TOTAL_CAP = 18000

export function CostPanelPopover({ fixtureMap, costIndex }: CostPanelPopoverProps) {
  const open = useEditorStore((s) => s.costPanelOpen)
  const setOpen = useEditorStore((s) => s.setCostPanelOpen)
  const placedItems = useEditorStore((s) => s.placedItems)
  const itemCount = Object.keys(placedItems).length

  // ======== 入场/出场动画：先挂载 → 下一帧切到 open=true 触发 transition ========
  // 关闭时先把 open 翻成 false，等 transition 跑完再彻底卸载
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (open) {
      setMounted(true)
    } else {
      const t = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!mounted) return null

  return (
    <div
      id="cost-panel"
      role="dialog"
      aria-label="材料コスト"
      style={{
        width: 320,
        height: 580,
        background: 'linear-gradient(180deg, #ffffff, #fbf6ea)',
        border: '1px solid var(--color-panel-edge)',
        borderRadius: 'var(--radius-panel)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transformOrigin: 'top right',
        transform: open ? 'scale(1)' : 'scale(0.95)',
        opacity: open ? 1 : 0,
        transition: 'transform .18s ease, opacity .18s ease',
      }}
    >
      {/* ======== Header — 奶油渐变 + 关闭 X ======== */}
      <div
        style={{
          padding: '16px',
          background: 'linear-gradient(180deg, #fff8e7, #ecdfb8)',
          borderBottom: '1px solid var(--color-tan-edge)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: 16,
              lineHeight: 1.2,
              color: 'var(--color-ink)',
            }}
          >
            材料コスト
          </h3>
          <p
            style={{
              margin: '4px 0 0',
              fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: 11,
              lineHeight: 1.3,
              color: 'var(--color-ink-2)',
            }}
          >
            {itemCount} 件 / {TOTAL_CAP.toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="閉じる"
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-chip)',
            background: 'rgba(255,255,255,.5)',
            border: '1px solid var(--color-panel-edge)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-ink-2)',
            transition: 'background .12s ease',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ======== Body — CostPanel 无壳内容 ======== */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <CostPanel fixtureMap={fixtureMap} costIndex={costIndex} />
      </div>
    </div>
  )
}
