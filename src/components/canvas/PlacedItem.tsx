// ======== 放置物品组件 ========
// INPUT: PlacedItem, Fixture, isSelected, toolMode, stageScale
// OUTPUT: Konva Group（彩色矩形 + 名称标签 + 选中指示器 + 系统锁标识 + 闪烁动画）
// POS: src/components/canvas/PlacedItem.tsx — 单个放置物品的画布渲染

import React, { useCallback, useEffect, useRef } from 'react'
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva'
import Konva from 'konva'
import useImage from 'use-image'
import type { KonvaEventObject } from 'konva/lib/Node'
import { TILE_SIZE } from '../../utils/grid'
import { getEffectiveSize } from '../../utils/grid'
import { getFixtureColor } from '../../utils/color'
import { getGroundSubtype } from '../../data/fixtures'
import { getSpriteEntrySync, resolveSpriteUrl } from '../../data/spriteManifest'
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

  // ======== Phase 5：sprite / 纯色矩形分支 ========
  // 决策（user feedback）：
  //   - 地面项（rug/road/color-tile/floor_appearance）-> 纯色 Rect 用 manifest dominantColor，
  //     这样相邻可连接、无 thumbnail 边缘伪影
  //   - 3D 家具 -> iso thumbnail（HID 风格）
  //   - manifest 未命中 -> getFixtureColor 旧路径（D-17 回退）
  const groundSubtype = getGroundSubtype(fixture)
  const isGroundItem =
    groundSubtype !== null ||
    fixture.mysekaiSettableLayoutType === 'floor_appearance'
  // dominantColor 底色仅给"应贴满方格"的项目用（road / color-tile / floor_appearance）；
  // rug 形状非矩形（扇贝边），底色会在透明边缘外溢成方块光晕。
  const usesUnderlay =
    isGroundItem && groundSubtype !== 'rug' && groundSubtype !== 'fence'
  const manifestEntry = getSpriteEntrySync(fixture.assetbundleName)
  const groundColor =
    usesUnderlay && manifestEntry?.dominantColor
      ? `rgb(${manifestEntry.dominantColor.join(',')})`
      : null
  // 地面项：solid Rect 保证可连接 + topdown sprite 叠加（iso thumbnail 会显示 3D 视角不适合地面）
  // 非地面（家具）：直接用 thumbnail（HID 风格）
  const groundUrl = isGroundItem
    ? (resolveSpriteUrl(fixture, import.meta.env.BASE_URL, 'topdown')?.url ?? '')
    : ''
  const furnitureUrl = !isGroundItem
    ? (resolveSpriteUrl(fixture, import.meta.env.BASE_URL)?.url ?? '')
    : ''
  const [groundImg, groundStatus] = useImage(groundUrl, 'anonymous')
  const [spriteImg, spriteStatus] = useImage(furnitureUrl, 'anonymous')
  const renderGroundTexture =
    isGroundItem && groundImg !== undefined && groundStatus === 'loaded'
  const renderSprite =
    !isGroundItem && spriteImg !== undefined && spriteStatus === 'loaded'
  // rug 走"无底色 + topdown 直贴"路径（usesUnderlay=false 时无 groundColor 但仍是地面项）
  const renderGroundOnly = !groundColor && renderGroundTexture

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
      {/* 主体：地面 = solid color + thumbnail 叠加；家具 = sprite；fallback = 彩色矩形 */}
      {groundColor ? (
        <>
          <Rect width={pixelWidth} height={pixelHeight} fill={groundColor} />
          {renderGroundTexture && (
            <KonvaImage
              image={groundImg}
              width={pixelWidth}
              height={pixelHeight}
              listening={false}
            />
          )}
        </>
      ) : renderGroundOnly ? (
        <KonvaImage
          image={groundImg}
          width={pixelWidth}
          height={pixelHeight}
          listening={false}
        />
      ) : renderSprite ? (
        <KonvaImage
          image={spriteImg}
          width={pixelWidth}
          height={pixelHeight}
          listening={false}
        />
      ) : (
        <Rect
          width={pixelWidth}
          height={pixelHeight}
          fill={fillColor}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={1}
          cornerRadius={2}
        />
      )}

      {/* 名称标签：仅在 fallback rect 路径上展示（地面纯色/sprite 都不需要标签） */}
      {!renderSprite && !groundColor && !renderGroundOnly && (
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
      )}

      {/* 选中指示器 */}
      {isSelected && (
        <SelectionIndicator
          width={pixelWidth}
          height={pixelHeight}
          stageScale={stageScale}
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
