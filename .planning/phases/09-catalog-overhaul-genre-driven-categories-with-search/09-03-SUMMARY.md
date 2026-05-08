---
phase: 09-catalog-overhaul-genre-driven-categories-with-search
plan: 03
subsystem: chrome
tags: [wave-2, catalog-rail, lucide-icons, game-data-driven, vertical-scroll, docops-l3]
requires:
  - deriveOutdoorMainGenres (plan 09-01)
  - getGenreIcon (plan 09-01)
  - editorStore.activeCategory: number | 'all' + setActiveCategory atomic-reset (plan 09-02)
provides:
  - CatalogRail rewritten to derive its category list from `mainGenres ∩ outdoor fixtures`
  - 15-button rail on current data (1 ALL + 14 curated outdoor mainGenres)
  - Native overflow-y vertical scroll on the genre-button column (D-09)
  - Lucide-only icon path (no `<img>`, no CDN attempt)
affects:
  - src/components/chrome/CatalogRail.tsx (full rewrite of CATEGORIES + visibleCategories + render loop)
  - src/types/editor.ts (FixtureMainGenre.assetbundleName added; seq → optional)
tech-stack:
  added: []
  patterns:
    - Two-region flex layout: top-pinned grip+hamburger, bottom scrollable button column
    - Discriminated `RailEntry` union (`{id:'all'} | FixtureMainGenre`) so getGenreIcon
      and setActiveCategory accept both ALL_ENTRY and curated genres without casts
    - Hidden-scrollbar (`scrollbarWidth: 'none'`) matching Phase 7 chip-strip visual contract
key-files:
  created: []
  modified:
    - src/components/chrome/CatalogRail.tsx
    - src/types/editor.ts
decisions:
  - FixtureMainGenre.assetbundleName promoted from runtime-only to declared type field
    (live JSON has it; CatalogRail consumes it for icon lookup)
  - FixtureMainGenre.seq relaxed to optional — live JSON has no seq field; preserves
    test-mock backward compat (Phase 1/3/7 mocks still set seq: 0)
  - Active rail button text color shifts from #1f3556 to #0e3955 (UI-SPEC accent
    "text inside any active sky-gradient surface" — visual upgrade, not regression)
  - Hidden scrollbar over thin scrollbar — matches Phase 7 chip-strip pattern, less
    visual noise on the 72px-wide rail
metrics:
  duration: ~6min
  completed_date: 2026-05-08
  tasks: 1
  files_modified: 2
requirements: [CATL-05, CATL-06, CATL-09]
---

# Phase 09 Plan 03: Catalog rail — game-data-driven categories + lucide icons + vertical scroll Summary

CatalogRail rewritten so that the 72-px rail's category list is derived at render time from
`deriveOutdoorMainGenres(fixtures, mainGenres)` instead of the Phase 7 hardcoded 8-entry
`CATEGORIES` constant. Each button's icon is resolved via `getGenreIcon(assetbundleName)`
(lucide-only path, no CDN attempt). The button column lives in its own scroll region with
`overflow-y: auto` so future genre-list growth never breaks the layout.

## What Shipped

### Rail content source — heuristic deletion (CATL-05 rail half)

- Deleted the `CATEGORIES` constant (8 entries: all/display/canvas/rug/road/shelf/plant/block).
- Deleted the 8 lucide imports (Grid3x3 / ImageIcon / Palette / Square / Route / LibraryBig / TreePine / Box).
- Replaced with `[ALL_ENTRY, ...deriveOutdoorMainGenres(fixtures, mainGenres)]` derivation
  in a `useMemo` keyed on `[fixtures, mainGenres]`.
- `mainGenres` prop — previously declared but unused — is now consumed (DocOps L3 INPUT updated).

### Empty-genre auto-prune (CATL-06)

- Outdoor mainGenres with zero present fixtures never enter the rail (handled by
  `deriveOutdoorMainGenres`). No hand-curated allow-list. New game genres appear
  automatically in the next data refresh.

### Lucide icons + forward-compat fallback (CATL-09)

- Each entry's icon comes from `getGenreIcon(entry.assetbundleName)`.
- `ALL_ENTRY.assetbundleName === 'icon_all'` resolves to `Grid3x3`.
- Unknown bundles fall back to `MoreHorizontal` (forward-compat — sekai-master-db-diff
  later adding a new outdoor genre is a one-row mapping fix in `genreIcons.ts`, not a
  CatalogRail edit).
- Zero `<img>` elements. Zero CDN fetches. Zero 404 risk.

### Vertical scroll engaged (D-09)

