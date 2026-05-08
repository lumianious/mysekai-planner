// ======== CatalogSidebar.smoke — Phase 9 CATL-07/10/11 ========
// INPUT: 手工最小 fixtures / mainGenres / subGenres prop 集
// OUTPUT: 验证 chip strip 渲染条件、search 接管、空状态、search-clear 恢复
// POS: src/components/catalog/__tests__/CatalogSidebar.smoke.test.tsx — RED until plan 09-04
//
// NOTE: 该文件在 Wave 0 阶段是 RED — turn GREEN by: plan 09-04（CatalogSidebar 重接线
//       为 filterByGenre + searchFixtures + chip strip + breadcrumb pill）

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CatalogSidebar } from '../CatalogSidebar'
import { useEditorStore } from '../../../stores/editorStore'
import type { Fixture, FixtureMainGenre, FixtureSubGenre } from '../../../types/editor'

// ======== 测试夹具：最小 fixture/mainGenre/subGenre 集 ========

function fx(overrides: Partial<Fixture>): Fixture {
  return {
    id: 1,
    name: 'テスト家具',
    pronunciation: 'てすと',
    assetbundleName: 'test_fixture',
    gridSize: { width: 1, depth: 1 },
    colorCode: '#fff',
    mysekaiFixtureType: 'normal',
    mysekaiFixtureMainGenreId: 2,
    mysekaiFixtureSubGenreId: 8,
    mysekaiFixtureHandleType: 'none',
    mysekaiSettableSiteType: 'home',
    mysekaiSettableLayoutType: 'floor',
    mysekaiFixturePutType: 'none',
    ...overrides,
  } as Fixture
}

function mg(id: number, name: string): FixtureMainGenre {
  return {
    id,
    name,
    mysekaiFixtureMainGenreType: 'none',
    seq: 0,
  } as FixtureMainGenre
}

function sg(id: number, name: string, mainGenreId: number): FixtureSubGenre {
  return {
    id,
    name,
    mysekaiFixtureSubGenreType: 'none',
    mysekaiFixtureMainGenreId: mainGenreId,
    seq: 0,
  } as FixtureSubGenre
}

const mainGenres: FixtureMainGenre[] = [
  mg(2, '一般'),
  mg(29, 'ぬいぐるみ'),
]

const subGenres: FixtureSubGenre[] = [
  sg(8, 'チェア', 2),
  sg(9, 'テーブル', 2),
  sg(50, 'ぬいぐるみ', 29),
]

// 一般(2): 2 subgenres present (チェア=8, テーブル=9) → chip strip should render
// ぬいぐるみ(29): 1 subgenre present (50) → chip strip should hide
const fixtures: Fixture[] = [
  fx({ id: 1, name: 'チェアA', pronunciation: 'ちぇあ', mysekaiFixtureMainGenreId: 2, mysekaiFixtureSubGenreId: 8 }),
  fx({ id: 2, name: 'チェアB', pronunciation: 'ちぇあ', mysekaiFixtureMainGenreId: 2, mysekaiFixtureSubGenreId: 8 }),
  fx({ id: 3, name: 'テーブルA', pronunciation: 'てーぶる', mysekaiFixtureMainGenreId: 2, mysekaiFixtureSubGenreId: 9 }),
  fx({ id: 4, name: 'クマぬいぐるみ', pronunciation: 'くま', mysekaiFixtureMainGenreId: 29, mysekaiFixtureSubGenreId: 50 }),
]

const fixtureMap = new Map(fixtures.map((f) => [f.id, f]))

function renderSidebar() {
  return render(
    <CatalogSidebar
      fixtures={fixtures}
      mainGenres={mainGenres}
      subGenres={subGenres as unknown as FixtureSubGenre[]}
      fixtureMap={fixtureMap}
    />,
  )
}

describe('CatalogSidebar smoke (CATL-07/10/11)', () => {
  beforeEach(() => {
    // Reset store between tests
    useEditorStore.setState({
      activeCategory: 'all' as unknown as never,
      // activeSubGenreId / searchActiveBeforeQuery added in plan 09-02
    } as never)
  })

  // ======== CATL-07 ========

  it('CATL-07: renders ≥2 subGenre chips + 全部 chip when mainGenre 2 (一般) is active', () => {
    useEditorStore.setState({ activeCategory: 2 as unknown as never } as never)
    renderSidebar()
    // 全部 chip
    expect(screen.getAllByText('全部').length).toBeGreaterThanOrEqual(1)
    // At least the two subGenre chips
    expect(screen.getByText('チェア')).toBeTruthy()
    expect(screen.getByText('テーブル')).toBeTruthy()
  })

  it('CATL-07: hides chip strip entirely when activeCategory === "all"', () => {
    useEditorStore.setState({ activeCategory: 'all' as unknown as never } as never)
    renderSidebar()
    // No subgenre chip text in DOM
    expect(screen.queryByText('チェア')).toBeNull()
    expect(screen.queryByText('テーブル')).toBeNull()
  })

  it('CATL-07: hides chip strip when only 1 derivable subGenre (ぬいぐるみ)', () => {
    useEditorStore.setState({ activeCategory: 29 as unknown as never } as never)
    renderSidebar()
    // visibleSubGenres.length < 2 → hidden (UI-SPEC §3 + RESEARCH Discretion §6)
    // Only the クマぬいぐるみ tile renders; the chip "ぬいぐるみ" must NOT appear in chip-strip role
    // (it may still appear as a result tile label — assertion targets chip role)
    expect(screen.queryByRole('button', { name: 'ぬいぐるみ' })).toBeNull()
  })

  // ======== CATL-10 ========

  it('CATL-10: typing into search hides chip strip and shows breadcrumb pills with mainGenre name', () => {
    useEditorStore.setState({ activeCategory: 2 as unknown as never } as never)
    renderSidebar()
    const search = screen.getByPlaceholderText(/家具を検索/) as HTMLInputElement
    fireEvent.change(search, { target: { value: 'チェア' } })
    // Chip strip gone
    expect(screen.queryByRole('button', { name: 'チェア' })).toBeNull()
    // Breadcrumb pill bears mainGenre name (一般)
    const breadcrumbs = screen.getAllByText('一般')
    expect(breadcrumbs.length).toBeGreaterThanOrEqual(1)
  })

  it('CATL-10: clearing search restores prior activeCategory snapshot', () => {
    useEditorStore.setState({ activeCategory: 2 as unknown as never } as never)
    renderSidebar()
    const search = screen.getByPlaceholderText(/家具を検索/) as HTMLInputElement
    fireEvent.change(search, { target: { value: 'チェア' } })
    fireEvent.change(search, { target: { value: '' } })
    expect(useEditorStore.getState().activeCategory).toBe(2)
  })

  // ======== CATL-11 ========

  it('CATL-11: search with no matches shows 該当する家具はありません empty state', () => {
    useEditorStore.setState({ activeCategory: 'all' as unknown as never } as never)
    renderSidebar()
    const search = screen.getByPlaceholderText(/家具を検索/) as HTMLInputElement
    fireEvent.change(search, { target: { value: 'zzznever-matches-anything' } })
    expect(screen.getByText('該当する家具はありません')).toBeTruthy()
  })
})
