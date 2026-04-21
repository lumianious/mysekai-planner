// ======== 蓝图 URL 编码器 ========
// INPUT: { placedItems, placedEdges, areaLevel } 切片
// OUTPUT: "v1.<lz-string-url-safe>" 字符串
// POS: src/persistence/encodeBlueprint.ts — 纯函数，无 React 无 store

import { compressToEncodedURIComponent } from 'lz-string'
import type {
  PlacedItem,
  PlacedEdge,
  AreaLevel,
  Rotation,
  ItemLayer,
  EdgeOrientation,
} from '../types/editor'

export const BLUEPRINT_VERSION = 1

// ======== 元组编码 + 整数枚举 + 位打包 ========
// 设计依据：D-05 URL 长度预算 (Twitter < 4000)
//
// 元组格式（消除 JSON 字段名开销）：
//   item:  [f, x, y, packed]
//          packed = (rotation << 2) | (layer << 1) | isSystem
//            rotation: 0/1/2/3 对应 0°/90°/180°/270° （2 位）
//            layer:    0='furniture', 1='ground'            （1 位）
//            isSystem: 0/1                                    （1 位）
//   edge:  [f, x, y, o]
//          o: 0='h', 1='v'
//
// ID 策略：不序列化 UUID。
// UUID 为高熵数据 lz-string 无法压缩（测试中 700 UUIDs ~= 25KB 裸字节）。
// applyBlueprint 会清空 temporal 历史，因此 id 连续性本就在导入边界被打断。
// 解码时在 record 键中合成新 UUID，放置物的相对顺序/坐标/类型完全保真。
export type CompactItemTuple = [number, number, number, number]
export type CompactEdgeTuple = [number, number, number, number]

export interface BlueprintPayload {
  v: number
  a: AreaLevel
  i: CompactItemTuple[]
  e: CompactEdgeTuple[]
}

// ======== 正向映射表 (encode) ========
const ROT_TO_CODE: Record<Rotation, 0 | 1 | 2 | 3> = { 0: 0, 90: 1, 180: 2, 270: 3 }
const LAYER_TO_CODE: Record<ItemLayer, 0 | 1> = { furniture: 0, ground: 1 }
const ORIENT_TO_CODE: Record<EdgeOrientation, 0 | 1> = { h: 0, v: 1 }

// ======== 反向映射表 (供 decodeBlueprint 复用，避免常量重复) ========
export const CODE_TO_ROT: Record<0 | 1 | 2 | 3, Rotation> = { 0: 0, 1: 90, 2: 180, 3: 270 }
export const CODE_TO_LAYER: Record<0 | 1, ItemLayer> = { 0: 'furniture', 1: 'ground' }
export const CODE_TO_ORIENT: Record<0 | 1, EdgeOrientation> = { 0: 'h', 1: 'v' }

export function encodeBlueprint(slice: {
  placedItems: Record<string, PlacedItem>
  placedEdges: Record<string, PlacedEdge>
  areaLevel: AreaLevel
}): string {
  const i: CompactItemTuple[] = Object.values(slice.placedItems).map((it) => {
    const r = ROT_TO_CODE[it.rotation]
    const l = LAYER_TO_CODE[it.layer]
    const s = it.isSystem ? 1 : 0
    // 位打包：rotation(2) | layer(1) | isSystem(1) → 4 位 (0-15)
    const packed = (r << 2) | (l << 1) | s
    return [it.fixtureId, it.x, it.y, packed]
  })
  const e: CompactEdgeTuple[] = Object.values(slice.placedEdges).map((ed) => [
    ed.fixtureId,
    ed.x,
    ed.y,
    ORIENT_TO_CODE[ed.orientation],
  ])
  const payload: BlueprintPayload = {
    v: BLUEPRINT_VERSION,
    a: slice.areaLevel,
    i,
    e,
  }
  return `v${BLUEPRINT_VERSION}.${compressToEncodedURIComponent(JSON.stringify(payload))}`
}
