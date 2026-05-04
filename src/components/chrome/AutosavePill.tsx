// ======== 顶栏自动保存药丸（Slot A） ========
// INPUT: useEditorStore.lastSaveAt（persist storage 包装器写入）
// OUTPUT: 静态指示 —— 持久化层是否落过盘（绿点 = 已保存；灰点 = 尚未触发）
// POS: src/components/chrome/AutosavePill.tsx — Phase 7 plan 02 自动保存指示器
//
// 注: 应用没有"保存失败"通道，也没有显式 saving 状态 —— Zustand persist 是同步写入，
//     失败极少且无 hook 暴露，所以不杜撰错误/进行中的多态指示。

import { useEditorStore } from '../../stores/editorStore'

export function AutosavePill() {
  const lastSaveAt = useEditorStore((s) => s.lastSaveAt)
  const saved = lastSaveAt !== null

  return (
    <div
      style={{
        height: 32,
        padding: '0 12px',
        gap: 6,
        display: 'flex',
        alignItems: 'center',
        background: '#ffffff',
        borderRadius: 'var(--radius-pill-inner)',
        boxShadow: 'var(--shadow-md)',
        fontFamily: 'Nunito, system-ui, sans-serif',
        fontWeight: 700,
        fontSize: 12,
        color: 'var(--color-ink-2)',
      }}
      aria-label={saved ? '自動保存済' : '未保存'}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: saved ? 'var(--color-green)' : 'var(--color-muted)',
        }}
      />
      <span>{saved ? '自動保存済' : '未保存'}</span>
    </div>
  )
}
