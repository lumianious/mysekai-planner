// ============================================================
// FenceLayer.tsx —— 围栏边渲染层（Phase 02.1）
//
// INPUT:  useEditorStore().placedEdges + fixtureMap（颜色查询）
// OUTPUT: Konva Layer，将每条边绘制为贴在格点线上的细矩形
// POS:    src/components/canvas/FenceLayer.tsx
//
// 渲染层级：GroundLayer 之上，FurnitureLayer 之下
// 不做点击命中（listening=false），v1 暂不支持单条边的选择
// 坐标换算：
//   'h' 边位于格子 (x,y) 的上边 —— 宽 TILE_SIZE，高 FENCE_THICKNESS，
//       y 偏移 -FENCE_THICKNESS/2 使其视觉上居中于格线
//   'v' 边位于格子 (x,y) 的左边 —— 宽 FENCE_THICKNESS，高 TILE_SIZE，
//       x 偏移 -FENCE_THICKNESS/2
// ============================================================

import { Layer, Rect, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import { useEditorStore } from '../../stores/editorStore'
import { TILE_SIZE } from '../../utils/grid'
import { getFixtureColor } from '../../utils/color'
import { getSpriteEntrySync } from '../../data/spriteManifest'
import type { Fixture, PlacedEdge } from '../../types/editor'

const FENCE_THICKNESS = 8
const FALLBACK_COLOR = '#8b5a2b'

interface FenceLayerProps {
  fixtureMap: Map<number, Fixture>
}

// 单条围栏边渲染：使用 entry.sprite（Wave 4 fence-only top-down 重渲染产物）。
// 渲染：sprite 是 256×256 的横向薄条，把它绘到 1 格大小的方块里、跨边线居中，
// 透明部分露出网格，可见的薄条恰好压在边线上。竖直边用 Konva rotation 转 90°。
function FenceEdge({ edge, fixture }: { edge: PlacedEdge; fixture: Fixture | undefined }) {
  const entry = fixture ? getSpriteEntrySync(fixture.assetbundleName) : undefined
  const spriteUrl = entry?.sprite ? `${import.meta.env.BASE_URL}${entry.sprite}` : ''
  const [img, status] = useImage(spriteUrl, 'anonymous')
  const renderSprite = img !== undefined && status === 'loaded'

  if (renderSprite) {
    // sprite 已 crop 到 visible bbox；拉伸到一格长 × FENCE_THICKNESS 厚的薄条，
    // 相邻 edge 共享端点 -> 视觉连续。
    if (edge.orientation === 'h') {
      return (
        <KonvaImage
          image={img}
          x={edge.x * TILE_SIZE}
          y={edge.y * TILE_SIZE - FENCE_THICKNESS / 2}
          width={TILE_SIZE}
          height={FENCE_THICKNESS}
          listening={false}
        />
      )
    }
    // 竖边：以 sprite 中心为支点旋转 90°，把中心放在边线中点
    return (
      <KonvaImage
        image={img}
        x={edge.x * TILE_SIZE}
        y={edge.y * TILE_SIZE + TILE_SIZE / 2}
        width={TILE_SIZE}
        height={FENCE_THICKNESS}
        offsetX={TILE_SIZE / 2}
        offsetY={FENCE_THICKNESS / 2}
        rotation={90}
        listening={false}
      />
    )
  }

  // 回退：纯色细矩形
  const color = fixture
    ? getFixtureColor(fixture.mysekaiFixtureMainGenreId, fixture.colorCode)
    : FALLBACK_COLOR
  if (edge.orientation === 'h') {
    return (
      <Rect
        x={edge.x * TILE_SIZE}
        y={edge.y * TILE_SIZE - FENCE_THICKNESS / 2}
        width={TILE_SIZE}
        height={FENCE_THICKNESS}
        fill={color}
      />
    )
  }
  return (
    <Rect
      x={edge.x * TILE_SIZE - FENCE_THICKNESS / 2}
      y={edge.y * TILE_SIZE}
      width={FENCE_THICKNESS}
      height={TILE_SIZE}
      fill={color}
    />
  )
}

export function FenceLayer({ fixtureMap }: FenceLayerProps) {
  const edges = useEditorStore((s) => s.placedEdges)

  return (
    <Layer listening={false}>
      {Object.values(edges).map((e) => (
        <FenceEdge key={e.id} edge={e} fixture={fixtureMap.get(e.fixtureId)} />
      ))}
    </Layer>
  )
}
