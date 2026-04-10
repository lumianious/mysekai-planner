// ======== 目录侧边栏 ========
// INPUT: fixtures, mainGenres, fixtureMap (由 EditorLayout 通过 useFixtureData 传入)
// OUTPUT: 可折叠侧边栏，包含搜索、分类芯片、缩略图网格
// POS: src/components/catalog/CatalogSidebar.tsx — 家具目录容器

import { useState } from 'react'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import type { Fixture, FixtureMainGenre } from '../../types/editor'
import { searchFixtures, filterByGenre } from '../../data/fixtures'
import { CatalogSearch } from './CatalogSearch'
import { CategoryFilter } from './CategoryFilter'
import { CatalogGrid } from './CatalogGrid'
import { useEditorStore } from '../../stores/editorStore'

interface CatalogSidebarProps {
  fixtures: Fixture[]
  mainGenres: FixtureMainGenre[]
  fixtureMap: Map<number, Fixture>
}

export function CatalogSidebar({
  fixtures,
  mainGenres,
}: CatalogSidebarProps) {
  const activeFixtureId = useEditorStore((s) => s.activeFixtureId)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeGenreId, setActiveGenreId] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const filteredFixtures = filterByGenre(
    searchFixtures(fixtures, searchQuery),
    activeGenreId,
    null,
  )

  if (collapsed) {
    return (
      <div className="w-10 bg-surface-raised border-r border-default flex-shrink-0 flex flex-col items-center pt-2">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="p-1.5 text-muted hover:text-accent hover:bg-surface-hover rounded-lg transition-colors"
          title="展开目录"
        >
          <ChevronsRight size={18} />
        </button>
      </div>
    )
  }

  return (
    <div className="w-72 bg-surface-raised border-r border-default flex-shrink-0 flex flex-col">
      {/* 标题行 */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-default">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">家具目录</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="p-1 text-muted hover:text-accent hover:bg-surface-hover rounded-md transition-colors"
          title="折叠目录"
        >
          <ChevronsLeft size={16} />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-2 pt-2">
        <CatalogSearch value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* 分类芯片 */}
      <div className="px-1">
        <CategoryFilter
          genres={mainGenres}
          activeGenreId={activeGenreId}
          onSelect={setActiveGenreId}
        />
      </div>

      {/* 分隔线 */}
      <div className="mx-2 border-t border-default" />

      {/* 虚拟化缩略图网格 */}
      <div className="flex-1 overflow-hidden">
        <CatalogGrid
          fixtures={filteredFixtures}
          activeFixtureId={activeFixtureId}
        />
      </div>
    </div>
  )
}
