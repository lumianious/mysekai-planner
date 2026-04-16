// ======== 网格图层 ========
// INPUT: gridWidth, gridDepth, stageScale
// OUTPUT: Konva Layer 包含草地纹理背景 + 两级网格线 (D-46 匹配游戏叠层)
//   - 主线（major）：每 MAJOR_EVERY 格实线，较粗较显眼 —— 匹配游戏较深的网格
//   - 次线（minor）：每格虚线，较细较淡 —— 匹配游戏细分虚线
// POS: src/components/canvas/GridLayer.tsx — 渲染网格底图

import React, { useEffect, useState } from 'react'
import { Layer, Rect, Line } from 'react-konva'
import { TILE_SIZE } from '../../utils/grid'
import grassTextureSrc from '../../assets/grass-texture.png'

// 主网格间隔（多少格一条主线）—— 4 匹配游戏内大网格间距
const MAJOR_EVERY = 4

interface GridLayerProps {
  gridWidth: number
  gridDepth: number
  stageScale: number
}

// ======== 草地纹理加载 ========

function useGrassImage(): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.src = grassTextureSrc
    img.onload = () => setImage(img)
    return () => {
      img.onload = null
    }
  }, [])

  return image
}

// ======== 网格线生成 ========

function GridLines({
  gridWidth,
  gridDepth,
  stageScale,
}: GridLayerProps) {
  const lines: React.ReactElement[] = []
  const totalWidth = gridWidth * TILE_SIZE
  const totalDepth = gridDepth * TILE_SIZE

  // ======== D-46 两级网格 ========
  // 次线（每格）：虚线，细、淡 —— 显示单格位置
  // 主线（每 MAJOR_EVERY 格）：实线，略粗、较显眼 —— 匹配游戏较深的大网格
  // 视觉宽度保持 1px / 1.5px，按 stageScale 反向缩放
  const minorStroke = 1 / stageScale
  const majorStroke = 1.5 / stageScale
  const dashLength = 2 / stageScale
  const gapLength = 3 / stageScale
  const minorColor = 'rgba(255, 255, 255, 0.18)'
  const majorColor = 'rgba(255, 255, 255, 0.45)'

  // 垂直线
  for (let col = 0; col <= gridWidth; col++) {
    const x = col * TILE_SIZE
    const isMajor = col % MAJOR_EVERY === 0
    lines.push(
      <Line
        key={`v-${col}`}
        points={[x, 0, x, totalDepth]}
        stroke={isMajor ? majorColor : minorColor}
        strokeWidth={isMajor ? majorStroke : minorStroke}
        dash={isMajor ? undefined : [dashLength, gapLength]}
        listening={false}
      />,
    )
  }

  // 水平线
  for (let row = 0; row <= gridDepth; row++) {
    const y = row * TILE_SIZE
    const isMajor = row % MAJOR_EVERY === 0
    lines.push(
      <Line
        key={`h-${row}`}
        points={[0, y, totalWidth, y]}
        stroke={isMajor ? majorColor : minorColor}
        strokeWidth={isMajor ? majorStroke : minorStroke}
        dash={isMajor ? undefined : [dashLength, gapLength]}
        listening={false}
      />,
    )
  }

  return <>{lines}</>
}

// ======== GridLayer 组件 ========

export const GridLayer = React.memo(function GridLayer({
  gridWidth,
  gridDepth,
  stageScale,
}: GridLayerProps) {
  const grassImage = useGrassImage()
  const totalWidth = gridWidth * TILE_SIZE
  const totalDepth = gridDepth * TILE_SIZE

  return (
    <Layer listening={false}>
      {/* 草地纹理背景（加载中使用暗绿色过渡） */}
      <Rect
        x={0}
        y={0}
        width={totalWidth}
        height={totalDepth}
        fill={grassImage ? undefined : '#2d5a1e'}
        fillPatternImage={grassImage ?? undefined}
        fillPatternRepeat="repeat"
      />

      {/* 半透明网格线 */}
      <GridLines
        gridWidth={gridWidth}
        gridDepth={gridDepth}
        stageScale={stageScale}
      />
    </Layer>
  )
})
