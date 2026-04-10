// ======== 线栅格化测试 ========
// INPUT: 各种起止坐标 + 步长
// OUTPUT: 验证 rasterizeLine + snapToAxis 产生正确的格子序列
// POS: src/__tests__/lineRasterize.test.ts — Phase 2 ROAD-01 / ROAD-03 rasterizer

import { describe, it, expect } from 'vitest'
import { rasterizeLine, snapToAxis } from '../utils/rasterize'

describe('rasterizeLine', () => {
  it('horizontal line step=2 from (0,0) to (4,0) yields [(0,0),(2,0),(4,0)]', () => {
    expect(rasterizeLine(0, 0, 4, 0, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 4, y: 0 },
    ])
  })

  it('vertical line step=2 from (0,0) to (0,6) yields 4 tiles', () => {
    expect(rasterizeLine(0, 0, 0, 6, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 0, y: 4 },
      { x: 0, y: 6 },
    ])
  })

  it('degenerate same-tile returns single point', () => {
    expect(rasterizeLine(5, 5, 5, 5, 2)).toEqual([{ x: 5, y: 5 }])
  })

  it('step=1 from (0,0) to (4,0) yields 5 tiles', () => {
    expect(rasterizeLine(0, 0, 4, 0, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ])
  })

  it('diagonal (0,0)->(6,4) step=2 has no gaps (4-connected)', () => {
    const tiles = rasterizeLine(0, 0, 6, 4, 2)
    // 起止点都出现
    expect(tiles[0]).toEqual({ x: 0, y: 0 })
    expect(tiles[tiles.length - 1]).toEqual({ x: 6, y: 4 })
    // 每一步只改变 x 或 y 之一（4 连通）
    for (let i = 1; i < tiles.length; i++) {
      const dx = Math.abs(tiles[i].x - tiles[i - 1].x)
      const dy = Math.abs(tiles[i].y - tiles[i - 1].y)
      expect(dx + dy).toBe(2) // 步长 2，仅改变一个轴
    }
  })

  it('reverse direction works (6,4)->(0,0)', () => {
    const tiles = rasterizeLine(6, 4, 0, 0, 2)
    expect(tiles[0]).toEqual({ x: 6, y: 4 })
    expect(tiles[tiles.length - 1]).toEqual({ x: 0, y: 0 })
  })

  it('throws on step <= 0', () => {
    expect(() => rasterizeLine(0, 0, 4, 0, 0)).toThrow()
  })
})

describe('snapToAxis', () => {
  it('vertical when dy > dx', () => {
    expect(snapToAxis(1, 1, 1, 5)).toEqual({ x: 1, y: 5 })
    expect(snapToAxis(2, 2, 3, 10)).toEqual({ x: 2, y: 10 })
  })

  it('horizontal when dx > dy', () => {
    expect(snapToAxis(1, 1, 5, 2)).toEqual({ x: 5, y: 1 })
    expect(snapToAxis(0, 0, 10, 3)).toEqual({ x: 10, y: 0 })
  })

  it('horizontal when dx == dy (tie-break)', () => {
    expect(snapToAxis(1, 1, 3, 3)).toEqual({ x: 3, y: 1 })
  })

  it('handles negative deltas', () => {
    expect(snapToAxis(5, 5, 5, 1)).toEqual({ x: 5, y: 1 }) // vertical
    expect(snapToAxis(5, 5, 1, 5)).toEqual({ x: 1, y: 5 }) // horizontal
  })
})
