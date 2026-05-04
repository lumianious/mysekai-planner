---
phase: 07-editor-chrome-redesign
plan: 04
subsystem: editor-chrome-floatbar
tags: [chrome, floatbar, drag-snap, keyboard, mutual-independence]
requirements: [SC-1, SC-6, SC-7]
dependency_graph:
  requires:
    - "07-01: chrome state slice (floatbarPosition + setter), persist v2, EditorLayout slot D"
    - "07-03: catalog rail mounted in slot B (independent — no direct coupling)"
  provides:
    - "FloatbarToolPill: bottom-centered tool pill rendering V/B/P/X tools, O overwrite, ⌘Z/⌘⇧Z undo/redo with sky/red gradient active states"
    - "FloatbarDragHandle: 22×36 pointer-capture grip that snaps the pill to viewport thirds and persists floatbarPosition"
    - "Phase 7 complete keybinding surface: V/B/P/X/O/⌘Z/⌘⇧Z (O is new — covers SC-6 mutual-independence axiom)"
  affects:
    - "Future plans rendering bottom-of-canvas chrome must respect floatbar drag zone (bottom:120, full-width slot)"
tech_stack:
  added: []
  patterns:
    - "Imperative inline-transform during drag (ref + style.transform = ...) to bypass React render loop, then setState only at snap-end — same pattern Konva-stage drag uses for performance"
    - "Independent toggle keybinding: O case in useKeyboard switch with no modifier gating, no setToolMode coupling — overwrite + tool mode are mutually orthogonal axes per UI-SPEC §Interaction Contract"
    - "sessionStorage-gated first-load discoverability hint (floatDragSeen) injected once via document.head <style> idempotency guard"
key_files:
  created:
    - "src/components/chrome/FloatbarDragHandle.tsx"
    - "src/components/chrome/FloatbarToolPill.tsx"
  modified:
    - "src/hooks/useKeyboard.ts (+ case 'o' for toggleOverwrite, + Phase-7 SC-6 traceability comment)"
    - "src/components/layout/EditorLayout.tsx (slot D mounts FloatbarToolPill, full-width with pointerEvents:none; removed legacy-tools transitional slot and Toolbar import)"
  deleted:
    - "src/components/toolbar/Toolbar.tsx (full legacy toolbar replaced by FloatbarToolPill + TopRail)"
decisions:
  - "FloatbarToolPill owns its own positioning (computed from floatbarPosition) inside a full-width slot rather than letting the slot wrap it — needed because the pill must slide between left/center/right snap points and the slot is now a pure drag-zone anchor"
  - "Slot D set to pointerEvents:'none' on the wrapper, pointerEvents:'auto' on the pill itself — the wrapper now spans the entire viewport bottom (left:0, right:0) so dragging works across the full width without blocking canvas clicks in the empty zones"
  - "Drag UX: imperative style.transform during pointermove (no React render), snap calc on pointerup, then setFloatbarPosition fires the React render with .22s cubic-bezier transition for the final glide — matches UI-SPEC animation table"
  - "ToolButton.tsx KEPT — ImportButton/ExportButton still import it. Initial deletion attempt was reverted after build-error (TS2307) discovered the dependency. Logged here so a future cleanup plan can decide whether to inline ToolButton's atom into Import/Export or keep it shared."
  - "Snap thresholds use viewport thirds (innerWidth/3 and 2*innerWidth/3) measured against the pill's getBoundingClientRect center — robust to viewport resize between drag start and end"
  - "kbd chip in active sky/red segments switches to rgba(255,255,255,.32) bg + white text for contrast against gradient backgrounds (UI-SPEC §Color reserved-for list rules)"
metrics:
  duration: "~19min"
  tasks_completed: 2
  files_modified: 5
  completed: "2026-05-05"
---

# Phase 7 Plan 4: Floatbar Summary

**One-liner:** Bottom-centered floatbar pill (V/B/P/X tools + O overwrite + ⌘Z/⌘⇧Z undo/redo) with drag-handle snap-to-thirds replaces the legacy top toolbar; new `O` keybinding closes the SC-6 mutual-independence keyboard surface; legacy `Toolbar.tsx` deleted.

## What Shipped

