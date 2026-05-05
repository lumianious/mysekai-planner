// ======== 重置按钮 ========
// INPUT: 无（直接读取 useEditorStore.areaLevel）
// OUTPUT: ToolButton + 确认对话框；确认后以当前 areaLevel 重新执行 startEditor，
//          清空 placedItems/Edges 并自动放回门和房子
// POS: src/components/toolbar/ResetButton.tsx — 顶栏白色药丸内，紧邻 Import/Export

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { ToolButton } from './ToolButton'
import { useEditorStore } from '../../stores/editorStore'

export function ResetButton() {
  const [open, setOpen] = useState(false)

  const handleConfirm = () => {
    const { areaLevel, startEditor } = useEditorStore.getState()
    startEditor(areaLevel)
    setOpen(false)
  }

  return (
    <>
      <ToolButton
        icon={RotateCcw}
        label="重置画布"
        isActive={false}
        onClick={() => setOpen(true)}
      />
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              bg-surface-raised text-primary p-6 rounded-lg shadow-xl
              border border-default z-50 max-w-md w-[90vw]"
            aria-describedby="reset-desc"
          >
            <Dialog.Title className="text-lg font-semibold mb-2">
              重置当前画布？
            </Dialog.Title>
            <Dialog.Description id="reset-desc" className="text-sm text-muted mb-4">
              所有已放置的家具、道路与栏杆都会被清空，并以当前区域等级重新生成默认门和房子。如需保留当前设计，请先用导出按钮复制蓝图代码。
            </Dialog.Description>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-md border border-default hover:bg-surface-hover text-sm cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-md bg-accent text-surface hover:opacity-90 text-sm cursor-pointer"
              >
                重置
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
