// ======== 网格图层 ========
// INPUT: gridWidth, gridDepth, stageScale
// OUTPUT: Konva Layer 包含草地纹理背景 + 虚线网格线 (D-46 匹配游戏叠层)
// POS: src/components/canvas/GridLayer.tsx — 渲染网格底图

import React, { useEffect, useState } from 'react'
import { Layer, Rect, Line } from 'react-konva'
import { TILE_SIZE } from '../../utils/grid'
import grassTextureSrc from '../../assets/grass-texture.png'

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
  const strokeWidth = 1 / stageScale // 保持 1px 视觉宽度
  // ======== D-46 虚线网格 ========
  // 匹配游戏内叠层；dash/gap 同样按 stageScale 反向缩放以保持视觉一致
  const dashLength = 4 / stageScale
  const gapLength = 3 / stageScale

  // 垂直线
  for (let col = 0; col <= gridWidth; col++) {
    const x = col * TILE_SIZE
    lines.push(
      <Line
        key={`v-${col}`}
        points={[x, 0, x, totalDepth]}
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth={strokeWidth}
        dash={[dashLength, gapLength]}
        listening={false}
      />,
    )
  }

  // 水平线
  for (let row = 0; row <= gridDepth; row++) {
    const y = row * TILE_SIZE
    lines.push(
      <Line
        key={`h-${row}`}
        points={[0, y, totalWidth, y]}
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth={strokeWidth}
        dash={[dashLength, gapLength]}
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
