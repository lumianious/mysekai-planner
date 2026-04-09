// ======== 目录侧边栏 ========
// INPUT: fixtures, mainGenres, fixtureMap (由 EditorLayout 通过 useFixtureData 传入)
// OUTPUT: 可折叠侧边栏，包含搜索、分类芯片、缩略图网格
// POS: src/components/catalog/CatalogSidebar.tsx — 家具目录容器

import { useState } from 'react'
import { ChevronsLeft, Package } from 'lucide-react'
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

  // 搜索 + 分类过滤管线
  const filteredFixtures = filterByGenre(
    searchFixtures(fixtures, searchQuery),
    activeGenreId,
    null,
  )

  // ======== 折叠状态 ========

  if (collapsed) {
    return (
      <div className="w-12 bg-surface-raised border-r border-default flex-shrink-0 flex flex-col items-center pt-2">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="p-2 text-muted hover:text-primary hover:bg-surface-hover rounded-md"
          title="展开目录"
        >
          <Package size={20} />
        </button>
      </div>
    )
  }

  // ======== 展开状态 ========

  return (
    <div className="w-72 bg-surface-raised border-r border-default flex-shrink-0 flex flex-col">
      {/* 标题行 */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-semibold text-primary">家具目录</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="p-1 text-muted hover:text-primary hover:bg-surface-hover rounded-md"
          title="折叠目录"
        >
          <ChevronsLeft className="h-6 w-6" />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-3">
        <CatalogSearch value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* 分类芯片 */}
      <div className="px-2">
        <CategoryFilter
          genres={mainGenres}
          activeGenreId={activeGenreId}
          onSelect={setActiveGenreId}
        />
      </div>

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
