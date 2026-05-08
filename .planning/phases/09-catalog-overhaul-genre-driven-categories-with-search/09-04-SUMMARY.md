---
phase: 09-catalog-overhaul-genre-driven-categories-with-search
plan: 04
subsystem: catalog-sidebar
tags: [catalog, react, zustand, search, filter, chip-strip, breadcrumb, phase9]
requires:
  - editorStore Phase 9 fields (activeCategory: number | 'all', activeSubGenreId, searchActiveBeforeQuery, setters) — landed in 09-02
  - searchFixtures + filterByGenre helpers in src/data/fixtures.ts (Phase 1, dead code until now)
  - fetchSubGenres in src/data/genres.ts
provides:
  - "CatalogSidebar wired to filterByGenre + searchFixtures (Phase 9 filter pipeline)"
  - "Conditional subGenre chip strip (hide<2 rule, hide-while-searching) — CATL-07"
  - "Search bypass + snapshot/restore via store + mainGenre breadcrumb pill — CATL-10"
  - "Empty state preserved verbatim — CATL-11"
  - "Generalized CategoryFilter (ChipStrip) with items: {id; name}[] prop"
  - "subGenres threaded useFixtureData → EditorLayout → CatalogRail → CatalogSidebar"
affects:
  - src/data/fixtures.ts (filterByPhase7Category still resident; deletion deferred to plan 09-05)
tech-stack:
  added: []
  patterns:
    - "Two-stage filter pipeline (RESEARCH Code Example 1): search wins, otherwise filterByGenre(mainId, subId)"
    - "Edge-triggered snapshot/restore (RESEARCH Code Example 5): empty→non-empty snapshots, non-empty→empty restores"
    - "Restore call order: setActiveCategory FIRST (resets subId internally), then setActiveSubGenreId — reversed order would clobber the restored subId"
    - "Generic ChipStrip via items: {id; name}[] — both FixtureMainGenre and FixtureSubGenre satisfy structurally, no `as any` needed"
    - "Optional breadcrumb prop drilled CatalogGrid → CatalogItem (only set when isSearching)"
key-files:
  created: []
  modified:
    - src/components/catalog/CatalogSidebar.tsx
    - src/components/catalog/CategoryFilter.tsx
    - src/components/catalog/CatalogGrid.tsx
    - src/components/catalog/CatalogItem.tsx
    - src/components/chrome/CatalogRail.tsx
    - src/components/layout/EditorLayout.tsx
    - src/hooks/useFixtureData.ts
decisions:
  - "Restore call sequence: setActiveCategory FIRST, then setActiveSubGenreId — order is load-bearing because setActiveCategory atomically zeroes activeSubGenreId per Phase 9 plan 09-02 pitfall §2"
  - "Breadcrumb pill rendered inside CatalogItem (not as React children prop) — minimal API surface; CatalogGrid only threads optional `mainGenres` prop and computes id→name once"
  - "CatalogGrid jsdom-only initialRect + observeElementRect override (env-gated by NODE_ENV==='test') so virtual rows render in RTL; production behavior unchanged"
  - "CategoryFilter kept as filename (not renamed to ChipStrip) to minimize diff per CLAUDE.md scope discipline; component is now generic over {id;name}[]"
  - "filterByPhase7Category removed from CatalogSidebar; the symbol still exists in src/data/fixtures.ts because plan 09-05 owns its deletion (cross-plan boundary respected)"
metrics:
  duration: 18min
  tasks: 2
  files: 7
  completed: 2026-05-08
requirements: [CATL-05, CATL-07, CATL-10, CATL-11]
---

# Phase 09 Plan 04: CatalogSidebar Phase 9 Wiring Summary

**One-liner:** Replace `CatalogSidebar`'s heuristic `filterByPhase7Category` call with the two-stage `searchFixtures` / `filterByGenre` pipeline, render a conditional subGenre chip strip and a search-mode breadcrumb pill, and snapshot/restore the active mainGenre+subGenre selection across the search-active edge — all driven by Phase 9 store fields (`activeCategory`, `activeSubGenreId`, `searchActiveBeforeQuery`).

## What Changed

