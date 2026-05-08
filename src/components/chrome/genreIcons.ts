// ======== genreIcons — Phase 9 类型→图标映射 ========
// INPUT: assetbundleName 字符串（来自 mysekaiFixtureMainGenres.json 或 ALL_ENTRY 哨兵 'icon_all'）
// OUTPUT: lucide-react 组件类型（默认 MoreHorizontal）
// POS: src/components/chrome/genreIcons.ts — 仅 lucide 路径（CDN 路径未确认，跳过）

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
import type React from 'react'

const ICON_BY_BUNDLE: Record<string, React.ElementType> = {
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

export function getGenreIcon(assetbundleName: string): React.ElementType {
  return ICON_BY_BUNDLE[assetbundleName] ?? MoreHorizontal
}
