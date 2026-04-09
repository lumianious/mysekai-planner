// ======== 家具数据层 ========
// 数据来源: sekai-master-db-diff (GitHub)
// CDN 缩略图: storage.sekai.best

import type { Fixture, FixtureMainGenre, FixtureSubGenre, ItemLayer } from '../types/editor'

const DATA_BASE_URL = 'https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main'

const CDN_THUMBNAIL_BASE = 'https://storage.sekai.best/sekai-jp-assets/mysekai/thumbnail/fixture'

// ======== 模块级缓存 ========

let cachedFixtures: Fixture[] | null = null

// ======== 数据获取 ========

export async function fetchFixtures(): Promise<Fixture[]> {
  if (cachedFixtures) return cachedFixtures
  const res = await fetch(`${DATA_BASE_URL}/mysekaiFixtures.json`)
  const data: Fixture[] = await res.json()
  cachedFixtures = data
  return data
}

// ======== 过滤：户外家具 ========
// 排除 room-only 和 system 类型（system 不在目录中显示）

export function filterOutdoorFixtures(fixtures: Fixture[]): Fixture[] {
  return fixtures.filter(
    (f) =>
      f.mysekaiSettableSiteType !== 'room' &&
      f.mysekaiFixtureType !== 'system',
  )
}

// ======== 搜索：按名称/读音 ========

export function searchFixtures(fixtures: Fixture[], query: string): Fixture[] {
  if (!query) return fixtures
  return fixtures.filter(
    (f) =>
      f.name.includes(query) ||
      f.pronunciation.includes(query.toLowerCase()),
  )
}

// ======== 过滤：按分类 ========

export function filterByGenre(
  fixtures: Fixture[],
  mainGenreId: number | null,
  subGenreId: number | null,
): Fixture[] {
  if (mainGenreId === null) return fixtures
  return fixtures.filter((f) => {
    if (f.mysekaiFixtureMainGenreId !== mainGenreId) return false
    if (subGenreId !== null && f.mysekaiFixtureSubGenreId !== subGenreId) return false
    return true
  })
}

// ======== CDN 缩略图 URL ========

export function getThumbnailUrl(assetbundleName: string): string {
  return `${CDN_THUMBNAIL_BASE}/${assetbundleName}_1.webp`
}

// ======== 图层判定 ========
// floor/rug → ground 层，wall 及其他 → furniture 层

export function getItemLayer(fixture: Fixture): ItemLayer {
  if (
    fixture.mysekaiSettableLayoutType === 'floor' ||
    fixture.mysekaiSettableLayoutType === 'rug'
  ) {
    return 'ground'
  }
  return 'furniture'
}

// ======== 系统家具（户外）========
// gate/house 等必须自动放置的系统物品

export function getSystemFixtures(fixtures: Fixture[]): Fixture[] {
  return fixtures.filter(
    (f) =>
      f.mysekaiFixtureType === 'system' &&
      f.mysekaiSettableSiteType !== 'room',
  )
}
