// ======== 家具分类数据 ========
// 数据来源: sekai-master-db-diff (GitHub)

import type { FixtureMainGenre, FixtureSubGenre } from '../types/editor'

const DATA_BASE_URL = 'https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main'

// ======== 主分类 ========

export async function fetchMainGenres(): Promise<FixtureMainGenre[]> {
  const res = await fetch(`${DATA_BASE_URL}/mysekaiFixtureMainGenres.json`)
  const data: FixtureMainGenre[] = await res.json()
  return data.sort((a, b) => a.seq - b.seq)
}

// ======== 子分类 ========

export async function fetchSubGenres(): Promise<FixtureSubGenre[]> {
  const res = await fetch(`${DATA_BASE_URL}/mysekaiFixtureSubGenres.json`)
  const data: FixtureSubGenre[] = await res.json()
  return data.sort((a, b) => a.seq - b.seq)
}
