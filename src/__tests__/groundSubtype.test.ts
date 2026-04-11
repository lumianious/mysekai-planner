// ======== 地面子类型分类测试 ========
// INPUT: Fixture 样本（道 111 / 柵 114 / カラータイル 544 / 地毯 mock / 桌子 mock）
// OUTPUT: 验证 getGroundSubtype / isBrushEligible / getBrushInteraction 的正确分类
// POS: src/__tests__/groundSubtype.test.ts — Phase 2 ROAD-01 分类器测试

import { describe, it, expect } from 'vitest'
import {
  getGroundSubtype,
  isBrushEligible,
  getBrushInteraction,
} from '../data/fixtures'
import type { Fixture } from '../types/editor'

// ======== 真实样本（摘自 RESEARCH.md §1 实测数据） ========

const road: Fixture = {
  id: 111,
  name: '土の道',
  pronunciation: 'つちのみち',
  assetbundleName: 'mdl_non2001_road_soil1',
  gridSize: { width: 2, depth: 2 },
  colorCode: '',
  mysekaiFixtureType: 'normal',
  mysekaiFixtureMainGenreId: 12, // 道
  mysekaiFixtureSubGenreId: 22,
  mysekaiFixtureHandleType: 'road',
  mysekaiSettableSiteType: 'home',
  mysekaiSettableLayoutType: 'road',
  mysekaiFixturePutType: 'none',
}

const fence: Fixture = {
  id: 114,
  name: 'シンプルな木の柵',
  pronunciation: 'しんぷるなきのさく',
  assetbundleName: 'mdl_non2001_fence_wood1',
  gridSize: { width: 2, depth: 2 },
  colorCode: '',
  mysekaiFixtureType: 'normal',
  mysekaiFixtureMainGenreId: 13, // 柵
  mysekaiFixtureSubGenreId: 23,
  mysekaiFixtureHandleType: 'fence',
  mysekaiSettableSiteType: 'home',
  mysekaiSettableLayoutType: 'floor',
  mysekaiFixturePutType: 'none',
}

const colorTile: Fixture = {
  id: 544,
  name: 'カラータイル/レッド',
  pronunciation: 'からーたいる',
  assetbundleName: 'mdl_non2001_colortile_red',
  gridSize: { width: 2, depth: 2 },
  colorCode: '#ff0000',
  mysekaiFixtureType: 'normal',
  mysekaiFixtureMainGenreId: 31, // カラータイル
  mysekaiFixtureSubGenreId: 34,
  mysekaiFixtureHandleType: 'road',
  mysekaiSettableSiteType: 'home',
  mysekaiSettableLayoutType: 'road',
  mysekaiFixturePutType: 'none',
}

const rug: Fixture = {
  id: 200,
  name: 'ラグ',
  pronunciation: 'らぐ',
  assetbundleName: 'mdl_rug1',
  gridSize: { width: 3, depth: 3 },
  colorCode: '',
  mysekaiFixtureType: 'normal',
  mysekaiFixtureMainGenreId: 5,
  mysekaiFixtureSubGenreId: 10,
  mysekaiFixtureHandleType: 'none',
  mysekaiSettableSiteType: 'home',
  mysekaiSettableLayoutType: 'rug',
  mysekaiFixturePutType: 'none',
}

const table: Fixture = {
  id: 300,
  name: 'テーブル',
  pronunciation: 'てーぶる',
  assetbundleName: 'mdl_table1',
  gridSize: { width: 2, depth: 2 },
  colorCode: '',
  mysekaiFixtureType: 'normal',
  mysekaiFixtureMainGenreId: 1,
  mysekaiFixtureSubGenreId: 5,
  mysekaiFixtureHandleType: 'none',
  mysekaiSettableSiteType: 'home',
  mysekaiSettableLayoutType: 'floor',
  mysekaiFixturePutType: 'put_base',
}

// ======== getGroundSubtype 测试 ========

describe('getGroundSubtype', () => {
  it("classifies handleType='fence' as 'fence'", () => {
    expect(getGroundSubtype(fence)).toBe('fence')
  })

  it("classifies handleType='road' + mainGenreId=12 as 'road'", () => {
    expect(getGroundSubtype(road)).toBe('road')
  })

  it("classifies handleType='road' + mainGenreId=31 as 'color-tile'", () => {
    expect(getGroundSubtype(colorTile)).toBe('color-tile')
  })

  it("classifies layoutType='rug' as 'rug'", () => {
    expect(getGroundSubtype(rug)).toBe('rug')
  })

  it('returns null for regular furniture (table)', () => {
    expect(getGroundSubtype(table)).toBeNull()
  })
})

// ======== isBrushEligible 测试 ========

describe('isBrushEligible', () => {
  it('accepts road, color-tile, fence', () => {
    expect(isBrushEligible(road)).toBe(true)
    expect(isBrushEligible(colorTile)).toBe(true)
    expect(isBrushEligible(fence)).toBe(true)
  })

  it('rejects rug and regular furniture', () => {
    expect(isBrushEligible(rug)).toBe(false)
    expect(isBrushEligible(table)).toBe(false)
  })
})

// ======== getBrushInteraction 测试 ========

describe('getBrushInteraction', () => {
  it("returns 'drag-paint' for road and color-tile", () => {
    expect(getBrushInteraction(road)).toBe('drag-paint')
    expect(getBrushInteraction(colorTile)).toBe('drag-paint')
  })

  it("returns 'drag-paint-edge' for fence", () => {
    expect(getBrushInteraction(fence)).toBe('drag-paint-edge')
  })

  it('returns null for rug and regular furniture', () => {
    expect(getBrushInteraction(rug)).toBeNull()
    expect(getBrushInteraction(table)).toBeNull()
  })
})
