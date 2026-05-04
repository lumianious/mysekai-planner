---
phase: 07-editor-chrome-redesign
plan: 01
subsystem: editor-chrome-foundation
tags: [foundation, design-tokens, fonts, store, layout]
requirements: [SC-7]
dependency_graph:
  requires: []
  provides:
    - "Tailwind @theme palette (panel/cream/tan/sky/ink) and radii/shadows tokens for plans 02–06"
    - "Self-hosted Nunito 700 + M PLUS Rounded 1c 800 fonts via @fontsource"
    - "useEditorStore chrome slice (catalogCollapsed, costPanelOpen, floatbarPosition, activeCategory) + setters"
    - "Persist v2 with migrate hook defaulting absent chrome fields"
    - "EditorLayout absolute-positioned shell with 6 named chrome slots (data-chrome-slot)"
  affects: ["all subsequent plans 02–06 in phase 07"]
tech_stack:
  added:
    - "@fontsource/nunito ^5 (700 axis only)"
    - "@fontsource/m-plus-rounded-1c ^5 (800 axis only)"
  patterns:
    - "Single Tailwind v4 @theme block in src/index.css as canonical token surface"
    - "Persist outside temporal (preserved from Phase 03) — chrome state in persist partialize, NOT in temporal partialize"
    - "Absolute-positioned chrome over full-viewport canvas (replaces flex column)"
key_files:
  created: []
  modified:
    - "package.json (+2 fontsource deps)"
    - "src/main.tsx (+ 2 side-effect font imports)"
    - "src/index.css (rewrite @theme: dark surface palette → light cream/sky palette + new spacing/radii/shadow tokens)"
    - "src/types/editor.ts (+4 chrome fields, +6 setter signatures)"
    - "src/stores/editorStore.ts (+4 initial values, +6 setters, persist partialize +4 fields, version 1→2 with migrate)"
    - "src/components/layout/EditorLayout.tsx (full rewrite: flex column → absolute slots A–F + legacy-status)"
    - "src/__tests__/persist.test.ts (whitelist +4 chrome keys to keep transient-state guard accurate)"
decisions:
  - "Self-host fonts via @fontsource (700/800 only) — matches GitHub Pages static-hosting constraint, no Google Fonts CORS hop"
  - "Persist version bumped to 2 with migrate hook so existing v1 payloads in users' localStorage rehydrate without losing chrome defaults"
  - "Legacy Toolbar/Hotbar/StatusBar/CatalogSidebar/CostPanel kept mounted inside their new slots (transitional) so editor remains functional until plans 02–06 replace each"
  - "Tailwind @theme block rewritten wholesale rather than additive — legacy semantic remap tokens (--color-surface, --color-accent, etc.) point to new palette so existing component classnames don't break"
  - "16px outer canvas margin (not 18px hifi value) — UI-SPEC normalization to nearest 4-multiple"
metrics:
  duration: "~5min"
  tasks_completed: 3
  files_modified: 7
  completed: "2026-05-04"
---

# Phase 7 Plan 1: Foundation Summary

**One-liner:** Light cream/sky Tailwind palette, self-hosted Nunito + M PLUS Rounded 1c fonts, four chrome state fields with persist v2 migrate, and a viewport-filling absolute-slot EditorLayout — the token + state shell every other 07 plan consumes.

## What Shipped

