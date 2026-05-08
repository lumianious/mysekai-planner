// ======== 虚拟化缩略图网格 ========
// INPUT: filteredFixtures, activeFixtureId, mainGenres?（仅搜索激活时传入，用于渲染面包屑）
// OUTPUT: 使用 TanStack Virtual 的 3 列虚拟化网格；mainGenres 存在时每 tile 渲染 mainGenre 面包屑
// POS: src/components/catalog/CatalogGrid.tsx — 家具缩略图虚拟滚动列表

import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { Fixture, FixtureMainGenre } from '../../types/editor'
import { CatalogItem } from './CatalogItem'

interface CatalogGridProps {
  fixtures: Fixture[]
  activeFixtureId: number | null
  mainGenres?: FixtureMainGenre[]
}

const COLUMNS = 3

export function CatalogGrid({
  fixtures,
  activeFixtureId,
  mainGenres,
}: CatalogGridProps) {
  // mainGenreId → name 索引（仅搜索激活时构建，避免 idle 路径开销）
  const mainGenreNameById = useMemo(() => {
    if (!mainGenres) return null
    const m = new Map<number, string>()
    for (const g of mainGenres) m.set(g.id, g.name)
    return m
  }, [mainGenres])
  const parentRef = useRef<HTMLDivElement>(null)
  const rowCount = Math.ceil(fixtures.length / COLUMNS)

  // jsdom 测试环境下 scroll element clientHeight=0，virtualizer 默认会用真实测量
  // 把首屏 visible range 算空。在测试环境（typeof window.ResizeObserver 不可信、
  // 元素 boundingRect 全 0）下提供一个非零 initialRect + 自定义 observeElementRect
  // 让首屏至少渲染 overscan 行，使虚拟列表对 RTL 测试可见。
  const isTestEnv =
    typeof window !== 'undefined' && typeof process !== 'undefined' &&
    process.env?.NODE_ENV === 'test'
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 5,
    initialRect: { width: 248, height: 740 },
    ...(isTestEnv
      ? {
          observeElementRect: (_instance, cb) => {
            cb({ width: 248, height: 740 })
            return () => {}
          },
        }
      : {}),
  })

  return (
    <Tooltip.Provider delayDuration={400}>
      <div
        ref={parentRef}
        className="h-full overflow-auto px-2 pt-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#3a3a56 transparent' }}
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
                <div className="grid grid-cols-3 gap-1.5">
                  {rowFixtures.map((fixture) => (
                    <CatalogItem
                      key={fixture.id}
                      fixture={fixture}
                      isActive={fixture.id === activeFixtureId}
                      breadcrumbMainGenreName={
                        mainGenreNameById?.get(
                          fixture.mysekaiFixtureMainGenreId,
                        ) ?? null
                      }
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-[10px] text-muted/50 text-center py-2">
          {fixtures.length} 件
        </p>
      </div>
    </Tooltip.Provider>
  )
}
