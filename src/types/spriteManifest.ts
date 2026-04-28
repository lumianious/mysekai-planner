// ======== 精灵清单类型 ========
// INPUT:  /sprites/manifest.json schema
// OUTPUT: SpriteManifest, SpriteManifestEntry
// POS:    src/types/spriteManifest.ts

export interface SpriteManifestEntry {
  mode: '2d' | '3d'
  sprite: string         // e.g. "sprites/<assetbundleName>.png", BASE_URL-relative
  size_px: [number, number]
}

export interface SpriteManifest {
  version: '1'
  extracted_at: string   // ISO 8601 UTC
  fixtures: Record<string, SpriteManifestEntry>  // key = assetbundleName
}