- **Design tokens.** `src/index.css` `@theme` block rewritten wholesale: dominant 60% panel whites, secondary 30% cream/tan, accent 10% sky-blue gradient, status reds/greens, ink text scale, panel-edge / tan-edge borders, three shadow elevations (`--shadow-lg/md/sm`), strict 4-multiple spacing scale (4/8/16/24/32), independent radii scale (22/18/14/12/10/6). Legacy semantic tokens (`--color-surface`, `--color-accent`, `--color-primary`, `--color-default`) remapped to new values so existing component classnames keep rendering.
- **Self-hosted fonts.** Added `@fontsource/nunito@^5` and `@fontsource/m-plus-rounded-1c@^5`. `src/main.tsx` side-effect imports `nunito/700.css` + `m-plus-rounded-1c/800.css` only — 900 axis is intentionally not loaded. Build emits the WOFF2/WOFF subsets locally; no `fonts.googleapis.com` request remains.
- **Chrome state slice.** `useEditorStore` extended with `catalogCollapsed: false`, `costPanelOpen: false`, `floatbarPosition: 'center'`, `activeCategory: 'all'` plus setters (`setCatalogCollapsed`, `toggleCatalogCollapsed`, `setCostPanelOpen`, `toggleCostPanel`, `setFloatbarPosition`, `setActiveCategory`). The four fields enter the **persist** partialize (UI-only persistence) but stay out of the **temporal** partialize so collapsing the catalog never appears in undo history.
- **Persist v2 migration.** Persist version bumped 1 → 2 with a `migrate` hook that fills missing chrome fields with documented defaults when older payloads rehydrate. Existing user localStorage data (placedItems/placedEdges/areaLevel/gridSize/inventory/isEditorReady) survives untouched.
- **Layout shell.** `EditorLayout.tsx` rewritten from flex-column to a viewport-filling `relative w-screen h-screen` shell. Canvas wraps in `absolute inset-0`. Six named chrome slots are absolutely positioned per UI-SPEC §Layout Regions: `top-rail` (top:16, h:44), `catalog` (top:76, left:16, h:740, w:320|72), `cost-panel` (top:76, right:16, w:320, h:580; mounted only when `costPanelOpen`), `floatbar` (bottom:120, centered), `hotbar` (bottom:16, centered), `zoom-dock` (bottom:16, right:16, h:44). A transitional `legacy-status` slot keeps the existing StatusBar visible during the cross-plan transition. Plans 02–06 replace each slot's children without touching this shell.

## Verification

- `pnpm build` exits 0 (Vite + Rolldown). Fontsource WOFF/WOFF2 assets emit into `dist/assets/`.
- `pnpm test` passes 199/199 tests across 24 files (existing persist suite continues to assert transient-state exclusion).
- Catalog slot width interpolates 320 ↔ 72 driven by `catalogCollapsed`; cost panel slot is conditionally mounted via `costPanelOpen` (verified via grep of `width: catalogCollapsed ? 72 : 320` and `costPanelOpen` in EditorLayout.tsx).
- 7 distinct `data-chrome-slot=` attributes present (six numbered slots + transitional `legacy-status`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Persist test whitelist needed updated chrome keys**
- **Found during:** Task 2 verification (`pnpm test -- src/__tests__/persist.test.ts`).
- **Issue:** `ALLOWED_PERSISTED_KEYS` whitelist in `src/__tests__/persist.test.ts` enumerated only the Phase-3/4 fields. Adding the four new chrome keys to the persist partialize made the existing `Test D: transient UI state is NOT persisted (partialize whitelist)` assertion fail because the actual persisted payload now contains keys the whitelist treats as forbidden.
- **Fix:** Appended `catalogCollapsed`, `costPanelOpen`, `floatbarPosition`, `activeCategory` to the whitelist constant with a Phase-7 comment. The test's negative assertions (`expect(...).not.toHaveProperty('selectedItemId')` etc.) remain unchanged so transient-state exclusion is still enforced.
- **Files modified:** `src/__tests__/persist.test.ts`
- **Commit:** e142374

No other deviations. Tasks 1 and 3 executed exactly as written.

## Authentication Gates

None — fully automated build + test execution.

## Known Stubs

None for this plan's scope. The transitional `legacy-status` slot and the empty `floatbar` / `zoom-dock` slot bodies are *intentional* placeholders to be filled by plans 02 (top rail), 04 (floatbar), 05 (hotbar + zoom dock) — they are documented as such inline in `EditorLayout.tsx` and tracked here for the verifier.

## Commits

- `0d99006` — feat(07-01): self-host fonts + rewrite Tailwind theme to light cream/sky palette
- `e142374` — feat(07-01): add chrome state slice to useEditorStore
- `dc16992` — refactor(07-01): rewrite EditorLayout into absolute-positioned chrome shell

## Self-Check: PASSED

- src/index.css: FOUND (`--font-display`, `--color-sky: #69c8ff`, `--radius-panel: 22px`, `--shadow-md` all present)
- src/main.tsx: FOUND (`@fontsource/nunito/700.css`, `@fontsource/m-plus-rounded-1c/800.css`)
- src/types/editor.ts: FOUND (`catalogCollapsed`, six chrome setter signatures)
- src/stores/editorStore.ts: FOUND (chrome initializers, setters, persist partialize entries, `version: 2`, `migrate` hook)
- src/components/layout/EditorLayout.tsx: FOUND (7 `data-chrome-slot=` attributes, `absolute inset-0` canvas, `width: catalogCollapsed ? 72 : 320`, `costPanelOpen` gate)
- Commit 0d99006: FOUND
- Commit e142374: FOUND
- Commit dc16992: FOUND
- pnpm build: PASSES
- pnpm test: 199/199 PASSES
