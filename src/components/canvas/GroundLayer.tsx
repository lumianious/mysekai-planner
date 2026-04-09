// ======== 地面图层 ========
// INPUT: ground 层放置物品, fixtureMap, toolMode, selectedItemId, stageScale
// OUTPUT: Konva Layer 渲染地面物品（道路、地毯等）
// POS: src/components/canvas/GroundLayer.tsx — 地面物品渲染层（位于家具层之下）

import { Layer } from 'react-konva'
import { PlacedItem as PlacedItemComponent } from './PlacedItem'
import type { PlacedItem, Fixture, ToolMode } from '../../types/editor'

interface GroundLayerProps {
  items: PlacedItem[]
  fixtureMap: Map<number, Fixture>
  toolMode: ToolMode
  selectedItemId: string | null
  stageScale: number
  onItemClick: (id: string) => void
  onItemDragEnd: (id: string, x: number, y: number) => void
}

export function GroundLayer({
  items,
  fixtureMap,
  toolMode,
  selectedItemId,
  stageScale,
  onItemClick,
  onItemDragEnd,
}: GroundLayerProps) {
  return (
    <Layer>
      {items.map((item) => {
        const fixture = fixtureMap.get(item.fixtureId)
        if (!fixture) return null
        return (
          <PlacedItemComponent
            key={item.id}
            item={item}
            fixture={fixture}
            isSelected={item.id === selectedItemId}
            toolMode={toolMode}
            stageScale={stageScale}
            onItemClick={onItemClick}
            onItemDragEnd={onItemDragEnd}
          />
        )
      })}
    </Layer>
  )
}
