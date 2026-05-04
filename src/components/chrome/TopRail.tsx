// ======== 顶栏（Slot A） ========
// INPUT: useEditorStore（placedItems, areaLevel, gridSize, inventory）, costIndex（来自 useFixtureData）
// OUTPUT: 项目标题药丸 + 间距 + 成本药丸 + 自动保存药丸 + 区域等级下拉 + 溢出菜单
// POS: src/components/chrome/TopRail.tsx — Phase 7 plan 02 顶栏容器

import { useMemo } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { computeMaterialTotals, type CostIndex } from '../../data/cost'
import { CostPill } from './CostPill'
import { AutosavePill } from './AutosavePill'
import { AreaLevelDropdown } from './AreaLevelDropdown'
import { TopRailKebab } from './TopRailKebab'
import type { Fixture } from '../../types/editor'

interface TopRailProps {
  fixtureMap: Map<number, Fixture>
  costIndex: CostIndex | null
}

export function TopRail({ fixtureMap, costIndex }: TopRailProps) {
  const placedItems = useEditorStore((s) => s.placedItems)
  const inventory = useEditorStore((s) => s.inventory)

  // ======== 成本药丸数值 ========
  // current = 仍需购买（needed - owned 截断），max = 全量需求
  const costSummary = useMemo(() => {
    if (!costIndex) return { current: 0, max: 0 }
    const rows = computeMaterialTotals(
      Object.values(placedItems),
      fixtureMap,
      costIndex,
      inventory,
    )
    const max = rows.reduce((s, r) => s + r.needed, 0)
    const current = rows.reduce((s, r) => s + (r.needed - r.remaining), 0)
    return { current, max }
  }, [costIndex, placedItems, fixtureMap, inventory])

  return (
    <div
      id="top-rail"
      className="flex items-center"
      style={{ height: 44, gap: 8 }}
    >
      {/* 项目标题药丸 */}
      <div
        className="flex items-center"
        style={{
          height: 32,
          padding: '0 16px',
          background: '#ffffff',
          borderRadius: 'var(--radius-pill-inner)',
          boxShadow: 'var(--shadow-md)',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: 13,
          color: 'var(--color-ink)',
        }}
      >
        めだかな上面
      </div>

      {/* 中部弹性间距 —— 让右侧药丸右对齐 */}
      <div className="flex-1" />

      <CostPill current={costSummary.current} max={costSummary.max} />
      <AutosavePill />
      <AreaLevelDropdown />
      <TopRailKebab />
    </div>
  )
}
