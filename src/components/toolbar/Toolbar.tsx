// ======== 工具栏 ========
// INPUT: editorStore（toolMode, overwriteEnabled, areaLevel, gridSize）
// OUTPUT: 顶部工具栏（模式切换、覆盖切换、撤销重做、区域等级选择）
// POS: src/components/toolbar/Toolbar.tsx — 编辑器顶部工具栏

import { useState, useEffect, useCallback } from 'react'
import {
  MousePointer2,
  Stamp,
  Eraser,
  Undo2,
  Redo2,
  Replace,
  Map,
  Paintbrush,
} from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useEditorStore, undoWithFlash, redoWithFlash } from '../../stores/editorStore'
import { AREA_LEVELS } from '../../data/areaLevels'
import { ToolButton } from './ToolButton'
import { ExportButton } from './ExportButton'
import { ImportButton } from './ImportButton'
import type { AreaLevel, ToolMode } from '../../types/editor'

// ======== temporal 状态订阅 Hook ========

function useTemporalState() {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    const temporal = useEditorStore.temporal.getState()
    setCanUndo(temporal.pastStates.length > 0)
    setCanRedo(temporal.futureStates.length > 0)

    const unsub = useEditorStore.temporal.subscribe((state) => {
      setCanUndo(state.pastStates.length > 0)
      setCanRedo(state.futureStates.length > 0)
    })
    return unsub
  }, [])

  return { canUndo, canRedo }
}

interface ToolbarProps {
  // Phase 7 plan 02: 紧凑模式 —— 隐藏迁移到顶栏的 area-level 下拉、Import/Export 按钮
  // 仅保留工具按钮、覆盖切换、撤销/重做（待 plan 04 替换为 Floatbar）
  compact?: boolean
}

export function Toolbar({ compact = false }: ToolbarProps = {}) {
  const toolMode = useEditorStore((s) => s.toolMode)
  const setToolMode = useEditorStore((s) => s.setToolMode)
  const overwriteEnabled = useEditorStore((s) => s.overwriteEnabled)
  const toggleOverwrite = useEditorStore((s) => s.toggleOverwrite)
  const areaLevel = useEditorStore((s) => s.areaLevel)
  const gridSize = useEditorStore((s) => s.gridSize)
  const setAreaLevel = useEditorStore((s) => s.setAreaLevel)

  const { canUndo, canRedo } = useTemporalState()

  const handleUndo = useCallback(() => undoWithFlash(), [])
  const handleRedo = useCallback(() => redoWithFlash(), [])

  const toolButtons: Array<{
    mode: ToolMode
    icon: React.ElementType
    label: string
    shortcut: string
    activeClassName: string
  }> = [
    {
      mode: 'select',
      icon: MousePointer2,
      label: '选择/移动',
      shortcut: 'V',
      activeClassName: 'bg-accent text-surface',
    },
    {
      mode: 'stamp',
      icon: Stamp,
      label: '放置',
      shortcut: 'B',
      activeClassName: 'bg-accent text-surface',
    },
    {
      mode: 'brush',
      icon: Paintbrush,
      label: '画刷',
      shortcut: 'P',
      activeClassName: 'bg-accent text-surface',
    },
    {
      mode: 'remove',
      icon: Eraser,
      label: '删除',
      shortcut: 'X',
      activeClassName: 'bg-destructive text-white',
    },
  ]

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="h-11 bg-surface-raised border-b border-default flex items-center px-3 gap-1.5 flex-shrink-0">
        {/* 工具模式按钮组 */}
        <div className="flex items-center gap-0.5 bg-surface rounded-lg p-0.5">
          {toolButtons.map((btn) => (
            <ToolButton
              key={btn.mode}
              icon={btn.icon}
              label={btn.label}
              shortcut={btn.shortcut}
              isActive={toolMode === btn.mode}
              activeClassName={btn.activeClassName}
              onClick={() => setToolMode(btn.mode)}
            />
          ))}
        </div>

        {/* 分隔 */}
        <div className="w-px h-6 bg-default mx-1" />

        {/* 覆盖模式 */}
        <ToolButton
          icon={Replace}
          label="覆盖模式"
          isActive={overwriteEnabled}
          activeClassName="bg-accent/20 text-accent ring-1 ring-accent/40"
          onClick={toggleOverwrite}
        />

        <div className="w-px h-6 bg-default mx-1" />

        {/* 导出 / 导入 代码（compact 模式隐藏 —— 已迁移到顶栏 kebab） */}
        {!compact && (
          <>
            <ExportButton />
            <ImportButton />
            <div className="w-px h-6 bg-default mx-1" />
          </>
        )}

        {/* 撤销/重做 */}
        <ToolButton
          icon={Undo2}
          label="撤销"
          shortcut="Ctrl+Z"
          isActive={false}
          onClick={handleUndo}
          disabled={!canUndo}
        />
        <ToolButton
          icon={Redo2}
          label="重做"
          shortcut="Ctrl+Y"
          isActive={false}
          onClick={handleRedo}
          disabled={!canRedo}
        />

        {/* 右侧 — 区域等级（compact 模式隐藏 —— 已迁移到顶栏 AreaLevelDropdown） */}
        {!compact && (
        <div className="ml-auto">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="h-8 rounded-lg flex items-center gap-2 px-3
                bg-surface hover:bg-surface-hover text-primary text-sm cursor-pointer
                border border-default transition-colors">
                <Map size={14} className="text-accent" />
                <span>{AREA_LEVELS[areaLevel].label}</span>
                <span className="text-muted font-mono text-xs">
                  {gridSize.width}×{gridSize.depth}
                </span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="rounded-lg bg-surface-raised border border-default shadow-xl p-1 min-w-[160px]"
                sideOffset={4}
                align="end"
              >
                {(Object.entries(AREA_LEVELS) as [string, (typeof AREA_LEVELS)[AreaLevel]][]).map(
                  ([key, config]) => {
                    const level = Number(key) as AreaLevel
                    return (
                      <DropdownMenu.Item
                        key={level}
                        className={`rounded-md px-3 py-2 text-sm cursor-pointer outline-none flex items-center justify-between
                          ${areaLevel === level
                            ? 'bg-accent/15 text-accent'
                            : 'text-primary hover:bg-surface-hover'
                          }`}
                        onSelect={() => setAreaLevel(level)}
                      >
                        <span>{config.label}</span>
                        <span className="text-xs text-muted font-mono">
                          {config.gridSize.width}×{config.gridSize.depth}
                        </span>
                      </DropdownMenu.Item>
                    )
                  },
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
        )}
      </div>
    </Tooltip.Provider>
  )
}
