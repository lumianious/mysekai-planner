// ======== 精灵清单类型 ========
// INPUT:  /sprites/manifest.json schema
// OUTPUT: SpriteManifest, SpriteManifestEntry
// POS:    src/types/spriteManifest.ts

export interface SpriteManifestEntry {
  mode: '2d' | '3d'
  sprite: string         // e.g. "sprites/<assetbundleName>.png", BASE_URL-relative
  size_px: [number, number]
  // 45-degree iso catalog thumbnails extracted from `mysekai/thumbnail/fixture/<name>_<variant>`
  // Index aligns with mysekaiFixtureAnotherColors ordering (variant 1 first).
  // Empty array if no thumbnails were extracted (e.g. Wave 2 pilot only ran for some fixtures).
  thumbnails: string[]
}

export interface SpriteManifest {
  version: '1'
  extracted_at: string   // ISO 8601 UTC
  fixtures: Record<string, SpriteManifestEntry>  // key = assetbundleName
}
