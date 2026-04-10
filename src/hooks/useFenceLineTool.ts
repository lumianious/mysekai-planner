// ======== 围栏线工具 Hook ========
// INPUT: toolMode, activeFixtureId, fixtureMap（均来自 EditorCanvas）
// OUTPUT: fenceState + activeFenceFixture + confirm/cancel/click/mouseMove 回调
//         + 工具模式/家具切换自动重置副作用
// POS: src/hooks/useFenceLineTool.ts — 将围栏线工具状态机从 EditorCanvas 剥离，
//      把 EditorCanvas.tsx 的行数压回 800 以内 (CLAUDE.md 硬限制)
//
// 设计要点：
//   1. 状态机三段式 idle → picking-end → confirming
//   2. activeFenceFixture 仅依赖 [toolMode, fixtureMap, activeFixtureId] —— 不订阅
//      placedItems，避免 paint 时反复重算
//   3. confirmFenceLine 用 withBatchedUndo 将整条线合批为单个 undo 步骤
//   4. cancelFenceLine 返回 boolean：true 表示线被取消（useKeyboard 据此吞 Escape），
//      false 表示无线在进行（Escape 回落到其它分支）

import { useCallback, useMemo, useState } from 'react'
import {
  useEditorStore,
  withBatchedUndo,
  buildOccupancyGrid,
  checkCanPlace,
} from '../stores/editorStore'
import { rasterizeLine, snapToAxis } from '../utils/rasterize'
import { getBrushInteraction } from '../data/fixtures'
import type { Fixture, ToolMode } from '../types/editor'

// ======== 类型 ========

export type FencePhase = 'idle' | 'picking-end' | 'confirming'

export interface FenceState {
  phase: FencePhase
  start: { x: number; y: number } | null
  end: { x: number; y: number } | null
}

interface UseFenceLineToolArgs {
  toolMode: ToolMode
  activeFixtureId: number | null
  fixtureMap: Map<number, Fixture>
}

export interface UseFenceLineToolResult {
  fenceState: FenceState
  activeFenceFixture: Fixture | null
  // 将 rawGridX/Y 喂给状态机处理点击（EditorCanvas 在 handleStageClick 中调用）
  handleFenceClick: (rawGridX: number, rawGridY: number) => void
  // 将 rawGridX/Y 喂给状态机处理 picking-end 阶段的 ghost 跟随
  handleFenceMouseMove: (rawGridX: number, rawGridY: number) => void
  // 提交当前 confirming 阶段的线为单 undo 步骤
  confirmFenceLine: () => void
  // 取消当前 picking-end / confirming 阶段；返回是否真的取消了
  cancelFenceLine: () => boolean
}

// ======== Hook 实现 ========

