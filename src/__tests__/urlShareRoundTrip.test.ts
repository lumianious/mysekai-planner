// ======== URL 分享往返测试 (PERS-05) ========
// INPUT: 合成 placedItems/placedEdges/areaLevel 切片
// OUTPUT: 验证 encodeBlueprint -> decodeBlueprint 完美保真 + 版本前缀 + URL 安全字符
// POS: src/__tests__/urlShareRoundTrip.test.ts — Wave 0 RED 契约

import { describe, it, expect } from 'vitest'
import { encodeBlueprint } from '../persistence/encodeBlueprint'
import { decodeBlueprint } from '../persistence/decodeBlueprint'
import type { PlacedItem, PlacedEdge, AreaLevel } from '../types/editor'

describe('encodeBlueprint / decodeBlueprint roundtrip (PERS-05)', () => {
  // ======== 固定样本 ========
  // 覆盖 rotation=270、layer='ground'、orientation='v' 三个枚举尾值，
  // 确保编解码不会丢失非默认值。
  const items: Record<string, PlacedItem> = {
    item1: {
      id: 'item1',
      fixtureId: 1234,
      x: 5,
      y: 7,
      rotation: 0,
      layer: 'furniture',
      isSystem: true,
    },
    item2: {
      id: 'item2',
      fixtureId: 5678,
      x: 12,
      y: 3,
      rotation: 270,
      layer: 'ground',
      isSystem: false,
    },
  }
  const edges: Record<string, PlacedEdge> = {
    edge1: {
      id: 'edge1',
      fixtureId: 777,
      x: 10,
      y: 2,
      orientation: 'v',
    },
  }
  const areaLevel: AreaLevel = 2

  it('roundtrips all PlacedItem fields exactly', () => {
    const encoded = encodeBlueprint({ placedItems: items, placedEdges: edges, areaLevel })
    const decoded = decodeBlueprint(encoded)
    expect(decoded).not.toBeNull()
    const decodedItems = decoded!.placedItems
    expect(Object.keys(decodedItems).sort()).toEqual(['item1', 'item2'])
    expect(decodedItems.item1).toEqual(items.item1)
    expect(decodedItems.item2).toEqual(items.item2)
  })

  it('roundtrips PlacedEdge with orientation v', () => {
    const encoded = encodeBlueprint({ placedItems: items, placedEdges: edges, areaLevel })
    const decoded = decodeBlueprint(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.placedEdges.edge1).toEqual(edges.edge1)
  })

  it('roundtrips areaLevel', () => {
    const encoded = encodeBlueprint({ placedItems: items, placedEdges: edges, areaLevel })
    const decoded = decodeBlueprint(encoded)
    expect(decoded!.areaLevel).toBe(2)
  })

  it('encoded string starts with literal "v1." version prefix', () => {
    const encoded = encodeBlueprint({ placedItems: items, placedEdges: edges, areaLevel })
    expect(encoded.startsWith('v1.')).toBe(true)
  })

  it('encoded string contains only URL-safe characters', () => {
    const encoded = encodeBlueprint({ placedItems: items, placedEdges: edges, areaLevel })
    // compressToEncodedURIComponent 使用的字母表: A-Z a-z 0-9 + - 和 $ *
    // 断言没有 +、/、=、#、?、&、空白等需转义字符
    expect(encoded).not.toMatch(/[+/=#?&\s]/)
  })

  it('roundtrips empty slices', () => {
    const encoded = encodeBlueprint({ placedItems: {}, placedEdges: {}, areaLevel: 1 })
    const decoded = decodeBlueprint(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.placedItems).toEqual({})
    expect(decoded!.placedEdges).toEqual({})
    expect(decoded!.areaLevel).toBe(1)
  })

  it('covers all rotation enum values', () => {
    const rots: Array<PlacedItem['rotation']> = [0, 90, 180, 270]
    const slice: Record<string, PlacedItem> = {}
    rots.forEach((r, i) => {
      const id = `r${i}`
      slice[id] = {
        id,
        fixtureId: 100 + i,
        x: i,
        y: i,
        rotation: r,
        layer: 'furniture',
        isSystem: false,
      }
    })
    const encoded = encodeBlueprint({ placedItems: slice, placedEdges: {}, areaLevel: 3 })
    const decoded = decodeBlueprint(encoded)
    expect(decoded).not.toBeNull()
    rots.forEach((r, i) => {
      expect(decoded!.placedItems[`r${i}`].rotation).toBe(r)
    })
  })
})
