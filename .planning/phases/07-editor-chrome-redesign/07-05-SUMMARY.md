---
phase: 07-editor-chrome-redesign
plan: 05
subsystem: editor-chrome-hotbar-zoom
tags: [chrome, hotbar, zoom-dock, slot-e, slot-f]
requirements: [SC-5, SC-6, SC-7]
dependency_graph:
  requires:
    - "07-01: chrome state slice (stageScale + setStageScale already in store), EditorLayout slot E + slot F anchors, design-token CSS vars"
    - "07-04: floatbar mounted in slot D (independent — no direct coupling)"
  provides:
    - "Hotbar.tsx: content-width 72×72 white-pill hotbar with sky-gradient active state and 3px sky glow ring"
    - "ZoomDock.tsx: bottom-right h44 pill with minus / 100%-reset / plus buttons wired to setStageScale"
    - "Slot F populated — EditorLayout no longer has an empty zoom-dock placeholder"
  affects:
    - "Future plan 06 (cost popover) — chrome layer is now visually complete; cost popover can layer on top without slot reflow"
tech_stack:
  added: []
  patterns:
    - "Imperative inline-style hover lift on hotbar slot button (translateY) — same .12s transform pattern used by FloatbarToolPill in plan 04"
    - "Zoom button clamps share MIN_SCALE/MAX_SCALE constants with the canvas wheel-zoom (useCanvasInteraction.ts) — single-source numeric contract, sync-comment on both sides"
key_files:
  created:
    - "src/components/chrome/ZoomDock.tsx"
  modified:
    - "src/components/hotbar/Hotbar.tsx (full rewrite: 40×40 dark-theme slots → 72×72 light-pill slots; outer container content-width with white-pill chrome)"
    - "src/components/layout/EditorLayout.tsx (+ ZoomDock import, mounts <ZoomDock /> inside slot F)"
  deleted: []
decisions:
  - "Zoom dock clamp constants (MIN_SCALE 0.15, MAX_SCALE 3.0) copied from useCanvasInteraction.ts rather than the plan's 0.25/4 defaults — sync-comments on both files mark them as paired constants"
  - "Button click step is 1.2 (coarse), separate from the wheel-zoom step of 1.05 (fine) — discrete clicks should advance perceptibly while smooth wheel zoom stays buttery"
  - "Hotbar empty-slot glyph (＋) rendered as decorative aria-hidden span; the button itself carries aria-label='空きスロット' so screen readers don't read the symbol redundantly"
  - "Hotbar drag-from-catalog onto empty slots: out of scope this plan — plan body explicitly notes 'no drag handler currently in this file' and preserves the existing click-only behavior; future plan can add it without touching the visual contract established here"
  - "Zoom dock buttons honor disabled state at clamp edges (Minus disabled at MIN, Plus at MAX) — provides immediate visual feedback when further zoom isn't possible"
metrics:
  duration: "~3min"
  tasks_completed: 2
  files_modified: 3
  completed: "2026-05-04"
---

# Phase 7 Plan 5: Hotbar + Zoom Dock Summary

**One-liner:** Hotbar re-skinned from a dark 40×40 strip into a content-width white pill of 72×72 sky-glowing slots; new bottom-right ZoomDock pill (minus / 100% / plus) wires button clicks to `setStageScale` with clamps aligned to the canvas wheel-zoom constants.

## What Shipped

