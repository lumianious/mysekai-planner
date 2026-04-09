// ======== 鬼影预览组件 ========
// INPUT: fixtureMap, stageScale, mouseGridPos
// OUTPUT: 半透明 Konva Layer（仅在 stamp 模式 + activeFixtureId 时渲染）
// POS: src/components/canvas/GhostPreview.tsx — 放置预览，跟随光标显示物品占位

import { Layer, Rect, Text } from 'react-konva'
import { useEditorStore } from '../../stores/editorStore'
import { TILE_SIZE } from '../../utils/grid'
import { checkGhostValidity } from '../../utils/ghostPreview'
import { getItemLayer } from '../../data/fixtures'
import type { Fixture } from '../../types/editor'

// ======== 颜色常量 ========

const VALID_COLOR = '#22c55e'   // 绿色 — 可放置
const BLOCKED_COLOR = '#ef4444' // 红色 — 已占用/越界
const GHOST_OPACITY = 0.35

interface GhostPreviewProps {
  fixtureMap: Map<number, Fixture>
  stageScale: number
  mouseGridPos: { x: number; y: number } | null
}

export function GhostPreview({
  fixtureMap,
  stageScale: _stageScale,
  mouseGridPos,
}: GhostPreviewProps) {
  const toolMode = useEditorStore((s) => s.toolMode)
  const activeFixtureId = useEditorStore((s) => s.activeFixtureId)
  const gridSize = useEditorStore((s) => s.gridSize)
  const placedItems = useEditorStore((s) => s.placedItems)
  const overwriteEnabled = useEditorStore((s) => s.overwriteEnabled)
  const previewRotation = useEditorStore((s) => s.previewRotation)

  // 只在 stamp 模式且有选中家具时渲染
  if (toolMode !== 'stamp' || activeFixtureId === null || !mouseGridPos) {
    return <Layer listening={false} />
  }

  const fixture = fixtureMap.get(activeFixtureId)
  if (!fixture) {
    return <Layer listening={false} />
  }

  const layer = getItemLayer(fixture)

  const result = checkGhostValidity(
    mouseGridPos.x,
    mouseGridPos.y,
    fixture,
    previewRotation,
    layer,
    placedItems,
    fixtureMap,
    gridSize,
    overwriteEnabled,
  )

  const color = result.valid ? VALID_COLOR : BLOCKED_COLOR
  const pixelWidth = result.effectiveWidth * TILE_SIZE
  const pixelHeight = result.effectiveDepth * TILE_SIZE

  return (
    <Layer listening={false}>
      <Rect
        x={mouseGridPos.x * TILE_SIZE}
        y={mouseGridPos.y * TILE_SIZE}
        width={pixelWidth}
        height={pixelHeight}
        fill={color}
        stroke={color}
        strokeWidth={1}
        opacity={GHOST_OPACITY}
        cornerRadius={2}
      />
      <Text
        x={mouseGridPos.x * TILE_SIZE}
        y={mouseGridPos.y * TILE_SIZE}
        width={pixelWidth}
        height={pixelHeight}
        text={fixture.name}
        fontSize={12}
        fill="white"
        align="center"
        verticalAlign="middle"
        wrap="none"
        ellipsis={true}
        listening={false}
        opacity={GHOST_OPACITY + 0.3}
      />
    </Layer>
  )
}
