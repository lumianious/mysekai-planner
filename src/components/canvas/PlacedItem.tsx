// ======== 放置物品组件 ========
// INPUT: PlacedItem, Fixture, isSelected, toolMode, stageScale
// OUTPUT: Konva Group（彩色矩形 + 名称标签 + 选中指示器 + 系统锁标识 + 闪烁动画）
// POS: src/components/canvas/PlacedItem.tsx — 单个放置物品的画布渲染

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva'
import Konva from 'konva'
import useImage from 'use-image'
import type { KonvaEventObject } from 'konva/lib/Node'
import { TILE_SIZE } from '../../utils/grid'
import { getEffectiveSize } from '../../utils/grid'
import { getFixtureColor } from '../../utils/color'
import { getGroundSubtype } from '../../data/fixtures'
import { getSpriteEntrySync, resolveSpriteUrl } from '../../data/spriteManifest'
import { getTilePattern } from '../../utils/croppedTile'
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
  const manifestEntryEarly = getSpriteEntrySync(fixture.assetbundleName)
  // 「地面项」= 视觉上是平面贴片，按格子无缝拼接（rug/road/color-tile/fence/floor texture）。
  // 权威信号：manifest mode === '2d'（管线已根据 layoutType + handleType 分类）。
  // 回退：manifest 未命中时沿用旧启发式（groundSubtype / floor_appearance）。
  const isGroundItem = manifestEntryEarly
    ? manifestEntryEarly.mode === '2d'
    : groundSubtype !== null ||
      fixture.mysekaiSettableLayoutType === 'floor_appearance'
  // dominantColor 底色仅给"应贴满方格"的项目用（road / color-tile / floor_appearance）；
  // rug 形状非矩形（扇贝边），底色会在透明边缘外溢成方块光晕。
  const usesUnderlay =
    isGroundItem && groundSubtype !== 'rug' && groundSubtype !== 'fence'
  const manifestEntry = manifestEntryEarly
  // dominantColor 缺失时回退到 getFixtureColor（颜色码或类型主色），保证 road / 色块
  // 始终有不透明底色，相邻拼接时网格绿不会从 sprite 透明像素中漏出。
  const groundColor = usesUnderlay
    ? manifestEntry?.dominantColor
      ? `rgb(${manifestEntry.dominantColor.join(',')})`
      : fillColor
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

  // ======== sprite 自然比例（contain-fit） ========
  // iso thumbnail 是方形文件；非方形足迹（2×6 床、4×2 沙发）等比缩放后居中，
  // 用虚线边框标示真实占地。地面项保持全填充（贴片需要无缝拼接）。
  const spriteNaturalW = spriteImg?.naturalWidth ?? 0
  const spriteNaturalH = spriteImg?.naturalHeight ?? 0
  const spriteFitScale =
    renderSprite && spriteNaturalW > 0 && spriteNaturalH > 0
      ? Math.min(pixelWidth / spriteNaturalW, pixelHeight / spriteNaturalH)
      : 1
  const spriteDrawW = spriteNaturalW * spriteFitScale
  const spriteDrawH = spriteNaturalH * spriteFitScale
  const spriteOffsetX = (pixelWidth - spriteDrawW) / 2
  const spriteOffsetY = (pixelHeight - spriteDrawH) / 2
  // 一致性原则：所有 3D 物件都画足迹底板，无论 sprite 比例是否匹配
  // —— 用户认知模型："3D 物件总有 pad；2D 贴片总是无缝铺开"。
  const showFootprintBorder = renderSprite

  // ======== 路面核心瓦片铺贴（路 / 色块 / 地板纹理） ========
  // 游戏 source asset 用 snake-shape 编码 tile 间连接关系（连接臂 = 透明），
  // 引擎按邻居动态拼合；我们没有连接逻辑，所以从单个源 tile 中裁中心 60% 的"实心核心"
  // 作为图案单元，跨 fixture 无缝铺贴时就是一片均匀路面（与游戏内观感一致）。
  const renderTiledGround =
    usesUnderlay &&
    groundImg !== undefined &&
    groundStatus === 'loaded' &&
    groundImg.naturalWidth > 0
  const tilePattern = useMemo(
    () =>
      renderTiledGround && groundImg ? getTilePattern(groundImg, w) : null,
    [renderTiledGround, groundImg, w],
  )

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
      {/* 主体：tiled ground core > solid underlay > rug 直贴 > 家具 sprite > fallback */}
      {renderTiledGround && tilePattern ? (
        <>
          {/* 全瓦模式下采样的底色：让源 tile 内剩余少量透明像素显出 mortar 而非草地 */}
          {tilePattern.underlayColor && (
            <Rect
              width={pixelWidth}
              height={pixelHeight}
              fill={tilePattern.underlayColor}
            />
          )}
          <Rect
            width={pixelWidth}
            height={pixelHeight}
            fillPatternImage={tilePattern.canvas}
            fillPatternRepeat="repeat"
            fillPatternScaleX={TILE_SIZE / tilePattern.sourceTilePx}
            fillPatternScaleY={TILE_SIZE / tilePattern.sourceTilePx}
            fillPatternOffsetX={
              tilePattern.mode === 'full-tile'
                ? item.x * tilePattern.sourceTilePx
                : 0
            }
            fillPatternOffsetY={
              tilePattern.mode === 'full-tile'
                ? item.y * tilePattern.sourceTilePx
                : 0
            }
            listening={false}
          />
        </>
      ) : groundColor ? (
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
        />
      ) : renderSprite ? (
        <>
          {/* 足迹底板：深色淡填充 + 实线描边，与白色虚线网格区分；同时充当点击命中区 */}
          <Rect
            width={pixelWidth}
            height={pixelHeight}
            fill={showFootprintBorder ? 'rgba(30,41,59,0.10)' : 'rgba(0,0,0,0.001)'}
            stroke={showFootprintBorder ? 'rgba(30,41,59,0.55)' : undefined}
            strokeWidth={showFootprintBorder ? 1 / stageScale : 0}
            cornerRadius={2}
          />
          <KonvaImage
            image={spriteImg}
            x={spriteOffsetX}
            y={spriteOffsetY}
            width={spriteDrawW}
            height={spriteDrawH}
            listening={false}
          />
        </>
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
