// ======== 家具数据层测试 ========

import { describe, it, expect } from 'vitest'
import type { Fixture } from '../types/editor'
import {
  filterOutdoorFixtures,
  searchFixtures,
  filterByGenre,
  getThumbnailUrl,
  getItemLayer,
  getSystemFixtures,
} from '../data/fixtures'

// ======== 模拟数据 ========

const mockFixtures: Fixture[] = [
  {
    id: 1,
    name: 'テーブル',
    pronunciation: 'てーぶる',
    assetbundleName: 'mysekai_fixture_table',
    gridSize: { width: 2, depth: 2 },
    colorCode: '#FF0000',
    mysekaiFixtureType: 'normal',
    mysekaiFixtureMainGenreId: 1,
    mysekaiFixtureSubGenreId: 5,
    mysekaiFixtureHandleType: 'none',
    mysekaiSettableSiteType: 'home',
    mysekaiSettableLayoutType: 'floor',
    mysekaiFixturePutType: 'put_base',
  },
  {
    id: 2,
    name: '花壇',
    pronunciation: 'かだん',
    assetbundleName: 'mysekai_fixture_flowerbed',
    gridSize: { width: 1, depth: 3 },
    colorCode: '#00FF00',
    mysekaiFixtureType: 'normal',
    mysekaiFixtureMainGenreId: 2,
    mysekaiFixtureSubGenreId: 8,
    mysekaiFixtureHandleType: 'none',
    mysekaiSettableSiteType: 'any',
    mysekaiSettableLayoutType: 'floor',
    mysekaiFixturePutType: 'none',
  },
  {
    id: 3,
    name: '室内ソファ',
    pronunciation: 'しつないそふぁ',
    assetbundleName: 'mysekai_fixture_indoor_sofa',
    gridSize: { width: 3, depth: 1 },
    colorCode: '#0000FF',
    mysekaiFixtureType: 'normal',
    mysekaiFixtureMainGenreId: 1,
    mysekaiFixtureSubGenreId: 3,
    mysekaiFixtureHandleType: 'none',
    mysekaiSettableSiteType: 'room',
    mysekaiSettableLayoutType: 'floor',
    mysekaiFixturePutType: 'none',
  },
  {
    id: 4,
    name: 'マイセカイゲート',
    pronunciation: 'まいせかいげーと',
    assetbundleName: 'mysekai_fixture_gate',
    gridSize: { width: 2, depth: 1 },
    colorCode: '#FFFF00',
    mysekaiFixtureType: 'system',
    mysekaiFixtureMainGenreId: 0,
    mysekaiFixtureSubGenreId: 0,
    mysekaiFixtureHandleType: 'none',
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
    mysekaiFixtureHandleType: 'none',
    mysekaiSettableSiteType: 'home',
    mysekaiSettableLayoutType: 'rug',
    mysekaiFixturePutType: 'none',
  },
  {
    id: 6,
    name: '壁飾り',
    pronunciation: 'かべかざり',
    assetbundleName: 'mysekai_fixture_wall_decor',
    gridSize: { width: 1, depth: 1 },
    colorCode: '#00FFFF',
    mysekaiFixtureType: 'normal',
    mysekaiFixtureMainGenreId: 3,
    mysekaiFixtureSubGenreId: 10,
    mysekaiFixtureHandleType: 'none',
    mysekaiSettableSiteType: 'any',
    mysekaiSettableLayoutType: 'wall',
    mysekaiFixturePutType: 'none',
  },
  {
    id: 7,
    name: 'システム家具（室内）',
    pronunciation: 'しすてむかぐ',
    assetbundleName: 'mysekai_fixture_system_indoor',
    gridSize: { width: 1, depth: 1 },
    colorCode: '#AAAAAA',
    mysekaiFixtureType: 'system',
    mysekaiFixtureMainGenreId: 0,
    mysekaiFixtureSubGenreId: 0,
    mysekaiFixtureHandleType: 'none',
    mysekaiSettableSiteType: 'room',
    mysekaiSettableLayoutType: 'floor',
    mysekaiFixturePutType: 'none',
  },
]

// ======== filterOutdoorFixtures 测试 ========

