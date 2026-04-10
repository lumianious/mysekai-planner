---
phase: 02-roads-fences-ground-layer
plan: 02
subsystem: editor-core
tags: [typescript, zustand, zundo, react, brush-mode, undo-batching, tdd, vitest]

# Dependency graph
requires:
  - phase: 02-roads-fences-ground-layer
    plan: 01
    provides: getBrushInteraction / isBrushEligible / getGroundSubtype classifier helpers
  - phase: 01-foundation-core-editor
    provides: ToolMode union, Zustand editor store, zundo temporal middleware, toolbar/keyboard scaffold
provides:
  - ToolMode 'brush' literal
  - pickToolModeForFixture(fixture) shared routing helper
  - setActiveFixture(id, fixture?) and activateHotbar(slot, fixture?) with optional fixture routing
  - startStrokeBatch / endStrokeBatch / withBatchedUndo (zundo batching with pre-stroke snapshot commit)
  - Brush toolbar button (Paintbrush icon, P shortcut)
  - 'p' → brush mode keyboard shortcut; Escape clears active fixture in brush mode
  - 'cell' cursor for brush mode (distinct from stamp's 'crosshair')
  - src/__tests__/temporalBatch.test.ts (6 cases including R-06 idempotent double-call)
  - src/__tests__/setActiveFixture.test.ts (11 cases, full routing matrix)
  - editorStore.test.ts rug stamp regression block (ROAD-02 / D-39)
affects: [02-03, 02-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-stroke snapshot + direct temporal.setState push for batched-undo commit (bypasses zundo's default pastState capture)"
    - "Optional fixture arg with undefined-vs-null discrimination for backward-compatible tool-mode routing"
    - "TDD: RED (failing tests committed) → GREEN (implementation committed)"

key-files:
  created:
    - src/__tests__/temporalBatch.test.ts
    - src/__tests__/setActiveFixture.test.ts
  modified:
    - src/types/editor.ts
    - src/stores/editorStore.ts
    - src/components/catalog/CatalogItem.tsx
    - src/components/hotbar/Hotbar.tsx
    - src/hooks/useKeyboard.ts
    - src/components/canvas/EditorCanvas.tsx
    - src/components/toolbar/Toolbar.tsx
    - src/__tests__/editorStore.test.ts

key-decisions:
  - "[Phase 02]: endStrokeBatch commits by pushing the pre-stroke snapshot directly into temporal.pastStates (not by triggering a post-stroke setState); zundo's default setState hook captures the current (post-stroke) state as pastState, which would make undo restore to the post-stroke state — the opposite of what's wanted"
  - "[Phase 02]: setActiveFixture and activateHotbar distinguish undefined fixture (Phase 1 backward-compat → stamp) from null fixture (explicit → select), so the optional second arg stays non-breaking"
  - "[Phase 02]: Module-level _preStrokeSnapshot acts as both the rollback reference and the idempotency guard; endStrokeBatch is a no-op when the guard is null, so mouseup+mouseleave+window.blur racing all call into the same no-op path"

patterns-established:
  - "Call sites holding a Fixture pass it to setActiveFixture/activateHotbar; call sites that don't omit the arg for Phase 1 fallback"
  - "useKeyboard resolves hotbar fixtures via options.fixtureMap for 1-9 slot activation, so brush-eligible fixtures assigned to a hotbar slot auto-enter brush mode on keyboard activation"

requirements-completed: [ROAD-01, ROAD-02]

# Metrics
duration: 8min
completed: 2026-04-10
---

# Phase 2 Plan 02: Brush Tool Mode Infrastructure Summary

**Added the 'brush' ToolMode with zundo stroke batching helpers (startStrokeBatch / endStrokeBatch / withBatchedUndo), shared pickToolModeForFixture routing that auto-switches road/color-tile/fence to brush and keeps rug/furniture on stamp, plus Brush toolbar button, P shortcut, and 'cell' cursor — all interaction handlers deferred to Wave 3 / Wave 4.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-10T10:00:29Z
- **Completed:** 2026-04-10T10:08:02Z
- **Tasks:** 2 (Task 1 TDD with RED + GREEN commits, Task 2 straightforward)
- **Files modified:** 8 (2 created, 6 modified)
- **Tests:** 120/120 passing (17 new cases added across temporalBatch / setActiveFixture / editorStore rug regression)

## Accomplishments
- `ToolMode` extended with `'brush'` literal; `Fixture` is now an optional second arg to `setActiveFixture` and `activateHotbar`
- `pickToolModeForFixture(fixture)` exported — single source of truth shared by catalog click and hotbar activation (RESEARCH open question 2)
- `startStrokeBatch` / `endStrokeBatch` / `withBatchedUndo` merge N paint/remove calls into exactly 1 undo entry
- `CatalogItem.handleClick` passes the fixture object — road/color-tile/fence now auto-enter brush mode from the catalog
- `Hotbar.onClick` resolves the fixture from `fixtureMap` and passes it — mouse-clicking a hotbar slot with a road/color-tile/fence enters brush mode
- `useKeyboard` accepts `fixtureMap` and resolves the hotbar fixture for digit-key activation; `EditorCanvas` wires it through
- Toolbar gains Paintbrush button between Stamp and Remove (P shortcut); `getCursor` returns `'cell'` for brush
- Escape while in brush mode clears active fixture (mirrors stamp behavior)

## Task Commits

Each task committed atomically (--no-verify due to Phase 2 parallel-safety convention):

1. **Task 1 RED** — `866d4d1` (test): failing tests + ToolMode/Fixture signature extension
2. **Task 1 GREEN** — `0236bd8` (feat): pickToolModeForFixture, setActiveFixture/activateHotbar routing, stroke batching helpers, call-site wiring
3. **Task 2** — `1f25f26` (feat): Toolbar Brush button, 'p' shortcut, Escape handler, brush cursor

_Task 1 is TDD (RED commit + GREEN commit). No REFACTOR commit was needed — the initial implementation was clean after Blocker 1 fix (see Deviations)._

## Files Created/Modified

- `src/__tests__/temporalBatch.test.ts` — 6 cases: pause/resume observable, 5×placeItem → 1 history entry, withBatchedUndo wrapper, undo restores pre-stroke, and the R-06 idempotent double-call guard
- `src/__tests__/setActiveFixture.test.ts` — 11 cases: full routing matrix for pickToolModeForFixture (road/color-tile/fence → brush, rug/table → stamp, null → select) plus setActiveFixture behavior including backward-compat fallback
- `src/types/editor.ts` — `'brush'` added to `ToolMode`; `setActiveFixture` and `activateHotbar` signatures gain optional `fixture?: Fixture | null` parameter
- `src/stores/editorStore.ts` — `pickToolModeForFixture` helper; `setActiveFixture`/`activateHotbar` now route via it (with undefined→stamp, null→select discrimination); `startStrokeBatch`/`endStrokeBatch`/`withBatchedUndo` appended after `redoWithFlash`; module-level `_preStrokeSnapshot` guard for idempotency
- `src/components/catalog/CatalogItem.tsx` — `handleClick` now passes `fixture` to `setActiveFixture`
- `src/components/hotbar/Hotbar.tsx` — `onClick` resolves fixture from `fixtureMap` and passes it to `activateHotbar`
- `src/hooks/useKeyboard.ts` — adds `fixtureMap` option, resolves hotbar fixture for 1-9, adds `'p'` case for brush mode, extends Escape handler to also clear active fixture in brush mode
- `src/components/canvas/EditorCanvas.tsx` — `getCursor` adds `'brush' → 'cell'` branch; `useKeyboard` call wires `fixtureMap`
- `src/components/toolbar/Toolbar.tsx` — imports `Paintbrush` from lucide-react; adds fourth `toolButtons` entry between stamp and remove
- `src/__tests__/editorStore.test.ts` — new `describe('rug stamp regression (ROAD-02)', ...)` block asserts D-39: rug click still enters stamp mode and produces a single undo step

## Decisions Made

1. **Commit via snapshot push, not setState trigger** — the plan's original description suggested calling `setState((s) => ({ placedItems: { ...s.placedItems } }))` after `resume()` to produce a single history entry. That strategy records exactly 1 entry, but zundo captures pastState *before* the setState runs, so the recorded pastState is the **post-stroke** items. Undo would then restore to the post-stroke state (no-op). The fix is to capture the pre-stroke `placedItems` reference in `startStrokeBatch` and, in `endStrokeBatch`, push that snapshot directly into `temporal.pastStates` via `useEditorStore.temporal.setState(...)` while clearing `futureStates` and honoring the `limit: 50` cap. This bypasses zundo's default capture and guarantees undo semantics. Documented in the block header comment in `editorStore.ts`.

2. **Undefined-vs-null fixture discrimination** — to keep `setActiveFixture(fixtureId)` backward-compatible with Phase 1 tests (which expect stamp mode), the optional fixture argument is checked with `fixture === undefined ? 'stamp' : pickToolModeForFixture(fixture)`. Passing `null` explicitly routes through the helper and yields `'select'`; passing a fixture routes to brush or stamp based on `handleType`; omitting the arg entirely stays stamp. Both call paths are covered by the setActiveFixture.test.ts suite.

3. **Module-level snapshot as idempotency guard** — `endStrokeBatch` checks both `!temporal.isTracking` and `_preStrokeSnapshot !== null`. On the first call it nulls the snapshot before committing; any subsequent call sees `null` and returns. This collapses three distinct race paths (mouseup, mouseleave, window.blur) into a single no-op after the first commit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] endStrokeBatch undo-restore direction was wrong**
- **Found during:** Task 1 GREEN verification (the "undo of a batched stroke restores the pre-stroke state" test failed)
- **Issue:** The plan's original `endStrokeBatch` body called `temporal.resume()` then `useEditorStore.setState((s) => ({ placedItems: { ...s.placedItems } }))`. That produces exactly 1 history entry (the batched-count test was green), but zundo's `pastState` is captured from `get()` immediately before the setState runs — which by that point is the **post-stroke** state. So undo restored to the post-stroke state (items still present) instead of pre-stroke (empty). Undo test failed with length 2 instead of length 0.
- **Fix:** Refactored to capture `placedItems` in `startStrokeBatch` into a module-level `_preStrokeSnapshot`, then in `endStrokeBatch` directly push `{ placedItems: snapshot }` into `temporal.pastStates` via `useEditorStore.temporal.setState(...)`, clearing `futureStates` and honoring the `limit: 50` cap. Also made the snapshot the idempotency guard (R-06). This fix preserves the plan's Blocker-1 contract ("double-call is a true no-op") and now satisfies the undo test.
- **Files modified:** `src/stores/editorStore.ts`
- **Commit:** `0236bd8`

**2. [Rule 1 - Bug] `pickToolModeForFixture(null)` broke Phase 1 backward-compat for `setActiveFixture(fixtureId)`**
- **Found during:** Task 1 GREEN verification (both the new backward-compat test and an existing Phase 1 `setActiveFixture` test failed)
- **Issue:** The plan's initial implementation used `setActiveFixture: (fixtureId, fixture: Fixture | null = null) => ... pickToolModeForFixture(fixture)`. Because the helper maps `null → 'select'`, legacy call sites that pass only `fixtureId` would land in `'select'` mode — breaking Phase 1's expectation of `'stamp'`. Existing test "setActiveFixture > resets previewRotation to 0" (line 320 of editorStore.test.ts) failed with `'select'` vs `'stamp'`.
- **Fix:** Changed default to `fixture?: Fixture | null` (undefined) and added a branch: `fixture === undefined ? 'stamp' : pickToolModeForFixture(fixture)`. Now omitting the arg yields stamp (Phase 1 behavior); passing `null` yields select; passing a fixture yields brush/stamp by handle type. Same pattern applied to `activateHotbar`.
- **Files modified:** `src/stores/editorStore.ts`
- **Commit:** `0236bd8`

No other deviations — everything else followed the plan exactly.

## Issues Encountered

Two GREEN-pass failures, both root-caused and fixed in the same GREEN commit (no extra commit needed) — see Deviations. After the fix, the full suite went 120/120 green on the first retry.

## Self-Check

**File existence:**
- FOUND: src/__tests__/temporalBatch.test.ts
- FOUND: src/__tests__/setActiveFixture.test.ts
- FOUND: src/types/editor.ts (modified)
- FOUND: src/stores/editorStore.ts (modified)
- FOUND: src/components/catalog/CatalogItem.tsx (modified)
- FOUND: src/components/hotbar/Hotbar.tsx (modified)
- FOUND: src/hooks/useKeyboard.ts (modified)
- FOUND: src/components/canvas/EditorCanvas.tsx (modified)
- FOUND: src/components/toolbar/Toolbar.tsx (modified)
- FOUND: src/__tests__/editorStore.test.ts (modified)

**Commit existence:**
- FOUND: 866d4d1 (Task 1 RED — failing tests + ToolMode extension)
- FOUND: 0236bd8 (Task 1 GREEN — store routing + stroke batching)
- FOUND: 1f25f26 (Task 2 — Toolbar brush button + P shortcut + cell cursor)

**Verification results:**
- `pnpm exec tsc --noEmit` — exit 0
- `pnpm test --run` — 120/120 passing (17 new cases: 6 temporalBatch, 11 setActiveFixture, 2 rug regression; existing 103 still green)

**Grep acceptance criteria (Task 1 + Task 2):**
- `type ToolMode = 'select' | 'stamp' | 'remove' | 'brush'` — present
- `export function pickToolModeForFixture` — 1 match
- `export function startStrokeBatch` — 1 match
- `export function endStrokeBatch` — 1 match
- `export function withBatchedUndo` — 1 match
- `temporal.getState().pause` — present in startStrokeBatch
- `temporal.resume()` — present in endStrokeBatch
- `Paintbrush` in Toolbar.tsx — 2 matches (import + icon usage)
- `mode: 'brush'`, `shortcut: 'P'` in Toolbar.tsx — 1 each
- `case 'p':` and `setToolMode('brush')` in useKeyboard.ts — 1 each
- `state.toolMode === 'brush'` in useKeyboard.ts — 1 match (escape handler)
- `case 'brush':` in EditorCanvas.tsx — 1 match inside getCursor

## Self-Check: PASSED

## Known Stubs

None. This plan intentionally stops at infrastructure — the actual drag-paint (02-03) and fence-line (02-04) handlers land in subsequent plans. That is not a stub; Brush mode is fully functional at the store/tool level, it simply has no `onMouseDown` handler yet. The Brush button and shortcut route users into the mode and the cursor changes, but clicking the canvas in brush mode does nothing (no placement, no ghost beyond what Phase 1's GhostPreview already shows). The plan explicitly calls this out: `Do NOT add brush-specific drag-paint logic in EditorCanvas.tsx in this task — that is plan 02-03.`

## User Setup Required

None.

## Next Phase Readiness

Wave 3 (plan 02-03, drag-paint for roads / color tiles) and Wave 4 (plan 02-04, fence line tool) can now proceed:

- **02-03** has `startStrokeBatch` / `endStrokeBatch` / `withBatchedUndo` ready to wrap its drag-paint loop into a single undo step (D-43).
- **02-03** can attach its `onMouseDown` / `onMouseMove` / `onMouseUp` handlers behind `state.toolMode === 'brush'` and `getBrushInteraction(fixture) === 'drag-paint'`.
- **02-04** has the same batching primitives for committing a confirmed fence line, plus the `'line-tool'` discriminator on `getBrushInteraction`.
- **Regression safety:** rug Stamp flow (ROAD-02) is now explicitly locked by a test — any future refactor that accidentally routes rugs to brush will trip editorStore.test.ts.
- **Mouse-leave / window-blur cleanup:** endStrokeBatch is idempotent, so 02-03's `onMouseLeave` and `window.blur` listeners can both call it without double-recording.

No blockers. No concerns.

---
*Phase: 02-roads-fences-ground-layer*
*Completed: 2026-04-10*
