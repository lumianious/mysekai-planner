---
phase: 03-persistence-sharing
plan: 02
subsystem: persistence
tags: [zustand, persist, zundo, localStorage, middleware, tdd]

requires:
  - phase: 03-persistence-sharing
    plan: 01
    provides: "DESIGN_STORAGE_KEY constant + persistence module layout"
  - phase: 02.1-fence-edge-unified-drag-tool
    provides: "startStrokeBatch/endStrokeBatch + zundo stroke-batch invariant"

provides:
  - "Auto-save to localStorage under 'mysekai:design:v1' on every setState"
  - "Auto-load on module init — rehydrates placedItems, placedEdges, areaLevel, gridSize, isEditorReady"
  - "isEditorReady auto-true when rehydrated design is non-empty (skip WelcomeScreen)"
  - "zundo stroke-batch + undo/redo preserved after persist wraps temporal"
  - "MemoryStorage polyfill in vitest.setup.ts (fixes Node 22+ broken built-in localStorage)"

affects: [03-03-share-import-ui]

tech-stack:
  added: []
  patterns:
    - "persist(temporal(creator)) middleware composition — outer persist, inner temporal"
    - "partialize whitelist for persist: placedItems + placedEdges + areaLevel + gridSize + isEditorReady"
    - "onRehydrateStorage hook auto-sets isEditorReady when design exists (Pitfall 2 defense-in-depth)"
    - "Minimal in-memory Storage polyfill for Vitest (bypasses Node 22 localStorage stub)"

key-files:
  created:
    - "src/__tests__/persist.test.ts"
    - "src/__tests__/temporalAfterRehydrate.test.ts"
    - "vitest.setup.ts"
  modified:
    - "src/stores/editorStore.ts"
    - "vitest.config.ts"

key-decisions:
  - "Persist OUTSIDE temporal (no wrapTemporal) — avoids persisting 50-step undo history (RESEARCH Pitfall 1)"
  - "Persist gridSize alongside areaLevel — avoids post-reload mismatch when setAreaLevel writes both atomically (RESEARCH Pitfall 7)"
  - "partialize auto-promotes isEditorReady=true when design is non-empty + onRehydrateStorage enforces same rule on load — defense in depth for Pitfall 2"
  - "Debounce skipped — stroke-batching already collapses drag events to one write per stroke; localStorage sync write cost is trivial (RESEARCH Pattern 2 confirmation)"
  - "MemoryStorage polyfill in vitest.setup.ts — Node 22+ ships a broken built-in localStorage stub that shadows jsdom's; rather than per-test workaround, install polyfill once globally"

patterns-established:
  - "Per-phase persistence middleware pattern: persist({name, version, storage, partialize, onRehydrateStorage}) wrapping existing temporal middleware"
  - "Vitest setup file owns jsdom/Node-storage reconciliation"

requirements-completed: [PERS-01, PERS-02]

duration: 5min
completed: 2026-04-21
---

# Phase 03 Plan 02: Persist Middleware Wiring Summary

**Wrap editorStore in `persist(temporal(...))` so placedItems, placedEdges, areaLevel, gridSize, and isEditorReady auto-save to localStorage and auto-rehydrate on page load — zero UI changes, stroke-batch invariant preserved.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-21T09:32:50Z
- **Completed:** 2026-04-21T09:38:30Z
- **Tasks:** 2 (TDD RED → GREEN)
- **Files modified:** 3 created + 2 modified (1 source + 2 tests + 2 config)

## Accomplishments

- 10 Wave 0 tests lock PERS-01 + PERS-02 + stroke-batch invariant (7 persist + 3 temporal-composition).
- `persist` middleware wraps `temporal` — middleware composition per RESEARCH Pattern 1 exactly.
- `partialize` whitelist excludes 8 transient fields (selectedItemId, toolMode, activeFixtureId, overwriteEnabled, previewRotation, hotbar, flashItemIds, stageScale) + undo history.
- `onRehydrateStorage` hook enforces Pitfall 2 invariant on load (non-empty design → isEditorReady=true).
- zundo stroke-batch (`startStrokeBatch`/`endStrokeBatch`) continues to work across rehydrate — undo after batched stroke correctly restores pre-stroke state.
- Full test suite: 173/173 pass. `pnpm build` clean.

