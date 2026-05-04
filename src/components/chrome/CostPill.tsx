// ======== 顶栏成本药丸（Slot A） ========
// INPUT: { current, max } —— 已扣除已有库存的所需材料总数 / 全量材料总数
// OUTPUT: 白色药丸；点击切换 useEditorStore.costPanelOpen；展开时雪佛龙旋转 180°
// POS: src/components/chrome/CostPill.tsx — Phase 7 plan 02 顶栏成本指示器

import { ChevronDown } from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'

interface CostPillProps {
  current: number
  max: number
}

export function CostPill({ current, max }: CostPillProps) {
  const costPanelOpen = useEditorStore((s) => s.costPanelOpen)
  const toggleCostPanel = useEditorStore((s) => s.toggleCostPanel)

  return (
    <button
      type="button"
      onClick={() => toggleCostPanel()}
      aria-expanded={costPanelOpen}
      aria-controls="cost-panel"
      className="flex items-center cursor-pointer"
      style={{
        height: 32,
        padding: '0 16px',
        gap: 8,
        background: '#ffffff',
        borderRadius: 'var(--radius-pill-inner)',
        boxShadow: 'var(--shadow-md)',
        border: 'none',
        transition:
          'transform .12s ease, box-shadow .12s ease, background .12s ease',
      }}
    >
      <span
        style={{
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: 13,
          color: 'var(--color-ink)',
        }}
      >
        コスト
      </span>
      <span
        style={{
          fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: 11,
          color: 'var(--color-ink)',
        }}
      >
        {current.toLocaleString()}
      </span>
      <span
        style={{
          fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
          fontWeight: 800,
          fontSize: 11,
          color: 'var(--color-muted)',
        }}
      >
        / {max.toLocaleString()}
      </span>
      <ChevronDown
        size={14}
        style={{
          color: 'var(--color-ink-2)',
          transform: costPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform .18s ease',
        }}
      />
    </button>
  )
}
