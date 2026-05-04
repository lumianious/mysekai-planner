---
phase: 07-editor-chrome-redesign
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - src/main.tsx
  - src/index.css
  - src/types/editor.ts
  - src/stores/editorStore.ts
  - src/components/layout/EditorLayout.tsx
autonomous: true
requirements: [SC-7]
must_haves:
  truths:
    - "App boots with Nunito + M PLUS Rounded 1c fonts loaded locally (no Google Fonts request)"
    - "Tailwind @theme block exposes the new light cream + sky-blue palette tokens"
    - "useEditorStore exposes catalogCollapsed / costPanelOpen / floatbarPosition / activeCategory with documented defaults and persistence"
    - "EditorLayout becomes a viewport-filling shell with absolutely-positioned chrome slots reserved for downstream plans"
  artifacts:
    - path: "src/index.css"
      provides: "design tokens (colors, shadows, radii, fonts)"
      contains: "--font-display"
    - path: "src/main.tsx"
      provides: "fontsource self-host imports"
      contains: "@fontsource/nunito"
    - path: "src/stores/editorStore.ts"
      provides: "chrome state slice"
      contains: "catalogCollapsed"
    - path: "src/components/layout/EditorLayout.tsx"
      provides: "absolute-positioning chrome shell"
      contains: "absolute"
  key_links:
    - from: "src/main.tsx"
      to: "@fontsource/nunito/700.css"
      via: "side-effect import"
      pattern: "@fontsource/nunito"
    - from: "src/index.css"
      to: "Tailwind v4"
      via: "@theme"
      pattern: "@theme"
    - from: "src/stores/editorStore.ts"
      to: "persist middleware partialize"
      via: "added field whitelist"
      pattern: "catalogCollapsed"
---

<objective>
Lay the typography + design-token + state-shell foundation for the Phase 7 chrome redesign. Self-host the two declared font axes, rewrite the existing dark-theme `@theme` block to the new light cream + sky-blue palette, add the four chrome state fields to `useEditorStore`, and rewrite `EditorLayout` into an absolutely-positioned shell that downstream plans fill in. After this plan the app should still build and render the canvas, but the surrounding chrome slots will be empty placeholders ready for plans 02–06.

Purpose: Every other plan in this phase consumes these tokens, fonts, and state fields. Building them once removes per-plan token drift.
Output: Reskin-ready repo with new design tokens, fonts loaded, store extended, and a layout shell that no longer fights for space against the canvas.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md
@CLAUDE.md
@src/index.css
@src/main.tsx
@src/stores/editorStore.ts
@src/components/layout/EditorLayout.tsx
@src/types/editor.ts

<interfaces>
<!-- Existing store shape relevant downstream (extracted from editorStore.ts + types/editor.ts) -->

EditorState already includes:
- toolMode: ToolMode  // 'select' | 'stamp' | 'brush' | 'remove'
- overwriteEnabled: boolean
- areaLevel: AreaLevel  // 1 | 2 | 3 | 4 | 5
- gridSize: { width: number; depth: number }
- placedItems: Record<string, PlacedItem>
- placedEdges: Record<string, PlacedEdge>
- stageScale: number
- hotbar: Array<{ fixtureId: number | null }>
- activeFixtureId: number | null
- inventory: Record<number, number>
- isEditorReady: boolean

Existing actions: setToolMode, toggleOverwrite, setAreaLevel, setStageScale, activateHotbar, setActiveFixture, ...

