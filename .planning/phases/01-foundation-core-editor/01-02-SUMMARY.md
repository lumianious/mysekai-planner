---
phase: 01-foundation-core-editor
plan: 02
subsystem: data, state
tags: [zustand, zundo, undo-redo, fixture-data, occupancy-grid, sekai-master-db-diff]

requires:
  - phase: 01-01
    provides: "TypeScript types (Fixture, PlacedItem, EditorState, Rotation, ItemLayer), grid utils (tileKey, getEffectiveSize, isInBounds), area level config (getGridSize)"
provides:
  - "Fixture data fetching, filtering (outdoor, genre, search), CDN URL construction"
  - "Zustand editor store with all editor actions (place, move, rotate, remove)"
  - "zundo undo/redo with 50-step history, partialized to placedItems only"
  - "Preview rotation state accessible from store for GhostPreview and keyboard handlers"
  - "Occupancy grid builder and collision detection per layer"
  - "Genre data fetching (main/sub genres sorted by seq)"
affects: [01-03, 01-04, 01-05, 01-06]

tech-stack:
  added: [zundo]
  patterns: [zustand-temporal-partialize, occupancy-grid-collision, module-level-fetch-cache]

key-files:
  created:
    - src/data/fixtures.ts
    - src/data/genres.ts
    - src/stores/editorStore.ts
    - src/__tests__/fixtures.test.ts
    - src/__tests__/editorStore.test.ts
  modified: []

key-decisions:
  - "Added equality function to zundo temporal config to prevent redundant undo entries from non-placedItems state changes"
  - "Module-level cache for fetchFixtures to avoid redundant network requests"
  - "previewRotation excluded from zundo tracking (transient UI state)"

patterns-established:
  - "Zustand store with zundo temporal: partialize + equality for selective undo/redo"
  - "OccupancyGrid as Map<string, string> with tileKey->itemId for per-layer collision"
  - "Module-level fetch cache pattern for static data (fixtures, genres)"

requirements-completed: [CATL-01, CATL-02, CATL-03, CATL-04, GRID-03, GRID-04, GRID-05, GRID-06, GRID-07, GRID-09]

duration: 7min
completed: 2026-04-09
---

# Phase 01 Plan 02: Fixture Data & Editor Store Summary

**Fixture data layer with outdoor filtering/search/CDN URLs and Zustand editor store with 50-step undo/redo, per-layer occupancy grid collision, and globally accessible preview rotation**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-09T09:46:39Z
- **Completed:** 2026-04-09T09:54:01Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- Fixture data layer: fetch from sekai-master-db-diff, outdoor filter (excludes room/system), Japanese name+pronunciation search, genre filtering, CDN thumbnail URL construction, layer assignment
- Zustand editor store with all core actions: placeItem, moveItem, rotateItem (cw/ccw), removeItem (system protection), setToolMode, setAreaLevel, setActiveFixture, hotbar assign/activate, startEditor
- zundo temporal middleware with 50-step undo/redo history, partialized to only track placedItems changes, equality check prevents redundant entries
- Occupancy grid collision detection: buildOccupancyGrid and checkCanPlace operating per-layer, with excludeItemId support for move validation
- Preview rotation (previewRotation) lives in store for cross-component access, resets to 0 on fixture change
- 39 new tests (15 fixture + 24 editor store), all passing alongside 28 existing tests (67 total)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fixture data layer** - `bbadaf6` (test: failing tests), `0584c5d` (feat: implementation)
2. **Task 2: Editor store with undo/redo** - `9523efd` (test: failing tests), `c33b8d0` (feat: implementation)

_TDD: each task has RED (failing test) and GREEN (implementation) commits_

## Files Created/Modified
- `src/data/fixtures.ts` - Fixture data fetching, outdoor filtering, search, genre filtering, CDN URL construction, layer assignment, system fixture extraction
- `src/data/genres.ts` - Main/sub genre fetching with seq-based sorting
- `src/stores/editorStore.ts` - Zustand store with zundo temporal, all editor actions, occupancy grid helpers
- `src/__tests__/fixtures.test.ts` - 15 tests for fixture data layer functions
- `src/__tests__/editorStore.test.ts` - 24 tests for editor store actions, undo/redo, occupancy grid

## Decisions Made
- Added `equality` function to zundo temporal config comparing `placedItems` reference identity. Without this, non-placedItems state changes (setToolMode, rotatePreview) would create redundant undo entries despite partialize, because zundo's default behavior creates entries for every `set` call regardless of whether partialized state changed.
- Used module-level variable cache for `fetchFixtures()` to avoid re-fetching static data from GitHub raw URLs on repeated calls.
- `previewRotation` intentionally excluded from zundo tracking via partialize -- it's transient UI state that shouldn't be undoable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added equality function to zundo temporal config**
- **Found during:** Task 2 (editor store implementation)
- **Issue:** Without equality check, zundo created undo entries for every `set` call even when `placedItems` (the only partialized field) didn't change. This caused undo to cycle through identical states instead of reverting actual placement changes.
- **Fix:** Added `equality: (pastState, currentState) => pastState.placedItems === currentState.placedItems` to temporal config
- **Files modified:** src/stores/editorStore.ts
- **Verification:** Undo/redo test "only affects placedItems, not toolMode or selectedItemId or previewRotation" passes
- **Committed in:** c33b8d0

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential for correct undo/redo behavior. No scope creep.

## Issues Encountered
- Dependencies not installed in worktree -- ran `pnpm install` before tests could execute.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Fixture data layer ready for catalog sidebar (Plan 03/04)
- Editor store ready for canvas interaction hooks (Plan 03)
- Occupancy grid ready for placement validation in canvas click handler
- Preview rotation ready for GhostPreview component consumption

## Self-Check: PASSED

All 5 created files verified on disk. All 4 commit hashes found in git history.

---
*Phase: 01-foundation-core-editor*
*Completed: 2026-04-09*
