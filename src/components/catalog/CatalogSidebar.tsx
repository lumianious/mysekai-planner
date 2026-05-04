// ======== 目录主体（Phase 7 拆分后只负责搜索+网格） ========
// INPUT: fixtures, mainGenres, fixtureMap; activeCategory from store
// OUTPUT: 头部条 + 搜索 + 缩略图网格（不含分类轨）
// POS: src/components/catalog/CatalogSidebar.tsx — 目录主体（Phase 7 拆分后只负责搜索+网格）

import { useState } from 'react'
import type { Fixture, FixtureMainGenre } from '../../types/editor'
import {
  searchFixtures,
  filterByPhase7Category,
  type Phase7Category,
} from '../../data/fixtures'
import { CatalogSearch } from './CatalogSearch'
import { CatalogGrid } from './CatalogGrid'
import { useEditorStore } from '../../stores/editorStore'

interface CatalogSidebarProps {
  fixtures: Fixture[]
  // mainGenres / fixtureMap 保留接口（兼容外层 CatalogRail 调用），暂未使用
  mainGenres: FixtureMainGenre[]
  fixtureMap: Map<number, Fixture>
}

export function CatalogSidebar({ fixtures }: CatalogSidebarProps) {
  const activeFixtureId = useEditorStore((s) => s.activeFixtureId)
  const activeCategory = useEditorStore(
    (s) => s.activeCategory,
  ) as Phase7Category
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFixtures = filterByPhase7Category(
    searchFixtures(fixtures, searchQuery),
    activeCategory,
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 头部条 — sky 渐变 */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '8px 16px',
          height: 40,
          background: 'linear-gradient(180deg, #9bdcff, #69c8ff)',
          color: 'var(--color-ink-on-sky, #1f3556)',
          borderTopRightRadius: 'var(--radius-panel)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 16,
            lineHeight: 1.2,
          }}
        >
          家具目録
        </span>
        <span
          style={{
            padding: '4px 8px',
            background: 'rgba(255,255,255,.4)',
            borderRadius: 'var(--radius-badge, 6px)',
            fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 11,
            lineHeight: 1,
          }}
        >
          {filteredFixtures.length} 件
        </span>
      </div>

      {/* 搜索框 */}
      <div style={{ padding: 16, flexShrink: 0 }}>
        <CatalogSearch value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* 网格主体 */}
      <div className="flex-1 overflow-hidden">
        {filteredFixtures.length === 0 ? (
          <div
            className="h-full flex flex-col items-center justify-center text-center"
            style={{ padding: 16 }}
          >
            <p
              style={{
                fontFamily:
                  '"M PLUS Rounded 1c", system-ui, sans-serif',
                fontWeight: 800,
                fontSize: 13,
                color: '#1f3556',
                marginBottom: 4,
              }}
            >
              該当する家具はありません
            </p>
            <p
              style={{
                fontFamily: 'Nunito, system-ui, sans-serif',
                fontWeight: 700,
                fontSize: 11,
                color: '#4f6a8e',
              }}
            >
              検索語またはカテゴリを変更してみてください
            </p>
          </div>
        ) : (
          <CatalogGrid
            fixtures={filteredFixtures}
            activeFixtureId={activeFixtureId}
          />
        )}
      </div>
    </div>
  )
}
