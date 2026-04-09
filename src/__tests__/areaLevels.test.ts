// ======== 区域等级配置测试 ========

import { describe, it, expect } from 'vitest'
import { AREA_LEVELS, getGridSize } from '../data/areaLevels'

describe('AREA_LEVELS', () => {
  it('包含所有 5 个等级', () => {
    expect(Object.keys(AREA_LEVELS)).toHaveLength(5)
    expect(AREA_LEVELS[1]).toBeDefined()
    expect(AREA_LEVELS[2]).toBeDefined()
    expect(AREA_LEVELS[3]).toBeDefined()
    expect(AREA_LEVELS[4]).toBeDefined()
    expect(AREA_LEVELS[5]).toBeDefined()
  })

  it('每个等级都有 label', () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(AREA_LEVELS[level].label).toBeTruthy()
    }
  })
})

describe('getGridSize', () => {
  it('等级 1 返回 36x36', () => {
    expect(getGridSize(1)).toEqual({ width: 36, depth: 36 })
  })

  it('等级 2 返回 36x36', () => {
    expect(getGridSize(2)).toEqual({ width: 36, depth: 36 })
  })

  it('等级 3 返回 70x70', () => {
    expect(getGridSize(3)).toEqual({ width: 70, depth: 70 })
  })

  it('等级 4 返回 90x90', () => {
    expect(getGridSize(4)).toEqual({ width: 90, depth: 90 })
  })

  it('等级 5 返回 100x100', () => {
    expect(getGridSize(5)).toEqual({ width: 100, depth: 100 })
  })
})
