// ======== 目录缩略图卡片 ========
// INPUT: fixture 数据, isActive 选中状态
// OUTPUT: 带尺寸徽章、Tooltip 的缩略图卡片，悬停时设置全局 hoveredFixtureId
// POS: src/components/catalog/CatalogItem.tsx — 单个家具目录项

import { useState, useCallback } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { Fixture } from '../../types/editor'
import { getThumbnailUrl } from '../../data/fixtures'
import { getSpriteEntrySync } from '../../data/spriteManifest'
import { getFixtureColor } from '../../utils/color'
import { useEditorStore, setHoveredFixtureId } from '../../stores/editorStore'

interface CatalogItemProps {
  fixture: Fixture
  isActive: boolean
  // Phase 9 D-14：搜索激活时由父级传入 mainGenre 名以渲染面包屑；否则 null/undefined → 不渲染
  breadcrumbMainGenreName?: string | null
}

export function CatalogItem({
  fixture,
  isActive,
  breadcrumbMainGenreName,
}: CatalogItemProps) {
  const [imgError, setImgError] = useState(false)
  const setActiveFixture = useEditorStore((s) => s.setActiveFixture)

  const handleClick = useCallback(() => {
    // D-30 / D-39: 传 fixture 让 store 根据 handleType 路由 brush vs stamp
    setActiveFixture(fixture.id, fixture)
  }, [fixture, setActiveFixture])

  const fallbackColor = getFixtureColor(
    fixture.mysekaiFixtureMainGenreId,
    fixture.colorCode,
  )

  // Phase 5：优先用本地清单缩略图（cyan 已去背），未命中再回退到 CDN webp
  const manifestEntry = getSpriteEntrySync(fixture.assetbundleName)
  const localThumb = manifestEntry?.thumbnails?.[0]
  const thumbnailSrc = localThumb
    ? `${import.meta.env.BASE_URL}${localThumb}`
    : getThumbnailUrl(fixture.assetbundleName)

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div
          className={`aspect-square rounded-lg overflow-hidden cursor-pointer relative
            transition-all duration-100
            ${isActive
              ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface-raised'
              : 'hover:ring-1 hover:ring-accent/40'
            }`}
          onClick={handleClick}
          onMouseEnter={() => setHoveredFixtureId(fixture.id)}
          onMouseLeave={() => setHoveredFixtureId(null)}
          role="button"
          aria-label={fixture.name}
        >
          {/* CDN 缩略图 / 备用颜色块 */}
          {!imgError ? (
            <img
              src={thumbnailSrc}
              alt={fixture.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain bg-surface"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: fallbackColor }}
            >
              <span className="text-[8px] text-white/70 text-center leading-tight px-0.5 line-clamp-2">
                {fixture.name}
              </span>
            </div>
          )}

          {/* 尺寸徽章 */}
          <span className="absolute bottom-0 right-0 px-1 text-[10px] bg-black/70 text-white/90 rounded-tl-md font-mono">
            {fixture.gridSize.width}×{fixture.gridSize.depth}
          </span>

          {/* Phase 9 D-14：搜索激活时显示 mainGenre 面包屑 */}
          {breadcrumbMainGenreName && (
            <span
              aria-hidden
              className="absolute"
              style={{
                left: 2,
                bottom: 2,
                padding: '2px 6px',
                background: '#fff8e7',
                color: '#4f6a8e',
                fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                fontWeight: 800,
                fontSize: 11,
                lineHeight: 1,
                borderRadius: 6,
                boxShadow: 'var(--shadow-sm)',
                pointerEvents: 'none',
              }}
            >
              {breadcrumbMainGenreName}
            </span>
          )}
        </div>
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          className="rounded-lg bg-surface-raised border border-default px-3 py-2 shadow-xl z-50 max-w-[200px]"
          sideOffset={6}
          side="right"
        >
          <div className="text-sm text-primary font-medium">
            {fixture.name}
          </div>
          <div className="text-xs text-muted mt-0.5">
            {fixture.gridSize.width}×{fixture.gridSize.depth} タイル
          </div>
          <Tooltip.Arrow className="fill-surface-raised" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
