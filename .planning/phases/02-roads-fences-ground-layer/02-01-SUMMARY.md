---
phase: 02-roads-fences-ground-layer
plan: 01
subsystem: data
tags: [typescript, fixture-schema, classifier, tdd, vitest]

# Dependency graph
requires:
  - phase: 01-foundation-core-editor
    provides: Fixture interface, getItemLayer, two-layer (ground/furniture) architecture
provides:
  - Fixture.mysekaiFixtureHandleType field (9-value union from live data)
  - mysekaiSettableLayoutType extended with 'road' and 'floor_appearance'
  - getItemLayer fix routing layoutType='road' to ground layer
  - getGroundSubtype() canonical classifier (road / color-tile / fence / rug / null)
  - isBrushEligible() and getBrushInteraction() helpers for plan 02-02 brush tool
  - src/__tests__/groundSubtype.test.ts seeded for downstream plans
affects: [02-02, 02-03, 02-04, phase-03, phase-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "handleType as canonical brush-target field (not name/ID heuristic)"
    - "Ground subtype classification as pure function of Fixture (no live data dependency)"
    - "TDD: RED commit for tests, GREEN commit for implementation"

key-files:
  created:
    - src/__tests__/groundSubtype.test.ts
  modified:
    - src/types/editor.ts
    - src/data/fixtures.ts
    - src/__tests__/fixtures.test.ts
    - src/__tests__/editorStore.test.ts
    - src/__tests__/ghostPreview.test.ts
    - src/__tests__/catalogFilter.test.ts

key-decisions:
  - "[Phase 02]: mysekaiFixtureHandleType is the canonical brush-target discriminator (cleanly partitions 26 roads/color-tiles and 7 fences)"
  - "[Phase 02]: 'floor_appearance' stays on furniture layer (parallels 'wall_appearance'); deferred collision behavior to future task"
  - "[Phase 02]: Rug classification uses layoutType='rug' (not handleType) to preserve Phase 1 routing"

patterns-established:
  - "Ground subtype classifier uses mysekaiFixtureHandleType as the authoritative field, with mainGenreId only as sub-discriminator between road (12) and カラータイル (31)"
  - "Mock Fixture literals across test files now include mysekaiFixtureHandleType: 'none' — convention for non-brush-target mocks"

requirements-completed: [ROAD-04, ROAD-01]

# Metrics
duration: 4min
completed: 2026-04-10
---

# Phase 2 Plan 01: Schema Fix and Ground Subtype Classifier Summary

**Fixed Phase 1 schema bug routing roads to the wrong layer, added mysekaiFixtureHandleType to Fixture type, and established the canonical getGroundSubtype classifier with 11 unit tests covering real game-data sample IDs (111 road, 114 fence, 544 color tile).**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-10T09:51:36Z
- **Completed:** 2026-04-10T09:55:52Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 5 (1 created, 5 modified)

## Accomplishments
- Extended `Fixture` interface with `mysekaiFixtureHandleType` (9-value union covering every value observed in live data: none, block, light, road, windowpane, clock, fence, idle_timeline, block_transparent)
- Extended `mysekaiSettableLayoutType` union with the two missing values `'road'` and `'floor_appearance'` that Phase 1 silently omitted
- Fixed `getItemLayer()` so all 26 `layoutType='road'` fixtures (6 roads + 20 color tiles) now correctly route to the ground layer (ROAD-04 precondition satisfied)
- Shipped `getGroundSubtype()`, `isBrushEligible()`, `getBrushInteraction()` — the classifier triple that plan 02-02 needs to branch between drag-paint and line-tool modes
- Seeded `src/__tests__/groundSubtype.test.ts` with 11 cases using real game sample IDs for downstream plans

## Task Commits

Each task was committed atomically (--no-verify due to parallel execution):

1. **Task 1: Extend Fixture type** — `fb057f7` (feat)
2. **Task 2 RED: Add failing classifier tests** — `399b9e9` (test)
3. **Task 2 GREEN: Classifier implementation + getItemLayer fix** — `b24b333` (feat)

_Task 2 is TDD (RED commit + GREEN commit). No REFACTOR commit was needed — the initial implementation was clean._

## Files Created/Modified

- `src/__tests__/groundSubtype.test.ts` — 11 test cases for `getGroundSubtype` / `isBrushEligible` / `getBrushInteraction` using real sample IDs (road 111, fence 114, color tile 544, plus synthetic rug and table)
- `src/types/editor.ts` — Added `mysekaiFixtureHandleType` field and two new `mysekaiSettableLayoutType` variants to `Fixture` interface
- `src/data/fixtures.ts` — Fixed `getItemLayer` (added `'road'` to ground routing), appended `GroundSubtype` type + `getGroundSubtype` + `isBrushEligible` + `getBrushInteraction` exports
- `src/__tests__/fixtures.test.ts` — Added 4 ROAD-04 regression cases; populated `mysekaiFixtureHandleType: 'none'` on 7 mock fixtures
- `src/__tests__/editorStore.test.ts` — Populated `mysekaiFixtureHandleType: 'none'` on 2 mock fixtures
- `src/__tests__/ghostPreview.test.ts` — Populated `mysekaiFixtureHandleType: 'none'` on 1 mock factory
- `src/__tests__/catalogFilter.test.ts` — Populated `mysekaiFixtureHandleType: 'none'` on 5 mock fixtures

## Decisions Made

None beyond what was already locked in CONTEXT.md and RESEARCH.md. Implementation followed the plan exactly:
- Classifier uses `handleType` as authoritative; `mainGenreId` only disambiguates 12 (道) vs 31 (カラータイル) within `handleType='road'`.
- Rug continues to use `layoutType='rug'` path, not `handleType`, preserving Phase 1 behavior.
- `floor_appearance` left on furniture layer (parallels `wall_appearance`).

## Deviations from Plan

None - plan executed exactly as written.

The plan already anticipated that test fixture literals would need the new required field added, and spelled out the four affected test files. No new scope discovered.

## Issues Encountered

None. RED → GREEN cycle was clean:
- After writing the RED test, 11 failures were exactly the expected set (`getGroundSubtype` / `isBrushEligible` / `getBrushInteraction` undefined + 1 road regression test).
- After GREEN implementation, all 101 tests in the suite passed and `tsc --noEmit` exited clean.

## Self-Check

**File existence:**
- FOUND: src/__tests__/groundSubtype.test.ts
- FOUND: src/types/editor.ts (modified)
- FOUND: src/data/fixtures.ts (modified)
- FOUND: src/__tests__/fixtures.test.ts (modified)
- FOUND: src/__tests__/editorStore.test.ts (modified)
- FOUND: src/__tests__/ghostPreview.test.ts (modified)
- FOUND: src/__tests__/catalogFilter.test.ts (modified)

**Commit existence:**
- FOUND: fb057f7 (Task 1 — Fixture type extension)
- FOUND: 399b9e9 (Task 2 RED — failing tests)
- FOUND: b24b333 (Task 2 GREEN — classifier implementation)

**Verification results:**
- `pnpm exec tsc --noEmit` — exit 0
- `pnpm test --run` — 101/101 passing (2 new test files, 10 + 4 new cases)

## Self-Check: PASSED

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plans 02-02, 02-03, 02-04 can now proceed. Specifically:

- **Plan 02-02 (brush infrastructure)** has the required `isBrushEligible` / `getBrushInteraction` helpers to route `setActiveFixture` into `'brush'` mode vs `'stamp'` mode.
- **Plan 02-03 (drag-paint roads/color-tiles)** has a clean `'drag-paint'` branch in `getBrushInteraction`.
- **Plan 02-04 (fence line tool)** has a clean `'line-tool'` branch.
- **ROAD-04** is now truly satisfied end-to-end: `GroundLayer.tsx` renders below `FurnitureLayer.tsx` (Phase 1) AND `getItemLayer` correctly routes all 26 road/color-tile fixtures to ground (Phase 2).
- **ROAD-01** schema-level precondition complete: the classifier exists and is tested with real sample IDs.

No blockers. No concerns.

---
*Phase: 02-roads-fences-ground-layer*
*Completed: 2026-04-10*
