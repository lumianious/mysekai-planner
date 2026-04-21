// ======== 蓝图 URL 解码器 ========
// INPUT: URL 哈希中的 "v1.<...>" 字符串
// OUTPUT: 解包后的 PlacedItem/PlacedEdge/areaLevel 切片 或 null
// POS: src/persistence/decodeBlueprint.ts — 纯函数，对恶意输入零崩溃

import { decompressFromEncodedURIComponent } from 'lz-string'
import type { PlacedItem, PlacedEdge, AreaLevel } from '../types/editor'
import {
  BLUEPRINT_VERSION,
  CODE_TO_ROT,
  CODE_TO_LAYER,
  CODE_TO_ORIENT,
  type BlueprintPayload,
} from './encodeBlueprint'

export interface DecodedBlueprint {
  placedItems: Record<string, PlacedItem>
  placedEdges: Record<string, PlacedEdge>
  areaLevel: AreaLevel
}

export function decodeBlueprint(raw: string): DecodedBlueprint | null {
  // ======== 1. 版本前缀网关 ========
  const match = raw.match(/^v(\d+)\.(.+)$/)
  if (!match) return null
  const version = parseInt(match[1], 10)
  if (version !== BLUEPRINT_VERSION) return null

  // ======== 2. lz-string 解压（永不抛异常）========
  let json: string | null
  try {
    json = decompressFromEncodedURIComponent(match[2])
  } catch {
    return null
  }
  if (!json) return null

  // ======== 3. JSON 反序列化 ========
  let parsed: BlueprintPayload
  try {
    parsed = JSON.parse(json) as BlueprintPayload
  } catch {
    return null
  }

  // ======== 4. 形状校验 ========
  if (!parsed || parsed.v !== BLUEPRINT_VERSION) return null
  if (!Array.isArray(parsed.i) || !Array.isArray(parsed.e)) return null
  if (typeof parsed.a !== 'number' || parsed.a < 1 || parsed.a > 5) return null

  // ======== 5. 元组解码 ========
  // 为每个放置物合成新 UUID —— 见 encodeBlueprint.ts ID 策略注释
  const placedItems: Record<string, PlacedItem> = {}
  for (const ci of parsed.i) {
    // 元组形状: [f, x, y, packed]  packed = r<<2 | l<<1 | s
    if (!Array.isArray(ci) || ci.length !== 4) return null
    const [f, x, y, packed] = ci
    if (
      typeof f !== 'number' ||
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof packed !== 'number'
    ) return null
    const r = ((packed >> 2) & 0b11) as 0 | 1 | 2 | 3
    const l = ((packed >> 1) & 0b1) as 0 | 1
    const s = (packed & 0b1) as 0 | 1
    const rotation = CODE_TO_ROT[r]
    const layer = CODE_TO_LAYER[l]
    if (rotation === undefined || layer === undefined) return null
    const id = crypto.randomUUID()
    placedItems[id] = {
      id,
      fixtureId: f,
      x,
      y,
      rotation,
      layer,
      isSystem: s === 1,
    }
  }

  const placedEdges: Record<string, PlacedEdge> = {}
  for (const ce of parsed.e) {
    // 元组形状: [f, x, y, o]
    if (!Array.isArray(ce) || ce.length !== 4) return null
    const [f, x, y, o] = ce
    if (
      typeof f !== 'number' ||
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof o !== 'number'
    ) return null
    const orientation = CODE_TO_ORIENT[o as 0 | 1]
    if (orientation === undefined) return null
    const id = crypto.randomUUID()
    placedEdges[id] = {
      id,
      fixtureId: f,
      x,
      y,
      orientation,
    }
  }

  return {
    placedItems,
    placedEdges,
    areaLevel: parsed.a as AreaLevel,
  }
}
