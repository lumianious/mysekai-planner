// ======== 热栏 ========
// INPUT: editorStore（hotbar, activeFixtureId）, fixtureMap（缩略图 URL 查找）
// OUTPUT: 底部 9 格快速选择栏
// POS: src/components/hotbar/Hotbar.tsx — 编辑器底部热栏

import { useEditorStore } from '../../stores/editorStore'
import { getThumbnailUrl } from '../../data/fixtures'
import type { Fixture } from '../../types/editor'

interface HotbarProps {
  fixtureMap: Map<number, Fixture>
}

export function Hotbar({ fixtureMap }: HotbarProps) {
  const hotbar = useEditorStore((s) => s.hotbar)
  const activeFixtureId = useEditorStore((s) => s.activeFixtureId)
  const activateHotbar = useEditorStore((s) => s.activateHotbar)

  return (
    <div className="h-14 bg-surface-raised border-t border-default flex items-center justify-center gap-2 flex-shrink-0">
      {hotbar.map((slot, index) => {
        const slotNumber = index + 1
        const isActive = slot.fixtureId !== null && slot.fixtureId === activeFixtureId
        const isEmpty = slot.fixtureId === null
        const fixture = slot.fixtureId !== null ? fixtureMap.get(slot.fixtureId) : null

        return (
          <button
            key={slotNumber}
            className={`w-12 h-12 rounded-md relative flex items-center justify-center
              cursor-pointer transition-colors overflow-hidden
              ${isActive
                ? 'border-2 border-accent ring-1 ring-accent/30 bg-surface'
                : 'border border-default bg-surface hover:bg-surface-hover'
              }`}
            onClick={() => activateHotbar(slotNumber)}
          >
            {isEmpty ? (
              // 空槽位 — 显示编号
              <span className="text-muted text-xs">{slotNumber}</span>
            ) : (
              // 已分配槽位 — 显示 CDN 缩略图 + 编号徽标
              <>
                {fixture && (
                  <img
                    src={getThumbnailUrl(fixture.assetbundleName)}
                    alt={fixture.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {!fixture && (
                  <span className="text-muted text-xs">{slotNumber}</span>
                )}
                <span className="absolute top-0 left-0 text-xs bg-black/60 text-white px-1 rounded-br-sm">
                  {slotNumber}
                </span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
