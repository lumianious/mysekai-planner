// ======== 编辑器画布 ========
// INPUT: fixtureMap (来自 EditorLayout)
// OUTPUT: Konva Stage 包含网格、地面层、家具层、鬼影预览
// POS: src/components/canvas/EditorCanvas.tsx — 画布主容器，管理平移/缩放/事件路由

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Stage } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore } from '../../stores/editorStore'
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useEditorActions } from '../../hooks/useEditorActions'
import { TILE_SIZE } from '../../utils/grid'
import { getEffectiveSize } from '../../utils/grid'
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
    case 'brush':
      return 'cell' // 区别于 stamp 的 crosshair，视觉上表示"格子画刷"
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

  // ======== 鼠标网格坐标追踪（供 GhostPreview 使用） ========

  const [mouseGridPos, setMouseGridPos] = useState<{ x: number; y: number } | null>(null)

  // ======== 编辑器复合动作 ========

  const { handleCanvasClick, handleMoveItem } = useEditorActions(fixtureMap)

  // ======== Tab 循环选择 ========

  const handleCycleSelection = useCallback(() => {
    const state = useEditorStore.getState()
    if (!state.selectedItemId) return
    const selectedItem = state.placedItems[state.selectedItemId]
    if (!selectedItem) return

    // 收集所有与选中物品有重叠的物品
    const overlapping: PlacedItem[] = []
    for (const item of Object.values(state.placedItems)) {
      const fixture = fixtureMap.get(item.fixtureId)
      if (!fixture) continue
      const [w, d] = getEffectiveSize(fixture.gridSize, item.rotation)
      // 检查是否与选中物品的左上角重叠
      if (
        selectedItem.x >= item.x &&
        selectedItem.x < item.x + w &&
        selectedItem.y >= item.y &&
        selectedItem.y < item.y + d
      ) {
        overlapping.push(item)
      }
    }

    if (overlapping.length <= 1) return

    // 按 ID 排序以保持稳定顺序
    overlapping.sort((a, b) => a.id.localeCompare(b.id))
    const currentIdx = overlapping.findIndex((i) => i.id === state.selectedItemId)
    const nextIdx = (currentIdx + 1) % overlapping.length
    state.setSelectedItem(overlapping[nextIdx].id)
  }, [fixtureMap])

  // ======== 键盘快捷键 ========

  useKeyboard({
    containerRef,
    onNudge: handleMoveItem,
    onCycleSelection: handleCycleSelection,
    fixtureMap,
  })

  // ======== 鼠标移动处理 ========

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

  // ======== 鼠标离开 — 清除鬼影预览 ========

  const handleMouseLeave = useCallback(() => {
    setMouseGridPos(null)
  }, [])

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
      const state = useEditorStore.getState()
      if (state.toolMode === 'select') {
        state.setSelectedItem(id)
      } else if (state.toolMode === 'remove') {
        state.removeItem(id)
      }
    },
    [],
  )

  // ======== 物品拖拽处理 ========

  const handleItemDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      handleMoveItem(id, x, y)
    },
    [handleMoveItem],
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

  // ======== Stage 点击处理（stamp/remove/select 通过网格坐标分发） ========

  const handleStageClick = useCallback(
    (e: { target: Konva.Stage | Konva.Node; evt?: MouseEvent | TouchEvent }) => {
      const stage = (e.target as Konva.Node).getStage?.()
      const state = useEditorStore.getState()

      // 仅在 Stage 空白区域点击时处理
      if (e.target === stage) {
        if (!stage) return
        const pointer = stage.getPointerPosition()
        if (!pointer) return
        const scale = stage.scaleX()
        const gridX = Math.floor((pointer.x - stage.x()) / scale / TILE_SIZE)
        const gridY = Math.floor((pointer.y - stage.y()) / scale / TILE_SIZE)

        if (state.toolMode === 'stamp') {
          handleCanvasClick(gridX, gridY)
        } else if (state.toolMode === 'remove') {
          // 移除模式下点击空白区域不做处理
        } else {
          // 选择模式下点击空白区域取消选中
          state.setSelectedItem(null)
        }
      }
    },
    [handleCanvasClick],
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
        onMouseLeave={handleMouseLeave}
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

// 导出 stageScale 供 StatusBar 使用
export type { EditorCanvasProps }
