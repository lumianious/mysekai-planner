// ======== 画布交互 Hook ========
// INPUT: 无
// OUTPUT: stagePos, setStagePos, stageScale, handleWheel
// POS: src/hooks/useCanvasInteraction.ts — 管理 Konva Stage 的平移和缩放

import { useState, useCallback } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEditorStore } from '../stores/editorStore'

// ======== 缩放常量 ========

const SCALE_BY = 1.05
const MIN_SCALE = 0.15
const MAX_SCALE = 3.0

export function useCanvasInteraction() {
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScaleLocal] = useState(1)

  const setStageScale = useCallback((scale: number) => {
    setStageScaleLocal(scale)
    useEditorStore.getState().setStageScale(scale)
  }, [])

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
  }, [setStageScale])

  return { stagePos, setStagePos, stageScale, handleWheel }
}
