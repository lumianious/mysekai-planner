// ======== 状态栏 ========
// INPUT: editorStore（areaLevel, gridSize, placedItems）
// OUTPUT: 底部状态栏（区域等级、已配置数量、缩放比例）
// POS: src/components/status/StatusBar.tsx — 编辑器底部信息栏

import { useEditorStore } from '../../stores/editorStore'
import { AREA_LEVELS } from '../../data/areaLevels'

export function StatusBar() {
  const areaLevel = useEditorStore((s) => s.areaLevel)
  const gridSize = useEditorStore((s) => s.gridSize)
  const placedItems = useEditorStore((s) => s.placedItems)

  const itemCount = Object.keys(placedItems).length

  return (
    <div className="h-8 bg-surface-raised border-t border-default flex items-center px-4 text-xs text-muted flex-shrink-0">
      {/* 区域等级 */}
      <span>区域等级: {AREA_LEVELS[areaLevel].label} ({gridSize.width}x{gridSize.depth})</span>

      {/* 分隔线 */}
      <span className="border-l border-default pl-4 ml-4">
        已配置: {itemCount}件
      </span>

      {/* 缩放比例 */}
      <span className="border-l border-default pl-4 ml-4">
        缩放: 100%
      </span>
    </div>
  )
}
