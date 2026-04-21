// ======== URL 分享长度预算测试 (D-05 / PERS-03) ========
// INPUT: 合成 200 items + 500 edges 的最坏场景蓝图
// OUTPUT: 压缩后字符串 < 4000 字符 (Twitter 预算)
// POS: src/__tests__/urlShareSizeBudget.test.ts — Wave 0 RED 契约

import { describe, it, expect } from 'vitest'
import { encodeBlueprint } from '../persistence/encodeBlueprint'
import type { PlacedItem, PlacedEdge } from '../types/editor'

describe('URL blueprint size budget (D-05)', () => {
  it('200 items + 500 edges encoded URL stays under 4000 chars', () => {
    // ======== 构造最坏场景切片 ========
    const items: Record<string, PlacedItem> = {}
    for (let i = 0; i < 200; i++) {
      const id = crypto.randomUUID()
      items[id] = {
        id,
        fixtureId: 1000 + (i % 50),
        x: i % 36,
        y: Math.floor(i / 36) % 36,
        rotation: ([0, 90, 180, 270] as const)[i % 4],
        layer: i % 3 === 0 ? 'ground' : 'furniture',
        isSystem: false,
      }
    }
    const edges: Record<string, PlacedEdge> = {}
    for (let i = 0; i < 500; i++) {
      const id = crypto.randomUUID()
      edges[id] = {
        id,
        fixtureId: 2000 + (i % 7),
        x: i % 37,
        y: Math.floor(i / 37) % 37,
        orientation: i % 2 === 0 ? 'h' : 'v',
      }
    }

    const encoded = encodeBlueprint({
      placedItems: items,
      placedEdges: edges,
      areaLevel: 5,
    })

    // 记录实际长度供人工审视 (测试仍应通过)
    // eslint-disable-next-line no-console
    console.info(`[size-budget] 200 items + 500 edges -> ${encoded.length} chars`)

    expect(encoded.length).toBeLessThan(4000)
  })
})
