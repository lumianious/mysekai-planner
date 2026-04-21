---
phase: 03-persistence-sharing
plan: 01
subsystem: persistence
tags: [lz-string, zustand, zundo, url-sharing, persistence, tdd]

requires:
  - phase: 02.1-fence-edge-unified-drag-tool
    provides: "PlacedEdge edge-based data model + EdgeOrientation type"
  - phase: 01-foundation
    provides: "PlacedItem, AreaLevel, useEditorStore, temporal middleware"

provides:
  - "Pure encoder: slice -> 'v1.<lz-string>' URL-safe string"
  - "Pure decoder: string -> DecodedBlueprint | null, never throws"
  - "applyBlueprint: setState + temporal.clear() helper"
  - "DESIGN_STORAGE_KEY constant for localStorage"
  - "Wave 0 test coverage (17 tests) for roundtrip, versioning, size budget"

affects: [03-02-persist-middleware, 03-03-share-import-ui]

tech-stack:
  added: []
  patterns:
    - "Tuple-over-object URL payload format (no field names)"
    - "Bit-packed rotation/layer/isSystem into single 4-bit int"
    - "UUID regeneration on decode (ids not serialized)"
    - "v1. plaintext version prefix gate (dispatch before decompression)"

key-files:
  created:
    - "src/persistence/encodeBlueprint.ts"
    - "src/persistence/decodeBlueprint.ts"
    - "src/persistence/applyBlueprint.ts"
    - "src/persistence/storageKey.ts"
    - "src/persistence/CLAUDE.md"
    - "src/__tests__/urlShareRoundTrip.test.ts"
    - "src/__tests__/urlShareVersioning.test.ts"
    - "src/__tests__/urlShareSizeBudget.test.ts"
  modified: []

key-decisions:
  - "Tuple encoding [f,x,y,packed] over object {f,x,y,r,l,s} to eliminate JSON field-name overhead"
  - "Bit-pack rotation(2) | layer(1) | isSystem(1) into a single int per item"
  - "Drop UUIDs from URL payload and regenerate on decode — UUIDs are incompressible (28KB vs 3.6KB budget); applyBlueprint clears temporal anyway so id continuity was already broken at import boundary"
  - "Plaintext v1. prefix satisfies PERS-05 version byte — human-inspectable, lets decoder dispatch before decompression"

patterns-established:
  - "Persistence module layout: src/persistence/{encode,decode,apply}Blueprint.ts + storageKey.ts + L2 CLAUDE.md"
  - "Pure encode/decode functions with side-effect apply helper kept separate (testability)"
  - "URL-safe tuple format: [fixtureId, x, y, packed] for items, [fixtureId, x, y, orientation] for edges"

requirements-completed: [PERS-05]

duration: 8min
completed: 2026-04-21
---

# Phase 03 Plan 01: URL Blueprint Encode/Decode Module Summary

**Pure tuple-encoded URL blueprint module with plaintext v1. version gate, bit-packed flags, and UUID regeneration — 200i/500e designs compress to 3579 chars (under Twitter 4000 budget).**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-21T09:22:06Z
- **Completed:** 2026-04-21T09:29:48Z
- **Tasks:** 2 (TDD RED → GREEN)
- **Files modified:** 8 created (5 source + 3 test)

## Accomplishments

- Wave 0 test contract (17 cases) locks PERS-05 behavior: roundtrip, versioning rejection, URL-safe alphabet, 4000-char budget.
- Pure `encodeBlueprint` / `decodeBlueprint` functions — zero React/store coupling, fully unit-testable.
- `applyBlueprint` side-effect helper wired to `temporal.clear()` so undo cannot cross import boundary.
- L2 CLAUDE.md documents tuple format, ID-regeneration policy, and future migration path.
- Size budget: 200 items + 500 edges = **3579 chars** (well under 4000 Twitter limit, comfortable margin for 95% of real designs).

## Task Commits

1. **Task 1: Wave 0 failing tests** — `5b2f00c` (test)
2. **Task 2: Implement encode/decode/apply/storageKey** — `36746b3` (feat)

## Files Created/Modified

- `src/persistence/encodeBlueprint.ts` — Pure encoder; tuple format with bit-packed flags
- `src/persistence/decodeBlueprint.ts` — Pure decoder; never throws; validates shape/enums/range
- `src/persistence/applyBlueprint.ts` — setState side-effect + `temporal.clear()`
- `src/persistence/storageKey.ts` — `DESIGN_STORAGE_KEY = 'mysekai:design:v1'`
- `src/persistence/CLAUDE.md` — L2 module doc (tuple format, ID policy, invariants)
- `src/__tests__/urlShareRoundTrip.test.ts` — Field-level roundtrip + URL-safe alphabet assertions
- `src/__tests__/urlShareVersioning.test.ts` — 9 adversarial-input cases, all return null without throwing
- `src/__tests__/urlShareSizeBudget.test.ts` — Asserts 200+500 fixture compresses under 4000 chars

## Decisions Made

