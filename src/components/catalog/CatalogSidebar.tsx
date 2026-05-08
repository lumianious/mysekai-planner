// ======== 目录主体 — Phase 9 改：分类驱动 + 子分类芯片栏 + 搜索接管 ========
// INPUT: fixtures（已 outdoor 过滤）, mainGenres, subGenres, fixtureMap;
//        activeCategory / activeSubGenreId / searchActiveBeforeQuery from store
// OUTPUT: 头部条 + 搜索 + 子分类芯片栏（条件渲染）+ 缩略图网格 + 搜索面包屑 +
//        空状态（保留 Phase 7 文案 該当する家具はありません）
// POS: src/components/catalog/CatalogSidebar.tsx — Phase 9 catalog body（CATL-05/07/10/11）
//
// 关键不变量：
// 1. 搜索非空 ⇒ 走 searchFixtures，绕开分类过滤；芯片栏隐藏；每个 tile 渲染 mainGenre
//    面包屑（D-14；UI-SPEC §3）
// 2. 搜索从空→非空 边沿快照 {mainId, subId} 进 store；非空→空 边沿恢复，注意必须
//    先 setActiveCategory（会内部清零 activeSubGenreId），再 setActiveSubGenreId 回填
// 3. 芯片栏渲染条件：activeCategory !== 'all' && !isSearching && visibleSubGenres.length >= 2

import { useMemo, useState } from 'react'
import type { Fixture, FixtureMainGenre, FixtureSubGenre } from '../../types/editor'
import { searchFixtures, filterByGenre } from '../../data/fixtures'
import { CatalogSearch } from './CatalogSearch'
import { CatalogGrid } from './CatalogGrid'
import { CategoryFilter } from './CategoryFilter'
import { useEditorStore } from '../../stores/editorStore'

interface CatalogSidebarProps {
  fixtures: Fixture[]
  mainGenres: FixtureMainGenre[]
  subGenres: FixtureSubGenre[]
  fixtureMap: Map<number, Fixture>
}

export function CatalogSidebar({
  fixtures,
  mainGenres,
  subGenres,
}: CatalogSidebarProps) {
  const activeFixtureId = useEditorStore((s) => s.activeFixtureId)
  const activeCategory = useEditorStore((s) => s.activeCategory)
  const activeSubGenreId = useEditorStore((s) => s.activeSubGenreId)
  const searchActiveBeforeQuery = useEditorStore(
    (s) => s.searchActiveBeforeQuery,
  )
  const setActiveCategory = useEditorStore((s) => s.setActiveCategory)
  const setActiveSubGenreId = useEditorStore((s) => s.setActiveSubGenreId)
  const setSearchActiveBeforeQuery = useEditorStore(
    (s) => s.setSearchActiveBeforeQuery,
  )

  const [searchQuery, setSearchQuery] = useState('')
  const isSearching = searchQuery.length > 0
  const mainId = activeCategory === 'all' ? null : activeCategory

  // ======== 过滤管道：搜索 wins，否则按 mainId + subId 过滤 ========
  const visibleFixtures = useMemo(() => {
    if (isSearching) return searchFixtures(fixtures, searchQuery)
    return filterByGenre(fixtures, mainId, activeSubGenreId)
  }, [fixtures, isSearching, searchQuery, mainId, activeSubGenreId])

  // ======== 派生子分类芯片：当前 mainGenre 下经验式存在的 subGenre ========
  const visibleSubGenres = useMemo(() => {
    if (mainId === null) return []
    const present = new Set<number>()
    for (const f of fixtures) {
      if (
        f.mysekaiFixtureMainGenreId === mainId &&
        f.mysekaiFixtureSubGenreId != null
      ) {
        present.add(f.mysekaiFixtureSubGenreId)
      }
    }
    return subGenres.filter((s) => present.has(s.id))
  }, [fixtures, mainId, subGenres])

  // 仅当至少 2 个 subGenre 才显示芯片栏（D-05/D-06 + 单芯片栏无价值）
  const showChipStrip = !isSearching && visibleSubGenres.length >= 2

  // ======== 搜索输入处理：边沿触发快照/恢复 ========
  // 先 setActiveCategory（会内部置零 activeSubGenreId，pitfall §2），
  // 再 setActiveSubGenreId 回填快照 subId —— 顺序很关键。
  const onSearchChange = (next: string) => {
    const wasSearching = searchQuery.length > 0
    const willSearch = next.length > 0
    if (!wasSearching && willSearch) {
      setSearchActiveBeforeQuery({
        mainId: activeCategory,
        subId: activeSubGenreId,
      })
    } else if (wasSearching && !willSearch) {
      if (searchActiveBeforeQuery) {
        setActiveCategory(searchActiveBeforeQuery.mainId)
        setActiveSubGenreId(searchActiveBeforeQuery.subId)
        setSearchActiveBeforeQuery(null)
      }
    }
    setSearchQuery(next)
  }

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
          {visibleFixtures.length} 件
        </span>
      </div>

      {/* 搜索框 */}
      <div style={{ padding: 16, flexShrink: 0 }}>
        <CatalogSearch value={searchQuery} onChange={onSearchChange} />
      </div>

      {/* 子分类芯片栏（条件渲染） */}
      {showChipStrip && (
        <div style={{ padding: '0 12px', flexShrink: 0 }}>
          <CategoryFilter
            items={visibleSubGenres}
            activeId={activeSubGenreId}
            onSelect={setActiveSubGenreId}
            allLabel="全部"
            allAriaLabel="この分類の全て"
          />
        </div>
      )}

      {/* 网格主体 */}
      <div className="flex-1 overflow-hidden">
        {visibleFixtures.length === 0 ? (
          <div
            className="h-full flex flex-col items-center justify-center text-center"
            style={{ padding: 16 }}
          >
            <p
              style={{
                fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
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
            fixtures={visibleFixtures}
            activeFixtureId={activeFixtureId}
            mainGenres={isSearching ? mainGenres : undefined}
          />
        )}
      </div>
    </div>
  )
}
