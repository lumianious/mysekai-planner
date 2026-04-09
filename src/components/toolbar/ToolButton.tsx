// ======== 工具栏按钮 ========
// INPUT: icon, label, isActive, activeClassName, onClick, shortcut
// OUTPUT: 带 Tooltip 的工具栏切换按钮
// POS: src/components/toolbar/ToolButton.tsx — 工具栏通用按钮原子组件

import * as Tooltip from '@radix-ui/react-tooltip'

interface ToolButtonProps {
  icon: React.ElementType
  label: string
  isActive: boolean
  activeClassName?: string
  onClick: () => void
  shortcut?: string
  disabled?: boolean
}

export function ToolButton({
  icon: Icon,
  label,
  isActive,
  activeClassName = 'bg-accent text-surface',
  onClick,
  shortcut,
  disabled = false,
}: ToolButtonProps) {
  const tooltipText = shortcut ? `${label} (${shortcut})` : label

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isActive ? activeClassName : 'bg-transparent hover:bg-surface-hover text-primary'}`}
          onClick={disabled ? undefined : onClick}
          aria-label={label}
          aria-pressed={isActive}
          disabled={disabled}
        >
          <Icon size={18} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="rounded-md bg-surface-raised border border-default px-2 py-1 text-xs text-primary shadow-md"
          sideOffset={6}
        >
          {tooltipText}
          <Tooltip.Arrow className="fill-surface-raised" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
