// ======== PlacedItem sprite 渲染测试（Wave 4 — SPRT-07）========
// POS: src/components/canvas/__tests__/PlacedItem.sprite.test.tsx
//
// 与 PlacedItem.fallback.test.tsx 同样原因（jsdom 无法跑 Konva Stage），
// 这里测试的是 Wave 4 引入的 *URL 解析契约*（resolveSpriteUrl）：
// - 2D 地面项 -> entry.sprite（顶视图铺贴）
// - 3D 家具命中 thumbnail -> entry.thumbnails[0]（iso 缩略图，HID 风格）
// - 3D 家具但缺 thumbnail -> 回退 entry.sprite（虽然像盒子也聊胜于无）
// - manifest 完全未命中 -> null（PlacedItem 走彩色矩形回退）
//
// 视觉验证（rotation、Konva canvas 实际渲染）见 manual checklist。

import { describe, it, expect, beforeEach } from 'vitest'
import {
  __resetSpriteManifestCacheForTests,
  loadSpriteManifest,
  resolveSpriteUrl,
} from '../../../data/spriteManifest'
import type { Fixture } from '../../../types/editor'

const BASE = '/mysekai-planner/'

function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: 1,
    name: 'test',
    pronunciation: 'test',
    assetbundleName: 'test_bundle',
    mysekaiFixtureType: 'normal',
    mysekaiFixtureMainGenreId: 1,
    mysekaiFixtureSubGenreId: 1,
    mysekaiFixtureHandleType: 'none',
    mysekaiSettableLayoutType: 'floor',
    mysekaiSettableSiteType: 'any',
    gridSize: { width: 1, depth: 1, height: 1 },
    ...overrides,
  } as Fixture
}

async function primeManifest(entries: Record<string, unknown>) {
  __resetSpriteManifestCacheForTests()
  const originalFetch = globalThis.fetch
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          version: '1',
          extracted_at: '2026-04-29T00:00:00Z',
          fixtures: entries,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )) as typeof fetch
  try {
    await loadSpriteManifest()
  } finally {
    globalThis.fetch = originalFetch
  }
}

describe('PlacedItem sprite URL resolution (SPRT-07)', () => {
  beforeEach(() => __resetSpriteManifestCacheForTests())

  it('returns thumbnail URL for 3D furniture when thumbnail exists', async () => {
    await primeManifest({
      furniture_bundle: {
        mode: '3d',
        sprite: 'sprites/furniture_bundle.png',
        size_px: [128, 128],
        thumbnails: ['sprites/thumbnails/furniture_bundle_1.png'],
      },
    })
    const fx = makeFixture({
      assetbundleName: 'furniture_bundle',
      mysekaiSettableLayoutType: 'floor',
    })
    expect(resolveSpriteUrl(fx, BASE)).toEqual({
      url: `${BASE}sprites/thumbnails/furniture_bundle_1.png`,
      kind: 'thumbnail',
    })
  })

  it('uses thumbnail for ground items too (rugs/roads/floor_appearance) — top-down extraction looked like seam-puzzle pieces', async () => {
    await primeManifest({
      rug_bundle: {
        mode: '2d',
        sprite: 'sprites/rug_bundle.png',
        size_px: [768, 768],
        thumbnails: ['sprites/thumbnails/rug_bundle_1.png'],
      },
    })
    const rug = makeFixture({
      assetbundleName: 'rug_bundle',
      mysekaiSettableLayoutType: 'rug',
    })
    expect(resolveSpriteUrl(rug, BASE)).toEqual({
      url: `${BASE}sprites/thumbnails/rug_bundle_1.png`,
      kind: 'thumbnail',
    })
  })

  it('falls back to top-down sprite when furniture has no thumbnail', async () => {
    await primeManifest({
      lonely_bundle: {
        mode: '3d',
        sprite: 'sprites/lonely_bundle.png',
        size_px: [128, 128],
        thumbnails: [],
      },
    })
    const fx = makeFixture({ assetbundleName: 'lonely_bundle' })
    expect(resolveSpriteUrl(fx, BASE)).toEqual({
      url: `${BASE}sprites/lonely_bundle.png`,
      kind: 'topdown',
    })
  })

  it('returns null when manifest has no entry for the fixture', async () => {
    await primeManifest({})
    const fx = makeFixture({ assetbundleName: 'unknown_bundle' })
    expect(resolveSpriteUrl(fx, BASE)).toBeNull()
  })
})
