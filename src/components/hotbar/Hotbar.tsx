// ======== 热栏（Slot E） ========
// INPUT: useEditorStore（hotbar, activeFixtureId）, fixtureMap（缩略图 URL）
// OUTPUT: 内容宽度居中白色药丸；9 个 72×72 槽位
// POS: src/components/hotbar/Hotbar.tsx — Phase 7 重构后的热栏

import { useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { getThumbnailUrl } from '../../data/fixtures'
import { getSpriteEntrySync } from '../../data/spriteManifest'
import { getFixtureColor } from '../../utils/color'
import type { Fixture } from '../../types/editor'

interface HotbarProps {
  fixtureMap: Map<number, Fixture>
}

// ======== 槽位缩略图 ========
// 与 CatalogItem 相同的三段式策略：本地清单 → CDN webp → 颜色块占位
function HotbarThumbnail({ fixture }: { fixture: Fixture }) {
  const [imgError, setImgError] = useState(false)
  const manifestEntry = getSpriteEntrySync(fixture.assetbundleName)
  const localThumb = manifestEntry?.thumbnails?.[0]
  const src = localThumb
    ? `${import.meta.env.BASE_URL}${localThumb}`
    : getThumbnailUrl(fixture.assetbundleName)

  if (imgError) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          backgroundColor: getFixtureColor(
            fixture.mysekaiFixtureMainGenreId,
            fixture.colorCode,
          ),
          borderRadius: 'var(--radius-tile)',
        }}
      >
        <span
          className="text-[8px] text-white/80 text-center leading-tight px-0.5 line-clamp-2"
        >
          {fixture.name}
        </span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={fixture.name}
      className="w-full h-full object-contain"
      style={{ borderRadius: 'var(--radius-tile)', background: '#ffffff' }}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
    />
  )
}

export function Hotbar({ fixtureMap }: HotbarProps) {
  const hotbar = useEditorStore((s) => s.hotbar)
  const activeFixtureId = useEditorStore((s) => s.activeFixtureId)
  const activateHotbar = useEditorStore((s) => s.activateHotbar)

  return (
    <div
      className="flex items-center"
      style={{
        background: 'linear-gradient(180deg, #ffffff, #fbf6ea)',
        borderRadius: 'var(--radius-panel)',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--color-panel-edge)',
        padding: 8,
        gap: 8,
      }}
    >
      {hotbar.map((slot, index) => {
        const slotNumber = index + 1
        const isActive = slot.fixtureId !== null && slot.fixtureId === activeFixtureId
        const isEmpty = slot.fixtureId === null
        const fixture = slot.fixtureId !== null ? fixtureMap.get(slot.fixtureId) ?? null : null

        return (
          <button
            key={slotNumber}
            type="button"
            className="relative overflow-hidden"
            style={{
              width: 72,
              height: 72,
              borderRadius: 'var(--radius-tile)',
              background: isActive
                ? 'linear-gradient(180deg, #9bdcff, #69c8ff)'
                : isEmpty
                  ? 'rgba(255,255,255,.6)'
                  : '#ffffff',
              border: isActive ? '0' : '1px solid var(--color-panel-edge)',
              boxShadow: isActive
                ? '0 0 0 3px rgba(105,200,255,.4)'
                : 'none',
              cursor: 'pointer',
              transition: 'transform .12s ease, box-shadow .12s ease, background .12s ease',
            }}
            onClick={() => activateHotbar(slotNumber, fixture)}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
            aria-label={isEmpty ? '空きスロット' : (fixture?.name ?? `スロット ${slotNumber}`)}
          >
            {!isEmpty && fixture && <HotbarThumbnail fixture={fixture} />}
            {/* Slot number badge — top-left */}
            <span
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                padding: '0 4px',
                borderRadius: 'var(--radius-badge)',
                background: isEmpty ? 'transparent' : 'rgba(31,53,86,.6)',
                color: isEmpty ? 'var(--color-muted)' : '#ffffff',
                fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                fontWeight: 800,
                fontSize: 10,
                lineHeight: 1.1,
              }}
            >
              {slotNumber}
            </span>
            {isEmpty && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-muted)',
                  fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                  fontWeight: 800,
                  fontSize: 16,
                }}
              >
                ＋
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
