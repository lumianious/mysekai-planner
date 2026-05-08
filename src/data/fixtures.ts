// ======== 家具数据层 ========
// 数据来源: sekai-master-db-diff (GitHub)
// CDN 缩略图: storage.sekai.best

import type { Fixture, ItemLayer } from '../types/editor'

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
// floor/rug/road → ground 层，wall 及其他 → furniture 层
// NOTE: 'floor_appearance' 表面外观贴花仍归 furniture 层（与 'wall_appearance' 一致）
//       不参与 ground 层碰撞，由未来任务决定

export function getItemLayer(fixture: Fixture): ItemLayer {
  const lt = fixture.mysekaiSettableLayoutType
  if (lt === 'floor' || lt === 'rug' || lt === 'road') {
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

// ======== 地面物品子类型分类 ========
// INPUT: fixture
// OUTPUT: 'road' | 'color-tile' | 'fence' | 'rug' | null
// POS: src/data/fixtures.ts — 驱动 Brush 工具模式下的交互模式选择
//
// 分类权威字段为 mysekaiFixtureHandleType（在 RESEARCH.md §1 中发现）：
//   - 'fence' → 柵 (7 个)
//   - 'road'  → 道 (6 个 mainGenreId=12) 或 カラータイル (20 个 mainGenreId=31)
// 地毯不用 handleType，改用 layoutType 以保持与 Phase 1 一致。

export type GroundSubtype = 'road' | 'color-tile' | 'fence' | 'rug'

export function getGroundSubtype(fixture: Fixture): GroundSubtype | null {
  // 柵 — handleType 权威标记
  if (fixture.mysekaiFixtureHandleType === 'fence') return 'fence'

  // 道 / カラータイル — 都使用 handleType='road'，通过 mainGenreId 区分
  if (fixture.mysekaiFixtureHandleType === 'road') {
    if (fixture.mysekaiFixtureMainGenreId === 31) return 'color-tile'
    return 'road' // 默认 mainGenreId === 12 (`道`)
  }

  // 地毯 — 使用现有 layoutType 分类（与 Phase 1 getItemLayer 一致）
  if (fixture.mysekaiSettableLayoutType === 'rug') return 'rug'

  return null
}

// Phase 9: 删除 Phase7Category + filterByPhase7Category（启发式正则替换为游戏数据驱动 — D-03）
// 类目改由 mysekaiFixtureMainGenreId / mysekaiFixtureSubGenreId 驱动；过滤走 filterByGenre()。

// ======== Brush 工具资格检查 ========
// 判断某家具能否通过 Brush 工具放置（道/柵/カラータイル 即可，地毯用 Stamp 模式）

export function isBrushEligible(fixture: Fixture): boolean {
  const s = getGroundSubtype(fixture)
  return s === 'road' || s === 'color-tile' || s === 'fence'
}

// ======== Brush 交互模式选择 ========
// 'drag-paint'      → 拖拽画刷（道、カラータイル）—— 目标是 tile 格子
// 'drag-paint-edge' → 拖拽画刷（柵）—— 目标是网格边缘（格子之间），Plan 02/03 实现
// null              → 非 Brush 目标（地毯走 Stamp，其他家具走 Stamp）

export function getBrushInteraction(
  fixture: Fixture,
): 'drag-paint' | 'drag-paint-edge' | null {
  const s = getGroundSubtype(fixture)
  if (s === 'road' || s === 'color-tile') return 'drag-paint'
  if (s === 'fence') return 'drag-paint-edge'
  return null
}