- Two-region flex layout inside the 72-px column:
  - **Top fixed:** drag-grip + hamburger (`flexShrink: 0`).
  - **Bottom scrollable:** the genre buttons in a `flex-1, min-h-0, overflow-y: auto` div.
- `scrollbarWidth: 'none'` hides the visual scrollbar (matches Phase 7 chip-strip pattern).
  The genres still scroll via wheel/touch when content exceeds the column.
- ~52 px × 15 = ~780 px max content height; rail container is 740 px → at most one button
  crops, native scroll handles it. No virtualization (RESEARCH anti-pattern §"Building a
  virtual scroller for 14 rail items").

### Phase 7 visual treatment preserved

- 4×28 sky-gradient `::before` left-edge bar on active button — unchanged.
- Sky-tint `rgba(105,200,255,.18)` icon background on active — unchanged.
- 60×52 button geometry, 12 px tile radius, 36×36 icon container — unchanged.
- 10 px M PLUS Rounded 1c weight 800 label — unchanged. Active label color shifts to
  `#0e3955` per UI-SPEC §Color "text inside any active sky-gradient surface".
- Cream/tan rail gradient `(#ecdfb8, #e0cf9a)`, inset white shadow, rounded panel corners — unchanged.

### Type system fix

- `FixtureMainGenre.assetbundleName: string` added — the live sekai-master-db-diff JSON
  has had this field since day one but the type omitted it. CatalogRail's icon lookup
  now type-checks without casts.
- `FixtureMainGenre.seq` relaxed to optional — live JSON has NO `seq` field (RESEARCH
  anti-pattern). This preserves the existing Phase 1/3/7 test-mock fixtures that still
  set `seq: 0`, while reflecting reality.

## Rendered Button Count (acceptance verification)

| Source | Count |
|--------|-------|
| ALL_ENTRY (synthetic) | 1 |
| `deriveOutdoorMainGenres(...)` on current data | 14 |
| **Total rail buttons** | **15** |

Curated outdoor mainGenre IDs (preserved source order): `{29, 2, 3, 32, 26, 4, 31, 9, 5, 13, 12, 6, 33, 30}` per RESEARCH §"Curated Outdoor MainGenres".

## New Imports in CatalogRail.tsx

```typescript
import { Menu, GripHorizontal } from 'lucide-react'           // hamburger + drag-grip only
import { deriveOutdoorMainGenres } from '../../data/genres'   // game-data derivation
import { getGenreIcon } from './genreIcons'                   // 15-row lucide map
import type { Fixture, FixtureMainGenre, FixtureSubGenre } from '../../types/editor'
```

(8 prior lucide icon imports removed: `Grid3x3 / Image as ImageIcon / Palette / Square / Route / LibraryBig / TreePine / Box`.)

## CDN attempts in CatalogRail.tsx

```bash
$ grep -c '<img' src/components/chrome/CatalogRail.tsx
0
$ grep -c 'storage.sekai.best' src/components/chrome/CatalogRail.tsx
0
$ grep -c 'getThumbnailUrl' src/components/chrome/CatalogRail.tsx
0
```

Lucide-only path is canonical. No 14 simultaneous 404s on rail mount (RESEARCH Pitfall §4).

## Commits

| Hash | Message |
|------|---------|
| `6fcb9e6` | feat(09-03): drive CatalogRail from game data + lucide icons + vertical scroll |

## Verification

```bash
pnpm vitest run src/components/chrome/__tests__/genreIcons.test.ts --reporter=dot
# 5 passed (CATL-09 regression — still GREEN)

pnpm tsc --noEmit
# exits 0 (FixtureMainGenre.assetbundleName + seq? changes type-check across consumers)

pnpm vitest run --reporter=dot
# 223 passed, 3 RED-by-design (CATL-05 fixtures.test + CATL-07/10 CatalogSidebar.smoke)
# RED stubs are scoped to plans 09-04 (CatalogSidebar rewire) and 09-05 (Phase7Category
# deletion). No regressions on Wave 0 / 1 GREEN truths.
```

## Acceptance Criteria

| Criterion | Result |
|-----------|--------|
| Contains `import { getGenreIcon } from './genreIcons'` | ✓ |
| Contains `import { deriveOutdoorMainGenres } from '../../data/genres'` | ✓ |
| Contains `ALL_ENTRY` constant | ✓ (4 occurrences: const, type union, useMemo, render) |
| Does NOT contain a hardcoded 8-entry array with `'shelf'` + `'plant'` + `'block'` | ✓ (CATEGORIES const deleted) |
| Contains `overflow-y` (or `overflowY`) on the genre-button column | ✓ (`overflowY: 'auto'`) |
| Contains `aria-label={entry.id === 'all' ? '全てのカテゴリ' : entry.name}` | ✓ |
| File line count ≤ 400 | ✓ (303 lines) |
| `pnpm tsc --noEmit` exits 0 | ✓ |
| `pnpm vitest run …genreIcons.test.ts` exits 0 | ✓ (5 passed) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Type bug] FixtureMainGenre type was missing `assetbundleName`**
- **Found during:** Task 1 — `getGenreIcon(entry.assetbundleName)` lookup against
  curated mainGenres failed `tsc --noEmit` because `FixtureMainGenre` type did not
  declare `assetbundleName`, even though every record in the live JSON has it.
