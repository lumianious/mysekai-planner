// ======== 应用解码后的蓝图到 store ========
// INPUT: DecodedBlueprint
// OUTPUT: store setState 副作用 + 清空 undo 历史
// POS: src/persistence/applyBlueprint.ts — 被 ShareButton 的 import 流程和 useImportFromURL 调用

import { useEditorStore } from '../stores/editorStore'
import { getGridSize } from '../data/areaLevels'
import type { DecodedBlueprint } from './decodeBlueprint'

export function applyBlueprint(payload: DecodedBlueprint): void {
  useEditorStore.setState({
    placedItems: payload.placedItems,
    placedEdges: payload.placedEdges,
    areaLevel: payload.areaLevel,
    gridSize: getGridSize(payload.areaLevel),
    selectedItemId: null,
    isEditorReady: true,
  })
  // 导入后清空 undo 历史 —— 用户不应能 undo 跨越导入边界
  useEditorStore.temporal.getState().clear()
}
