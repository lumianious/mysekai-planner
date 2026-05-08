---
phase: 09-catalog-overhaul-genre-driven-categories-with-search
plan: 02
subsystem: state-store
tags: [zustand, persist, migration, catalog, phase9]
requires:
  - editorStore persist middleware (Phase 7 v1→v2→v3 migrate ladder)
  - DESIGN_STORAGE_KEY (src/persistence/storageKey.ts)
provides:
  - "activeCategory: number | 'all' (mainGenreId-driven, replaces Phase7Category string)"
  - "activeSubGenreId: number | null (transient, Phase 9 D-08)"
  - "searchActiveBeforeQuery: { mainId; subId } | null (transient, D-15 snapshot)"
  - "setActiveSubGenreId / setSearchActiveBeforeQuery actions"
  - "persist version 4 with lossless v3→v4 migrate"
affects:
  - src/components/chrome/CatalogRail.tsx (consumes activeCategory; will be re-wired in plan 09-03)
  - src/components/catalog/CatalogSidebar.tsx (consumes activeSubGenreId/searchActiveBeforeQuery; wired in plan 09-04)
tech-stack:
  added: []
  patterns:
    - "Persist migrate ladder pattern (extend `if (fromVersion < N)` chain)"
    - "Atomic state reset in setter (setActiveCategory → activeSubGenreId: null)"
    - "Transient field excluded from both persist.partialize and temporal.partialize"
key-files:
  created:
    - src/stores/__tests__/persistMigrate.test.ts
  modified:
    - src/stores/editorStore.ts
    - src/types/editor.ts
decisions:
  - "Phase7Category type import not present in editorStore.ts (it used `string`); removal deferred to plan 09-05 in src/data/fixtures.ts as planned"
  - "Temporal partialize already filters to placedItems+placedEdges (Phase 02.1) — new transient fields naturally excluded, no edit required"
  - "v1→v2→v3→v4 chain preserved verbatim; v4 case appended after v3 case"
metrics:
  duration: 7min
  tasks: 1
  files: 3
  completed: 2026-05-08
requirements: [CATL-08]
---

# Phase 09 Plan 02: editorStore Phase 9 Migration Summary

**One-liner:** Migrate `activeCategory` from `Phase7Category` string union to `number | 'all'`, add two transient catalog fields (`activeSubGenreId`, `searchActiveBeforeQuery`), and bump persist version 3 → 4 with a lossless migrate that coerces every old string to `'all'`.

## What Changed

### `src/stores/editorStore.ts`
- **L1–14 DocOps L3 header** — added Phase 9 plan 02 note enumerating new transient fields and clarifying they are excluded from persist + temporal.
- **L172** — `activeCategory: 'all' as number | 'all'` (was inferred string `'all'`).
- **L173–177** — added two transient fields:
  ```typescript
  activeSubGenreId: null as number | null,
  searchActiveBeforeQuery: null as { mainId: number | 'all'; subId: number | null } | null,
  ```
- **L387–391** — `setActiveCategory` now atomically resets `activeSubGenreId`; added `setActiveSubGenreId` and `setSearchActiveBeforeQuery` actions next to it.
- **L411** — persist `version: 3` → `version: 4`.
- **L454–458** — appended `if (fromVersion < 4)` migrate case that coerces `activeCategory` to `'all'`.
- Persist `partialize` (L460–478) and temporal `partialize` (L399–402) **unchanged** — new transient fields naturally outside both whitelists.

### `src/types/editor.ts`
- **EditorState.activeCategory** — `string` → `number | 'all'`.
- Added `activeSubGenreId: number | null` and `searchActiveBeforeQuery: { mainId: number | 'all'; subId: number | null } | null` to interface.
- **setActiveCategory** — `(category: string) => void` → `(category: number | 'all') => void`.
- Added `setActiveSubGenreId` and `setSearchActiveBeforeQuery` setter signatures.

### `src/stores/__tests__/persistMigrate.test.ts` (new)
9 unit tests covering CATL-08:
1. v3 `activeCategory: 'shelf'` → `'all'`
2. All 6 old Phase7Category strings (`display`/`canvas`/`rug`/`road`/`shelf`/`plant`/`block`) → `'all'`
3. v3 payload preserves all other fields (placedItems/placedEdges/areaLevel/gridSize/inventory/chrome) losslessly
4. v4 numeric `activeCategory: 2` passes through
5. v4 `'all'` sentinel passes through
6. `activeSubGenreId` / `searchActiveBeforeQuery` default to `null` AND are excluded from persist payload after writes
7. `setActiveCategory` resets `activeSubGenreId` to `null` (pitfall §2)
8. persist payload's top-level `version` is `4`
9. Legacy v1 payload flows through full v1→v2→v3→v4 chain with all chrome defaults populated

## Migrate Hook Chain

| From | To | Effect |
|------|----|----|
| v1 | v2 | Adds chrome defaults (`catalogCollapsed`, `costPanelOpen`, `floatbarPosition='center'`, `activeCategory='all'`) |
| v2 | v3 | Converts discrete `floatbarPosition` → continuous `floatbarX`; populates `catalogTop=76` |
| **v3** | **v4** | **Coerces `activeCategory` string → `'all'` (CATL-08, this plan)** |

A v1 payload migrating today goes through all three steps in sequence; a v3 payload only goes through the final step.

## Verification

- `pnpm vitest run src/stores/__tests__/persistMigrate.test.ts --reporter=dot` — 9/9 pass
- `pnpm tsc --noEmit` — clean
- `pnpm vitest run --reporter=dot` — 219/220 pass; the single failure is `src/__tests__/fixtures.test.ts > does not export filterByPhase7Category` which is a forward-reference assertion for plan **09-05** (out of scope for plan 09-02 — `filterByPhase7Category` will be removed from `src/data/fixtures.ts` in plan 09-05).

## Deviations from Plan

None — plan executed exactly as written. The single planned conditional ("remove `Phase7Category` type import if no other usage remains in this file") was a no-op because `editorStore.ts` never imported `Phase7Category` (it used the wider `string` type for `activeCategory`); removal lands in plan 09-05 inside `src/data/fixtures.ts`.

## Commits

- `e973ec5` — feat(09-02): migrate editorStore to Phase 9 catalog shape (CATL-08)
- `9afe3e0` — test(09-02): add failing persist v3→v4 migrate tests for CATL-08

## Self-Check: PASSED

- src/stores/editorStore.ts — FOUND, contains `version: 4`, `if (fromVersion < 4)`, `activeSubGenreId`, `searchActiveBeforeQuery`, `setActiveCategory: (category) => set({ activeCategory: category, activeSubGenreId: null })`
- src/types/editor.ts — FOUND, EditorState updated
- src/stores/__tests__/persistMigrate.test.ts — FOUND, 9 tests passing
- Commit `e973ec5` — FOUND in git log
- Commit `9afe3e0` — FOUND in git log
