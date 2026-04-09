// ======== 画布交互 Hook ========
// INPUT: 无
// OUTPUT: stagePos, setStagePos, stageScale, handleWheel
// POS: src/hooks/useCanvasInteraction.ts — 管理 Konva Stage 的平移和缩放

import { useState, useCallback } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'

// ======== 缩放常量 ========

const SCALE_BY = 1.05
const MIN_SCALE = 0.15 // 适配 100x100 网格 (100*32=3200px @ 0.15 ≈ 480px 视口)
const MAX_SCALE = 3.0  // 细节检查

export function useCanvasInteraction() {
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)

  // 基于指针位置的滚轮缩放 (Pattern 3 from RESEARCH.md)
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    // trackpad pinch 发送 ctrlKey，需要反转方向
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY),
    )

    setStageScale(newScale)
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }, [])

  return { stagePos, setStagePos, stageScale, handleWheel }
}
