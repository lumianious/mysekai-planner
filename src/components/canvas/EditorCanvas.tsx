// ======== 编辑器画布 ========
// INPUT: fixtureMap (来自 EditorLayout)
// OUTPUT: Konva Stage 包含网格、地面层、家具层、鬼影预览
// POS: src/components/canvas/EditorCanvas.tsx — 画布主容器，管理平移/缩放/事件路由

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Stage } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore } from '../../stores/editorStore'
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction'
import { TILE_SIZE } from '../../utils/grid'
import { GridLayer } from './GridLayer'
import { GroundLayer } from './GroundLayer'
import { FurnitureLayer } from './FurnitureLayer'
import { GhostPreview } from './GhostPreview'
import type { Fixture, PlacedItem, ToolMode } from '../../types/editor'

// ======== 光标映射 ========

function getCursor(toolMode: ToolMode): string {
  switch (toolMode) {
    case 'select':
      return 'default'
    case 'stamp':
      return 'crosshair'
    case 'remove':
      return 'pointer'
    default:
      return 'default'
  }
}

// ======== 容器尺寸 Hook ========

function useContainerSize(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ width: Math.floor(width), height: Math.floor(height) })
      }
    })
    observer.observe(el)

    // 初始尺寸
    const rect = el.getBoundingClientRect()
    setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) })

    return () => observer.disconnect()
  }, [containerRef])

  return size
}

// ======== EditorCanvas 组件 ========

interface EditorCanvasProps {
  fixtureMap: Map<number, Fixture>
}

export function EditorCanvas({ fixtureMap }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef)
  const { stagePos, setStagePos, stageScale, handleWheel } = useCanvasInteraction()

  // ======== Store 订阅 ========

  const gridSize = useEditorStore((s) => s.gridSize)
  const placedItems = useEditorStore((s) => s.placedItems)
  const toolMode = useEditorStore((s) => s.toolMode)
  const selectedItemId = useEditorStore((s) => s.selectedItemId)
  const setSelectedItem = useEditorStore((s) => s.setSelectedItem)
  const moveItem = useEditorStore((s) => s.moveItem)
  const removeItem = useEditorStore((s) => s.removeItem)

  // ======== 鼠标网格坐标追踪（供 GhostPreview 使用） ========

  const [mouseGridPos, setMouseGridPos] = useState<{ x: number; y: number } | null>(null)

  const handleMouseMove = useCallback(
    (e: { target: { getStage: () => Konva.Stage | null } }) => {
      const stage = e.target.getStage()
      if (!stage) return
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      const scale = stage.scaleX()
      const gridX = Math.floor((pointer.x - stage.x()) / scale / TILE_SIZE)
      const gridY = Math.floor((pointer.y - stage.y()) / scale / TILE_SIZE)
      setMouseGridPos({ x: gridX, y: gridY })
    },
    [],
  )

  // ======== 物品按图层分组 ========

  const { groundItems, furnitureItems } = useMemo(() => {
    const items = Object.values(placedItems)
    const ground: PlacedItem[] = []
    const furniture: PlacedItem[] = []
    for (const item of items) {
      if (item.layer === 'ground') {
        ground.push(item)
      } else {
        furniture.push(item)
      }
    }
    return { groundItems: ground, furnitureItems: furniture }
  }, [placedItems])

  // ======== 物品点击处理 ========

  const handleItemClick = useCallback(
    (id: string) => {
      if (toolMode === 'select') {
        setSelectedItem(id)
      } else if (toolMode === 'remove') {
        removeItem(id)
      }
    },
    [toolMode, setSelectedItem, removeItem],
  )

  // ======== 物品拖拽处理 ========

  const handleItemDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      moveItem(id, x, y)
    },
    [moveItem],
  )

  // ======== Stage 拖拽结束（平移） ========

  const handleStageDragEnd = useCallback(
    (e: { target: Konva.Stage | Konva.Node }) => {
      // 只处理 Stage 本身的拖拽（平移），忽略子节点
      const stage = (e.target as Konva.Node).getStage?.()
      if (e.target === stage) {
        setStagePos({ x: (e.target as Konva.Stage).x(), y: (e.target as Konva.Stage).y() })
      }
    },
    [setStagePos],
  )

  // ======== Stage 空白区域点击（取消选中） ========

  const handleStageClick = useCallback(
    (e: { target: Konva.Stage | Konva.Node }) => {
      const stage = (e.target as Konva.Node).getStage?.()
      if (e.target === stage) {
        setSelectedItem(null)
      }
    },
    [setSelectedItem],
  )

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-surface overflow-hidden"
      style={{ cursor: getCursor(toolMode) }}
    >
      <Stage
        ref={stageRef}
        width={containerWidth}
        height={containerHeight}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        draggable={toolMode === 'select'}
        onWheel={handleWheel}
        onDragEnd={handleStageDragEnd}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseMove={handleMouseMove}
        onPointerMove={handleMouseMove}
      >
        {/* 网格底图（草地 + 网格线） */}
        <GridLayer
          gridWidth={gridSize.width}
          gridDepth={gridSize.depth}
          stageScale={stageScale}
        />

        {/* 地面层（道路、地毯 — 位于家具层之下） */}
        <GroundLayer
          items={groundItems}
          fixtureMap={fixtureMap}
          toolMode={toolMode}
          selectedItemId={selectedItemId}
          stageScale={stageScale}
          onItemClick={handleItemClick}
          onItemDragEnd={handleItemDragEnd}
        />

        {/* 家具层 */}
        <FurnitureLayer
          items={furnitureItems}
          fixtureMap={fixtureMap}
          toolMode={toolMode}
          selectedItemId={selectedItemId}
          stageScale={stageScale}
          onItemClick={handleItemClick}
          onItemDragEnd={handleItemDragEnd}
        />

        {/* 鬼影预览（第4层，最顶层覆盖） */}
        <GhostPreview
          fixtureMap={fixtureMap}
          stageScale={stageScale}
          mouseGridPos={mouseGridPos}
        />
      </Stage>
    </div>
  )
}

// 导出 stageRef 用于 Plan 06 键盘事件绑定
export type { EditorCanvasProps }
