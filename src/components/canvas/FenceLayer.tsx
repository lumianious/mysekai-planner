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

import { Layer, Rect } from 'react-konva'
import { useEditorStore } from '../../stores/editorStore'
import { TILE_SIZE } from '../../utils/grid'
import { getFixtureColor } from '../../utils/color'
import type { Fixture } from '../../types/editor'

const FENCE_THICKNESS = 6
const FALLBACK_COLOR = '#8b5a2b'

interface FenceLayerProps {
  fixtureMap: Map<number, Fixture>
}

export function FenceLayer({ fixtureMap }: FenceLayerProps) {
  const edges = useEditorStore((s) => s.placedEdges)

  return (
    <Layer listening={false}>
      {Object.values(edges).map((e) => {
        const fixture = fixtureMap.get(e.fixtureId)
        const color = fixture
          ? getFixtureColor(fixture.mysekaiFixtureMainGenreId, fixture.colorCode)
          : FALLBACK_COLOR

        if (e.orientation === 'h') {
          return (
            <Rect
              key={e.id}
              x={e.x * TILE_SIZE}
              y={e.y * TILE_SIZE - FENCE_THICKNESS / 2}
              width={TILE_SIZE}
              height={FENCE_THICKNESS}
              fill={color}
            />
          )
        }
        return (
          <Rect
            key={e.id}
            x={e.x * TILE_SIZE - FENCE_THICKNESS / 2}
            y={e.y * TILE_SIZE}
            width={FENCE_THICKNESS}
            height={TILE_SIZE}
            fill={color}
          />
        )
      })}
    </Layer>
  )
}
