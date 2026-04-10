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
    <div className="h-12 bg-surface-raised border-t border-default flex items-center justify-center gap-1 flex-shrink-0 px-4">
      {hotbar.map((slot, index) => {
        const slotNumber = index + 1
        const isActive = slot.fixtureId !== null && slot.fixtureId === activeFixtureId
        const isEmpty = slot.fixtureId === null
        const fixture = slot.fixtureId !== null ? fixtureMap.get(slot.fixtureId) : null

        return (
          <button
            key={slotNumber}
            className={`w-10 h-10 rounded-lg relative flex items-center justify-center
              cursor-pointer transition-all duration-100 overflow-hidden
              ${isActive
                ? 'ring-2 ring-accent bg-surface shadow-[0_0_8px_rgba(57,197,187,0.3)]'
                : isEmpty
                  ? 'bg-surface/50 border border-default/50 hover:bg-surface-hover'
                  : 'bg-surface border border-default hover:border-accent/50'
              }`}
            onClick={() => activateHotbar(slotNumber)}
          >
            {isEmpty ? (
              <span className="text-muted/30 text-xs font-mono">{slotNumber}</span>
            ) : (
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
                <span className="absolute top-0 left-0 text-[9px] bg-black/70 text-white/80 px-1 rounded-br-md font-mono">
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
