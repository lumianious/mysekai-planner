// ======== 顶栏区域等级下拉（Slot A） ========
// INPUT: useEditorStore（areaLevel, gridSize, setAreaLevel）, AREA_LEVELS
// OUTPUT: 奶白色药丸触发器 + Radix DropdownMenu（5 个等级项）
// POS: src/components/chrome/AreaLevelDropdown.tsx — Phase 7 plan 02 区域等级切换

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'
import { AREA_LEVELS } from '../../data/areaLevels'
import type { AreaLevel } from '../../types/editor'

export function AreaLevelDropdown() {
  const areaLevel = useEditorStore((s) => s.areaLevel)
  const gridSize = useEditorStore((s) => s.gridSize)
  const setAreaLevel = useEditorStore((s) => s.setAreaLevel)

  const triggerStyle: React.CSSProperties = {
    height: 32,
    padding: '0 16px',
    gap: 8,
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(180deg, #fff8e7, #ecdfb8)',
    borderRadius: 'var(--radius-pill-inner)',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--color-tan-edge)',
    cursor: 'pointer',
    transition:
      'transform .12s ease, box-shadow .12s ease, background .12s ease',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
    fontWeight: 800,
    fontSize: 11,
    color: 'var(--color-ink)',
  }

  const sizeStyle: React.CSSProperties = {
    fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
    fontWeight: 800,
    fontSize: 11,
    color: 'var(--color-muted)',
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="エリアレベルを変更"
          style={triggerStyle}
        >
          <span style={labelStyle}>Lv.{areaLevel}</span>
          <span style={sizeStyle}>
            {gridSize.width}×{gridSize.depth}
          </span>
          <ChevronDown size={14} style={{ color: 'var(--color-ink-2)' }} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="end"
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-tile)',
            boxShadow: 'var(--shadow-lg)',
            padding: 8,
            minWidth: 160,
            border: '1px solid var(--color-panel-edge)',
            zIndex: 50,
          }}
        >
          {(
            Object.entries(AREA_LEVELS) as [
              string,
              (typeof AREA_LEVELS)[AreaLevel],
            ][]
          ).map(([key, config]) => {
            const level = Number(key) as AreaLevel
            const isActive = areaLevel === level
            return (
              <DropdownMenu.Item
                key={level}
                onSelect={() => setAreaLevel(level)}
                style={{
                  padding: '8px 16px',
                  fontFamily: 'Nunito, system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: 13,
                  color: isActive
                    ? 'var(--color-ink-on-sky)'
                    : 'var(--color-ink)',
                  background: isActive
                    ? 'linear-gradient(180deg, #9bdcff, #69c8ff)'
                    : 'transparent',
                  borderRadius: 'var(--radius-chip)',
                  cursor: 'pointer',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLElement).style.background =
                      'var(--color-cream-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLElement).style.background =
                      'transparent'
                  }
                }}
              >
                <span>{config.label}</span>
                <span
                  style={{
                    fontFamily:
                      '"M PLUS Rounded 1c", system-ui, sans-serif',
                    fontWeight: 800,
                    fontSize: 11,
                    color: isActive
                      ? 'var(--color-ink-on-sky)'
                      : 'var(--color-muted)',
                  }}
                >
                  {config.gridSize.width}×{config.gridSize.depth}
                </span>
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
