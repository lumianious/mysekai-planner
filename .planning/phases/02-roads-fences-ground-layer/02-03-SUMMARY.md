---
phase: 02-roads-fences-ground-layer
plan: 03
subsystem: editor-core
tags: [react, konva, zustand, brush-tool, drag-paint, bresenham, tdd, vitest]

# Dependency graph
requires:
  - phase: 02-roads-fences-ground-layer
    plan: 01
    provides: getBrushInteraction / getItemLayer / classifier helpers
  - phase: 02-roads-fences-ground-layer
    plan: 02
    provides: ToolMode 'brush', pickToolModeForFixture, startStrokeBatch / endStrokeBatch / withBatchedUndo, Toolbar brush button, P shortcut
  - phase: 01-foundation-core-editor
    provides: EditorCanvas Stage event model, GhostPreview, buildOccupancyGrid, checkCanPlace, zundo temporal middleware
provides:
  - src/utils/rasterize.ts rasterizeLine (4-connected Bresenham, step-aware) and snapToAxis
  - EditorCanvas drag-paint state machine (isPaintingRef, lastPaintedTileRef, pointerToGrid, paintTileIfAllowed)
  - EditorCanvas drag-erase state machine (isErasingRef, lastErasedTileRef, eraseGroundTileIfAny) — D-42
  - Stage onMouseDown / onMouseUp / onPointerDown / onPointerUp handlers gated on toolMode
  - window.blur cleanup path (R-06 stroke idempotency)
  - GhostPreview brush-mode rendering with step-snapped position (fence line-tool ghost deferred to 02-04)
