// ======== 目录缩略图卡片 ========
// INPUT: fixture 数据, isActive 选中状态
// OUTPUT: 带尺寸徽章、Tooltip、热栏绑定的缩略图卡片
// POS: src/components/catalog/CatalogItem.tsx — 单个家具目录项

import { useState, useCallback } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { Fixture } from '../../types/editor'
import { getThumbnailUrl } from '../../data/fixtures'
import { getFixtureColor } from '../../utils/color'
import { useEditorStore } from '../../stores/editorStore'

interface CatalogItemProps {
  fixture: Fixture
  isActive: boolean
}

export function CatalogItem({ fixture, isActive }: CatalogItemProps) {
  const [imgError, setImgError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const setActiveFixture = useEditorStore((s) => s.setActiveFixture)
  const assignHotbar = useEditorStore((s) => s.assignHotbar)

  // 点击：设为当前家具并进入 stamp 模式
  const handleClick = useCallback(() => {
    setActiveFixture(fixture.id)
  }, [fixture.id, setActiveFixture])

  // 热栏绑定：悬停时按 1-9 分配到对应热栏槽位
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isHovered) return
      const key = e.key
      if (key >= '1' && key <= '9') {
        e.preventDefault()
        e.stopPropagation()
        assignHotbar(parseInt(key, 10), fixture.id)
      }
    },
    [isHovered, fixture.id, assignHotbar],
  )

  const fallbackColor = getFixtureColor(
    fixture.mysekaiFixtureMainGenreId,
    fixture.colorCode,
  )

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div
          className={`aspect-square rounded-md bg-surface-hover overflow-hidden cursor-pointer relative
            ${isActive ? 'ring-2 ring-accent' : 'hover:ring-1 hover:ring-accent/50'}`}
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label={fixture.name}
        >
          {/* CDN 缩略图 / 备用颜色块 */}
          {!imgError ? (
            <img
              src={getThumbnailUrl(fixture.assetbundleName)}
              alt={fixture.name}
              loading="lazy"
              className="w-full h-full object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ backgroundColor: fallbackColor }}
            />
          )}

          {/* 尺寸徽章 (WxD) */}
          <span className="absolute bottom-0 right-0 px-1 py-0.5 text-xs bg-black/60 text-white rounded-tl-sm">
            {fixture.gridSize.width}x{fixture.gridSize.depth}
          </span>
        </div>
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          className="rounded-md bg-surface-raised border border-default px-2 py-1.5 shadow-md z-50"
          sideOffset={6}
        >
          {/* 名称 */}
          <div className="text-sm font-normal text-primary">
            {fixture.name}
          </div>
          {/* 尺寸 */}
          <div className="text-xs text-muted">
            {fixture.gridSize.width}x{fixture.gridSize.depth}
          </div>
          <Tooltip.Arrow className="fill-surface-raised" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
