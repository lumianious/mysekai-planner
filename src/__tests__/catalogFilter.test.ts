// ======== 目录搜索+过滤管线测试 ========
// 验证 searchFixtures + filterByGenre 的组合使用

import { describe, it, expect } from 'vitest'
import type { Fixture } from '../types/editor'
import {
  searchFixtures,
  filterByGenre,
  getThumbnailUrl,
} from '../data/fixtures'

// ======== 模拟数据 ========

const mockFixtures: Fixture[] = [
  {
    id: 1,
    name: 'テーブルA',
    pronunciation: 'てーぶるえー',
    assetbundleName: 'mysekai_fixture_table_a',
    gridSize: { width: 2, depth: 2 },
    colorCode: '#FF0000',
    mysekaiFixtureType: 'normal',
    mysekaiFixtureMainGenreId: 1,
    mysekaiFixtureSubGenreId: 5,
    mysekaiSettableSiteType: 'home',
    mysekaiSettableLayoutType: 'floor',
    mysekaiFixturePutType: 'put_base',
  },
  {
    id: 2,
    name: 'テーブルB',
    pronunciation: 'てーぶるびー',
    assetbundleName: 'mysekai_fixture_table_b',
    gridSize: { width: 1, depth: 1 },
    colorCode: '#00FF00',
    mysekaiFixtureType: 'normal',
    mysekaiFixtureMainGenreId: 2,
    mysekaiFixtureSubGenreId: 8,
    mysekaiSettableSiteType: 'home',
    mysekaiSettableLayoutType: 'floor',
    mysekaiFixturePutType: 'none',
  },
  {
    id: 3,
    name: '花壇',
    pronunciation: 'かだん',
    assetbundleName: 'mysekai_fixture_flowerbed',
    gridSize: { width: 1, depth: 3 },
    colorCode: '#0000FF',
    mysekaiFixtureType: 'normal',
    mysekaiFixtureMainGenreId: 1,
    mysekaiFixtureSubGenreId: 3,
    mysekaiSettableSiteType: 'any',
    mysekaiSettableLayoutType: 'floor',
    mysekaiFixturePutType: 'none',
  },
  {
    id: 4,
    name: 'ベンチ',
    pronunciation: 'べんち',
    assetbundleName: 'mysekai_fixture_bench',
    gridSize: { width: 3, depth: 1 },
    colorCode: '#FFFF00',
    mysekaiFixtureType: 'normal',
    mysekaiFixtureMainGenreId: 3,
    mysekaiFixtureSubGenreId: 10,
    mysekaiSettableSiteType: 'home',
    mysekaiSettableLayoutType: 'floor',
    mysekaiFixturePutType: 'none',
  },
  {
    id: 5,
    name: 'ラグマット',
    pronunciation: 'らぐまっと',
    assetbundleName: 'mysekai_fixture_rug',
    gridSize: { width: 4, depth: 4 },
    colorCode: '#FF00FF',
    mysekaiFixtureType: 'normal',
    mysekaiFixtureMainGenreId: 2,
    mysekaiFixtureSubGenreId: 5,
    mysekaiSettableSiteType: 'home',
    mysekaiSettableLayoutType: 'rug',
    mysekaiFixturePutType: 'none',
  },
]

// ======== 搜索 + 分类过滤组合测试 ========

describe('catalog search + genre filter pipeline', () => {
  it('search "テーブル" then filter genre 1 returns only matching items', () => {
    const searched = searchFixtures(mockFixtures, 'テーブル')
    const result = filterByGenre(searched, 1, null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
    expect(result[0].name).toBe('テーブルA')
  })

  it('empty search + null genre returns all items', () => {
    const searched = searchFixtures(mockFixtures, '')
    const result = filterByGenre(searched, null, null)
    expect(result).toHaveLength(mockFixtures.length)
  })

  it('specific genreId narrows result set correctly', () => {
    const result = filterByGenre(mockFixtures, 2, null)
    expect(result).toHaveLength(2)
    expect(result.map((f) => f.id)).toEqual([2, 5])
  })

  it('search + filter are composable (order does not matter)', () => {
    // 先搜索再过滤
    const searchFirst = filterByGenre(
      searchFixtures(mockFixtures, 'テーブル'),
      1,
      null,
    )
    // 先过滤再搜索
    const filterFirst = searchFixtures(
      filterByGenre(mockFixtures, 1, null),
      'テーブル',
    )
    expect(searchFirst).toEqual(filterFirst)
    expect(searchFirst).toHaveLength(1)
    expect(searchFirst[0].id).toBe(1)
  })

  it('search with no matching genre returns empty', () => {
    const searched = searchFixtures(mockFixtures, 'テーブル')
    const result = filterByGenre(searched, 3, null)
    expect(result).toHaveLength(0)
  })
})

// ======== CDN 缩略图 URL 测试 ========

describe('getThumbnailUrl for catalog', () => {
  it('produces correct CDN URL pattern', () => {
    const url = getThumbnailUrl('mysekai_fixture_table_a')
    expect(url).toBe(
      'https://storage.sekai.best/sekai-jp-assets/mysekai/thumbnail/fixture/mysekai_fixture_table_a_1.webp',
    )
  })

  it('handles various assetbundleName formats', () => {
    const url = getThumbnailUrl('fixture_with_special-chars')
    expect(url).toContain('fixture_with_special-chars_1.webp')
    expect(url).toMatch(/^https:\/\/storage\.sekai\.best\//)
  })
})
