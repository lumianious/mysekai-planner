// ======== spriteManifest 加载器测试 ========
// POS: src/data/__tests__/spriteManifest.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadSpriteManifest,
  getSpriteEntrySync,
  __resetSpriteManifestCacheForTests,
} from '../spriteManifest'

describe('spriteManifest', () => {
  beforeEach(() => __resetSpriteManifestCacheForTests())
  afterEach(() => vi.restoreAllMocks())

  it('returns empty Map on 404 (D-17 graceful fallback)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    )
    const m = await loadSpriteManifest()
    expect(m.size).toBe(0)
    expect(getSpriteEntrySync('anything')).toBeUndefined()
  })

  it('parses manifest entries on 200', async () => {
    const payload = {
      version: '1',
      extracted_at: '2026-04-28T00:00:00Z',
      fixtures: {
        mysekai_fixture_001: {
          mode: '3d',
          sprite: 'sprites/mysekai_fixture_001.png',
          size_px: [128, 128],
        },
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    const m = await loadSpriteManifest()
    expect(m.get('mysekai_fixture_001')?.mode).toBe('3d')
    expect(getSpriteEntrySync('mysekai_fixture_001')?.size_px).toEqual([128, 128])
  })

  it('dedupes concurrent calls (single fetch)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ version: '1', extracted_at: 'x', fixtures: {} }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    await Promise.all([
      loadSpriteManifest(),
      loadSpriteManifest(),
      loadSpriteManifest(),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns empty Map on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const m = await loadSpriteManifest()
    expect(m.size).toBe(0)
  })
})
