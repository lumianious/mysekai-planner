---
phase: 07-editor-chrome-redesign
plan: 02
subsystem: editor-chrome-top-rail
tags: [chrome, top-rail, autosave, cost-pill, area-level, kebab]
requirements: [SC-3, SC-4, SC-7]
dependency_graph:
  requires:
    - "07-01: chrome state slice + EditorLayout slots + design tokens"
  provides:
    - "TopRail Slot A container + 4 pill children + kebab"
    - "lastSaveAt persist storage hook (runtime-only, fuels plan 06 cost popover summary too)"
    - "Toolbar.compact prop pattern (legacy-tools transitional slot)"
  affects: ["plan 04 (replaces legacy-tools slot)", "plan 06 (consumes costPanelOpen toggle)"]
tech_stack:
  added: []
  patterns:
    - "Wrapped createJSONStorage adapter to record write timestamp without entering partialize (avoids setState↔setItem feedback loop)"
    - "Inline <style> tag for component-scoped CSS keyframes (autosave-pulse) — avoids polluting index.css for one-off animations"
    - "Radix DropdownMenu.Item asChild + onSelect preventDefault to host nested dialogs (Import/Export) in kebab menu without closing them prematurely"
key_files:
  created:
    - "src/components/chrome/TopRail.tsx"
    - "src/components/chrome/CostPill.tsx"
    - "src/components/chrome/AutosavePill.tsx"
    - "src/components/chrome/AreaLevelDropdown.tsx"
    - "src/components/chrome/TopRailKebab.tsx"
    - "src/components/chrome/CLAUDE.md"
  modified:
    - "src/types/editor.ts (+ lastSaveAt: number | null)"
    - "src/stores/editorStore.ts (lastSaveAt initial value + wrapped storage adapter)"
    - "src/components/layout/EditorLayout.tsx (TopRail mount, legacy-tools slot, removed legacy-status)"
    - "src/components/toolbar/Toolbar.tsx (compact prop hides area-level + Import/Export)"
    - "src/components/canvas/EditorCanvas.tsx (stale StatusBar comment cleanup)"
  deleted:
    - "src/components/status/StatusBar.tsx (whole file removed)"
decisions:
  - "lastSaveAt stays out of persist partialize — would form a setState→setItem→setState feedback loop. Lives only in the runtime store and is intentionally lost across reloads (the next localStorage write reseeds it within milliseconds of any edit)."
  - "Pulse keyframes embedded as inline <style> string inside AutosavePill rather than added to global index.css — single consumer, removable with the component."
  - "Toolbar.compact = transitional contract for plan 04 — keeps the legacy Toolbar mounted only for tool/overwrite/undo/redo until the Floatbar lands; deleting the Toolbar in this plan would have orphaned those features."
  - "Kebab uses DropdownMenu.Item asChild + onSelect e.preventDefault() so the existing ImportButton/ExportButton self-contained dialog flow continues to work; no changes to those components."
  - "Cost-pill numerics computed from existing computeMaterialTotals (current = needed - remaining summed; max = needed summed) — surfaces the same 'still-need-to-buy / total-need' semantics the future cost panel will show."
metrics:
  duration: "~5min"
  tasks_completed: 2
  files_modified: 12
  completed: "2026-05-04"
---

# Phase 7 Plan 2: Top Rail Summary

**One-liner:** Top rail (Slot A) ships with project-title pill, cost pill (toggles `costPanelOpen` with chevron rotation), autosave pill (3 states fed by a wrapped persist storage adapter writing `lastSaveAt`), area-level Radix dropdown (Lv.1–5, sky-gradient active row), and a `MoreVertical` kebab hosting the existing Import/Export dialog flows; legacy `StatusBar` deleted; legacy `Toolbar` survives transitionally in compact mode.

## What Shipped

