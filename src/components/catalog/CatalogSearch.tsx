// ======== 目录搜索输入框 ========
// INPUT: value, onChange 回调
// OUTPUT: 带图标的搜索输入框
// POS: src/components/catalog/CatalogSearch.tsx — 家具名搜索

import { Search, X } from 'lucide-react'

interface CatalogSearchProps {
  value: string
  onChange: (value: string) => void
}

export function CatalogSearch({ value, onChange }: CatalogSearchProps) {
  return (
    <div className="relative">
      {/* 搜索图标 */}
      <Search
        size={16}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />

      {/* 输入框 */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索家具..."
        className="w-full h-9 bg-surface border border-default rounded-md pl-8 pr-8 text-sm text-primary placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none"
      />

      {/* 清除按钮 */}
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
