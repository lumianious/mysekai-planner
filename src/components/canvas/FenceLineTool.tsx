// ======== 围栏线工具鬼影图层 ========
// INPUT: start / end 格子坐标，fixture（取 gridSize 决定步长/足迹），fixtureMap（层占用）
// OUTPUT: Konva Layer，将 rasterizeLine 产生的每个 tile 渲染为半透明预览矩形
//         —— 绿色表示可放置，红色表示被占用/越界
// POS: src/components/canvas/FenceLineTool.tsx — 围栏 picking-end / confirming 阶段鬼影
//
// 设计要点：
//   1. 传入的 start/end 已由 EditorCanvas 预吸附到 step-space（`Math.floor(g/step)*step`）
//   2. 根据 fixture.gridSize.width 作为 rasterize step 步长；v1 所有围栏均为 2
//   3. 在渲染阶段按 ground 层构造占用图，逐 tile 判定颜色
//   4. Layer listening={false}：鬼影不拦截指针事件

import { Layer, Rect } from 'react-konva'
import { rasterizeLine } from '../../utils/rasterize'
import { TILE_SIZE } from '../../utils/grid'
import {
  buildOccupancyGrid,
  checkCanPlace,
  useEditorStore,
} from '../../stores/editorStore'
import type { Fixture } from '../../types/editor'

const VALID_COLOR = '#22c55e'
const BLOCKED_COLOR = '#ef4444'
const GHOST_OPACITY = 0.4

interface FenceLineToolProps {
  start: { x: number; y: number } | null
  end: { x: number; y: number } | null
  fixture: Fixture
  fixtureMap: Map<number, Fixture>
}

export function FenceLineTool({
  start,
  end,
  fixture,
  fixtureMap,
}: FenceLineToolProps) {
  const placedItems = useEditorStore((s) => s.placedItems)
  const gridSize = useEditorStore((s) => s.gridSize)

  if (!start || !end) return <Layer listening={false} />

  const step = fixture.gridSize.width
  const depth = fixture.gridSize.depth
  const tiles = rasterizeLine(start.x, start.y, end.x, end.y, step)
  const groundOcc = buildOccupancyGrid(placedItems, fixtureMap, 'ground')

  return (
    <Layer listening={false}>
      {tiles.map((t, i) => {
        const canPlace = checkCanPlace(
          groundOcc,
          t.x,
          t.y,
          step,
          depth,
          gridSize.width,
          gridSize.depth,
        )
        const color = canPlace ? VALID_COLOR : BLOCKED_COLOR
        return (
          <Rect
            key={`${t.x},${t.y},${i}`}
            x={t.x * TILE_SIZE}
            y={t.y * TILE_SIZE}
            width={step * TILE_SIZE}
            height={depth * TILE_SIZE}
            fill={color}
            stroke={color}
            strokeWidth={1}
            opacity={GHOST_OPACITY}
            cornerRadius={2}
          />
        )
      })}
    </Layer>
  )
}
