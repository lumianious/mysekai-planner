// ======== 目录搜索输入框 ========
// INPUT: value, onChange 回调
// OUTPUT: 带图标的搜索输入框（Phase 7: 18px 圆角 + 浅蓝底 + Nunito 700 13px）
// POS: src/components/catalog/CatalogSearch.tsx — 家具名搜索

import { Search, X } from 'lucide-react'

interface CatalogSearchProps {
  value: string
  onChange: (value: string) => void
}

export function CatalogSearch({ value, onChange }: CatalogSearchProps) {
  return (
    <div className="relative">
      <Search
        size={14}
        className="absolute pointer-events-none"
        style={{
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#4f6a8e',
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="家具を検索…"
        className="w-full outline-none"
        style={{
          height: 36,
          background: '#eaf6ff',
          border: '1px solid rgba(60,80,140,.14)',
          borderRadius: 'var(--radius-search, 18px)',
          padding: '0 32px 0 32px',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: 13,
          color: '#1f3556',
        }}
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute"
          style={{
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#4f6a8e',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
          }}
          aria-label="検索をクリア"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
