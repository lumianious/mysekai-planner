// ======== genres.test — Phase 9 CATL-06 ========
// INPUT: 内联手工构造 Fixture / FixtureMainGenre 切片
// OUTPUT: 验证 deriveOutdoorMainGenres 行为
// POS: src/data/__tests__/genres.test.ts — CATL-06 单元测试（应在 09-01 完成时变 GREEN）

import { describe, it, expect } from 'vitest'
import { deriveOutdoorMainGenres } from '../genres'
import type { Fixture, FixtureMainGenre } from '../../types/editor'

// 构造工厂：仅填 deriveOutdoorMainGenres 关心的字段，其余安全地 cast
function mg(id: number, name: string): FixtureMainGenre {
  return {
    id,
    name,
    mysekaiFixtureMainGenreType: 'none',
    // seq 在游戏数据中实际不存在，但类型仍需要 — 给 0 占位
    seq: 0,
  } as FixtureMainGenre
}

function fx(mainGenreId: number, id = mainGenreId * 1000): Fixture {
  return { id, mysekaiFixtureMainGenreId: mainGenreId } as unknown as Fixture
}

// 14 curated outdoor mainGenre IDs（RESEARCH §"Curated Outdoor MainGenres"）
const CURATED_IDS = [29, 2, 3, 32, 26, 4, 31, 9, 5, 13, 12, 6, 33, 30]

describe('deriveOutdoorMainGenres (CATL-06)', () => {
  // 构造 33 个 mainGenres（含 14 个 curated + 多个无户外 fixture 的 indoor/unit/event/tool）
  const allGenres: FixtureMainGenre[] = [
    mg(29, 'ぬいぐるみ'),
    mg(2, '一般'),
    mg(3, '小物'),
    mg(7, 'Leo/need'), // 单元 logo — 应被过滤掉
    mg(8, 'MORE MORE JUMP！'), // 单元 logo
    mg(32, 'ブロック'),
    mg(26, '植物'),
    mg(4, '壁掛け'),
    mg(31, 'カラータイル'),
    mg(9, 'ラグ'),
    mg(5, 'ディスプレイ'),
    mg(13, '柵'),
    mg(12, '道'),
    mg(6, 'キャンバス'),
    mg(33, '大型'),
    mg(30, 'その他'),
    mg(99, 'ツルハシ'), // 工具 — 过滤掉
  ]

  it('returns [] when no fixtures provided', () => {
    expect(deriveOutdoorMainGenres([], allGenres)).toEqual([])
  })

  it('keeps only genres whose id is referenced by at least one fixture', () => {
    const fixtures = [fx(2), fx(2), fx(29), fx(13)]
    const result = deriveOutdoorMainGenres(fixtures, allGenres)
    const ids = result.map((g) => g.id)
    expect(ids.sort((a, b) => a - b)).toEqual([2, 13, 29])
  })

  it('preserves the order of allGenres (no resorting)', () => {
    const fixtures = [fx(13), fx(2), fx(29)]
    const result = deriveOutdoorMainGenres(fixtures, allGenres)
    // allGenres order: 29 first, then 2, then 13. Result must follow.
    expect(result.map((g) => g.id)).toEqual([29, 2, 13])
  })

  it('drops genres with zero outdoor fixtures (Leo/need, MJ, ツルハシ)', () => {
    const fixtures = CURATED_IDS.map((id) => fx(id))
    const result = deriveOutdoorMainGenres(fixtures, allGenres)
    const ids = new Set(result.map((g) => g.id))
    expect(ids.has(7)).toBe(false)
    expect(ids.has(8)).toBe(false)
    expect(ids.has(99)).toBe(false)
  })

  it('canonical sample yields the 14 curated outdoor mainGenres', () => {
    const fixtures = CURATED_IDS.map((id) => fx(id))
    const result = deriveOutdoorMainGenres(fixtures, allGenres)
    expect(result).toHaveLength(14)
    const sortedIds = result.map((g) => g.id).sort((a, b) => a - b)
    const expected = [...CURATED_IDS].sort((a, b) => a - b)
    expect(sortedIds).toEqual(expected)
  })
})