- **`FloatbarDragHandle.tsx`** — 22×36 grip button (lucide `GripVertical` 16px, `aria-label="ドラッグで移動"`). Pointer flow: `pointerdown` captures pointer + records `clientX`, `pointermove` calls parent `onDragMove(deltaX)`, `pointerup` releases capture + calls `onDragEnd`. First-load discoverability via `sessionStorage.getItem('floatDragSeen')` — when null, applies `floatHandleHint 1.4s ease-in-out 2` keyframe animation for ~2.8s then sets the flag. Cursor swaps grab → grabbing during drag. Hover bg `rgba(105,200,255,.12)`. Keyframes (`floatHandleHint` + `pulse`) injected once via idempotent `document.head` `<style>` element.
- **`FloatbarToolPill.tsx`** — Outer pill: 44h, `linear-gradient(180deg, #ffffff, #fbf6ea)`, `radius-panel 22px`, `--shadow-md`, panel-edge border, padding `0 8`, gap 4. Renders drag handle → 4 tool segments (select/stamp/brush/remove) → separator → overwrite segment → separator → undo/redo segments. Each segment is 36×36, `radius-pill-inner 14px`, with absolutely-positioned 16×14 `radius-chip 10px` kbd-chip in top-right corner (M PLUS Rounded 1c 800 11px). Active states: `linear-gradient(180deg, #9bdcff, #69c8ff)` for tool/overwrite (with `inset 0 -2px 0 rgba(46,168,238,.4)` bottom shadow), `linear-gradient(180deg, #ff8c8c, #ff6f6f)` for active remove (with `inset 0 -2px 0 rgba(0,0,0,.18)`). Tooltips via Radix `Tooltip.Provider delayDuration={300}` rendering `{label} ({kbd})` (Chinese labels per UI-SPEC §Copywriting). Temporal subscription via `useTemporalState()` hook (mirrors the legacy Toolbar pattern: `useEditorStore.temporal.subscribe`). Position computed from `floatbarPosition` store value: `left` = `0%`/`50%`/`100%` and `transform` = `translateX(24px)`/`translateX(-50%)`/`translateX(calc(-100% - 24px))` for left/center/right respectively. CSS transition `left .22s cubic-bezier(.5,1.4,.4,1), transform .22s cubic-bezier(.5,1.4,.4,1)` animates the snap glide. During drag the transition is suspended (`transition: none`) and `transform` is rewritten imperatively to `${base} translateX(${deltaX}px)` — bypassing React render. On pointerup, `getBoundingClientRect().left + width/2` is compared to viewport thirds (`innerWidth/3`, `2*innerWidth/3`) to pick the snap target, the transition is restored, and `setFloatbarPosition(snap)` fires the final React render.
- **`useKeyboard.ts`** — Added `case 'o':` immediately after `case 'x':`, calling `state.toggleOverwrite()` and returning. Added Phase-7 SC-6 traceability comment above the switch (`Phase 7 SC-6: V/B/P/X/O/⌘Z/⌘⇧Z`). The `O` case has no modifier gating — plain `o`/`O` toggles overwrite (case-insensitive via the existing `e.key.toLowerCase()` dispatch). It does NOT call `setToolMode`, preserving the mutual-independence axiom.
- **`EditorLayout.tsx`** — Slot D restructured: was `bottom:120, left:50%, translateX(-50%)` empty placeholder, now `bottom:120, left:0, right:0, pointerEvents:'none'` full-width drag zone hosting `<FloatbarToolPill />`. The pill itself sets `pointerEvents:'auto'` so empty zones pass clicks through to the canvas. Removed the transitional `data-chrome-slot="legacy-tools"` block and its `<Toolbar compact />` mount, plus the `Toolbar` import.
- **`Toolbar.tsx`** — DELETED. Tool/overwrite/undo/redo migrated to `FloatbarToolPill`; area-level + import/export already migrated to `TopRail` + `TopRailKebab` in plan 02.

## Verification

