// ======== 顶栏溢出菜单（Slot A） ========
// INPUT: 无（包装现有 ImportButton / ExportButton 复用其对话框流程）
// OUTPUT: 32×32 白色按钮 + Radix DropdownMenu，菜单项是 Import/Export 按钮
// POS: src/components/chrome/TopRailKebab.tsx — Phase 7 plan 02 Import/Export 溢出菜单

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreVertical } from 'lucide-react'
import { ImportButton } from '../toolbar/ImportButton'
import { ExportButton } from '../toolbar/ExportButton'

export function TopRailKebab() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="その他のアクション"
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            borderRadius: 'var(--radius-chip)',
            boxShadow: 'var(--shadow-md)',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-ink-2)',
            transition:
              'transform .12s ease, box-shadow .12s ease, background .12s ease',
          }}
        >
          <MoreVertical size={18} />
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
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {/* asChild 让 DropdownMenu.Item 透传到 Import/Export 内部按钮，
              点击后菜单关闭，对话框正常打开 */}
          <DropdownMenu.Item
            asChild
            onSelect={(e) => {
              // 防止 Radix 默认行为吞掉对话框开启时机
              e.preventDefault()
            }}
          >
            <div style={{ outline: 'none' }}>
              <ImportButton />
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            asChild
            onSelect={(e) => {
              e.preventDefault()
            }}
          >
            <div style={{ outline: 'none' }}>
              <ExportButton />
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