export function useFenceLineTool({
  toolMode,
  activeFixtureId,
  fixtureMap,
}: UseFenceLineToolArgs): UseFenceLineToolResult {
  // 工具模式 / fixture 切换时自动重置状态机
  // —— React 官方推荐模式：把"上一轮依赖项"存入 state，渲染期间比较后调用
  // setState 同步（无 useEffect，无 ref），React 会合并到本次 commit。
  // 参考: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [fenceState, setFenceState] = useState<FenceState>({
    phase: 'idle',
    start: null,
    end: null,
  })
  const currentResetKey = `${toolMode}::${activeFixtureId ?? 'null'}`
  const [prevResetKey, setPrevResetKey] = useState(currentResetKey)
  if (prevResetKey !== currentResetKey) {
    setPrevResetKey(currentResetKey)
    if (fenceState.phase !== 'idle') {
      setFenceState({ phase: 'idle', start: null, end: null })
    }
  }

  // 当前围栏 fixture 解析 —— 故意不订阅 placedItems
  const activeFenceFixture = useMemo(() => {
    if (toolMode !== 'brush' || activeFixtureId === null) return null
    const fixture = fixtureMap.get(activeFixtureId)
    if (!fixture) return null
    return getBrushInteraction(fixture) === 'line-tool' ? fixture : null
  }, [toolMode, fixtureMap, activeFixtureId])

  // ======== 点击路由（三段式状态机） ========
  const handleFenceClick = useCallback(
    (rawGridX: number, rawGridY: number) => {
      const fixture = activeFenceFixture
      if (!fixture) return
      const step = fixture.gridSize.width
      const gridX = Math.floor(rawGridX / step) * step
      const gridY = Math.floor(rawGridY / step) * step

      if (fenceState.phase === 'idle') {
        setFenceState({
          phase: 'picking-end',
          start: { x: gridX, y: gridY },
          end: { x: gridX, y: gridY },
        })
        return
      }
      if (fenceState.phase === 'picking-end' && fenceState.start) {
        const snapped = snapToAxis(
          fenceState.start.x,
          fenceState.start.y,
          gridX,
          gridY,
        )
        setFenceState({
          phase: 'confirming',
          start: fenceState.start,
          end: snapped,
        })
        return
      }
      if (fenceState.phase === 'confirming') {
        // 确认阶段空白点击 → 取消并以此点为新起点（D-36）
        setFenceState({
          phase: 'picking-end',
          start: { x: gridX, y: gridY },
          end: { x: gridX, y: gridY },
        })
        return
      }
    },
    [activeFenceFixture, fenceState],
  )

  // ======== 鼠标移动更新 ghost ========
  // 仅在 picking-end 阶段；用引用相等守卫避免无变化的 setState 触发重渲染
  const handleFenceMouseMove = useCallback(
    (rawGridX: number, rawGridY: number) => {
      const fixture = activeFenceFixture
      if (!fixture) return
      if (fenceState.phase !== 'picking-end' || !fenceState.start) return

      const step = fixture.gridSize.width
      const snappedX = Math.floor(rawGridX / step) * step
      const snappedY = Math.floor(rawGridY / step) * step
      const axisSnapped = snapToAxis(
        fenceState.start.x,
        fenceState.start.y,
        snappedX,
        snappedY,
      )
      if (
        fenceState.end === null ||
        fenceState.end.x !== axisSnapped.x ||
        fenceState.end.y !== axisSnapped.y
      ) {
        setFenceState((prev) => ({ ...prev, end: axisSnapped }))
      }
    },
    [activeFenceFixture, fenceState],
  )

  // ======== 提交（D-34, D-43） ========
  // overwrite=OFF + 占位冲突 → 跳过（与 drag-paint Photoshop 语义一致）
  // overwrite=ON  + 占位冲突 → 先移除 ground 占位再重新放置
  const confirmFenceLine = useCallback(() => {
    const fixture = activeFenceFixture
    if (!fixture) return
    if (fenceState.phase !== 'confirming') return
    if (!fenceState.start || !fenceState.end) return

    const step = fixture.gridSize.width
    const depth = fixture.gridSize.depth
    const tiles = rasterizeLine(
      fenceState.start.x,
      fenceState.start.y,
      fenceState.end.x,
      fenceState.end.y,
      step,
    )

    withBatchedUndo(() => {
      for (const t of tiles) {
        const state = useEditorStore.getState()
        const occ = buildOccupancyGrid(state.placedItems, fixtureMap, 'ground')
        const { width: gw, depth: gd } = state.gridSize
        if (checkCanPlace(occ, t.x, t.y, step, depth, gw, gd)) {
          state.placeItem({
            fixtureId: fixture.id,
            x: t.x,
            y: t.y,
            rotation: 0,
            layer: 'ground',
            isSystem: false,
          })
          continue
        }
        if (state.overwriteEnabled) {
          const idsToRemove = new Set<string>()
          for (let dx = 0; dx < step; dx++) {
            for (let dy = 0; dy < depth; dy++) {
              const id = occ.get(`${t.x + dx},${t.y + dy}`)
              if (id) idsToRemove.add(id)
            }
          }
          for (const id of idsToRemove) state.removeItem(id)
          const fresh = buildOccupancyGrid(
            useEditorStore.getState().placedItems,
            fixtureMap,
            'ground',
          )
          if (checkCanPlace(fresh, t.x, t.y, step, depth, gw, gd)) {
            useEditorStore.getState().placeItem({
              fixtureId: fixture.id,
              x: t.x,
              y: t.y,
              rotation: 0,
              layer: 'ground',
              isSystem: false,
            })
          }
        }
        // overwrite=OFF + 被占 → 跳过该 tile
      }
    })

    setFenceState({ phase: 'idle', start: null, end: null })
  }, [fenceState, activeFenceFixture, fixtureMap])

  // ======== 取消（返回 boolean 供 useKeyboard 判断是否吞 Escape） ========
  const cancelFenceLine = useCallback((): boolean => {
    if (fenceState.phase === 'idle') return false
    setFenceState({ phase: 'idle', start: null, end: null })
    return true
  }, [fenceState.phase])

  return {
    fenceState,
    activeFenceFixture,
    handleFenceClick,
    handleFenceMouseMove,
    confirmFenceLine,
    cancelFenceLine,
  }
}