- **`lastSaveAt` persist hook.** Added `lastSaveAt: number | null` to `EditorState` (default `null`). Wrapped `createJSONStorage(() => localStorage)` so every successful `setItem` calls `useEditorStore.setState({ lastSaveAt: Date.now() })`. The field is **intentionally absent from `partialize`** — including it would cause an infinite setState↔setItem feedback loop. The persist test whitelist therefore stays unchanged (and continues to assert `lastSaveAt` does not leak into persisted state).
- **`CostPill.tsx` (Slot A right cluster #1).** White pill, h32 / px16 / gap8 / `--shadow-md` / `--radius-pill-inner`. Renders `コスト` (Body 13/700) + `current.toLocaleString()` (Label 11/800 ink) + `/ max.toLocaleString()` (Label 11/800 muted) + `<ChevronDown>` (rotates 180° via `costPanelOpen` selector). Click → `toggleCostPanel()`. `aria-expanded` + `aria-controls="cost-panel"`.
- **`AutosavePill.tsx`.** Cream-fill pill (`linear-gradient(180deg, #fff8e7, #ecdfb8)` + tan-edge border). Three states: `保存エラー — 再試行` (red dot, `aria-label="保存を再試行"`, role=button, fires `onRetry`); `保存中…` (no dot — when `lastSaveAt === null`); `自動保存 · {Ns/Nm/Nh}` (pulsing 8×8 green dot, `autosave-pulse 2s ease-in-out infinite` keyframes scoped to the component). Re-renders every 1s via `setInterval`.
- **`AreaLevelDropdown.tsx`.** Cream pill trigger renders `Lv.{areaLevel}` + `{w}×{d}` + chevron, `aria-label="エリアレベルを変更"`. Radix `DropdownMenu` opens a white panel (`--shadow-lg`, `--radius-tile`); each row is a `Lv.N` + `WxD` line, sky-gradient when active, hover `--color-cream-hover`. `onSelect` fires `setAreaLevel(level)`.
- **`TopRailKebab.tsx`.** 32×32 white button, `MoreVertical` (lucide, 18px), `aria-label="その他のアクション"`. Opens a Radix DropdownMenu containing the existing `<ImportButton />` and `<ExportButton />`, each wrapped in `DropdownMenu.Item asChild onSelect={(e) => e.preventDefault()}` — preserves the original button-→dialog flow without Radix closing the dialog prematurely.
- **`TopRail.tsx`.** Container (`h:44`, `flex items-center gap:8`). Layout: project-title pill (`めだかな上面`) → `flex-1` spacer → CostPill → AutosavePill → AreaLevelDropdown → TopRailKebab. Cost numerics derived from `useFixtureData().costIndex` + `useEditorStore({placedItems, inventory})` via `computeMaterialTotals`.
- **`EditorLayout.tsx`.** Slot A now mounts `<TopRail fixtureMap costIndex>` (gated `!loading && !error`). The legacy-status slot and `<StatusBar />` import deleted. New transitional `data-chrome-slot="legacy-tools"` at `top:76 left:360` mounts `<Toolbar compact />` for the tool buttons + overwrite + undo/redo until plan 04 replaces them.
- **`Toolbar.tsx`.** Now accepts `compact?: boolean`. When true, hides the trailing `<ExportButton />` + `<ImportButton />` block AND the right-aligned area-level `DropdownMenu` (those features now live in `TopRailKebab` and `AreaLevelDropdown` respectively).
- **`StatusBar.tsx`.** Deleted. Two stray references (a comment in `types/editor.ts` and a comment in `EditorCanvas.tsx`) were updated to point to the new `ZoomDock`/`EditorLayout` consumers (scope: directly caused by this task's deletion).
- **`src/components/chrome/CLAUDE.md`.** L2 doc lists all 10 phase-7 chrome components (the 5 new in this plan + the 5 expected from plans 03/04/05/06) so subsequent plans get a stable index.

## Verification

- `pnpm build` exits 0 (Vite + Rolldown). Final bundle 706 KB JS / 180 KB CSS — 6 KB JS growth vs plan 01 (the 5 new components + Radix DropdownMenu reuse already present in deps).
- `pnpm test` 199/199 pass — persist whitelist test continues to assert no transient keys leak; the new `lastSaveAt` field, being absent from `partialize`, never appears in serialized state and therefore doesn't trip the negative assertions either.
- `grep -r "StatusBar" src/` returns no matches.
- `grep -c "<TopRail" src/components/layout/EditorLayout.tsx` = 1.
- All 8 acceptance-criteria greps from Task 1 + all 7 from Task 2 match.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Stale `StatusBar` references in unrelated comments**
- **Found during:** Task 2 acceptance check (`grep -r "StatusBar" src/` after file deletion).
- **Issue:** Two comments still mentioned `StatusBar` (`src/types/editor.ts` line 128 explanatory comment; `src/components/canvas/EditorCanvas.tsx` line 641 export comment) — would have caused the acceptance assertion `grep -r "StatusBar" src/ | wc -l` returns 0 to fail.
- **Fix:** Updated both comments to reference Phase 7 successors (ZoomDock for `stageScale`; cleared the export-doc comment). No code-path changes.
- **Files modified:** `src/types/editor.ts`, `src/components/canvas/EditorCanvas.tsx`
- **Commit:** 2b78729 (folded into Task 2 commit since it was a single logical change with the StatusBar deletion)

No other deviations.

## Authentication Gates

None — fully automated build + test execution.

## Known Stubs

- **Project title pill renders the placeholder string `めだかな上面`** as specified in UI-SPEC §Copywriting. There is no project-name persistence yet; this becomes a real value in a future phase (or stays decorative for v1). Documented as intentional in the plan and UI-SPEC.
- **`AutosavePill` `saveError` prop is plumbed but no caller currently sets it.** The persist middleware does not surface failure events through `useEditorStore`; the prop default `false` keeps the pill in the success/saving paths until a future plan wires up an error channel. The retry handler `onRetry` is similarly optional.
- **Cost-pill numerics depend on `costIndex !== null`.** When `useFixtureData` is still loading or fails, `current` and `max` are both `0` (not `— / —`). The TopRail itself is gated on `!loading && !error` in EditorLayout, so users won't see this state in normal flow; the `0 / 0` fallback is only reachable if `costIndex` is somehow null after data load. Acceptable for this plan; the cost panel (plan 06) will offer richer error states.

These stubs do not block the plan's stated goal (top rail visible, cost pill toggles panel state, area-level changes the grid, autosave shows time-since-save, import/export accessible via kebab).

## Commits

- `7538e60` — feat(07-02): add lastSaveAt persist hook + 4 top-rail pill components
- `2b78729` — feat(07-02): mount TopRail in slot A, delete StatusBar, add Toolbar compact prop

## Self-Check: PASSED

- `src/components/chrome/TopRail.tsx`: FOUND
- `src/components/chrome/CostPill.tsx`: FOUND (`toggleCostPanel`, `ChevronDown`, `aria-expanded` all present)
- `src/components/chrome/AutosavePill.tsx`: FOUND (`自動保存`, `保存中…`, `保存エラー`, `setInterval` all present)
- `src/components/chrome/AreaLevelDropdown.tsx`: FOUND (`setAreaLevel`, `AREA_LEVELS`, `Lv.`, `aria-label="エリアレベルを変更"` all present)
- `src/components/chrome/TopRailKebab.tsx`: FOUND (`MoreVertical`, `ImportButton`, `ExportButton`, `aria-label="その他のアクション"` all present)
- `src/components/chrome/CLAUDE.md`: FOUND (10 component rows + conventions section)
- `src/stores/editorStore.ts`: FOUND (`lastSaveAt`, wrapped `setItem` calling `useEditorStore.setState({ lastSaveAt: Date.now() })`)
- `src/components/layout/EditorLayout.tsx`: FOUND (`<TopRail`, `data-chrome-slot="legacy-tools"`, no `StatusBar` import)
- `src/components/toolbar/Toolbar.tsx`: FOUND (`compact?: boolean` prop, conditional ExportButton/ImportButton/area-level dropdown rendering)
- `src/components/status/StatusBar.tsx`: ABSENT (deleted)
- Commit `7538e60`: FOUND in `git log --oneline`
- Commit `2b78729`: FOUND in `git log --oneline`
- `pnpm build`: PASSES (exit 0)
- `pnpm test`: 199/199 PASSES
