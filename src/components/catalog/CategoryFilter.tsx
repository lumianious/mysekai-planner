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
  return (
    <div
      className="overflow-x-auto flex flex-wrap gap-1 py-2 px-1"
      style={{ scrollbarWidth: 'none' }}
    >
      <button
        type="button"
        className={`px-2.5 py-1 rounded-md text-xs cursor-pointer transition-all
          ${activeGenreId === null
            ? 'bg-accent text-surface font-medium'
            : 'bg-surface text-muted hover:text-primary hover:bg-surface-hover'
          }`}
        onClick={() => onSelect(null)}
      >
        全部
      </button>

      {genres.map((genre) => (
        <button
          key={genre.id}
          type="button"
          className={`px-2.5 py-1 rounded-md text-xs cursor-pointer transition-all
            ${activeGenreId === genre.id
              ? 'bg-accent text-surface font-medium'
              : 'bg-surface text-muted hover:text-primary hover:bg-surface-hover'
            }`}
          onClick={() => onSelect(genre.id)}
        >
          {genre.name}
        </button>
      ))}
    </div>
  )
}