- **Tuple encoding over object encoding.** Object `{f,x,y,r,l,s}` kept JSON field names in every item; tuple `[f,x,y,packed]` eliminates that overhead (28% size reduction in the 200+500 case).
- **Bit-pack rotation+layer+isSystem into a single 4-bit int** (`packed = r<<2 | l<<1 | s`). Further shrinks tuple width from 6 numbers to 4.
- **Drop UUIDs from the payload; regenerate on decode.** See Deviations — this was the only way to fit the D-05 budget.
- **Plaintext `v1.` prefix over binary version byte.** Matches RESEARCH recommendation: human-inspectable, lets decoder dispatch before decompression, same forward-compat semantics.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Drop UUID ids from encoded payload, regenerate on decode**

- **Found during:** Task 2 (GREEN phase; size-budget test failed at 28,333 chars vs 4000 limit)
- **Issue:** Plan and RESEARCH specified keeping `id` in serialized payload and estimated 2500-3500 chars for the 200+500 worst case. Actual measurement was 28,333 chars — nearly 8x the budget. Root cause: each PlacedItem/PlacedEdge id is `crypto.randomUUID()` (36 chars, high entropy). 700 UUIDs × 36 = ~25,200 chars of incompressible data that lz-string cannot collapse. The RESEARCH estimate did not account for UUID incompressibility.
- **Fix:** Stop serializing `id` in the CompactItem/CompactEdge tuples. On decode, synthesize a fresh UUID via `crypto.randomUUID()` for each record. This is safe because:
  - `applyBlueprint` calls `temporal.clear()`, so undo cannot cross the import boundary — no consumer holds a reference to pre-import ids.
  - `selectedItemId` is reset to `null` in `applyBlueprint`.
  - Field-level content (fixtureId, x, y, rotation, layer, isSystem, orientation) is preserved exactly.
  - RESEARCH §URL Size Analysis Mitigation 1 explicitly lists this as the recommended mitigation with "minor cost".
- **Also applied:** Tuple encoding + bit-packing (two compatible size reductions recommended by RESEARCH §URL Size Analysis Mitigation 2+3).
- **Files modified:** src/persistence/encodeBlueprint.ts, src/persistence/decodeBlueprint.ts, src/persistence/CLAUDE.md, src/__tests__/urlShareRoundTrip.test.ts (assertion updated to "fields-except-id preservation")
- **Verification:** All 17 urlShare tests green; size-budget now measures 3579 chars (10% under budget); full suite 163/163 pass; `pnpm build` clean.
- **Committed in:** 36746b3 (Task 2 commit)

**2. [Rule 1 - Bug] URL-safe alphabet test assertion was too strict**

- **Found during:** Task 2 verification
- **Issue:** Task 1's test asserted `not.toMatch(/[+/=#?&\s]/)`, but `compressToEncodedURIComponent` legitimately uses `+` in its output alphabet (lz-string documents this; `+` is valid in URL hash fragments). The assertion rejected valid output.
- **Fix:** Relax to `not.toMatch(/[/=#?&\s]/)` (drop `+` from the exclusion list) and add a positive assertion `toMatch(/^v\d+\.[A-Za-z0-9$\-+*]+$/)` documenting the full lz-string URL-safe alphabet.
- **Files modified:** src/__tests__/urlShareRoundTrip.test.ts
- **Verification:** Test passes against encoded output that contains `+` characters.
- **Committed in:** 36746b3 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 correctness fixes)
**Impact on plan:** Both fixes necessary to satisfy plan acceptance criteria (< 4000 chars + URL-safe output). No scope creep. Phase contract (PERS-05: binary format with version byte prefix) preserved exactly; only internal payload shape changed.

## Issues Encountered

- Size-budget failure required rethinking ID strategy mid-execution. RESEARCH budget estimate proved optimistic (didn't account for UUID incompressibility). Fix was the RESEARCH-documented Mitigation 1, applied transparently.

## User Setup Required

None — pure client-side code, no external configuration.

## Next Phase Readiness

- **Plan 03-02 (persist middleware):** Can import `DESIGN_STORAGE_KEY` from `src/persistence/storageKey.ts`; payload shape is stable.
- **Plan 03-03 (Share button + import):** Can import `encodeBlueprint`, `decodeBlueprint`, `applyBlueprint` as pure/side-effect functions.
- Note for plan 03-03: since ids regenerate on import, the Import dialog should communicate "replaces current design" not "merges" — current text already says this (D-07).
- No blockers.

## Self-Check: PASSED

- src/persistence/encodeBlueprint.ts — FOUND
- src/persistence/decodeBlueprint.ts — FOUND
- src/persistence/applyBlueprint.ts — FOUND
- src/persistence/storageKey.ts — FOUND
- src/persistence/CLAUDE.md — FOUND
- src/__tests__/urlShareRoundTrip.test.ts — FOUND
- src/__tests__/urlShareVersioning.test.ts — FOUND
- src/__tests__/urlShareSizeBudget.test.ts — FOUND
- Commit 5b2f00c — FOUND (Task 1 RED)
- Commit 36746b3 — FOUND (Task 2 GREEN)
- Full test suite: 163/163 pass; `pnpm build` clean

---
*Phase: 03-persistence-sharing*
*Completed: 2026-04-21*
