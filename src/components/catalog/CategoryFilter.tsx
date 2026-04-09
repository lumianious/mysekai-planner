// ======== 分类过滤芯片栏 ========
// INPUT: genres 列表, activeGenreId, onSelect 回调
// OUTPUT: 水平滚动的分类芯片行
// POS: src/components/catalog/CategoryFilter.tsx — 主分类筛选

import type { FixtureMainGenre } from '../../types/editor'

interface CategoryFilterProps {
  genres: FixtureMainGenre[]
  activeGenreId: number | null
  onSelect: (id: number | null) => void
}

export function CategoryFilter({
  genres,
  activeGenreId,
  onSelect,
}: CategoryFilterProps) {
  const baseChip =
    'px-2 py-1 rounded-full text-xs font-normal cursor-pointer whitespace-nowrap transition-colors'
  const defaultChip = `${baseChip} bg-surface text-muted border border-default`
  const activeChip = `${baseChip} bg-accent/15 text-accent border-accent`

  return (
    <div
      className="overflow-x-auto flex gap-1.5 py-2 px-1"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {/* "全部" 芯片 */}
      <button
        type="button"
        className={activeGenreId === null ? activeChip : defaultChip}
        onClick={() => onSelect(null)}
      >
        全部
      </button>

      {/* 各分类芯片 */}
      {genres.map((genre) => (
        <button
          key={genre.id}
          type="button"
          className={activeGenreId === genre.id ? activeChip : defaultChip}
          onClick={() => onSelect(genre.id)}
        >
          {genre.name}
        </button>
      ))}
    </div>
  )
}