- **`Hotbar.tsx` rewrite.** Outer container drops the legacy `h-12 bg-surface-raised border-t border-default flex items-center justify-center` full-width chrome. New container is content-width with `linear-gradient(180deg, #ffffff, #fbf6ea)` background, `var(--radius-panel)` (22px) outer radius, `var(--shadow-md)`, panel-edge border, padding 8, gap 8 — matches UI-SPEC §Layout Regions hotbar pill chrome. Each slot is now a 72×72 button with `var(--radius-tile)` (12px) corners. Active state (`fixtureId === activeFixtureId`) renders the sky gradient `linear-gradient(180deg, #9bdcff, #69c8ff)` with a 3px sky glow ring `0 0 0 3px rgba(105,200,255,.4)` — UI-SPEC §Color reserved-for list item 3. Empty slots render at 60% opacity white with a decorative `＋` glyph and carry `aria-label="空きスロット"`. Filled slots show the fixture thumbnail at 72×72 plus a slot-number badge in the top-left (`rgba(31,53,86,.6)` background, `var(--radius-badge)` 6px). Hover lift `translateY(-2px)` runs on a `.12s ease` transition for transform/box-shadow/background per UI-SPEC §Animations.
- **`ZoomDock.tsx` (new).** Three-button pill mounted in slot F (bottom-right). Outer container is the same white pill chrome as the hotbar (h44, padding `0 8`, gap 4). Three buttons: Minus (36×36, lucide `Minus` 18px, `aria-label="縮小"`), reset/percentage display (56×36, M PLUS Rounded 1c 800 11px, renders `Math.round(stageScale * 100)%`, `aria-label="表示倍率をリセット"`), Plus (36×36, lucide `Plus` 18px, `aria-label="拡大"`). Click handlers: `onMinus` calls `setStageScale(clamp(stageScale / 1.2))`, `onPlus` calls `setStageScale(clamp(stageScale * 1.2))`, `onReset` calls `setStageScale(1)`. Clamp helper bounds to `[MIN_SCALE=0.15, MAX_SCALE=3.0]` — values copied from `src/hooks/useCanvasInteraction.ts` with a sync-comment on both files. Disabled state (`disabled={stageScale <= MIN_SCALE}` / `>= MAX_SCALE`) provides terminal feedback at clamp edges. Local sub-step constant `STEP = 1.2` differs intentionally from the wheel-zoom `SCALE_BY = 1.05`: discrete button clicks need a coarser step than the smooth wheel.
- **`EditorLayout.tsx` slot F populated.** Added `import { ZoomDock } from '../chrome/ZoomDock'`. Inside the existing `data-chrome-slot="zoom-dock"` block, replaced the `{/* Plan 05 mounts ZoomDock here */}` placeholder with `<ZoomDock />`. Slot F's positioning (bottom:16, right:16, h:44) is unchanged — ZoomDock owns its own internal layout.

## Verification

- `pnpm build` exits 0 (Vite + Rolldown, 1.86s). Bundle delta: +1.4 KB JS, no new deps (lucide `Minus`/`Plus` already imported elsewhere).
- `pnpm test` 199/199 pass — no test-suite changes needed; existing persist tests already cover the unchanged `hotbar` shape.
- Acceptance grep contract (Task 1): `width: 72` MATCH, `height: 72` MATCH, `rgba(105,200,255,.4)` MATCH, `linear-gradient(180deg, #9bdcff, #69c8ff)` MATCH, `translateY(-2px)` MATCH, `var(--radius-panel)` MATCH, `var(--radius-tile)` MATCH, `空きスロット` MATCH; legacy `h-12 bg-surface-raised border-t border-default` ABSENT.
- Acceptance grep contract (Task 2): `test -f ZoomDock.tsx` PASS, `setStageScale` count = 5 (≥ 3 required for the three handlers + 2 other call sites in selector + line), `aria-label="縮小"` MATCH, `aria-label="拡大"` MATCH, `aria-label="表示倍率をリセット"` MATCH, `Math.round(stageScale * 100)` MATCH, `<ZoomDock` in EditorLayout count = 1.
- Manual interaction contract preserved by code review: 1-9 keyboard activation routes through `useKeyboard` → `activateHotbar`, untouched by this plan; click on a slot calls `activateHotbar(slotNumber, fixture)` exactly as before; the temporal/persist partialize whitelists are unchanged so `stageScale` continues to NOT persist (intentional — a fresh page load resets to 1×).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] ZoomDock clamps misaligned with EditorCanvas constants**
- **Found during:** Task 2 read_first inspection of `src/hooks/useCanvasInteraction.ts`.
- **Issue:** The plan said "If not exported, use 0.25 / 4 here." Inspection of `useCanvasInteraction.ts` revealed the actual canvas wheel-zoom constants are `MIN_SCALE = 0.15` and `MAX_SCALE = 3.0` (not 0.25 / 4). Using the plan's defaults would mean button clicks could not zoom out past 0.25× even though wheel-zoom can reach 0.15×, and could not zoom in past 4× even though wheel-zoom caps at 3.0× — two divergent clamp surfaces over the same `stageScale` field.
- **Fix:** Copied the exact values into `ZoomDock.tsx` as `const MIN_SCALE = 0.15; const MAX_SCALE = 3.0;` with a sync-comment marking the file pair. Both files now declare matching constants. A future change in either place needs to be mirrored.
- **Files modified:** `src/components/chrome/ZoomDock.tsx`
- **Commit:** `d128a8b`

