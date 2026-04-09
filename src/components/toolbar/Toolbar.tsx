// ======== 工具栏 ========
// INPUT: editorStore（toolMode, overwriteEnabled, areaLevel, gridSize）
// OUTPUT: 顶部工具栏（模式切换、覆盖切换、撤销重做、区域等级选择）
// POS: src/components/toolbar/Toolbar.tsx — 编辑器顶部工具栏

import {
  MousePointer2,
  Stamp,
  Eraser,
  Undo2,
  Redo2,
  Replace,
  Map,
} from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useEditorStore } from '../../stores/editorStore'
import { AREA_LEVELS } from '../../data/areaLevels'
import { ToolButton } from './ToolButton'
import type { AreaLevel, ToolMode } from '../../types/editor'

export function Toolbar() {
  const toolMode = useEditorStore((s) => s.toolMode)
  const setToolMode = useEditorStore((s) => s.setToolMode)
  const overwriteEnabled = useEditorStore((s) => s.overwriteEnabled)
  const toggleOverwrite = useEditorStore((s) => s.toggleOverwrite)
  const areaLevel = useEditorStore((s) => s.areaLevel)
  const gridSize = useEditorStore((s) => s.gridSize)
  const setAreaLevel = useEditorStore((s) => s.setAreaLevel)

  // ---- 工具模式按钮配置 ----
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
      mode: 'remove',
      icon: Eraser,
      label: '删除',
      shortcut: 'X',
      activeClassName: 'bg-destructive text-white',
    },
  ]

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="h-10 bg-surface-raised border-b border-default flex items-center px-2 gap-1 flex-shrink-0">
        {/* 工具模式按钮组 */}
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

        {/* 分隔线 */}
        <div className="w-px h-6 bg-border-default mx-1" />

        {/* 覆盖模式切换 */}
        <ToolButton
          icon={Replace}
          label="覆盖模式"
          isActive={overwriteEnabled}
          activeClassName="bg-accent/20 border border-accent text-accent"
          onClick={toggleOverwrite}
        />

        {/* 分隔线 */}
        <div className="w-px h-6 bg-border-default mx-1" />

        {/* 撤销/重做 */}
        <ToolButton
          icon={Undo2}
          label="撤销"
          shortcut="Ctrl+Z"
          isActive={false}
          onClick={() => {
            // TODO: 撤销功能将在 Plan 02 完整 store 中接入 zundo temporal
          }}
          disabled={false}
        />
        <ToolButton
          icon={Redo2}
          label="重做"
          shortcut="Ctrl+Y"
          isActive={false}
          onClick={() => {
            // TODO: 重做功能将在 Plan 02 完整 store 中接入 zundo temporal
          }}
          disabled={false}
        />

        {/* 右侧区域 — 区域等级选择 */}
        <div className="ml-auto">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="h-8 rounded-md flex items-center gap-2 px-2
                bg-transparent hover:bg-surface-hover text-primary text-sm cursor-pointer">
                <Map size={16} />
                <span>{AREA_LEVELS[areaLevel].label} ({gridSize.width}x{gridSize.depth})</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="rounded-md bg-surface-raised border border-default shadow-lg p-1 min-w-[140px]"
                sideOffset={4}
                align="end"
              >
                {(Object.entries(AREA_LEVELS) as [string, (typeof AREA_LEVELS)[AreaLevel]][]).map(
                  ([key, config]) => {
                    const level = Number(key) as AreaLevel
                    return (
                      <DropdownMenu.Item
                        key={level}
                        className={`rounded-sm px-2 py-1.5 text-sm cursor-pointer outline-none
                          ${areaLevel === level
                            ? 'bg-accent/15 text-accent'
                            : 'text-primary hover:bg-surface-hover'
                          }`}
                        onSelect={() => setAreaLevel(level)}
                      >
                        {config.label} ({config.gridSize.width}x{config.gridSize.depth})
                      </DropdownMenu.Item>
                    )
                  },
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </Tooltip.Provider>
  )
}