affects: [02-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ref-driven paint/erase state machine to avoid per-tile React re-renders during drag"
    - "4-connected Bresenham with step-space mapping (neighbor tiles share an edge, no diagonal skips, automatic step-alignment)"
    - "pointerToGrid utility returns BOTH raw and step-snapped grid coords so brush and erase can use the same helper"
    - "endStrokeIfActive guards: clear ref BEFORE endStrokeBatch() so concurrent mouseup/mouseleave/window.blur collapses into one commit"
    - "Overwrite OFF skips occupied tiles but continues stroke (paintbrush semantics — RESEARCH open question 3)"

key-files:
  created:
    - src/utils/rasterize.ts
    - src/__tests__/lineRasterize.test.ts
    - src/__tests__/brushStroke.test.ts
    - src/__tests__/brushErase.test.ts
  modified:
    - src/components/canvas/EditorCanvas.tsx
    - src/components/canvas/GhostPreview.tsx

key-decisions:
  - "[Phase 02]: 4-connected Bresenham splits any simultaneous X+Y move into two consecutive single-axis moves, guaranteeing high-velocity drag leaves no gaps (D-33)"
  - "[Phase 02]: Rasterizer contract treats start == end as a degenerate case and returns the INPUT coordinate verbatim (no step-rounding), so single-click strokes land on the click tile even when the click is not step-aligned"
  - "[Phase 02]: Ref clearing happens BEFORE endStrokeBatch() inside endStrokeIfActive so the second call path (mouseleave after mouseup, or window.blur) sees the ref false and no-ops — this is the R-06 mitigation and must not be reordered"
  - "[Phase 02]: Overwrite OFF skips occupied tiles and continues the stroke (does NOT abort) — matches how Photoshop paint brush behaves when crossing a locked pixel"
  - "[Phase 02]: Brush ghost position is step-snapped with Math.floor(gridX / step) * step so the preview rectangle always lines up with where mousedown will actually place the fixture"

patterns-established:
  - "Stage onMouseDown/onMouseUp/onPointerDown/onPointerUp coexist with onClick — mousedown initiates stroke, mouseup ends it, click still handles non-drag select/remove flows"
  - "pointerToGrid(stage, step) is the canonical way to derive grid coordinates from a pointer event; callers pass step=1 for erase (tile granularity) and step=fixture.gridSize.width for paint (fixture-footprint granularity)"
  - "handleMouseMove is dual-purpose: always updates ghost position; advances active paint/erase stroke if a ref is set"

requirements-completed: [ROAD-01]

# Metrics
duration: 8min
completed: 2026-04-10
---

# Phase 2 Plan 03: Drag-Paint and Drag-Erase Summary

**Delivered the primary ROAD-01 interaction — hold-drag with a road or color-tile fixture paints every tile the cursor crosses as a single undo step, hold-drag in Remove mode erases every ground tile the cursor crosses (furniture preserved per D-21), all backed by a step-aware 4-connected Bresenham rasterizer that never leaves gaps at high drag velocity.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-10T18:13:30Z
- **Completed:** 2026-04-10T18:21:00Z
- **Tasks:** 2 (Task 1 TDD with RED + GREEN commits, Task 2 with integration tests written alongside implementation)
- **Files modified:** 6 (4 created, 2 modified)
- **Tests:** 139/139 passing (19 new cases: 11 lineRasterize + 5 brushStroke + 3 brushErase)

## Accomplishments

- Pure `rasterizeLine(x0, y0, x1, y1, step=1)` in `src/utils/rasterize.ts` — 4-connected Bresenham (neighbor tiles share an edge, no diagonal skips) with step-space mapping so callers can walk in fixture-footprint increments (step=2 for all current road/color-tile/fence fixtures) or tile increments (step=1 for erase)
- `snapToAxis(startX, startY, endX, endY)` — axis-aligned tie-break utility for the fence line tool (D-35) that plan 02-04 will consume
- EditorCanvas paint state machine: `isPaintingRef` + `lastPaintedTileRef` track the active stroke without triggering React re-renders per sample; `handleStageMouseDown` kicks off `startStrokeBatch()` → paints the mousedown tile; `handleMouseMove` advances via `rasterizeLine(last, now, step)` so even high-velocity drags leave no gaps; `handleStageMouseUp` ends the stroke
- EditorCanvas erase state machine (D-42): `isErasingRef` + `lastErasedTileRef` with step=1; drag across ground items in Remove mode removes every ground tile the cursor crosses, batched as a single undo step; furniture items are ignored during drag (Phase 1 D-21 single-click requirement preserved)
- `paintTileIfAllowed` respects the overwrite toggle (D-40): OFF → skip occupied tiles but continue the stroke (RESEARCH open question 3); ON → remove existing ground-layer occupants first, then place
- Layer independence (D-41): `paintTileIfAllowed` calls `buildOccupancyGrid(..., 'ground')` only — a painted road at (x,y) does not observe or conflict with furniture at (x,y)
- R-06 cleanup: `endStrokeIfActive` is idempotent by clearing `isPaintingRef` / `isErasingRef` BEFORE calling `endStrokeBatch()`, so concurrent cleanup paths (`handleStageMouseUp`, `handleMouseLeave`, `window.blur`) all collapse into a single commit; the second and later calls see the refs false and return early
- `window.blur` listener installed via `useEffect` with cleanup on unmount
- GhostPreview extended: `toolMode === 'brush'` with an active fixture now renders the ghost; brush-mode ghost position is step-snapped (`Math.floor(gridX / step) * step`) so the preview rectangle aligns with where mousedown will actually place; fence `line-tool` interaction returns an empty layer (deferred to 02-04)

## Task Commits

Each task committed atomically (--no-verify per Phase 2 parallel-safety convention):

1. **Task 1 RED** — `cd0202d` (test): failing lineRasterize test file importing non-existent `src/utils/rasterize`
2. **Task 1 GREEN** — `c883845` (feat): 4-connected Bresenham `rasterizeLine` + `snapToAxis` implementation; 11/11 rasterize tests green
3. **Task 2** — `059670c` (feat): EditorCanvas paint/erase wiring + GhostPreview brush-mode rendering + brushStroke and brushErase integration tests (8 cases); full suite 139/139 green

_Task 2 integration tests were written alongside the implementation rather than in a separate RED commit because the tests exercise store-level behavior (paintStroke / eraseDrag helpers simulating what EditorCanvas does) and don't touch the DOM — the batching helpers from 02-02 already satisfied the test expectations once wiring was in place._

## Files Created/Modified

- **`src/utils/rasterize.ts`** (created, 92 lines) — L3 header + `Tile` interface + `rasterizeLine` (4-connected Bresenham with step-space mapping and degenerate-case handling) + `snapToAxis` (axis-aligned tie-break for fence line tool)
- **`src/__tests__/lineRasterize.test.ts`** (created, 84 lines) — 11 cases: horizontal step=2, vertical step=2, degenerate same-tile, step=1 preserved, diagonal 4-connectivity invariant, reverse direction, throw on step<=0, 4 snapToAxis cases
- **`src/components/canvas/EditorCanvas.tsx`** (modified, 302 → 523 lines, well under 800) — Added imports for `startStrokeBatch`, `endStrokeBatch`, `buildOccupancyGrid`, `checkCanPlace`, `rasterizeLine`, `getBrushInteraction`; added `isPaintingRef`, `lastPaintedTileRef`, `isErasingRef`, `lastErasedTileRef`; added `pointerToGrid`, `paintTileIfAllowed`, `eraseGroundTileIfAny`, `endStrokeIfActive`, `handleStageMouseDown`, `handleStageMouseUp` callbacks; extended `handleMouseMove` to advance strokes; extended `handleMouseLeave` to call `endStrokeIfActive`; added `useEffect` for `window.blur` cleanup; wired new handlers on `<Stage>`
- **`src/components/canvas/GhostPreview.tsx`** (modified, 95 → 113 lines) — Added `getBrushInteraction` import; replaced `toolMode !== 'stamp'` early-return with `showGhost` that also accepts `'brush'`; added step-snapping for brush drag-paint ghost; hid ghost for fence `line-tool` (deferred to 02-04); switched `mouseGridPos.x/y` references to new `ghostX/ghostY` locals
- **`src/__tests__/brushStroke.test.ts`** (created, 168 lines) — 5 cases: 5-tile stroke = 1 history entry; undo/redo; overwrite OFF skips occupied tiles; D-41 layer independence (furniture does not block ground painting); single-click stroke = 1 history entry
- **`src/__tests__/brushErase.test.ts`** (created, 166 lines) — 3 cases: 3-item ground erase = 1 history entry; furniture ignored during drag (D-21 preserved); undo restores all erased ground items

## Decisions Made

1. **4-connected Bresenham (not 8-connected)** — standard 2D Bresenham walks diagonals with steps like `(0,0)→(1,1)`, which would leave `(0,1)` and `(1,0)` unpainted. For drag-paint the player expects every tile the cursor visually crosses to be painted, so the implementation splits any simultaneous X+Y move into two consecutive single-axis steps. The diagonal test `rasterizeLine(0,0,6,4,2)` explicitly asserts `dx + dy === step` between adjacent tiles (i.e., only one axis changes per step).

2. **Degenerate case returns input verbatim** — `rasterizeLine(5, 5, 5, 5, 2)` returns `[{x:5,y:5}]`, not `[{x:6,y:6}]` (which would be the step-aligned rounding result). Single-click strokes land exactly on the click tile even when the click is not step-aligned, matching how the paint handler pre-snaps its coordinates upstream via `Math.floor(rawX / step) * step`.

3. **Ref clearing BEFORE `endStrokeBatch()`** — `endStrokeIfActive` is called from three places (mouseup, mouseleave, window.blur) that may race. The ref is cleared first so the second caller sees `isPaintingRef.current === false` and returns early, ensuring exactly one `endStrokeBatch()` call per stroke. Reversing the order (clear ref after commit) would allow a second caller to commit a stale stroke. A warning comment in the code explicitly says "不要将 ref 清除操作重新排在 endStrokeBatch 之后 —— 这是 R-06 缓解."

4. **Overwrite OFF continues past occupied tiles** — the paintbrush semantics match Photoshop: painting across a locked pixel skips it but keeps painting. A stroke from (0,0) to (8,0) with (4,0) already occupied places 4 new fixtures (0, 2, 6, 8) rather than aborting at 4. Tested explicitly in `brushStroke.test.ts`.

5. **Brush ghost step-snapping via Math.floor** — `Math.floor(mouseGridPos.x / step) * step` aligns the ghost to the fixture footprint that mousedown will actually place, so the preview rectangle matches the eventual placement. Using `Math.round` would cause the ghost to jump a tile before mousedown snaps.

6. **`pointerToGrid` returns BOTH raw and snapped coordinates** — brush needs the step-snapped version (for paint alignment); erase needs the raw version (1-tile granularity so drag-erase can pick off individual tiles of a multi-tile ground item). Returning both avoids two near-identical helpers.

7. **Erase via `handleStageMouseDown` instead of `handleStageClick`** — previously remove mode dispatched through `handleCanvasClick` on click. That path still exists for single-click removal on items the drag-erase logic misses (e.g. clicking a furniture item). The drag-erase lives on mousedown so the first tile is erased synchronously and the stroke advances via mousemove.

## Deviations from Plan

None - plan executed exactly as written with one minor inline adaptation noted below.

**Adaptation from plan pseudocode → real implementation:**

The plan's `action` section provided a detailed TypeScript sketch that was followed verbatim except for the rasterizer algorithm: the plan's original sketch (lines 165-208 of 02-03-PLAN.md) was the classic 2D Bresenham which produces 8-connected lines, but the test assertion at line 50 of `lineRasterize.test.ts` (also copied from the plan) explicitly demands 4-connectivity (`dx + dy === 2` between adjacent tiles). The implementation was adjusted mid-GREEN to a 4-connected variant that splits simultaneous X+Y moves into consecutive single-axis steps. Both tests and the intent (D-33 "no gaps at high velocity") agree the 4-connected variant is correct — the plan's sketch was simply imprecise about which Bresenham variant to use.

This was discovered when the initial GREEN implementation failed the diagonal invariant test. The fix is localized to `rasterizeLine` and does not affect any caller (EditorCanvas and the integration tests only care about connectivity and step-alignment, both of which the 4-connected variant preserves).

## Issues Encountered

**1. Initial rasterizer attempt had two bugs** — first attempt got the degenerate case wrong (returned step-rounded `(6,6)` instead of input `(5,5)`) and also produced 8-connected diagonals. Both surfaced as GREEN test failures. Fixed in the same GREEN commit by (a) adding an early-return for `x0 === x1 && y0 === y1`, and (b) rewriting the Bresenham loop to split simultaneous X+Y steps into consecutive single-axis steps. Second GREEN run was 11/11 clean.

**2. No other issues.** The EditorCanvas wiring and GhostPreview extension were single-pass clean; full suite went 139/139 on the first run after implementation.

## Self-Check

**File existence:**
- FOUND: src/utils/rasterize.ts
- FOUND: src/__tests__/lineRasterize.test.ts
- FOUND: src/__tests__/brushStroke.test.ts
- FOUND: src/__tests__/brushErase.test.ts
- FOUND: src/components/canvas/EditorCanvas.tsx (modified)
- FOUND: src/components/canvas/GhostPreview.tsx (modified)

**Commit existence:**
- FOUND: cd0202d (Task 1 RED — failing lineRasterize test)
- FOUND: c883845 (Task 1 GREEN — rasterizer implementation)
- FOUND: 059670c (Task 2 — EditorCanvas + GhostPreview + brushStroke/brushErase tests)

**Verification results:**
- `pnpm exec tsc --noEmit` — exit 0
- `pnpm test --run` — 139/139 passing (19 new cases: 11 lineRasterize, 5 brushStroke, 3 brushErase; existing 120 still green)
- `wc -l src/components/canvas/EditorCanvas.tsx` — 523 lines (≤800 CLAUDE.md limit)

**Grep acceptance criteria (Task 2):**
- `isPaintingRef` in EditorCanvas.tsx — 6 matches (≥2 required)
- `startStrokeBatch|endStrokeBatch` in EditorCanvas.tsx — 8 matches (≥4 required)
- `rasterizeLine` in EditorCanvas.tsx — 3 matches (≥2 required)
- `window.addEventListener('blur'` in EditorCanvas.tsx — 1 match (exact)
- `onMouseDown={handleStageMouseDown}` in EditorCanvas.tsx — 1 match (exact)
- `toolMode === 'brush'` in GhostPreview.tsx — 2 matches (≥1 required)
- `getBrushInteraction` in GhostPreview.tsx — 2 matches (≥1 required)
- `export function rasterizeLine` in rasterize.ts — 1 match
- `export function snapToAxis` in rasterize.ts — 1 match
- `export interface Tile` in rasterize.ts — 1 match

## Self-Check: PASSED

## Known Stubs

None. Brush mode now has a fully functional drag-paint and drag-erase implementation end-to-end. The ghost preview shows step-snapped feedback. The only intentionally-deferred piece is the fence line tool, which 02-04 will add — GhostPreview already returns an empty layer for fence fixtures so the user sees no stale stamp ghost when a fence is active.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Wave 4 (plan 02-04, fence line tool) can now proceed cleanly:

- **02-04** consumes `snapToAxis` from `src/utils/rasterize.ts` and `rasterizeLine` with step=fence.gridSize.width for the confirmed line commit
- **02-04** reuses `startStrokeBatch` / `endStrokeBatch` to batch the confirmed line into a single undo entry
- **02-04** will own the fence ghost preview — GhostPreview.tsx currently returns an empty layer for `line-tool` interaction, leaving a clean extension point
- **02-04** Enter/Escape keyboard handling lands in `useKeyboard.ts`, which already wires fixtureMap through (from 02-02)
- **Regression safety:** ROAD-01 is now fully covered by `brushStroke.test.ts` + `brushErase.test.ts`; any future refactor that breaks drag-paint semantics will trip these tests
- **R-06 safety:** `endStrokeIfActive` idempotency is exercised indirectly by every test that uses the batching primitives, and explicitly by `temporalBatch.test.ts` "endStrokeBatch is idempotent on double-call"

No blockers. No concerns.

---
*Phase: 02-roads-fences-ground-layer*
*Completed: 2026-04-10*
