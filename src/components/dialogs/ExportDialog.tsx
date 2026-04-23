// ======== 导出代码对话框 ========
// INPUT: open 布尔 + code 字符串 + onClose 回调
// OUTPUT: 只读 textarea 展示蓝图代码 + 复制按钮；点击「复制」走 clipboard + toast
// POS: src/components/dialogs/ExportDialog.tsx — 被 ExportButton 挂载

import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'

export function ExportDialog(props: {
  open: boolean
  code: string
  onClose: () => void
}) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.code)
      toast.success('蓝图代码已复制到剪贴板')
    } catch {
      toast.error(`复制失败 — 代码长度 ${props.code.length} 字符`)
    }
  }

  return (
    <Dialog.Root open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            bg-surface-raised text-primary p-6 rounded-lg shadow-xl
            border border-default z-50 max-w-lg w-[90vw]"
          aria-describedby="export-desc"
        >
          <Dialog.Title className="text-lg font-semibold mb-2">导出蓝图代码</Dialog.Title>
          <Dialog.Description id="export-desc" className="text-sm text-muted mb-3">
            复制下方代码，分享给他人。对方可在「导入代码」中粘贴此代码以载入你的设计。
          </Dialog.Description>
          <textarea
            readOnly
            value={props.code}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full h-32 p-2 rounded-md border border-default bg-surface
              text-primary text-xs font-mono resize-none mb-4"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted">{props.code.length} 字符</span>
            <div className="flex gap-2">
              <button
                onClick={props.onClose}
                className="px-4 py-2 rounded-md border border-default hover:bg-surface-hover text-sm cursor-pointer">
                关闭
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-md bg-accent text-surface hover:opacity-90 text-sm cursor-pointer">
                复制
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
