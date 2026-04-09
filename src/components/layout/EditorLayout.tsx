// ======== 编辑器主布局 ========
// INPUT: Toolbar, Hotbar, StatusBar, EditorCanvas 组件
// OUTPUT: 编辑器整体布局壳（工具栏 + 侧边栏 + 画布区 + 热栏 + 状态栏）
// POS: src/components/layout/EditorLayout.tsx — 编辑器页面骨架

import { useMemo } from 'react'
import { Toolbar } from '../toolbar/Toolbar'
import { Hotbar } from '../hotbar/Hotbar'
import { StatusBar } from '../status/StatusBar'
import { EditorCanvas } from '../canvas/EditorCanvas'
import type { Fixture } from '../../types/editor'

export function EditorLayout() {
  // fixtureMap 将由 Plan 04 的 useFixtureData hook 提供
  // 当前使用空 Map 作为占位，画布仍可渲染网格和空白场景
  const fixtureMap = useMemo(() => new Map<number, Fixture>(), [])

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* 工具栏 */}
      <Toolbar />

      {/* 中间区域: 侧边栏 + 画布 */}
      <div className="flex flex-1 min-h-0">
        {/* 目录侧边栏（占位） */}
        <div className="w-72 bg-surface-raised border-r border-default flex-shrink-0" />

        {/* 画布区域 */}
        <EditorCanvas fixtureMap={fixtureMap} />
      </div>

      {/* 热栏 */}
      <Hotbar />

      {/* 状态栏 */}
      <StatusBar />
    </div>
  )
}
