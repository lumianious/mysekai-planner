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

  // ID 策略说明：编码器不序列化 UUID（见 encodeBlueprint.ts）。
  // 解码时合成新 UUID，record 键改变；字段级内容（fixtureId/x/y/rotation/layer/isSystem/orientation）完整保留。
  // applyBlueprint 会清空 temporal 历史，因此 id 连续性本就在导入边界被打断。

  it('roundtrips all PlacedItem fields (except id, which is regenerated)', () => {
    const encoded = encodeBlueprint({ placedItems: items, placedEdges: edges, areaLevel })
    const decoded = decodeBlueprint(encoded)
    expect(decoded).not.toBeNull()
    const decodedItems = Object.values(decoded!.placedItems)
    expect(decodedItems).toHaveLength(2)
    // 字段级匹配：剥离 id 后其余字段必须精确相等
    const stripId = (it: PlacedItem) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...rest } = it
      return rest
    }
    const expected = Object.values(items).map(stripId).sort((a, b) => a.fixtureId - b.fixtureId)
    const actual = decodedItems.map(stripId).sort((a, b) => a.fixtureId - b.fixtureId)
    expect(actual).toEqual(expected)
    // 每个合成 id 都是合法非空字符串
    expect(decodedItems.every((d) => typeof d.id === 'string' && d.id.length > 0)).toBe(true)
  })

  it('roundtrips PlacedEdge with orientation v', () => {
    const encoded = encodeBlueprint({ placedItems: items, placedEdges: edges, areaLevel })
    const decoded = decodeBlueprint(encoded)
    expect(decoded).not.toBeNull()
    const decodedEdges = Object.values(decoded!.placedEdges)
    expect(decodedEdges).toHaveLength(1)
    const e0 = decodedEdges[0]
    expect(e0.fixtureId).toBe(777)
    expect(e0.x).toBe(10)
    expect(e0.y).toBe(2)
    expect(e0.orientation).toBe('v')
    expect(typeof e0.id).toBe('string')
    expect(e0.id.length).toBeGreaterThan(0)
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

  it('encoded string contains only URL-safe characters (lz-string alphabet)', () => {
    const encoded = encodeBlueprint({ placedItems: items, placedEdges: edges, areaLevel })
    // compressToEncodedURIComponent 的 URI 安全字母表: A-Z a-z 0-9 $ - + *
    // 加上前缀 "v1." 的点号
    // 断言不含 / = # ? & 空白等需要额外转义的字符
    expect(encoded).not.toMatch(/[/=#?&\s]/)
    // 整体只包含 lz-string 安全字母表 + 前缀字符
    expect(encoded).toMatch(/^v\d+\.[A-Za-z0-9$\-+*]+$/)
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
    // 用 fixtureId 作为稳定身份检索（id 已被重新合成）
    const decodedByFixture = new Map<number, PlacedItem>()
    for (const it of Object.values(decoded!.placedItems)) decodedByFixture.set(it.fixtureId, it)
    rots.forEach((r, i) => {
      expect(decodedByFixture.get(100 + i)?.rotation).toBe(r)
    })
  })
})
