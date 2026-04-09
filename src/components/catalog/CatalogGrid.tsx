// ======== 虚拟化缩略图网格 ========
// INPUT: filteredFixtures, activeFixtureId
// OUTPUT: 使用 TanStack Virtual 的 2 列虚拟化网格
// POS: src/components/catalog/CatalogGrid.tsx — 家具缩略图虚拟滚动列表

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { Fixture } from '../../types/editor'
import { CatalogItem } from './CatalogItem'

interface CatalogGridProps {
  fixtures: Fixture[]
  activeFixtureId: number | null
}

const COLUMNS = 2

export function CatalogGrid({ fixtures, activeFixtureId }: CatalogGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowCount = Math.ceil(fixtures.length / COLUMNS)

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 152,
    overscan: 5,
  })

  return (
    <Tooltip.Provider delayDuration={400}>
      <div
        ref={parentRef}
        className="h-full overflow-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#3a3a52 transparent' }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            position: 'relative',
            width: '100%',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const startIdx = virtualRow.index * COLUMNS
            const rowFixtures = fixtures.slice(startIdx, startIdx + COLUMNS)

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: virtualRow.start,
                  width: '100%',
                  height: virtualRow.size,
                }}
              >
                <div className="grid grid-cols-2 gap-2 px-2">
                  {rowFixtures.map((fixture) => (
                    <CatalogItem
                      key={fixture.id}
                      fixture={fixture}
                      isActive={fixture.id === activeFixtureId}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* 总数 */}
        <p className="text-xs text-muted text-center py-2">
          {fixtures.length} 件
        </p>
      </div>
    </Tooltip.Provider>
  )
}
