// ======== 编辑器主布局 ========
// INPUT: Toolbar, Hotbar, StatusBar, CatalogSidebar 组件, useFixtureData hook
// OUTPUT: 编辑器整体布局壳（工具栏 + 目录侧边栏 + 画布区 + 热栏 + 状态栏）
// POS: src/components/layout/EditorLayout.tsx — 编辑器页面骨架

import { Toolbar } from '../toolbar/Toolbar'
import { Hotbar } from '../hotbar/Hotbar'
import { StatusBar } from '../status/StatusBar'
import { CatalogSidebar } from '../catalog/CatalogSidebar'
import { useFixtureData } from '../../hooks/useFixtureData'

export function EditorLayout() {
  const { fixtures, mainGenres, fixtureMap, loading, error } = useFixtureData()

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* 工具栏 */}
      <Toolbar />

      {/* 中间区域: 侧边栏 + 画布 */}
      <div className="flex flex-1 min-h-0">
        {/* 目录侧边栏 */}
        {loading ? (
          <div className="w-72 bg-surface-raised border-r border-default flex-shrink-0 flex items-center justify-center">
            <p className="text-muted text-sm">加载中...</p>
          </div>
        ) : error ? (
          <div className="w-72 bg-surface-raised border-r border-default flex-shrink-0 flex items-center justify-center px-4">
            <p className="text-destructive text-sm text-center">{error}</p>
          </div>
        ) : (
          <CatalogSidebar
            fixtures={fixtures}
            mainGenres={mainGenres}
            fixtureMap={fixtureMap}
          />
        )}

        {/* 画布区域（占位） */}
        <div className="flex-1 bg-surface flex items-center justify-center">
          <p className="text-muted text-sm">
            从左侧目录选择家具开始布局
          </p>
        </div>
      </div>

      {/* 热栏 */}
      <Hotbar />

      {/* 状态栏 */}
      <StatusBar />
    </div>
  )
}
