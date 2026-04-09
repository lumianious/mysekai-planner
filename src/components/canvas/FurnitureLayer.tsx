// ======== 家具图层 ========
// INPUT: furniture 层放置物品, fixtureMap, toolMode, selectedItemId, stageScale
// OUTPUT: Konva Layer 渲染家具物品
// POS: src/components/canvas/FurnitureLayer.tsx — 家具物品渲染层（位于地面层之上）

import { Layer } from 'react-konva'
import { PlacedItem as PlacedItemComponent } from './PlacedItem'
import type { PlacedItem, Fixture, ToolMode } from '../../types/editor'

interface FurnitureLayerProps {
  items: PlacedItem[]
  fixtureMap: Map<number, Fixture>
  toolMode: ToolMode
  selectedItemId: string | null
  stageScale: number
  onItemClick: (id: string) => void
  onItemDragEnd: (id: string, x: number, y: number) => void
}

export function FurnitureLayer({
  items,
  fixtureMap,
  toolMode,
  selectedItemId,
  stageScale,
  onItemClick,
  onItemDragEnd,
}: FurnitureLayerProps) {
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