Persist partialize already whitelists: placedItems, placedEdges, areaLevel, gridSize, inventory, isEditorReady.
Temporal partialize tracks ONLY placedItems + placedEdges (chrome state will not enter undo history — correct).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Self-host fonts + rewrite Tailwind theme tokens</name>
  <read_first>
    - src/index.css (current dark-theme @theme block — to be replaced wholesale)
    - src/main.tsx (entry point where fontsource imports go)
    - .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md §Design System, §Spacing Scale, §Border Radii, §Typography, §Color, §Borders & shadows
    - package.json (verify @fontsource packages NOT yet present)
  </read_first>
  <files>
    - package.json
    - src/main.tsx
    - src/index.css
  </files>
  <action>
    Step 1 — Add fontsource deps. Run:
      pnpm add @fontsource/nunito@^5 @fontsource/m-plus-rounded-1c@^5
    (Per UI-SPEC §Design System the 900 axis is NOT loaded — load only the 700 axis for Nunito and the 800 axis for M PLUS Rounded 1c.)

    Step 2 — Edit `src/main.tsx`. Add these side-effect imports immediately after `import './index.css'`:
      import '@fontsource/nunito/700.css'
      import '@fontsource/m-plus-rounded-1c/800.css'

    Step 3 — REPLACE the entire contents of `src/index.css` with the block below (verbatim — every value pulled from UI-SPEC). Keep the existing `@import "tailwindcss";` first line.

      @import "tailwindcss";

      @theme {
        /* ----- Fonts (Phase 7) ----- */
        --font-sans: 'Nunito', 'M PLUS Rounded 1c', system-ui, sans-serif;
        --font-display: 'M PLUS Rounded 1c', 'Nunito', system-ui, sans-serif;

        /* ----- Color: dominant 60% (panels) ----- */
        --color-panel: #ffffff;
        --color-panel-2: #fbf6ea;

        /* ----- Color: secondary 30% (cream + tan) ----- */
        --color-cream: #fff8e7;
        --color-cream-hover: #f1efe5;
        --color-tan-1: #ecdfb8;
        --color-tan-2: #e0cf9a;

        /* ----- Color: accent 10% (sky) ----- */
        --color-sky: #69c8ff;
        --color-sky-deep: #2ea8ee;
        --color-sky-soft: #9bdcff;

        /* ----- Status / destructive ----- */
        --color-danger: #ff7a8a;
        --color-danger-hot: #ff6f6f;
        --color-danger-warm: #ff8c8c;
        --color-shortfall: #d33;
        --color-green: #8fdf6c;
        --color-green-deep: #5db232;
        --color-surplus: #2c8a3a;

        /* ----- Text ----- */
        --color-ink: #1f3556;
        --color-ink-2: #4f6a8e;
        --color-muted: #8aa0bd;
        --color-ink-on-sky: #0e3955;

        /* ----- Borders ----- */
        --color-panel-edge: rgba(60,80,140,.14);
        --color-tan-edge: rgba(120,90,30,.18);

        /* ----- Legacy semantic remap (so existing classnames like bg-surface still resolve) ----- */
        --color-surface: #ffffff;
        --color-surface-raised: #fbf6ea;
        --color-surface-hover: #f1efe5;
        --color-surface-active: #ecdfb8;
        --color-accent: #69c8ff;
        --color-accent-dim: rgba(105,200,255,.4);
        --color-destructive: #ff7a8a;
        --color-valid: #8fdf6c;
        --color-selection: #2ea8ee;
        --color-primary: #1f3556;
        --color-default: rgba(60,80,140,.14);

        /* ----- Spacing (4-multiple ONLY: 4/8/16/24/32/48/64) ----- */
        --space-xs: 4px;
        --space-sm: 8px;
        --space-md: 16px;
        --space-lg: 24px;
        --space-xl: 32px;

        /* ----- Border radii (independent scale; values 12/14/18/22 are radii-only) ----- */
        --radius-panel: 22px;
        --radius-search: 18px;
        --radius-pill-inner: 14px;
        --radius-tile: 12px;
        --radius-chip: 10px;
        --radius-badge: 6px;

        /* ----- Shadows ----- */
        --shadow-lg: 0 16px 36px -14px rgba(60,90,160,.30), 0 4px 12px -6px rgba(60,90,160,.18);
        --shadow-md: 0 6px 16px -8px rgba(60,90,160,.28), 0 2px 4px -2px rgba(60,90,160,.16);
        --shadow-sm: 0 2px 6px -2px rgba(60,90,160,.18);
      }

      /* Scrollbar (light theme) */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(60,80,140,.18); border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(60,80,140,.32); }

      body {
        margin: 0;
        background: #fff8e7; /* cream — see UI-SPEC §Color secondary */
        color: #1f3556;       /* --color-ink */
        font-family: 'Nunito', 'M PLUS Rounded 1c', system-ui, sans-serif;
        font-weight: 700;
        -webkit-font-smoothing: antialiased;
      }

    Step 4 — Do NOT touch any other component file in this task. Existing classnames (`bg-surface`, `text-primary`, etc.) keep their semantic meaning; the legacy remap block above remaps them to the new light-theme values.
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -20 && grep -q "@fontsource/nunito" src/main.tsx && grep -q "M PLUS Rounded 1c" src/index.css && grep -q "color-sky" src/index.css && grep -q "radius-panel: 22px" src/index.css</automated>
  </verify>
  <done>
    - `package.json` lists `@fontsource/nunito` and `@fontsource/m-plus-rounded-1c` (semver ^5).
    - `src/main.tsx` imports `@fontsource/nunito/700.css` and `@fontsource/m-plus-rounded-1c/800.css` (no other axes).
    - `src/index.css` `@theme` block contains EXACTLY these new tokens: `--color-panel`, `--color-panel-2`, `--color-cream`, `--color-tan-1`, `--color-sky`, `--color-sky-deep`, `--color-ink`, `--color-ink-2`, `--color-muted`, `--space-md: 16px`, `--space-sm: 8px`, `--radius-panel: 22px`, `--radius-search: 18px`, `--radius-pill-inner: 14px`, `--radius-tile: 12px`, `--radius-chip: 10px`, `--shadow-lg`, `--shadow-md`, `--shadow-sm`, `--font-display`, `--font-sans`.
    - Legacy remap tokens (`--color-surface`, `--color-accent`, `--color-primary`, `--color-default`) are still present so existing components don't break.
    - `pnpm build` succeeds.
  </done>
  <acceptance_criteria>
    - `grep -c "@fontsource" src/main.tsx` returns >= 2.
    - `grep "M PLUS Rounded 1c" src/index.css` finds at least one match (in `--font-display` and body fallback).
    - `grep -E "^\\s*--color-sky:\\s*#69c8ff" src/index.css` matches.
    - `grep -E "^\\s*--radius-panel:\\s*22px" src/index.css` matches.
    - `grep -E "^\\s*--shadow-md:" src/index.css` matches and the value contains `0 6px 16px -8px rgba(60,90,160,.28)`.
    - `grep -E "^\\s*--space-md:\\s*16px" src/index.css` matches; values 12, 20, 28 do NOT appear in spacing tokens (only `--radius-pill-inner: 14px` and `--radius-tile: 12px` may contain those numbers — they are radii, not spacing).
    - `pnpm build` exit code 0.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Add chrome state fields to useEditorStore</name>
  <read_first>
    - src/stores/editorStore.ts (entire file — note both partialize blocks: temporal at line ~354 and persist at line ~372)
    - src/types/editor.ts (EditorState interface)
    - .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md §State Management
    - .planning/STATE.md (Phase 03 decision: persist composed OUTSIDE temporal — must preserve)
  </read_first>
  <files>
    - src/types/editor.ts
    - src/stores/editorStore.ts
  </files>
  <action>
    Step 1 — In `src/types/editor.ts`, extend the `EditorState` interface with these UI-only fields (place near the existing UI block — `selectedItemId`, `toolMode`, etc.):

      catalogCollapsed: boolean
      costPanelOpen: boolean
      floatbarPosition: 'left' | 'center' | 'right'
      activeCategory: string

    And add corresponding setter signatures:

      setCatalogCollapsed: (collapsed: boolean) => void
      toggleCatalogCollapsed: () => void
      setCostPanelOpen: (open: boolean) => void
      toggleCostPanel: () => void
      setFloatbarPosition: (pos: 'left' | 'center' | 'right') => void
      setActiveCategory: (category: string) => void

    Step 2 — In `src/stores/editorStore.ts`, inside the `(set, get) => ({ ... })` initializer, add the four state fields with these defaults (per UI-SPEC §State Management):

      catalogCollapsed: false,
      costPanelOpen: false,
      floatbarPosition: 'center' as const,
      activeCategory: 'all',

    Add the six setters using `set(...)` patterns matching existing actions. Example:

      setCatalogCollapsed: (collapsed) => set({ catalogCollapsed: collapsed }),
      toggleCatalogCollapsed: () => set((s) => ({ catalogCollapsed: !s.catalogCollapsed })),
      setCostPanelOpen: (open) => set({ costPanelOpen: open }),
      toggleCostPanel: () => set((s) => ({ costPanelOpen: !s.costPanelOpen })),
      setFloatbarPosition: (pos) => set({ floatbarPosition: pos }),
      setActiveCategory: (category) => set({ activeCategory: category }),

    Step 3 — Extend the **persist** partialize (the OUTER one, around line ~372) to include the four new fields. Append to the existing returned object:

      catalogCollapsed: state.catalogCollapsed,
      costPanelOpen: state.costPanelOpen,
      floatbarPosition: state.floatbarPosition,
      activeCategory: state.activeCategory,

    Step 4 — DO NOT modify the `temporal` partialize (around line ~354). It must remain `{ placedItems, placedEdges }` only — chrome state must NOT enter undo history.

    Step 5 — Bump the persist `version` from `1` to `2` and add a `migrate` hook that defaults the four new fields when older payloads rehydrate:

      version: 2,
      migrate: (persistedState: any, fromVersion: number) => {
        if (fromVersion < 2) {
          return {
            ...persistedState,
            catalogCollapsed: persistedState.catalogCollapsed ?? false,
            costPanelOpen: persistedState.costPanelOpen ?? false,
            floatbarPosition: persistedState.floatbarPosition ?? 'center',
            activeCategory: persistedState.activeCategory ?? 'all',
          }
        }
        return persistedState
      },
  </action>
  <verify>
    <automated>pnpm test -- src/__tests__/persist.test.ts && pnpm build 2>&1 | tail -10</automated>
  </verify>
  <done>
    - `EditorState` declares `catalogCollapsed`, `costPanelOpen`, `floatbarPosition`, `activeCategory` and the six setters.
    - `useEditorStore` initial state contains the four fields with documented defaults.
    - Persist partialize whitelists all four fields; temporal partialize is unchanged.
    - Persist version is `2` with a `migrate` callback handling `fromVersion < 2`.
    - Existing persist test still passes (no regressions to placedItems persistence).
  </done>
  <acceptance_criteria>
    - `grep -n "catalogCollapsed" src/types/editor.ts` matches at least once.
    - `grep -c "catalogCollapsed" src/stores/editorStore.ts` returns >= 4 (interface field, initializer, setter, partialize).
    - `grep -E "floatbarPosition:\\s*'center'" src/stores/editorStore.ts` matches the initializer.
    - `grep -E "version:\\s*2" src/stores/editorStore.ts` matches in the persist config.
    - `grep -E "migrate:\\s*\\(persistedState" src/stores/editorStore.ts` matches.
    - The temporal partialize block returns ONLY `placedItems` + `placedEdges` (verify by reading the file: the inner `partialize: (state) => ({ placedItems: state.placedItems, placedEdges: state.placedEdges })` is unchanged).
    - `pnpm test -- src/__tests__/persist.test.ts` exits 0.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Rewrite EditorLayout into absolute-positioned chrome shell</name>
  <read_first>
    - src/components/layout/EditorLayout.tsx (current flex-column layout to be replaced)
    - src/components/canvas/EditorCanvas.tsx (must keep working — only its container changes)
    - .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md §Layout Regions
    - src/components/toolbar/Toolbar.tsx, src/components/hotbar/Hotbar.tsx, src/components/status/StatusBar.tsx (legacy chrome — kept rendered for now to avoid regressions; downstream plans replace each)
  </read_first>
  <files>
    - src/components/layout/EditorLayout.tsx
  </files>
  <action>
    REPLACE the contents of `src/components/layout/EditorLayout.tsx` with the structure below. The goal: canvas fills the viewport, six numbered chrome slots sit absolutely positioned over it. **Transitional rule:** keep the existing `<Toolbar />`, `<Hotbar />`, `<StatusBar />`, `<CatalogSidebar />`, `<CostPanel />` mounted INSIDE their respective slots so the editor remains functional after this plan; downstream plans (02–06) replace each slot's contents with the new chrome components without touching this shell again.

    Use these exact slot positions (per UI-SPEC §Layout Regions, with the 18→16 outer-margin normalization noted in the spec):

      ┌─ Slot A: Top rail   ─ top:16, left:16, right:16, h:44
      ├─ Slot B: Catalog    ─ top:76, left:16, h:740, w: collapsed?72:320
      ├─ Slot C: Cost panel ─ top:76, right:16, w:320, h:580 (mounted only if costPanelOpen)
      ├─ Slot D: Floatbar   ─ bottom:120, centered (left/center/right snap)
      ├─ Slot E: Hotbar     ─ bottom:16, left:50%, translateX(-50%)
      └─ Slot F: Zoom dock  ─ bottom:16, right:16, h:44

    Skeleton:

      // ======== 编辑器主布局（Phase 7 重构） ========
      // INPUT: editorStore（chrome state）, useFixtureData hook
      // OUTPUT: 画布全屏 + 六个绝对定位 chrome 槽位（A–F），槽内容由后续 plan 02–06 填充
      // POS: src/components/layout/EditorLayout.tsx — 编辑器页面骨架（chrome shell）

      import { Toolbar } from '../toolbar/Toolbar'
      import { Hotbar } from '../hotbar/Hotbar'
      import { StatusBar } from '../status/StatusBar'
      import { CatalogSidebar } from '../catalog/CatalogSidebar'
      import { EditorCanvas } from '../canvas/EditorCanvas'
      import { CostPanel } from '../costs/CostPanel'
      import { useFixtureData } from '../../hooks/useFixtureData'
      import { useEditorStore } from '../../stores/editorStore'

      export function EditorLayout() {
        const { fixtures, mainGenres, fixtureMap, costIndex, loading, error } = useFixtureData()
        const catalogCollapsed = useEditorStore((s) => s.catalogCollapsed)
        const costPanelOpen = useEditorStore((s) => s.costPanelOpen)

        return (
          <div className="relative w-screen h-screen overflow-hidden bg-cream" style={{ background: '#fff8e7' }}>
            {/* Canvas fills entire viewport — chrome floats over it */}
            <div className="absolute inset-0">
              <EditorCanvas fixtureMap={fixtureMap} />
            </div>

            {/* Slot A — Top rail (h:44, top:16, left:16, right:16) */}
            <div data-chrome-slot="top-rail"
                 className="absolute z-20"
                 style={{ top: 16, left: 16, right: 16, height: 44 }}>
              {/* Plan 02 mounts TopRail here. Until then keep legacy Toolbar visible at slot to preserve features. */}
              <Toolbar />
            </div>

            {/* Slot B — Catalog (top:76, left:16, h:740, w: 320|72) */}
            {!loading && !error && (
              <div data-chrome-slot="catalog"
                   className="absolute z-10"
                   style={{
                     top: 76,
                     left: 16,
                     height: 740,
                     width: catalogCollapsed ? 72 : 320,
                     transition: 'width 0.22s ease',
                   }}>
                <CatalogSidebar fixtures={fixtures} mainGenres={mainGenres} fixtureMap={fixtureMap} />
              </div>
            )}

            {/* Slot C — Cost panel (top:76, right:16, w:320, h:580) — only when open */}
            {!loading && !error && costPanelOpen && (
              <div data-chrome-slot="cost-panel"
                   className="absolute z-10"
                   style={{ top: 76, right: 16, width: 320, height: 580 }}>
                <CostPanel fixtureMap={fixtureMap} costIndex={costIndex} />
              </div>
            )}

            {/* Slot D — Floatbar (bottom:120, centered) */}
            <div data-chrome-slot="floatbar"
                 className="absolute z-20"
                 style={{ bottom: 120, left: '50%', transform: 'translateX(-50%)' }}>
              {/* Plan 04 mounts FloatbarToolPill here */}
            </div>

            {/* Slot E — Hotbar (bottom:16, centered) */}
            <div data-chrome-slot="hotbar"
                 className="absolute z-10"
                 style={{ bottom: 16, left: '50%', transform: 'translateX(-50%)' }}>
              <Hotbar fixtureMap={fixtureMap} />
            </div>

            {/* Slot F — Zoom dock (bottom:16, right:16, h:44) */}
            <div data-chrome-slot="zoom-dock"
                 className="absolute z-20"
                 style={{ bottom: 16, right: 16, height: 44 }}>
              {/* Plan 05 mounts ZoomDock here */}
            </div>

            {/* Legacy status bar — temporary, removed by Plan 02 once top-rail pills cover its data */}
            <div data-chrome-slot="legacy-status" className="absolute z-0" style={{ bottom: 0, left: 0, right: 0 }}>
              <StatusBar />
            </div>

            {/* Loading / error states keep their existing position over the catalog slot */}
            {loading && (
              <div className="absolute z-30" style={{ top: 76, left: 16, width: 320, height: 740 }}>
                <div className="w-full h-full bg-panel rounded-[22px] flex items-center justify-center" style={{ background: '#ffffff', boxShadow: 'var(--shadow-lg)' }}>
                  <p className="text-muted text-sm">加载中...</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute z-30" style={{ top: 76, left: 16, width: 320, height: 740 }}>
                <div className="w-full h-full bg-panel rounded-[22px] flex items-center justify-center px-4" style={{ background: '#ffffff', boxShadow: 'var(--shadow-lg)' }}>
                  <p className="text-destructive text-sm text-center">{error}</p>
                </div>
              </div>
            )}
          </div>
        )
      }

    DocOps L3 header is preserved at the top of the file as shown above.
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -15 && grep -c 'data-chrome-slot=' src/components/layout/EditorLayout.tsx</automated>
  </verify>
  <done>
    - `EditorLayout.tsx` renders six `data-chrome-slot=` containers (`top-rail`, `catalog`, `cost-panel`, `floatbar`, `hotbar`, `zoom-dock`) plus the transitional `legacy-status` slot.
    - Canvas wrapper uses `absolute inset-0` so chrome floats over it.
    - Catalog slot width interpolates between 72 and 320 based on `catalogCollapsed`.
    - Cost panel slot is conditionally mounted via `costPanelOpen`.
    - `pnpm build` succeeds; the editor still renders Toolbar / Hotbar / Catalog / CostPanel inside their slots (transitional state — replaced by plans 02–06).
  </done>
  <acceptance_criteria>
    - `grep -c 'data-chrome-slot=' src/components/layout/EditorLayout.tsx` returns >= 7 (six slots + legacy-status).
    - `grep -E 'data-chrome-slot="(top-rail|catalog|cost-panel|floatbar|hotbar|zoom-dock)"' src/components/layout/EditorLayout.tsx` returns 6 distinct matches.
    - `grep "absolute inset-0" src/components/layout/EditorLayout.tsx` matches (canvas full-screen).
    - File contains `width: catalogCollapsed ? 72 : 320` (collapsed/expanded widths from UI-SPEC).
    - File contains `costPanelOpen` (cost panel mounted conditionally).
    - File no longer contains `h-screen flex flex-col` (the old flex-column shell is gone).
    - `pnpm build` exit code 0.
  </acceptance_criteria>
</task>

</tasks>

<verification>
- `pnpm build` succeeds end-to-end.
- App boots and renders the canvas full-viewport with the legacy Toolbar / Hotbar / Catalog / CostPanel still visible (in transitional positions) so no editor functionality regresses.
- New design tokens are reachable from any component via Tailwind utilities (`bg-panel`, `bg-sky`, `text-ink`, etc. once Tailwind picks them up) and via raw CSS vars (`var(--shadow-md)`, `var(--radius-panel)`).
- Devtools Network panel shows fontsource WOFF2 served from local bundle (no `fonts.googleapis.com` requests).
</verification>

<success_criteria>
SC-7 partially satisfied (token + font foundation in place; component-level visual treatment remains for plans 02–06). Plans 02–06 can now consume tokens/fonts/state without re-deriving them. Editor remains functional throughout this plan.
</success_criteria>

<output>
After completion, create `.planning/phases/07-editor-chrome-redesign/07-01-SUMMARY.md`.
</output>