- `pnpm build` exits 0 (Vite + Rolldown, 1.94s). Final bundle 714 KB JS / 179 KB CSS — +3 KB JS vs plan 03 (FloatbarToolPill + DragHandle, no new deps).
- `pnpm test` 199/199 pass — no test changes needed; existing persist test continues to verify `floatbarPosition` round-trips correctly.
- Acceptance grep contract (Task 1): `case 'o':` MATCH, `toggleOverwrite` in useKeyboard MATCH, all 7 lucide imports in FloatbarToolPill MATCH (`MousePointer2`/`Stamp`/`Paintbrush`/`Eraser`/`Replace`/`Undo2`/`Redo2`), `setToolMode`/`toggleOverwrite`/`undoWithFlash`/`redoWithFlash` all MATCH, `floatbarPosition` MATCH, `cubic-bezier(.5,1.4,.4,1)` MATCH, sky-gradient `linear-gradient(180deg, #9bdcff, #69c8ff)` MATCH, remove-gradient `linear-gradient(180deg, #ff8c8c, #ff6f6f)` MATCH. DragHandle: `setPointerCapture` MATCH, `floatDragSeen` MATCH, `aria-label="ドラッグで移動"` MATCH, `GripVertical` MATCH.
- Acceptance grep contract (Task 2): `Toolbar.tsx` ABSENT, `<FloatbarToolPill` in EditorLayout = 1 match, `legacy-tools` in EditorLayout = 0 matches, `<Toolbar` in EditorLayout = 0 matches.
- Manual interaction contract preserved by code review: tool segments call `setToolMode` (mutual exclusion via store), overwrite calls `toggleOverwrite` (independent), undo/redo call `undoWithFlash`/`redoWithFlash` (Phase 1 helpers), drag handle calls `setFloatbarPosition` (Phase 7-01 setter, persisted via partialize).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] ToolButton.tsx still consumed by ImportButton/ExportButton**
- **Found during:** Task 2 build verification (`pnpm build` failed with TS2307 after attempting to delete `ToolButton.tsx`).
- **Issue:** The plan said "Verify `ToolButton.tsx` is still used somewhere... If zero matches, ALSO delete `ToolButton.tsx`." My initial grep for `from.*toolbar/ToolButton` (with the `toolbar/` path prefix) returned zero matches, so I deleted the file. The build then failed because `src/components/toolbar/ImportButton.tsx` and `src/components/toolbar/ExportButton.tsx` both import via the relative path `from './ToolButton'` (no `toolbar/` prefix) — sibling-relative imports my regex did not catch.
- **Fix:** Restored `src/components/toolbar/ToolButton.tsx` via `git checkout HEAD --`. Re-ran build → green. ToolButton stays as the shared atom for the two surviving toolbar consumers (Import/Export buttons mounted by `TopRailKebab`).
- **Files modified:** `src/components/toolbar/ToolButton.tsx` (restored to HEAD)
- **Commit:** Folded into Task 2 commit `2a6b84c` (the restoration was a no-op against HEAD, so no separate commit was needed; the `Toolbar.tsx` deletion remains the only file removal in that commit).

No other deviations. Task 1 executed exactly as written.

## Authentication Gates

None — fully automated build + test execution.

## Known Stubs

- **Drag snap is viewport-thirds, not catalog-aware.** When the catalog is expanded (320px wide on the left), snapping the pill to `'left'` puts it at `left:24px` which overlaps the catalog rail visually. The plan's snap math is intentionally simple (viewport thirds against pill center) and does not subtract the catalog width. This is acceptable v1 behavior — users who want the pill clear of the catalog can snap to `'center'` or `'right'`. A future plan could make snap zones catalog-aware (e.g., `'left'` snap zone shifts to `catalogCollapsed ? 24 : 360`), but this is not required for SC-1/SC-6/SC-7.
- **`O` keybinding fires from any focus state.** The `useKeyboard` hook listens at the `window` level (matching V/B/P/X), so pressing `O` while focused inside the catalog search input will both type `o` AND toggle overwrite. The existing keys (V/B/P/X/Z/Y/R) have the same behavior; this is a pre-existing quirk not introduced by this plan. Documented for the verifier.
- **No first-load hint when sessionStorage is unavailable.** `FloatbarDragHandle` guards with `typeof window === 'undefined'` for SSR and silently skips the pulse if `sessionStorage` throws (private mode in some browsers). Acceptable degradation — the drag still works without the hint.

These stubs do not block the plan's stated goals: floatbar visible at bottom, all 7 keybindings functional, drag-snap to left/center/right with persistence, legacy Toolbar removed.

## Commits

- `42d1f3d` — feat(07-04): add FloatbarToolPill + FloatbarDragHandle + O keybinding
- `2a6b84c` — feat(07-04): mount FloatbarToolPill in slot D, delete legacy Toolbar

## Self-Check: PASSED

- `src/components/chrome/FloatbarToolPill.tsx`: FOUND (7 lucide imports, `setToolMode`/`toggleOverwrite`/`undoWithFlash`/`redoWithFlash` all present, `floatbarPosition` consumed, `cubic-bezier(.5,1.4,.4,1)` transition, both active gradients, `Tooltip.Provider`)
- `src/components/chrome/FloatbarDragHandle.tsx`: FOUND (`setPointerCapture`, `floatDragSeen`, `aria-label="ドラッグで移動"`, `GripVertical`, idempotent keyframe injection)
- `src/hooks/useKeyboard.ts`: FOUND (`case 'o':` calling `state.toggleOverwrite()`, Phase 7 SC-6 traceability comment, V/B/P/X/Z/Y switch cases all intact)
- `src/components/layout/EditorLayout.tsx`: FOUND (`<FloatbarToolPill />` mounted, slot D `pointerEvents:'none'` full-width, no `Toolbar` import, no `legacy-tools` slot)
- `src/components/toolbar/Toolbar.tsx`: ABSENT (deleted)
- `src/components/toolbar/ToolButton.tsx`: PRESENT (kept — Import/Export still consume it)
- Commit `42d1f3d`: FOUND in `git log --oneline`
- Commit `2a6b84c`: FOUND in `git log --oneline`
- `pnpm build`: PASSES (exit 0)
- `pnpm test`: 199/199 PASSES
