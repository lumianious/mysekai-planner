// ======== 导入代码对话框 ========
// INPUT: open 布尔 + onSubmit(decoded) + onClose
// OUTPUT: 粘贴 textarea + 「导入」按钮；解析成功提交给上层确认；失败内联报错
// POS: src/components/dialogs/ImportDialog.tsx — 被 ImportButton 挂载

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { decodeBlueprint, type DecodedBlueprint } from '../../persistence/decodeBlueprint'

export function ImportDialog(props: {
  open: boolean
  onSubmit: (decoded: DecodedBlueprint) => void
  onClose: () => void
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  // 关闭 dialog 时清空输入与错误
  useEffect(() => {
    if (!props.open) {
      setValue('')
      setError(null)
    }
  }, [props.open])

  const handleImport = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('请粘贴蓝图代码')
      return
    }
    const decoded = decodeBlueprint(trimmed)
    if (!decoded) {
      setError('代码无效 —— 请检查是否完整复制（应以 v1. 开头）')
      return
    }
    setError(null)
    props.onSubmit(decoded)
  }

  return (
    <Dialog.Root open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            bg-surface-raised text-primary p-6 rounded-lg shadow-xl
            border border-default z-50 max-w-lg w-[90vw]"
          aria-describedby="import-desc"
        >
          <Dialog.Title className="text-lg font-semibold mb-2">导入蓝图代码</Dialog.Title>
          <Dialog.Description id="import-desc" className="text-sm text-muted mb-3">
            粘贴他人分享的蓝图代码（以 v1. 开头）。导入前会再次确认以防覆盖当前设计。
          </Dialog.Description>
          <textarea
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null) }}
            placeholder="v1..."
            className="w-full h-32 p-2 rounded-md border border-default bg-surface
              text-primary text-xs font-mono resize-none mb-2"
            aria-invalid={error !== null}
          />
          {error && (
            <div role="alert" className="text-sm text-destructive mb-3">
              {error}
            </div>
          )}
          <div className="flex gap-2 justify-end mt-2">
            <button
              onClick={props.onClose}
              className="px-4 py-2 rounded-md border border-default hover:bg-surface-hover text-sm cursor-pointer">
              取消
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 rounded-md bg-accent text-surface hover:opacity-90 text-sm cursor-pointer">
              导入
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
