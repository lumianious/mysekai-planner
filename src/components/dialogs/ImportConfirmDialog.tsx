// ======== 导入确认对话框 ========
// INPUT: open 布尔量 + onConfirm/onCancel 回调
// OUTPUT: Radix Dialog 模态，阻止用户在不知情时覆盖当前设计
// POS: src/components/dialogs/ImportConfirmDialog.tsx — 被 App.tsx 挂载

import * as Dialog from '@radix-ui/react-dialog'

export function ImportConfirmDialog(props: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog.Root open={props.open} onOpenChange={(o) => !o && props.onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            bg-surface-raised text-primary p-6 rounded-lg shadow-xl
            border border-default z-50 max-w-md w-[90vw]"
          aria-describedby="import-desc"
        >
          <Dialog.Title className="text-lg font-semibold mb-2">替换当前设计？</Dialog.Title>
          <Dialog.Description id="import-desc" className="text-sm text-muted mb-4">
            此操作将用分享链接中的蓝图覆盖你当前的布局。如需保留当前设计，请先复制其分享链接。
          </Dialog.Description>
          <div className="flex gap-2 justify-end">
            <button
              onClick={props.onCancel}
              className="px-4 py-2 rounded-md border border-default hover:bg-surface-hover text-sm cursor-pointer">
              取消
            </button>
            <button
              onClick={props.onConfirm}
              className="px-4 py-2 rounded-md bg-accent text-surface hover:opacity-90 text-sm cursor-pointer">
              替换
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
