// ======== 编辑器状态管理（临时桩）========
// 此文件为 Plan 03 创建的最小桩，提供 UI 组件所需的状态字段。
// Plan 02 的完整 store 会覆盖此文件。

import { create } from 'zustand'
import type {
  AreaLevel,
  GridSize,
  ToolMode,
  HotbarSlot,
  PlacedItem,
  Rotation,
} from '../types/editor'
import { AREA_LEVELS } from '../data/areaLevels'

// ======== Store 接口 ========

interface EditorStore {
  // -- 核心状态 --
  areaLevel: AreaLevel
  gridSize: GridSize
  placedItems: Record<string, PlacedItem>
  selectedItemId: string | null
  toolMode: ToolMode
  activeFixtureId: number | null
  overwriteEnabled: boolean
  previewRotation: Rotation
  hotbar: HotbarSlot[]
  isEditorReady: boolean

  // -- 动作 --
  setToolMode: (mode: ToolMode) => void
  setAreaLevel: (level: AreaLevel) => void
  toggleOverwrite: () => void
  activateHotbar: (slot: number) => void
  startEditor: (level: AreaLevel) => void
}

// ======== Store 实例 ========

export const useEditorStore = create<EditorStore>((set) => ({
  areaLevel: 1,
  gridSize: AREA_LEVELS[1].gridSize,
  placedItems: {},
  selectedItemId: null,
  toolMode: 'select',
  activeFixtureId: null,
  overwriteEnabled: false,
  previewRotation: 0,
  hotbar: Array.from({ length: 9 }, () => ({ fixtureId: null })),
  isEditorReady: false,

  setToolMode: (mode) => set({ toolMode: mode }),

  setAreaLevel: (level) =>
    set({
      areaLevel: level,
      gridSize: AREA_LEVELS[level].gridSize,
    }),

  toggleOverwrite: () =>
    set((state) => ({ overwriteEnabled: !state.overwriteEnabled })),

  activateHotbar: (slot) =>
    set((state) => {
      const hotbarSlot = state.hotbar[slot - 1]
      if (!hotbarSlot || hotbarSlot.fixtureId === null) return state
      return { activeFixtureId: hotbarSlot.fixtureId, toolMode: 'stamp' as ToolMode }
    }),

  startEditor: (level) =>
    set({
      areaLevel: level,
      gridSize: AREA_LEVELS[level].gridSize,
      isEditorReady: true,
    }),
}))
