// ======== 编辑器画布 ========
// INPUT: fixtureMap (来自 EditorLayout)
// OUTPUT: Konva Stage 包含网格、地面层、家具层、鬼影预览
// POS: src/components/canvas/EditorCanvas.tsx — 画布主容器，管理平移/缩放/事件路由

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Stage } from 'react-konva'
import type Konva from 'konva'
import {
  useEditorStore,
  startStrokeBatch,
  endStrokeBatch,
  buildOccupancyGrid,
  checkCanPlace,
} from '../../stores/editorStore'
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useEditorActions } from '../../hooks/useEditorActions'
import { TILE_SIZE } from '../../utils/grid'
import { getEffectiveSize } from '../../utils/grid'
import { rasterizeLine } from '../../utils/rasterize'
import { getBrushInteraction } from '../../data/fixtures'
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

  // ======== 拖拽画刷状态机 (D-31, D-33) ========
  // 使用 ref 避免每个样本都 setState 触发整画布重渲染
  const isPaintingRef = useRef(false)
  const lastPaintedTileRef = useRef<{ x: number; y: number } | null>(null)

  // ======== 拖拽擦除状态机 (D-42) ========
  const isErasingRef = useRef(false)
  const lastErasedTileRef = useRef<{ x: number; y: number } | null>(null)

  // ======== 光标 → 格子坐标辅助 ========
  // 返回原始格子坐标 + 按 step 对齐的画刷格子坐标（v1 step=2）
  const pointerToGrid = useCallback(
    (stage: Konva.Stage, step: number) => {
      const pointer = stage.getPointerPosition()
      if (!pointer) return null
      const scale = stage.scaleX()
      const rawGridX = Math.floor((pointer.x - stage.x()) / scale / TILE_SIZE)
      const rawGridY = Math.floor((pointer.y - stage.y()) / scale / TILE_SIZE)
      const snappedX = Math.floor(rawGridX / step) * step
      const snappedY = Math.floor(rawGridY / step) * step
      return { gridX: snappedX, gridY: snappedY, rawGridX, rawGridY }
    },
    [],
  )

  // ======== 单 tile 油漆（尊重 overwrite 和 layer 独立性 D-40/D-41） ========
  const paintTileIfAllowed = useCallback(
    (gridX: number, gridY: number, fixture: Fixture) => {
      const state = useEditorStore.getState()
      const [w, d] = getEffectiveSize(fixture.gridSize, 0)
      // D-41 — 画刷仅与 ground 层碰撞
      const groundOcc = buildOccupancyGrid(state.placedItems, fixtureMap, 'ground')
      const { width: gw, depth: gd } = state.gridSize

      if (checkCanPlace(groundOcc, gridX, gridY, w, d, gw, gd)) {
        state.placeItem({
          fixtureId: fixture.id,
          x: gridX,
          y: gridY,
          rotation: 0,
          layer: 'ground',
          isSystem: false,
        })
        return
      }

      // overwrite=ON → 先移除 ground 层占位物品再试一次
      if (state.overwriteEnabled) {
        const idsToRemove = new Set<string>()
        for (let dx = 0; dx < w; dx++) {
          for (let dy = 0; dy < d; dy++) {
            const id = groundOcc.get(`${gridX + dx},${gridY + dy}`)
            if (id) idsToRemove.add(id)
          }
        }
        for (const id of idsToRemove) state.removeItem(id)
        const fresh = buildOccupancyGrid(
          useEditorStore.getState().placedItems,
          fixtureMap,
          'ground',
        )
        if (checkCanPlace(fresh, gridX, gridY, w, d, gw, gd)) {
          useEditorStore.getState().placeItem({
            fixtureId: fixture.id,
            x: gridX,
            y: gridY,
            rotation: 0,
            layer: 'ground',
            isSystem: false,
          })
        }
      }
      // overwrite=OFF + 被占 → 跳过此 tile，继续 stroke（RESEARCH Q3）
    },
    [fixtureMap],
  )

  // ======== 单 tile 擦除（仅 ground，D-42） ========
  const eraseGroundTileIfAny = useCallback(
    (rawGridX: number, rawGridY: number) => {
      const state = useEditorStore.getState()
      for (const item of Object.values(state.placedItems)) {
        if (item.layer !== 'ground') continue
        const fixture = fixtureMap.get(item.fixtureId)
        if (!fixture) continue
        const [w, d] = getEffectiveSize(fixture.gridSize, item.rotation)
        if (
          rawGridX >= item.x &&
          rawGridX < item.x + w &&
          rawGridY >= item.y &&
          rawGridY < item.y + d
        ) {
          state.removeItem(item.id)
          return
        }
      }
    },
    [fixtureMap],
  )

  // ======== stroke 结束（R-06 幂等清理） ========
  // 设计上幂等：ref 在调用 endStrokeBatch() 之前清除，因此并发的第二次调用
  // （例如 mouseleave 在 mouseup 之后触发，或 window.blur 与任一方竞态）
  // 会发现 `isPaintingRef.current === false` 而跳过 paint 分支。
  // 不要将 ref 清除操作重新排在 endStrokeBatch 之后 —— 这是 R-06 缓解。
  const endStrokeIfActive = useCallback(() => {
    if (isPaintingRef.current) {
      isPaintingRef.current = false
      lastPaintedTileRef.current = null
      endStrokeBatch()
    }
    if (isErasingRef.current) {
      isErasingRef.current = false
      lastErasedTileRef.current = null
      endStrokeBatch()
    }
  }, [])

  // ======== Stage mousedown — 启动画刷/擦除 stroke ========
  const handleStageMouseDown = useCallback(
    (e: { target: Konva.Node | Konva.Stage }) => {
      const stage = (e.target as Konva.Node).getStage?.()
      if (!stage) return
      // 仅响应空白区域 mousedown（避免与物品拖拽冲突）
      if (e.target !== stage) return

      const state = useEditorStore.getState()

      // --- 画刷拖拽起点 ---
      if (state.toolMode === 'brush' && state.activeFixtureId !== null) {
        const fixture = fixtureMap.get(state.activeFixtureId)
        if (!fixture) return
        const interaction = getBrushInteraction(fixture)
        if (interaction === 'drag-paint') {
          const step = fixture.gridSize.width
          const p = pointerToGrid(stage, step)
          if (!p) return
          startStrokeBatch()
          isPaintingRef.current = true
          lastPaintedTileRef.current = { x: p.gridX, y: p.gridY }
          paintTileIfAllowed(p.gridX, p.gridY, fixture)
          return
        }
        // fence 线工具在 plan 02-04 实现
      }

      // --- 移除拖拽起点 (D-42) ---
      if (state.toolMode === 'remove') {
        const p = pointerToGrid(stage, 1)
        if (!p) return
        startStrokeBatch()
        isErasingRef.current = true
        lastErasedTileRef.current = { x: p.rawGridX, y: p.rawGridY }
        eraseGroundTileIfAny(p.rawGridX, p.rawGridY)
      }
    },
    [fixtureMap, pointerToGrid, paintTileIfAllowed, eraseGroundTileIfAny],
  )

  // ======== Stage mouseup — 结束 stroke ========
  const handleStageMouseUp = useCallback(() => {
    endStrokeIfActive()
  }, [endStrokeIfActive])

  // ======== R-06：window.blur 清理路径 ========
  useEffect(() => {
    const onBlur = () => endStrokeIfActive()
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [endStrokeIfActive])

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

      // --- 画刷拖拽推进 (D-33) ---
      if (isPaintingRef.current) {
        const state = useEditorStore.getState()
        const fixture =
          state.activeFixtureId !== null
            ? fixtureMap.get(state.activeFixtureId)
            : undefined
        if (!fixture) return
        const step = fixture.gridSize.width
        const snappedX = Math.floor(gridX / step) * step
        const snappedY = Math.floor(gridY / step) * step
        const last = lastPaintedTileRef.current
        if (last && last.x === snappedX && last.y === snappedY) return
        const tiles = last
          ? rasterizeLine(last.x, last.y, snappedX, snappedY, step)
          : [{ x: snappedX, y: snappedY }]
        // 跳过第一个 tile —— 它是 last 本身（已绘制）
        for (let i = last ? 1 : 0; i < tiles.length; i++) {
          paintTileIfAllowed(tiles[i].x, tiles[i].y, fixture)
        }
        lastPaintedTileRef.current = { x: snappedX, y: snappedY }
        return
      }

      // --- 移除拖拽推进 (D-42) ---
      if (isErasingRef.current) {
        const last = lastErasedTileRef.current
        if (last && last.x === gridX && last.y === gridY) return
        const tiles = last
          ? rasterizeLine(last.x, last.y, gridX, gridY, 1)
          : [{ x: gridX, y: gridY }]
        for (let i = last ? 1 : 0; i < tiles.length; i++) {
          eraseGroundTileIfAny(tiles[i].x, tiles[i].y)
        }
        lastErasedTileRef.current = { x: gridX, y: gridY }
      }
    },
    [fixtureMap, paintTileIfAllowed, eraseGroundTileIfAny],
  )

  // ======== 鼠标离开 — 清除鬼影预览 + R-06 清理 ========

  const handleMouseLeave = useCallback(() => {
    setMouseGridPos(null)
    endStrokeIfActive()
  }, [endStrokeIfActive])

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
        onMouseDown={handleStageMouseDown}
        onMouseUp={handleStageMouseUp}
        onPointerDown={handleStageMouseDown}
        onPointerUp={handleStageMouseUp}
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
