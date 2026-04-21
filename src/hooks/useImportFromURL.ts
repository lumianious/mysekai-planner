// ======== URL 哈希导入 Hook ========
// INPUT: 应用挂载时 window.location.hash
// OUTPUT: { pending, accept, cancel } —— pending 非空时触发 ImportConfirmDialog
// POS: src/hooks/useImportFromURL.ts — 由 App.tsx 调用一次

import { useEffect, useState, useCallback } from 'react'
import { decodeBlueprint, type DecodedBlueprint } from '../persistence/decodeBlueprint'
import { applyBlueprint } from '../persistence/applyBlueprint'
import { useEditorStore } from '../stores/editorStore'

function stripHash() {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

export function useImportFromURL() {
  const [pending, setPending] = useState<DecodedBlueprint | null>(null)

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, '')
    if (!raw) return
    const decoded = decodeBlueprint(raw)
    if (!decoded) { stripHash(); return }
    const state = useEditorStore.getState()
    const hasExisting =
      Object.keys(state.placedItems).length > 0 ||
      Object.keys(state.placedEdges).length > 0
    if (hasExisting) {
      setPending(decoded)
    } else {
      applyBlueprint(decoded)
      stripHash()
    }
    // 仅挂载时运行一次 —— 不依赖 store 状态，避免 HMR 循环 (Pitfall 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accept = useCallback(() => {
    if (pending) { applyBlueprint(pending); stripHash() }
    setPending(null)
  }, [pending])

  const cancel = useCallback(() => {
    setPending(null)
    stripHash() // D-07 语义：取消后清 hash，避免刷新再次弹窗
  }, [])

  return { pending, accept, cancel }
}
