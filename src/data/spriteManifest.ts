// ======== 精灵清单加载器 ========
// INPUT:  fetch ${BASE_URL}sprites/manifest.json
// OUTPUT: Map<assetbundleName, SpriteManifestEntry>
// POS:    src/data/spriteManifest.ts

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
