// ======== PlacedItem 回退渲染测试（D-17）========
// POS: src/components/canvas/__tests__/PlacedItem.fallback.test.tsx
//
// PlacedItem 在没有 sprite manifest 命中时回退到彩色矩形（D-17）。
// 当前 PlacedItem 始终渲染矩形——本测试今天就应通过；
// Wave 4 加 sprite 分支后仍应通过：manifest 为空 -> getSpriteEntrySync 返回 undefined
// -> PlacedItem 走 <Rect> 分支。
//
// 注：jsdom 环境下 Konva Stage 不能渲染到真 canvas（HTMLCanvasElement.getContext
// 返回 null），所以这里测试的是回退**契约**——getSpriteEntrySync 在 manifest miss
// 时返回 undefined——而不是 Konva 渲染本身。Wave 4 的视觉验证留给 manual checklist。

import { describe, it, expect, beforeEach } from 'vitest'
import {
  __resetSpriteManifestCacheForTests,
  getSpriteEntrySync,
  loadSpriteManifest,
} from '../../../data/spriteManifest'

describe('PlacedItem fallback (D-17)', () => {
  beforeEach(() => __resetSpriteManifestCacheForTests())

  it('getSpriteEntrySync returns undefined before manifest loads (PlacedItem will render <Rect>)', () => {
    expect(getSpriteEntrySync('any_bundle')).toBeUndefined()
  })

  it('getSpriteEntrySync returns undefined for unknown bundle after empty manifest loads', async () => {
    // 模拟生产首发：manifest.json 不存在 -> 加载器返回空 Map
    const originalFetch = globalThis.fetch
    globalThis.fetch = (() =>
      Promise.resolve(new Response(null, { status: 404 }))) as typeof fetch
    try {
      const m = await loadSpriteManifest()
      expect(m.size).toBe(0)
      expect(getSpriteEntrySync('mysekai_fixture_unknown')).toBeUndefined()
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
