// ======== 顶栏（Slot A） ========
// INPUT: useEditorStore（placedItems, areaLevel, gridSize, inventory）, costIndex（来自 useFixtureData）
// OUTPUT: 成本药丸 + 自动保存药丸 + 区域等级下拉 + 导入/导出按钮
// POS: src/components/chrome/TopRail.tsx — Phase 7 plan 02 顶栏容器

import { useMemo } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { computeLayoutCost, type CostIndex } from '../../data/cost'
import { getPutCostLimit } from '../../data/areaLevels'
import { CostPill } from './CostPill'
import { AutosavePill } from './AutosavePill'
import { AreaLevelDropdown } from './AreaLevelDropdown'
import { ImportButton } from '../toolbar/ImportButton'
import { ExportButton } from '../toolbar/ExportButton'
import { ResetButton } from '../toolbar/ResetButton'
import type { Fixture } from '../../types/editor'

interface TopRailProps {
  fixtureMap: Map<number, Fixture>
  costIndex: CostIndex | null
}

export function TopRail({ fixtureMap, costIndex: _costIndex }: TopRailProps) {
  const placedItems = useEditorStore((s) => s.placedItems)
  const areaLevel = useEditorStore((s) => s.areaLevel)

  // ======== 成本药丸数值 —— 配置コスト（layout cost） ========
  // current = 已使用 firstPutCost 总和；max = 当前 areaLevel 的 putCostLimit。
  // 注意：这里不是材料成本（材料在 CostPanel 显示）。
  const costSummary = useMemo(() => {
    const current = computeLayoutCost(Object.values(placedItems), fixtureMap)
    const max = getPutCostLimit(areaLevel)
    return { current, max }
  }, [placedItems, fixtureMap, areaLevel])

  return (
    <div
      id="top-rail"
      className="flex items-center"
      style={{ height: 44, gap: 8 }}
    >
      {/* 左侧弹性间距 —— 顶栏所有功能项右对齐，左边留给画布呼吸 */}
      <div className="flex-1" />

      <CostPill current={costSummary.current} max={costSummary.max} />
      <AutosavePill />
      <AreaLevelDropdown />
      {/* 导入/导出/重置 ToolButton 放在白色药丸里，保持顶栏视觉一致 */}
      <div
        className="flex items-center"
        style={{
          height: 32,
          padding: '0 4px',
          background: '#ffffff',
          borderRadius: 'var(--radius-pill-inner)',
          boxShadow: 'var(--shadow-md)',
          gap: 2,
        }}
      >
        <ImportButton />
        <ExportButton />
        <ResetButton />
      </div>
    </div>
  )
}
