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
      <div className="flex flex-col items-center gap-8">
        {/* 标题区 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary tracking-tight">
            MySekai <span className="text-accent">区域规划器</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            我的世界 户外区域布局设计工具
          </p>
        </div>

        {/* 等级卡片网格 */}
        <div className="grid grid-cols-3 gap-3">
          {levels.map(([key, config]) => {
            const level = Number(key) as AreaLevel
            const sizeLabel = `${config.gridSize.width}×${config.gridSize.depth}`
            return (
              <button
                key={level}
                className="group w-36 py-5 rounded-xl
                  bg-surface-raised border border-default
                  hover:border-accent hover:bg-surface-hover
                  active:bg-surface-active
                  cursor-pointer transition-all duration-150
                  flex flex-col items-center gap-2"
                onClick={() => startEditor(level)}
              >
                <span className="text-xl font-bold text-primary group-hover:text-accent transition-colors">
                  {config.label}
                </span>
                <span className="text-xs text-muted font-mono">
                  {sizeLabel}
                </span>
              </button>
            )
          })}
        </div>

        {/* 提示 */}
        <p className="text-xs text-muted/60">
          选择区域等级开始编辑
        </p>
      </div>
    </div>
  )
}
