// ======== 网格工具测试 ========

import { describe, it, expect } from 'vitest'
import { snapToGrid, getEffectiveSize, tileKey, isInBounds, TILE_SIZE } from '../utils/grid'
import { getFixtureColor } from '../utils/color'

describe('TILE_SIZE', () => {
  it('值为 32', () => {
    expect(TILE_SIZE).toBe(32)
  })
})

describe('snapToGrid', () => {
  it('对齐到最近的网格点 (47, 63) -> (32, 64)', () => {
    // 47/32=1.47 四舍五入=1 => 32; 63/32=1.97 四舍五入=2 => 64
    expect(snapToGrid({ x: 47, y: 63 }, 32)).toEqual({ x: 32, y: 64 })
  })

  it('已对齐的坐标不变', () => {
    expect(snapToGrid({ x: 64, y: 96 }, 32)).toEqual({ x: 64, y: 96 })
  })

  it('使用默认 TILE_SIZE', () => {
    const result = snapToGrid({ x: 47, y: 63 })
    // 默认 tileSize=32，同上
    expect(result).toEqual({ x: 32, y: 64 })
  })

  it('(0, 0) 不变', () => {
    expect(snapToGrid({ x: 0, y: 0 }, 32)).toEqual({ x: 0, y: 0 })
  })
})

describe('getEffectiveSize', () => {
  const size = { width: 2, depth: 1 }

  it('0 度旋转返回 [2, 1]', () => {
    expect(getEffectiveSize(size, 0)).toEqual([2, 1])
  })

  it('90 度旋转返回 [1, 2]（宽深互换）', () => {
    expect(getEffectiveSize(size, 90)).toEqual([1, 2])
  })

  it('180 度旋转返回 [2, 1]', () => {
    expect(getEffectiveSize(size, 180)).toEqual([2, 1])
  })

  it('270 度旋转返回 [1, 2]（宽深互换）', () => {
    expect(getEffectiveSize(size, 270)).toEqual([1, 2])
  })
})

describe('tileKey', () => {
  it('格式为 "x,y"', () => {
    expect(tileKey(3, 7)).toBe('3,7')
  })

  it('(0, 0) 返回 "0,0"', () => {
    expect(tileKey(0, 0)).toBe('0,0')
  })
})

describe('isInBounds', () => {
  it('(0, 0) 尺寸 2x1 在 36x36 网格内', () => {
    expect(isInBounds(0, 0, 2, 1, 36, 36)).toBe(true)
  })

  it('(35, 35) 尺寸 2x1 超出 36x36 网格边界', () => {
    expect(isInBounds(35, 35, 2, 1, 36, 36)).toBe(false)
  })

  it('(34, 35) 尺寸 2x1 在 36x36 网格内', () => {
    expect(isInBounds(34, 35, 2, 1, 36, 36)).toBe(true)
  })

  it('负坐标超出边界', () => {
    expect(isInBounds(-1, 0, 1, 1, 36, 36)).toBe(false)
  })

  it('恰好填满网格', () => {
    expect(isInBounds(0, 0, 36, 36, 36, 36)).toBe(true)
  })
})

describe('getFixtureColor', () => {
  it('对同一 genreId 返回相同颜色', () => {
    const color1 = getFixtureColor(1)
    const color2 = getFixtureColor(1)
    expect(color1).toBe(color2)
  })

  it('不同 genreId 返回不同颜色', () => {
    const color1 = getFixtureColor(1)
    const color2 = getFixtureColor(2)
    expect(color1).not.toBe(color2)
  })

  it('返回有效的十六进制颜色字符串', () => {
    const color = getFixtureColor(1)
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('提供 colorCode 时优先使用 colorCode', () => {
    expect(getFixtureColor(1, '#ff0000')).toBe('#ff0000')
  })

  it('colorCode 为空字符串时回退到 genreId 颜色', () => {
    const color = getFixtureColor(1, '')
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
