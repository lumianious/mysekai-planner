// ======== URL 分享版本网关测试 (PERS-05) ========
// INPUT: 各种病态 / 错误版本 / 空载荷字符串
// OUTPUT: decodeBlueprint 永不抛异常，统一返回 null
// POS: src/__tests__/urlShareVersioning.test.ts — Wave 0 RED 契约

import { describe, it, expect } from 'vitest'
import { compressToEncodedURIComponent } from 'lz-string'
import { encodeBlueprint } from '../persistence/encodeBlueprint'
import { decodeBlueprint } from '../persistence/decodeBlueprint'

describe('decodeBlueprint version gate (PERS-05)', () => {
  it('returns null for empty string', () => {
    expect(decodeBlueprint('')).toBeNull()
  })

  it('returns null for garbage without version prefix', () => {
    expect(decodeBlueprint('garbage-no-prefix')).toBeNull()
  })

  it('returns null for future version v2', () => {
    // 解码器必须在解压前就根据版本号拒绝，避免对未知版本做任何猜测
    expect(decodeBlueprint('v2.abc')).toBeNull()
  })

  it('returns null for v1 with empty payload', () => {
    expect(decodeBlueprint('v1.')).toBeNull()
  })

  it('returns null and does not throw on invalid lz-string body', () => {
    // 手工构造的 v1 前缀 + 无效 lz-string 不应让解码器崩溃
    expect(() => decodeBlueprint('v1.notvalidlzstring!!!')).not.toThrow()
    expect(decodeBlueprint('v1.notvalidlzstring!!!')).toBeNull()
  })

  it('returns null for v1 with valid lz-string but non-JSON body', () => {
    // 合法的 lz-string 压缩，但解压得到非 JSON 字符串 —— 测试 JSON.parse 失败路径
    const bogus = `v1.${compressToEncodedURIComponent('hello-not-json')}`
    expect(decodeBlueprint(bogus)).toBeNull()
  })

  it('successfully decodes an encoded v1 payload with v === 1 field', () => {
    const encoded = encodeBlueprint({
      placedItems: {},
      placedEdges: {},
      areaLevel: 1,
    })
    const decoded = decodeBlueprint(encoded)
    expect(decoded).not.toBeNull()
    // 外壳返回的 DecodedBlueprint 虽然不暴露 v 字段，
    // 但能成功解码说明内层 v === 1 校验已通过
    expect(decoded!.areaLevel).toBe(1)
  })

  it('rejects shape violations (i or e not array)', () => {
    const badShape = `v1.${compressToEncodedURIComponent(
      JSON.stringify({ v: 1, a: 1, i: 'not-array', e: [] }),
    )}`
    expect(decodeBlueprint(badShape)).toBeNull()
  })

  it('rejects out-of-range areaLevel', () => {
    const badArea = `v1.${compressToEncodedURIComponent(
      JSON.stringify({ v: 1, a: 99, i: [], e: [] }),
    )}`
    expect(decodeBlueprint(badArea)).toBeNull()
  })
})
