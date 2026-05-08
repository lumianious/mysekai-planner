// ======== 分类过滤芯片栏（通用 ChipStrip）========
// INPUT: items（{id, name}[]）, activeId（number | null）, onSelect 回调,
//        allLabel?（默认 '全部'）, allAriaLabel?（默认 '全てのカテゴリ'）
// OUTPUT: 水平滚动的分类芯片行；首个 "全部" 芯片调用 onSelect(null)
// POS: src/components/catalog/CategoryFilter.tsx — 主分类筛选
// 复用：mainGenre 和 subGenre 共享同一渲染契约 (Phase 9)

interface ChipStripItem {
  id: number
  name: string
}

interface CategoryFilterProps {
  items: ChipStripItem[]
  activeId: number | null
  onSelect: (id: number | null) => void
  allLabel?: string
  allAriaLabel?: string
}

export function CategoryFilter({
  items,
  activeId,
  onSelect,
  allLabel = '全部',
  allAriaLabel = '全てのカテゴリ',
}: CategoryFilterProps) {
  return (
    <div
      className="overflow-x-auto flex flex-wrap gap-1 py-2 px-1"
      style={{ scrollbarWidth: 'none' }}
    >
      <button
        type="button"
        aria-label={allAriaLabel}
        className={`px-2.5 py-1 rounded-md text-xs cursor-pointer transition-all
          ${activeId === null
            ? 'bg-accent text-surface font-medium'
            : 'bg-surface text-muted hover:text-primary hover:bg-surface-hover'
          }`}
        onClick={() => onSelect(null)}
      >
        {allLabel}
      </button>

      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`px-2.5 py-1 rounded-md text-xs cursor-pointer transition-all
            ${activeId === item.id
              ? 'bg-accent text-surface font-medium'
              : 'bg-surface text-muted hover:text-primary hover:bg-surface-hover'
            }`}
          onClick={() => onSelect(item.id)}
        >
          {item.name}
        </button>
      ))}
    </div>
  )
}
