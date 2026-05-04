// ======== 编辑器主布局（Phase 7 重构） ========
// INPUT: editorStore（chrome state）, useFixtureData hook
// OUTPUT: 画布全屏 + 六个绝对定位 chrome 槽位（A–F），槽内容由后续 plan 02–06 填充
// POS: src/components/layout/EditorLayout.tsx — 编辑器页面骨架（chrome shell）

import { Toolbar } from '../toolbar/Toolbar'
import { Hotbar } from '../hotbar/Hotbar'
import { CatalogSidebar } from '../catalog/CatalogSidebar'
import { EditorCanvas } from '../canvas/EditorCanvas'
import { CostPanel } from '../costs/CostPanel'
import { TopRail } from '../chrome/TopRail'
import { useFixtureData } from '../../hooks/useFixtureData'
import { useEditorStore } from '../../stores/editorStore'

export function EditorLayout() {
  const { fixtures, mainGenres, fixtureMap, costIndex, loading, error } =
    useFixtureData()
  const catalogCollapsed = useEditorStore((s) => s.catalogCollapsed)
  const costPanelOpen = useEditorStore((s) => s.costPanelOpen)

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-cream"
      style={{ background: '#fff8e7' }}
    >
      {/* Canvas fills entire viewport — chrome floats over it */}
      <div className="absolute inset-0">
        <EditorCanvas fixtureMap={fixtureMap} />
      </div>

      {/* Slot A — Top rail (h:44, top:16, left:16, right:16) */}
      <div
        data-chrome-slot="top-rail"
        className="absolute z-20"
        style={{ top: 16, left: 16, right: 16, height: 44 }}
      >
        {!loading && !error && (
          <TopRail fixtureMap={fixtureMap} costIndex={costIndex} />
        )}
      </div>

      {/* Transitional Slot — legacy Toolbar (compact) for tool/overwrite/undo/redo
          until plan 04 replaces it with the Floatbar. Positioned just right of
          the catalog rail (left:360 = 16 + 320 + 24 sm-gap snapped to 32). */}
      <div
        data-chrome-slot="legacy-tools"
        className="absolute z-20"
        style={{ top: 76, left: 360 }}
      >
        <Toolbar compact />
      </div>

      {/* Slot B — Catalog (top:76, left:16, h:740, w: 320|72) */}
      {!loading && !error && (
        <div
          data-chrome-slot="catalog"
          className="absolute z-10"
          style={{
            top: 76,
            left: 16,
            height: 740,
            width: catalogCollapsed ? 72 : 320,
            transition: 'width 0.22s ease',
          }}
        >
          <CatalogSidebar
            fixtures={fixtures}
            mainGenres={mainGenres}
            fixtureMap={fixtureMap}
          />
        </div>
      )}

      {/* Slot C — Cost panel (top:76, right:16, w:320, h:580) — only when open */}
      {!loading && !error && costPanelOpen && (
        <div
          data-chrome-slot="cost-panel"
          className="absolute z-10"
          style={{ top: 76, right: 16, width: 320, height: 580 }}
        >
          <CostPanel fixtureMap={fixtureMap} costIndex={costIndex} />
        </div>
      )}

      {/* Slot D — Floatbar (bottom:120, centered) */}
      <div
        data-chrome-slot="floatbar"
        className="absolute z-20"
        style={{ bottom: 120, left: '50%', transform: 'translateX(-50%)' }}
      >
        {/* Plan 04 mounts FloatbarToolPill here */}
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
        {/* Plan 05 mounts ZoomDock here */}
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
  )
}
