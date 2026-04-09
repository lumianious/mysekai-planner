// ======== 欢迎界面 ========
// INPUT: AREA_LEVELS（区域等级配置）、editorStore.startEditor
// OUTPUT: 全屏区域等级选择界面
// POS: src/components/welcome/WelcomeScreen.tsx — 应用启动首屏

import { AREA_LEVELS } from '../../data/areaLevels'
import { useEditorStore } from '../../stores/editorStore'
import type { AreaLevel } from '../../types/editor'

export function WelcomeScreen() {
  const startEditor = useEditorStore((s) => s.startEditor)
  const levels = Object.entries(AREA_LEVELS) as [string, (typeof AREA_LEVELS)[AreaLevel]][]

  return (
    <div className="h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* 标题 */}
        <h1 className="text-2xl font-semibold text-primary">
          MySekai 区域规划器
        </h1>

        {/* 副标题 */}
        <p className="text-sm text-muted">
          我的世界 户外区域布局设计工具
        </p>

        {/* 等级卡片 — 3+2 布局 */}
        <div className="flex flex-wrap justify-center gap-4 max-w-[432px]">
          {levels.map(([key, config]) => {
            const level = Number(key) as AreaLevel
            return (
              <button
                key={level}
                className="w-32 h-24 rounded-lg bg-surface-raised border border-default
                  hover:border-accent cursor-pointer
                  flex flex-col items-center justify-center gap-1
                  transition-colors"
                onClick={() => startEditor(level)}
              >
                <span className="text-lg font-semibold text-primary">
                  {config.label}
                </span>
                <span className="text-sm text-muted">
                  {config.gridSize.width}x{config.gridSize.depth}
                </span>
              </button>
            )
          })}
        </div>

        {/* 提示文字 */}
        <p className="text-sm text-muted">
          选择区域等级开始编辑
        </p>
      </div>
    </div>
  )
}