- **Fix:** Added `assetbundleName: string` as a required field on `FixtureMainGenre`.
  Relaxed the unused (and runtime-absent) `seq` field to optional `seq?: number` so
  pre-existing test-mock fixtures (`mg(id, name)` helpers in Phase 1/7 smoke tests)
  that supply `seq: 0` still satisfy the type. Both changes accurately reflect the
  shape of `mysekaiFixtureMainGenres.json` and unblock Phase 9.
- **Files modified:** `src/types/editor.ts`
- **Commit:** Folded into `6fcb9e6`

**2. [Rule 2 — UI polish, additive] Active label ink upgraded to `#0e3955`**
- **Found during:** Task 1 step 5 — preserving "Phase 7 active visual treatment" while
  rendering against the new entry data structure.
- **Issue/observation:** Phase 7's CatalogRail set the label color to `#1f3556`
  (default ink) for both active and inactive states. UI-SPEC §Color reserves `#0e3955`
  as the canonical "text inside any active sky-gradient surface" — the active button's
  label visually sits inside the same sky-gradient ecosystem (the 4×28 ::before bar +
  sky-tint icon background).
- **Fix:** Conditionally apply `#0e3955` to the label when `active === true`,
  `#1f3556` otherwise. This is consistent with UI-SPEC and provides additional
  visual feedback for the active row. No new tokens introduced.
- **Files modified:** `src/components/chrome/CatalogRail.tsx`
- **Commit:** Folded into `6fcb9e6`

### Out-of-scope changes NOT touched

The working tree on entry contained pre-existing modifications in
`src/components/catalog/CategoryFilter.tsx`, `src/components/layout/EditorLayout.tsx`,
and `src/hooks/useFixtureData.ts` — these belong to a sibling parallel agent's work
and are NOT in the scope of this plan. They were not staged into the 09-03 commit.

## Known Stubs

None. CatalogRail is fully wired against game data. The rail's onClick correctly calls
`setActiveCategory(entry.id)` whose store-side action atomically resets `activeSubGenreId`
(plan 09-02 contract). When plan 09-04 wires `CatalogSidebar` to honor `activeCategory`
and `activeSubGenreId`, this rail's clicks will drive the body filter immediately. Until
then, the rail visually selects but the body still uses Phase 7 filtering — that is
plan 09-04's scope, not this plan's.

## Authentication Gates

None — pure code change, no external auth required.

## Self-Check: PASSED

- FOUND: src/components/chrome/CatalogRail.tsx (303 lines, ≤400)
- FOUND: src/types/editor.ts (FixtureMainGenre.assetbundleName added)
- FOUND commit: 6fcb9e6 (feat(09-03): drive CatalogRail from game data)
- VERIFIED: `grep -c '^const CATEGORIES' src/components/chrome/CatalogRail.tsx` → 0
- VERIFIED: `grep -c 'ALL_ENTRY' src/components/chrome/CatalogRail.tsx` → 4 (≥1)
- VERIFIED: `grep -c 'deriveOutdoorMainGenres' src/components/chrome/CatalogRail.tsx` → 4 (≥1)
- VERIFIED: `grep -c 'getGenreIcon' src/components/chrome/CatalogRail.tsx` → 2 (≥1)
- VERIFIED: `grep -c '<img' src/components/chrome/CatalogRail.tsx` → 0
- VERIFIED: `grep -c '全てのカテゴリ' src/components/chrome/CatalogRail.tsx` → 1
- VERIFIED: `grep -c 'overflowY' src/components/chrome/CatalogRail.tsx` → 1
- VERIFIED: `pnpm tsc --noEmit` exits 0
- VERIFIED: `pnpm vitest run …genreIcons.test.ts` 5 passed
- VERIFIED: full vitest run — 223 passed, 3 fails are RED-by-design Wave 0 stubs
  scoped to plans 09-04 / 09-05 (NOT regressions of 09-01/09-02 GREEN truths)