describe('filterOutdoorFixtures', () => {
  it('removes items where mysekaiSettableSiteType === "room"', () => {
    const result = filterOutdoorFixtures(mockFixtures)
    const roomItems = result.filter((f) => f.mysekaiSettableSiteType === 'room')
    expect(roomItems).toHaveLength(0)
  })

  it('keeps items where mysekaiSettableSiteType === "home" or "any"', () => {
    const result = filterOutdoorFixtures(mockFixtures)
    const homeOrAny = result.filter(
      (f) =>
        f.mysekaiSettableSiteType === 'home' ||
        f.mysekaiSettableSiteType === 'any',
    )
    expect(homeOrAny.length).toBeGreaterThan(0)
    // id=1 (home), id=2 (any), id=5 (home), id=6 (any) should remain
    expect(result.map((f) => f.id)).toContain(1)
    expect(result.map((f) => f.id)).toContain(2)
    expect(result.map((f) => f.id)).toContain(5)
    expect(result.map((f) => f.id)).toContain(6)
  })

  it('excludes items where mysekaiFixtureType === "system"', () => {
    const result = filterOutdoorFixtures(mockFixtures)
    const systemItems = result.filter(
      (f) => f.mysekaiFixtureType === 'system',
    )
    expect(systemItems).toHaveLength(0)
    // id=4 (system, home) should be excluded from catalog
    expect(result.map((f) => f.id)).not.toContain(4)
  })
})

// ======== searchFixtures 测试 ========

describe('searchFixtures', () => {
  const outdoorFixtures = [
    mockFixtures[0], // テーブル
    mockFixtures[1], // 花壇
    mockFixtures[4], // ラグマット
    mockFixtures[5], // 壁飾り
  ]

  it('returns fixtures whose name contains query', () => {
    const result = searchFixtures(outdoorFixtures, 'テーブル')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('matches against pronunciation field', () => {
    const result = searchFixtures(outdoorFixtures, 'てーぶる')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('returns all fixtures when query is empty', () => {
    const result = searchFixtures(outdoorFixtures, '')
    expect(result).toHaveLength(outdoorFixtures.length)
  })

  it('returns empty array when no match', () => {
    const result = searchFixtures(outdoorFixtures, 'ドラゴン')
    expect(result).toHaveLength(0)
  })
})

// ======== filterByGenre 测试 ========

describe('filterByGenre', () => {
  it('returns only fixtures with matching mainGenreId', () => {
    const result = filterByGenre(mockFixtures, 1, null)
    expect(result.every((f) => f.mysekaiFixtureMainGenreId === 1)).toBe(true)
    expect(result).toHaveLength(2) // id=1, id=3
  })

  it('returns only fixtures matching both main and sub genre', () => {
    const result = filterByGenre(mockFixtures, 1, 5)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('returns all fixtures when mainGenreId is null', () => {
    const result = filterByGenre(mockFixtures, null, null)
    expect(result).toHaveLength(mockFixtures.length)
  })
})

// ======== getThumbnailUrl 测试 ========

describe('getThumbnailUrl', () => {
  it('constructs correct CDN URL from assetbundleName', () => {
    const url = getThumbnailUrl('fixture_name')
    expect(url).toBe(
      'https://storage.sekai.best/sekai-jp-assets/mysekai/thumbnail/fixture/fixture_name_1.webp',
    )
  })
})

// ======== getItemLayer 测试 ========

describe('getItemLayer', () => {
  it('returns "ground" for mysekaiSettableLayoutType "floor"', () => {
    const fixture = mockFixtures[0] // layoutType: 'floor'
    expect(getItemLayer(fixture)).toBe('ground')
  })

  it('returns "ground" for mysekaiSettableLayoutType "rug"', () => {
    const fixture = mockFixtures[4] // layoutType: 'rug'
    expect(getItemLayer(fixture)).toBe('ground')
  })

  it('returns "furniture" for mysekaiSettableLayoutType "wall"', () => {
    const fixture = mockFixtures[5] // layoutType: 'wall'
    expect(getItemLayer(fixture)).toBe('furniture')
  })
})

// ======== getSystemFixtures 测试 ========

describe('getSystemFixtures', () => {
  it('returns outdoor system fixtures only', () => {
    const result = getSystemFixtures(mockFixtures)
    // id=4 (system, home) should be included
    // id=7 (system, room) should be excluded
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(4)
  })
})