## Exact persist config used

```typescript
{
  name: DESIGN_STORAGE_KEY,             // 'mysekai:design:v1'
  version: 1,
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    placedItems: state.placedItems,
    placedEdges: state.placedEdges,
    areaLevel: state.areaLevel,
    gridSize: state.gridSize,
    isEditorReady:
      Object.keys(state.placedItems).length > 0 ||
      Object.keys(state.placedEdges).length > 0
        ? true
        : state.isEditorReady,
  }),
  onRehydrateStorage: () => (rehydrated) => {
    if (!rehydrated) return
    const hasDesign =
      Object.keys(rehydrated.placedItems ?? {}).length > 0 ||
      Object.keys(rehydrated.placedEdges ?? {}).length > 0
    if (hasDesign && !rehydrated.isEditorReady) {
      rehydrated.isEditorReady = true
    }
  },
}
```

## Debounce status

**Skipped.** Per RESEARCH §Pattern 2 and CLAUDE.md §Simplicity First:

- Stroke-batching (Phase 02.1) already collapses drag paint/fence operations to a single setState per stroke — writes happen only at stroke end, not every frame.
- Under heavy use that's ≤50 writes/min to localStorage, which is synchronous, fast, and imposes no observable cost.
- Zustand's `persist` writes synchronously inside setState, so the `beforeunload` "final flush" concern from D-08 is satisfied for free.
- D-08 called for ~1s debounce; research confirmed that's a non-problem given Phase 02.1's stroke-batch model. Skipping the debounce eliminates a hook, a timer, and a window event listener — no lost functionality.

Revisit only if profiling shows jank.

## Task Commits

1. **Task 1: Wave 0 failing tests** — `68ce981` (test)
2. **Task 2: Wrap store in persist middleware** — `a8c3316` (feat)

## Files Created/Modified

- `src/__tests__/persist.test.ts` — 7 tests covering PERS-01 (save) + PERS-02 (load) + partialize whitelist
- `src/__tests__/temporalAfterRehydrate.test.ts` — 3 tests proving stroke-batch + undo/redo survive rehydrate
- `vitest.setup.ts` — MemoryStorage polyfill (see Deviations)
- `src/stores/editorStore.ts` — added `persist(…)` wrapper outside `temporal(…)`; added L3 header comment for DocOps
- `vitest.config.ts` — added `setupFiles: ['./vitest.setup.ts']`

## Decisions Made

- **persist wraps temporal (no wrapTemporal).** Matches RESEARCH Pattern 1 and StackBlitz reference; `wrapTemporal` would persist 50-step undo history, adding kilobytes for zero user value.
- **Persist gridSize even though it's derivable from areaLevel.** 8 bytes saved vs. one round-trip bug's worth of debugging — not close.
- **isEditorReady derived on BOTH serialize (partialize) and deserialize (onRehydrateStorage).** Either alone would work for the happy path, but defense-in-depth handles the edge case of a payload where the invariant is violated (e.g., hand-edited localStorage, legacy v0 data). Cost: ~8 lines.
- **Debounce deferred.** See Debounce status above.
- **MemoryStorage polyfill over per-test mocking.** See Deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Node 22+ built-in localStorage shadows jsdom's Storage, breaks persist tests**

