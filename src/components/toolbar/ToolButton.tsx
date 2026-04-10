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
          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-100
            ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
            ${isActive ? activeClassName : 'text-muted hover:text-primary hover:bg-surface-hover'}`}
          onClick={disabled ? undefined : onClick}
          aria-label={label}
          aria-pressed={isActive}
          disabled={disabled}
        >
          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="rounded-lg bg-surface-raised border border-default px-2.5 py-1.5 text-xs text-primary shadow-xl"
          sideOffset={8}
        >
          {tooltipText}
          <Tooltip.Arrow className="fill-surface-raised" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
