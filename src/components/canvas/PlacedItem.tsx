// ======== 放置物品组件 ========
// INPUT: PlacedItem, Fixture, isSelected, toolMode, stageScale
// OUTPUT: Konva Group（彩色矩形 + 名称标签 + 选中指示器 + 系统锁标识 + 闪烁动画）
// POS: src/components/canvas/PlacedItem.tsx — 单个放置物品的画布渲染

import React, { useCallback, useEffect, useRef } from 'react'
import { Group, Rect, Text } from 'react-konva'
import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { TILE_SIZE } from '../../utils/grid'
import { getEffectiveSize } from '../../utils/grid'
import { getFixtureColor } from '../../utils/color'
import { useEditorStore } from '../../stores/editorStore'
import type { PlacedItem as PlacedItemType, Fixture, ToolMode } from '../../types/editor'

interface PlacedItemProps {
  item: PlacedItemType
  fixture: Fixture
  isSelected: boolean
  toolMode: ToolMode
  stageScale: number
  onItemClick: (id: string) => void
  onItemDragEnd: (id: string, x: number, y: number) => void
}

// ======== 选中指示器 ========

function SelectionIndicator({
  width,
  height,
  stageScale,
}: {
  width: number
  height: number
  stageScale: number
}) {
  const handleSize = 4
  const strokeWidth = 2 / stageScale

  return (
    <>
      {/* 选中边框 */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        stroke="#3b82f6"
        strokeWidth={strokeWidth}
        listening={false}
      />
      {/* 四角手柄 */}
      <Rect x={-handleSize / 2} y={-handleSize / 2} width={handleSize} height={handleSize} fill="#3b82f6" listening={false} />
      <Rect x={width - handleSize / 2} y={-handleSize / 2} width={handleSize} height={handleSize} fill="#3b82f6" listening={false} />
      <Rect x={-handleSize / 2} y={height - handleSize / 2} width={handleSize} height={handleSize} fill="#3b82f6" listening={false} />
      <Rect x={width - handleSize / 2} y={height - handleSize / 2} width={handleSize} height={handleSize} fill="#3b82f6" listening={false} />
    </>
  )
}

// ======== PlacedItem 组件 ========

export const PlacedItem = React.memo(function PlacedItem({
  item,
  fixture,
  isSelected,
  toolMode,
  stageScale,
  onItemClick,
  onItemDragEnd,
}: PlacedItemProps) {
  const [w, d] = getEffectiveSize(fixture.gridSize, item.rotation)
  const pixelWidth = w * TILE_SIZE
  const pixelHeight = d * TILE_SIZE
  const flashRectRef = useRef<Konva.Rect>(null)

  // ======== 闪烁动画（undo/redo 反馈） ========

  const flashItemIds = useEditorStore((s) => s.flashItemIds)

  useEffect(() => {
    if (flashItemIds.includes(item.id) && flashRectRef.current) {
      const node = flashRectRef.current
      node.opacity(1)
      const tween = new Konva.Tween({
        node,
        duration: 0.3,
        opacity: 0,
        easing: Konva.Easings.EaseOut,
        onFinish: () => tween.destroy(),
      })
      tween.play()
    }
  }, [flashItemIds, item.id])

  // 点击事件处理
  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true
      onItemClick(item.id)
    },
    [item.id, onItemClick],
  )

  // 拖拽结束处理
  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const newGridX = Math.round(e.target.x() / TILE_SIZE)
      const newGridY = Math.round(e.target.y() / TILE_SIZE)
      onItemDragEnd(item.id, newGridX, newGridY)
    },
    [item.id, onItemDragEnd],
  )

  // 吸附网格的拖拽边界函数 (Pattern 2 from RESEARCH.md)
  const dragBoundFunc = useCallback(
    (pos: { x: number; y: number }) => ({
      x: Math.round(pos.x / TILE_SIZE) * TILE_SIZE,
      y: Math.round(pos.y / TILE_SIZE) * TILE_SIZE,
    }),
    [],
  )

  const fillColor = getFixtureColor(fixture.mysekaiFixtureMainGenreId, fixture.colorCode)

  return (
    <Group
      x={item.x * TILE_SIZE}
      y={item.y * TILE_SIZE}
      draggable={toolMode === 'select'}
      dragBoundFunc={dragBoundFunc}
      onClick={handleClick}
      onTap={handleClick}
      onDragEnd={handleDragEnd}
    >
      {/* 彩色矩形 */}
      <Rect
        width={pixelWidth}
        height={pixelHeight}
        fill={fillColor}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={1}
        cornerRadius={2}
      />

      {/* 名称标签 */}
      <Text
        text={fixture.name}
        width={pixelWidth}
        height={pixelHeight}
        fontSize={12}
        fill="white"
        align="center"
        verticalAlign="middle"
        wrap="none"
        ellipsis={true}
        listening={false}
      />

      {/* 选中指示器 */}
      {isSelected && (
        <SelectionIndicator
          width={pixelWidth}
          height={pixelHeight}
          stageScale={stageScale}
        />
      )}

      {/* 系统物品锁标识 */}
      {item.isSystem && (
        <Rect
          x={pixelWidth - 8}
          y={2}
          width={6}
          height={6}
          fill="#f59e0b"
          cornerRadius={1}
          listening={false}
        />
      )}

      {/* undo/redo 闪烁覆盖层 */}
      <Rect
        ref={flashRectRef}
        width={pixelWidth}
        height={pixelHeight}
        stroke="#39c5bb"
        strokeWidth={2 / stageScale}
        opacity={0}
        listening={false}
        cornerRadius={2}
      />
    </Group>
  )
})
