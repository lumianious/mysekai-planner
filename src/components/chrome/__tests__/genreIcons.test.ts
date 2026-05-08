// ======== genreIcons.test — Phase 9 CATL-09 ========
// INPUT: assetbundleName 字符串（含 14 curated outdoor mainGenres + 'icon_all' + unknown）
// OUTPUT: 验证 getGenreIcon 返回 lucide 组件
// POS: src/components/chrome/__tests__/genreIcons.test.ts — CATL-09 单元测试（09-01 GREEN）

import { describe, it, expect } from 'vitest'
import {
  Cat,
  Sofa,
  Lamp,
  Box,
  TreePine,
  Frame,
  Grid2x2,
  Square,
  Image,
  Fence,
  Route,
  Palette,
  Trees,
  MoreHorizontal,
  Grid3x3,
} from 'lucide-react'
import { getGenreIcon } from '../genreIcons'

describe('getGenreIcon (CATL-09)', () => {
  it("'icon_normal_furniture' → Sofa", () => {
    expect(getGenreIcon('icon_normal_furniture')).toBe(Sofa)
  })

  it("'icon_stuffed_toy' → Cat", () => {
    expect(getGenreIcon('icon_stuffed_toy')).toBe(Cat)
  })

  it("'icon_all' → Grid3x3", () => {
    expect(getGenreIcon('icon_all')).toBe(Grid3x3)
  })

  it('unknown bundle falls back to MoreHorizontal (forward-compat)', () => {
    expect(getGenreIcon('icon_unknown_future_genre')).toBe(MoreHorizontal)
  })

  it('every curated outdoor bundle + icon_all resolves to a defined component', () => {
    const expectedMap: Record<string, unknown> = {
      icon_all: Grid3x3,
      icon_stuffed_toy: Cat,
      icon_normal_furniture: Sofa,
      icon_small_furniture: Lamp,
      icon_block: Box,
      icon_plant: TreePine,
      icon_wall_furniture: Frame,
      icon_road_color: Grid2x2,
      icon_rug: Square,
      icon_custom_furniture: Image,
      icon_fence: Fence,
      icon_road: Route,
      icon_canvas: Palette,
      icon_outside: Trees,
      icon_others: MoreHorizontal,
    }
    for (const [bundle, expected] of Object.entries(expectedMap)) {
      const got = getGenreIcon(bundle)
      expect(got).toBeDefined()
      expect(got).toBe(expected)
    }
  })
})