### `src/components/catalog/CatalogSidebar.tsx` (largest delta)
- **L3 header rewritten** — Phase 9 INPUT/OUTPUT/POS with the three key invariants documented inline.
- **Imports:** `searchFixtures`, `filterByGenre`, `CategoryFilter`, store selectors for the three Phase 9 fields and their setters.
- **Props:** added `subGenres: FixtureSubGenre[]`.
- **Filter pipeline:** `useMemo` returning either `searchFixtures(fixtures, q)` or `filterByGenre(fixtures, mainId, activeSubGenreId)` keyed by `isSearching`.
- **`visibleSubGenres`:** `useMemo` collecting subGenre ids present under the current `mainId` and projecting them through the global `subGenres` list.
- **`showChipStrip` = `!isSearching && visibleSubGenres.length >= 2`** (per CATL-07 + UI-SPEC §2 + RESEARCH Discretion §6).
- **`onSearchChange`:** edge-triggered snapshot/restore — `wasSearching=false && willSearch=true` snapshots `{mainId, subId}` into `searchActiveBeforeQuery`; reverse edge restores via `setActiveCategory(snap.mainId)` THEN `setActiveSubGenreId(snap.subId)` (order matters — see Decisions).
- **Render order matches UI-SPEC §2:** header strip → search input → conditional chip strip → grid → empty state. Empty state markup preserved verbatim.

### `src/components/catalog/CategoryFilter.tsx`
- Props generalized: `genres: FixtureMainGenre[]` → `items: ChipStripItem[]` where `ChipStripItem = { id: number; name: string }`. `activeGenreId` → `activeId`. New optional `allLabel` (default `'全部'`) and `allAriaLabel` (default `'全てのカテゴリ'`).
- Same visual contract — gap, padding, radius, font, active vs inactive treatment all unchanged.
- Both `FixtureMainGenre` and `FixtureSubGenre` satisfy `{id; name}` structurally → no `as any` cast.

### `src/components/catalog/CatalogGrid.tsx`
- Optional `mainGenres?: FixtureMainGenre[]` prop. When set (search-active path), build `mainGenreNameById` Map once via `useMemo` and pass each tile's name down via `breadcrumbMainGenreName`.
- jsdom-only virtualizer override: `initialRect: { width: 248, height: 740 }` plus an `observeElementRect` no-op fed at mount so RTL tests render virtual rows. Production behavior unchanged (real `ResizeObserver` callback delivers true measurements).

### `src/components/catalog/CatalogItem.tsx`
- New optional prop `breadcrumbMainGenreName?: string | null`. When truthy, renders a `<span>` pill in tile bottom-left: cream `#fff8e7` surface, `--ink-2` `#4f6a8e` text, 11px M PLUS Rounded 1c weight 800, radius 6px, padding `2px 6px`, `var(--shadow-sm)`. `pointer-events: none` (non-interactive — UI-SPEC §3).

### `src/components/chrome/CatalogRail.tsx`
- Props extended with `subGenres: FixtureSubGenre[]`; threads through to `CatalogSidebar`. Rail itself does not consume subGenres (it only renders mainGenres).

### `src/components/layout/EditorLayout.tsx`
- Destructures `subGenres` from `useFixtureData()` and passes into `<CatalogRail subGenres={subGenres} ... />`.
- L3 header updated.

### `src/hooks/useFixtureData.ts`
- New `subGenres` state populated from `fetchSubGenres()` in the existing `Promise.all` block (no new effect).
- Returned tuple now includes `subGenres`. L3 header updated.

## Filter Pipeline (RESEARCH Code Example 1)

```
isSearching → searchFixtures(fixtures, query)             (genre filter bypassed)
otherwise   → filterByGenre(fixtures, mainId, subId)
```

`mainId` = `activeCategory === 'all' ? null : activeCategory`. `filterByGenre` already handles `mainId === null` (returns input as-is) and `subId === null` (only mainGenre filter applied) — no wrapper needed.

## Snapshot/Restore (RESEARCH Code Example 5 + D-15)

| Edge | Action |
|------|--------|
| empty → non-empty | `setSearchActiveBeforeQuery({ mainId: activeCategory, subId: activeSubGenreId })` |
| non-empty → empty | `setActiveCategory(snap.mainId)` THEN `setActiveSubGenreId(snap.subId)` THEN clear snapshot |

**Order trap:** `setActiveCategory` (per plan 09-02) atomically resets `activeSubGenreId: null`. Calling `setActiveSubGenreId(snap.subId)` first and then `setActiveCategory(snap.mainId)` would clobber the restored subId. The implementation enforces the correct order.

