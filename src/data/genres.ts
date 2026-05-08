// ======== 家具分类数据 ========
// INPUT: sekai-master-db-diff (mainGenres / subGenres JSON), 户外家具数组
// OUTPUT: fetchMainGenres / fetchSubGenres / deriveOutdoorMainGenres
// POS: src/data/genres.ts — Phase 9 catalog overhaul 主分类数据层
// 数据来源: sekai-master-db-diff (GitHub)

import type { Fixture, FixtureMainGenre, FixtureSubGenre } from '../types/editor'

const DATA_BASE_URL = 'https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main'

// ======== 主分类 ========
// 上游 JSON 已按游戏定义的稳定顺序返回，无需排序。

export async function fetchMainGenres(): Promise<FixtureMainGenre[]> {
  const res = await fetch(`${DATA_BASE_URL}/mysekaiFixtureMainGenres.json`)
  const data: FixtureMainGenre[] = await res.json()
  return data
}

// ======== 子分类 ========

export async function fetchSubGenres(): Promise<FixtureSubGenre[]> {
  const res = await fetch(`${DATA_BASE_URL}/mysekaiFixtureSubGenres.json`)
  const data: FixtureSubGenre[] = await res.json()
  return data
}

// ======== 户外主分类导出（Phase 9 新增）========
// INPUT: 已经过 filterOutdoorFixtures 的 fixtures 集合 + 全部 mainGenres
// OUTPUT: 仅保留至少有一个户外 fixture 引用的 mainGenre，保持 allGenres 原顺序
// POS: src/data/genres.ts — D-02 经验式派生，避免硬编码白名单

export function deriveOutdoorMainGenres(
  fixtures: Fixture[],
  allGenres: FixtureMainGenre[],
): FixtureMainGenre[] {
  const presentIds = new Set(fixtures.map((f) => f.mysekaiFixtureMainGenreId))
  return allGenres.filter((g) => presentIds.has(g.id))
}
