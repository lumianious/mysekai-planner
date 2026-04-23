// ======== 导入按钮 ========
// INPUT: 无（打开对话框、接收粘贴代码、串联确认）
// OUTPUT: 两段式流程 —— ImportDialog（粘贴）→ ImportConfirmDialog（替换确认）→ applyBlueprint
// POS: src/components/toolbar/ImportButton.tsx — Toolbar 工具组件

import { useState } from 'react'
import { ClipboardPaste } from 'lucide-react'
import { ToolButton } from './ToolButton'
import { ImportDialog } from '../dialogs/ImportDialog'
import { ImportConfirmDialog } from '../dialogs/ImportConfirmDialog'
import { applyBlueprint } from '../../persistence/applyBlueprint'
import type { DecodedBlueprint } from '../../persistence/decodeBlueprint'

export function ImportButton() {
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pending, setPending] = useState<DecodedBlueprint | null>(null)

  const handleSubmit = (decoded: DecodedBlueprint) => {
    // D-07 语义收紧：始终弹确认（包括空设计）——用户明确要求一致性
    setPasteOpen(false)
    setPending(decoded)
  }

  const handleConfirm = () => {
    if (pending) applyBlueprint(pending)
    setPending(null)
  }

  const handleCancel = () => {
    setPending(null)
  }

  return (
    <>
      <ToolButton
        icon={ClipboardPaste}
        label="导入代码"
        isActive={false}
        onClick={() => setPasteOpen(true)}
      />
      <ImportDialog
        open={pasteOpen}
        onSubmit={handleSubmit}
        onClose={() => setPasteOpen(false)}
      />
      <ImportConfirmDialog
        open={pending !== null}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  )
}
