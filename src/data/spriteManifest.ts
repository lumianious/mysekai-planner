// ======== 精灵清单加载器 ========
// INPUT:  fetch ${BASE_URL}sprites/manifest.json
// OUTPUT: Map<assetbundleName, SpriteManifestEntry> + resolveSpriteUrl helper
// POS:    src/data/spriteManifest.ts

import type { Fixture } from '../types/editor'
import type { SpriteManifest, SpriteManifestEntry } from '../types/spriteManifest'

let cache: Map<string, SpriteManifestEntry> | null = null
let inflight: Promise<Map<string, SpriteManifestEntry>> | null = null

export async function loadSpriteManifest(): Promise<Map<string, SpriteManifestEntry>> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}sprites/manifest.json`)
      if (!res.ok) {
        // 404 在开发期是常态 —— D-17 优雅回退，PlacedItem 全部走矩形分支
        cache = new Map()
        return cache
      }
      const json = (await res.json()) as SpriteManifest
      cache = new Map(Object.entries(json.fixtures))
      return cache
    } catch {
      // 网络错误也走回退（D-17）
      cache = new Map()
      return cache
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export function getSpriteEntrySync(assetbundleName: string): SpriteManifestEntry | undefined {
  return cache?.get(assetbundleName)
}

// 仅供测试使用：重置模块级缓存
export function __resetSpriteManifestCacheForTests(): void {
  cache = null
  inflight = null
}

// ======== URL 解析（PlacedItem / FenceLayer / 测试共享） ========
// 决策：默认使用去背后的 iso 缩略图（HID 风格）。
// FenceLayer 走 'topdown' 偏好——围栏从上面看就是一根细线，iso 视觉看起来不对。
// 若所选项不存在则回退到另一种；都没有时返回 null（PlacedItem 走彩色矩形回退）。
export type SpriteUrlKind = 'thumbnail' | 'topdown'
export interface ResolvedSprite {
  url: string
  kind: SpriteUrlKind
}

export function resolveSpriteUrl(
  fixture: Fixture,
  baseUrl: string,
  preference: SpriteUrlKind = 'thumbnail',
): ResolvedSprite | null {
  const entry = getSpriteEntrySync(fixture.assetbundleName)
  if (!entry) return null
  const thumb = entry.thumbnails[0]
  if (preference === 'topdown') {
    if (entry.sprite) return { url: `${baseUrl}${entry.sprite}`, kind: 'topdown' }
    if (thumb) return { url: `${baseUrl}${thumb}`, kind: 'thumbnail' }
    return null
  }
  // 默认 thumbnail 偏好
  if (thumb) return { url: `${baseUrl}${thumb}`, kind: 'thumbnail' }
  if (entry.sprite) return { url: `${baseUrl}${entry.sprite}`, kind: 'topdown' }
  return null
}