## Verification

- `pnpm tsc --noEmit` — clean
- `pnpm vitest run src/components/catalog/__tests__/CatalogSidebar.smoke.test.tsx --reporter=dot` — **6/6 GREEN** (CATL-07, CATL-10, CATL-11)
- `pnpm vitest run src/components/chrome/__tests__/genreIcons.test.ts src/data/__tests__/genres.test.ts --reporter=dot` — 10/10 still GREEN
- `pnpm vitest run --reporter=dot` — 225/226 pass; the single failure is `src/data/__tests__/fixtures.test.ts > does not export filterByPhase7Category` — out of scope for this plan; deletion of `filterByPhase7Category` from `src/data/fixtures.ts` is owned by plan 09-05 (per 09-02 SUMMARY)
- `grep -c 'filterByPhase7Category' src/components/catalog/CatalogSidebar.tsx` → 0 (heuristic call removed from this file)
- `grep -c 'searchActiveBeforeQuery' src/components/catalog/CatalogSidebar.tsx` → 4 (read + restore branches + snapshot)
- No `as any` / `as unknown as` introduced

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| `CatalogSidebar.tsx` imports `searchFixtures, filterByGenre` | ✓ |
| `CatalogSidebar.tsx` references `searchActiveBeforeQuery` | ✓ |
| `CatalogSidebar.tsx` contains `該当する家具はありません` AND `検索語またはカテゴリを変更してみてください` | ✓ |
| `CatalogSidebar.tsx` contains `visibleSubGenres.length >= 2` | ✓ |
| `CatalogSidebar.tsx` does NOT contain `filterByPhase7Category` | ✓ |
| `CatalogSidebar.tsx` does NOT contain `as any` | ✓ |
| Smoke test green (CATL-07/10/11) | ✓ 6/6 |
| `pnpm tsc --noEmit` exits 0 | ✓ |
| `CategoryFilter.tsx` declares `items` prop (not `genres`) | ✓ |
| `CategoryFilter.tsx` no `as any` | ✓ |
| `EditorLayout.tsx` imports/threads `subGenres` | ✓ via `useFixtureData()` destructure |
| `EditorLayout.tsx` passes `subGenres` to CatalogRail (which forwards to Sidebar) | ✓ |

## Deviations from Plan

**One small deviation (Rule 3 — auto-fix blocking issue):** the plan instructed EditorLayout to call `fetchSubGenres()` directly in a `useEffect`. Because `useFixtureData()` already owns the central data-loading lifecycle (parallel `Promise.all`, abort controller, error handling), bypassing it would split the data layer. I added `subGenres` to `useFixtureData`'s state and return value instead, then EditorLayout simply destructures it. Net effect identical; one source of truth preserved.

**One additive deviation (Rule 2 — missing critical functionality for tests to pass):** CatalogGrid uses TanStack Virtual; jsdom returns `clientHeight=0` for the scroll element so `getVirtualItems()` returns an empty range and the breadcrumb test couldn't observe rendered tiles. I added an env-gated `initialRect` + `observeElementRect` override (NODE_ENV==='test' only) — production unchanged; ResizeObserver still drives real measurements there. Without this the smoke test for D-14 (breadcrumb pill) couldn't be made GREEN regardless of the breadcrumb logic.

## Commits

- `2ceb4d7` — feat(09-04): generalize CategoryFilter + thread subGenres through layout
- `2378b73` — feat(09-04): wire CatalogSidebar to filterByGenre + searchFixtures (CATL-05/07/10/11)

## Self-Check: PASSED

- src/components/catalog/CatalogSidebar.tsx — FOUND
- src/components/catalog/CategoryFilter.tsx — FOUND, uses `items` prop
- src/components/catalog/CatalogGrid.tsx — FOUND, accepts optional mainGenres
- src/components/catalog/CatalogItem.tsx — FOUND, renders breadcrumb when prop set
- src/components/chrome/CatalogRail.tsx — FOUND, accepts subGenres prop
- src/components/layout/EditorLayout.tsx — FOUND, threads subGenres
- src/hooks/useFixtureData.ts — FOUND, returns subGenres
- Commit `2ceb4d7` — FOUND in git log
- Commit `2378b73` — FOUND in git log
- Smoke test 6/6 GREEN — verified
