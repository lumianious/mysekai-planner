// ======== 编辑器主布局（Phase 7 重构） ========
// INPUT: editorStore（chrome state）, useFixtureData hook
// OUTPUT: 画布全屏 + 六个绝对定位 chrome 槽位（A–F），槽内容由后续 plan 02–06 填充
// POS: src/components/layout/EditorLayout.tsx — 编辑器页面骨架（chrome shell）

import * as Tooltip from '@radix-ui/react-tooltip'
import { Hotbar } from '../hotbar/Hotbar'
import { CatalogRail } from '../chrome/CatalogRail'
import { EditorCanvas } from '../canvas/EditorCanvas'
import { CostPanelPopover } from '../chrome/CostPanelPopover'
import { TopRail } from '../chrome/TopRail'
import { FloatbarToolPill } from '../chrome/FloatbarToolPill'
import { ZoomDock } from '../chrome/ZoomDock'
import { useFixtureData } from '../../hooks/useFixtureData'
import { useEditorStore } from '../../stores/editorStore'

export function EditorLayout() {
  const { fixtures, mainGenres, fixtureMap, costIndex, loading, error } =
    useFixtureData()
  // 允许 catalog 贴到屏顶；与 top-rail 重叠时由 z-index 决定可点击性
  const catalogTop = Math.max(16, useEditorStore((s) => s.catalogTop))

  return (
    <Tooltip.Provider delayDuration={300}>
    {/* 暗绿色作为草地纹理加载前的过渡底色；草地由 GridLayer 在 Stage 内向四周延展 */}
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: '#2d5a1e' }}
    >
      {/* Canvas fills entire viewport — chrome floats over it */}
      <div className="absolute inset-0">
        <EditorCanvas fixtureMap={fixtureMap} />
      </div>

      {/* Slot A — Top rail (h:44, top:16, left:16, right:16)
          槽位本身透明、空白区让点击穿透；TopRail 的可见 pill 自行恢复 pointer-events */}
      <div
        data-chrome-slot="top-rail"
        className="absolute z-20"
        style={{
          top: 16,
          left: 16,
          right: 16,
          height: 44,
          pointerEvents: 'none',
        }}
      >
        {!loading && !error && (
          <TopRail fixtureMap={fixtureMap} costIndex={costIndex} />
        )}
      </div>

      {/* Slot B — Catalog (top: catalogTop, left:16, h:740)
          catalogTop 来自 store，由 CatalogRail 顶部的 grip 拖拽更新。
          顶栏槽位是透明容器，可见 pill 都在右侧 —— catalog 在左侧无需 z-index 让位。 */}
      {!loading && !error && (
        <div
          data-chrome-slot="catalog"
          className="absolute z-10"
          style={{ top: catalogTop, left: 16, height: 740 }}
        >
          <CatalogRail
            fixtures={fixtures}
            mainGenres={mainGenres}
            fixtureMap={fixtureMap}
          />
        </div>
      )}

      {/* Slot C — Cost panel popover (top:76, right:16) — popover handles its own mount/unmount lifecycle */}
      {!loading && !error && (
        <div
          data-chrome-slot="cost-panel"
          className="absolute z-10"
          style={{ top: 76, right: 16 }}
        >
          <CostPanelPopover fixtureMap={fixtureMap} costIndex={costIndex} />
        </div>
      )}

      {/* Slot D — Floatbar (bottom:120, drag-snap left/center/right)
          Slot is full-width with pointer-events:none so the empty area passes
          clicks through; the FloatbarToolPill itself sets pointerEvents:'auto'. */}
      <div
        data-chrome-slot="floatbar"
        className="absolute z-20"
        style={{ bottom: 120, left: 0, right: 0, pointerEvents: 'none' }}
      >
        <FloatbarToolPill />
      </div>

      {/* Slot E — Hotbar (bottom:16, centered) */}
      <div
        data-chrome-slot="hotbar"
        className="absolute z-10"
        style={{ bottom: 16, left: '50%', transform: 'translateX(-50%)' }}
      >
        <Hotbar fixtureMap={fixtureMap} />
      </div>

      {/* Slot F — Zoom dock (bottom:16, right:16, h:44) */}
      <div
        data-chrome-slot="zoom-dock"
        className="absolute z-20"
        style={{ bottom: 16, right: 16, height: 44 }}
      >
        <ZoomDock />
      </div>

      {/* Loading / error states keep their existing position over the catalog slot */}
      {loading && (
        <div
          className="absolute z-30"
          style={{ top: 76, left: 16, width: 320, height: 740 }}
        >
          <div
            className="w-full h-full bg-panel rounded-[22px] flex items-center justify-center"
            style={{ background: '#ffffff', boxShadow: 'var(--shadow-lg)' }}
          >
            <p className="text-muted text-sm">加载中...</p>
          </div>
        </div>
      )}
      {error && (
        <div
          className="absolute z-30"
          style={{ top: 76, left: 16, width: 320, height: 740 }}
        >
          <div
            className="w-full h-full bg-panel rounded-[22px] flex items-center justify-center px-4"
            style={{ background: '#ffffff', boxShadow: 'var(--shadow-lg)' }}
          >
            <p className="text-destructive text-sm text-center">{error}</p>
          </div>
        </div>
      )}
    </div>
    </Tooltip.Provider>
  )
}