No other deviations. Task 1 executed exactly as written.

## Authentication Gates

None — fully automated build + test execution.

## Known Stubs

- **Hotbar drag-from-catalog onto empty slots not wired.** The plan body explicitly noted "currently there is no drag handler in this file; preserve the simple click handler" — i.e., this v1 hotbar accepts only click-to-activate from existing slots and 1-9 keyboard activation. Drag-from-catalog (the catalog tile → empty hotbar slot interaction) is not implemented in this plan. The store action `assignHotbar(slot, fixtureId)` exists from Phase 1 and is callable, but no UI surface in the new hotbar invokes it. Future plan can add `onDragOver`/`onDrop` handlers to the slot button without touching the visual contract established here.
- **`stageScale` is intentionally not persisted.** Reload resets to 1× because `stageScale` is excluded from the persist partialize (Phase 1 decision). This means the `100%` reset button and a fresh page load produce the same state on the first interaction — acceptable per UI-SPEC.
- **No keyboard shortcut for zoom buttons.** The wheel-zoom + button surface covers the primary use cases; a future plan could add `+`/`-`/`0` keys to mirror the buttons, but UI-SPEC does not require it.

These stubs do not block the plan's stated goals: SC-5 (hotbar content-width centered + bottom-right zoom dock wires to setStageScale) is fully satisfied; SC-6 (1-9 keyboard preserved) is verified by code review; SC-7 (visual treatment) progresses.

## Commits

- `8191939` — feat(07-05): re-skin Hotbar to content-width 72x72 white pill
- `d128a8b` — feat(07-05): add ZoomDock and mount in slot F

## Self-Check: PASSED

- `src/components/hotbar/Hotbar.tsx`: FOUND (`width: 72`, `height: 72`, sky gradient `#9bdcff, #69c8ff`, `rgba(105,200,255,.4)` glow, `translateY(-2px)` hover, `var(--radius-panel)`, `var(--radius-tile)`, `空きスロット` aria-label, no legacy `h-12 bg-surface-raised`)
- `src/components/chrome/ZoomDock.tsx`: FOUND (5 `setStageScale` references, `MIN_SCALE = 0.15`, `MAX_SCALE = 3.0`, three aria-labels `縮小`/`拡大`/`表示倍率をリセット`, `Math.round(stageScale * 100)` percentage display, disabled-at-clamp logic)
- `src/components/layout/EditorLayout.tsx`: FOUND (`import { ZoomDock }`, exactly 1 `<ZoomDock />` mount inside `data-chrome-slot="zoom-dock"`)
- Commit `8191939`: FOUND in `git log --oneline`
- Commit `d128a8b`: FOUND in `git log --oneline`
- `pnpm build`: PASSES (exit 0)
- `pnpm test`: 199/199 PASSES
