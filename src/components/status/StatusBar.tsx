// ======== 状态栏 ========
// INPUT: editorStore（areaLevel, gridSize, placedItems, stageScale）
// OUTPUT: 底部状态栏（区域等级、已配置数量、缩放比例、鼠标坐标）
// POS: src/components/status/StatusBar.tsx — 编辑器底部信息栏

import { useEditorStore } from '../../stores/editorStore'
import { AREA_LEVELS } from '../../data/areaLevels'

export function StatusBar() {
  const areaLevel = useEditorStore((s) => s.areaLevel)
  const gridSize = useEditorStore((s) => s.gridSize)
  const placedItems = useEditorStore((s) => s.placedItems)
  const stageScale = useEditorStore((s) => s.stageScale)

  const itemCount = Object.keys(placedItems).length

  return (
    <div className="h-7 bg-surface border-t border-default flex items-center px-4 text-[11px] text-muted flex-shrink-0 gap-4 font-mono">
      <span>{AREA_LEVELS[areaLevel].label} ({gridSize.width}×{gridSize.depth})</span>
      <span className="text-default">|</span>
      <span>配置: <span className="text-primary">{itemCount}</span> 件</span>
      <span className="text-default">|</span>
      <span>缩放: <span className="text-primary">{Math.round(stageScale * 100)}%</span></span>
    </div>
  )
}