- **Found during:** Task 1 (RED phase — `localStorage.clear is not a function`)
- **Issue:** Node 22+ introduced a built-in `localStorage` global activated by `--localstorage-file=PATH`. Without the flag, Node still installs a stub object with `typeof localStorage === 'object'` but NO Storage prototype methods (setItem, getItem, clear, etc.). This stub overrides jsdom's real Storage on `globalThis` AND `window.localStorage`. Zustand `persist` middleware hits the broken global and crashes. This was not covered in RESEARCH because the project had never used localStorage in tests before.
- **Fix:** Added `vitest.setup.ts` that installs a minimal in-memory Storage polyfill on `globalThis.localStorage`, `globalThis.sessionStorage`, `window.localStorage`, `window.sessionStorage`. The polyfill implements the full Storage interface (setItem/getItem/removeItem/clear/length/key). Wired via `setupFiles: ['./vitest.setup.ts']` in vitest.config.ts.
- **Why Rule 3:** Truly blocked Task 1 tests from running. Zero scope creep — polyfill is 65 lines, test-only, doesn't touch production code.
- **Files modified:** vitest.setup.ts (new), vitest.config.ts (setupFiles entry)
- **Verification:** All 173 tests pass after polyfill (including the original 164 that weren't touching localStorage — no regressions).
- **Committed in:** 68ce981 (Task 1 commit, alongside the tests that require it)

**2. [Rule 2 - Missing critical functionality] onRehydrateStorage hook**

- **Found during:** Task 2 GREEN (Test G failed: rehydrate with `isEditorReady: false` in payload + non-empty placedItems didn't auto-flip to true)
- **Issue:** Plan specified handling Pitfall 2 via `partialize` — but partialize only runs on SERIALIZE, not on DESERIALIZE. If a payload arrives with `isEditorReady: false` (legacy, hand-edited, or corner case), the rehydrated store would still show WelcomeScreen despite having a design.
- **Fix:** Added `onRehydrateStorage` callback that checks the rehydrated state post-load; if design exists but `isEditorReady` is false, mutates it to true. Defense-in-depth alongside partialize.
- **Why Rule 2:** Plan's must_have truth #3 ("Rehydrated state with non-empty placedItems sets isEditorReady=true so App.tsx skips WelcomeScreen") cannot be guaranteed by partialize alone — needs deserialize-side enforcement too.
- **Files modified:** src/stores/editorStore.ts
- **Verification:** Test G passes; all existing tests remain green.
- **Committed in:** a8c3316 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (Rule 3 blocker, Rule 2 critical functionality)
**Impact on plan:** Both fixes necessary to satisfy plan must_haves. No architectural change. The `onRehydrateStorage` hook was hinted at in RESEARCH Pattern 1 inline comment but not explicitly required by the plan; Test G's failure proved it necessary.

## Issues Encountered

- **Node 22 localStorage breakage** — well-documented community issue but new to this repo. Fix is one-time infrastructure (polyfill), not recurring.

## Surprises future phases should know about

- **Rehydrate is synchronous with localStorage.** Zustand persist hydrates eagerly when the storage adapter is synchronous (localStorage is). No async flicker to worry about in practice. The `skipHydration` option was not needed. Plan 03-03's `useImportFromURL` hook can assume the rehydrated state is already in place when the hook's effect fires.
- **`useEditorStore.persist.rehydrate()` exists.** For tests that want to manually re-run rehydration after seeding localStorage, call `await useEditorStore.persist.rehydrate()`. Tests use `vi.resetModules()` + dynamic `import()` as the primary pattern, but the manual rehydrate is a backup for edge cases.
- **Stroke-batch preserved.** `useEditorStore.temporal` is unchanged — `startStrokeBatch`/`endStrokeBatch` and the direct `temporal.setState({ pastStates, futureStates })` manipulation in endStrokeBatch still work. Verified by `temporalAfterRehydrate.test.ts` Test 1.

## User Setup Required

None — pure middleware composition, no external configuration.

## Next Phase Readiness

- **Plan 03-03 (Share button + import URL):** Can assume the store auto-saves without any explicit call; ShareButton just reads state, encodes, copies to clipboard. `useImportFromURL` can call `applyBlueprint` (from 03-01) which will trigger persist write of the new state.
- Note for 03-03: after `applyBlueprint`, persist writes the imported design immediately — so even if user closes the tab before editing, the imported design sticks (matches RESEARCH §Open Questions 2 recommendation).
- No blockers.

## Self-Check: PASSED

- src/__tests__/persist.test.ts — FOUND
- src/__tests__/temporalAfterRehydrate.test.ts — FOUND
- vitest.setup.ts — FOUND
- src/stores/editorStore.ts — FOUND (modified; persist + DESIGN_STORAGE_KEY + createJSONStorage present, no wrapTemporal)
- vitest.config.ts — FOUND (setupFiles entry present)
- Commit 68ce981 — FOUND (Task 1 RED)
- Commit a8c3316 — FOUND (Task 2 GREEN)
- Full test suite: 173/173 pass; `pnpm build` clean

---
*Phase: 03-persistence-sharing*
*Completed: 2026-04-21*
