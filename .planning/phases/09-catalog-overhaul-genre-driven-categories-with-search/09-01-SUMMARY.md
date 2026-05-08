---
phase: 09-catalog-overhaul-genre-driven-categories-with-search
plan: 01
subsystem: catalog
tags: [wave-0, pure-helpers, test-scaffolding, lucide-icons, docops-l3]
requires:
  - mysekaiFixtureMainGenres.json (sekai-master-db-diff)
  - lucide-react (existing dep)
  - vitest 3.2 + RTL 16 + jsdom 26 (existing)
provides:
  - deriveOutdoorMainGenres(fixtures, allGenres) — pure helper, empirical curated outdoor mainGenre list
  - getGenreIcon(assetbundleName) — 15-row lucide mapping (14 curated + icon_all)
  - Wave 0 vitest stubs for all 7 phase requirements (CATL-05..CATL-11)
affects:
  - src/data/genres.ts (drop broken seq sort, add deriveOutdoorMainGenres)
  - downstream consumers in plans 09-03 (CatalogRail) and 09-04 (CatalogSidebar)
tech-stack:
  added: []
  patterns:
    - Pure-function unit tests for data helpers (RESEARCH §Validation Architecture)
    - Lucide-only icon path (RESEARCH Open Question §1 + Pitfall §4 — skip CDN until path confirmed)
key-files:
  created:
    - src/components/chrome/genreIcons.ts
    - src/components/chrome/__tests__/genreIcons.test.ts
    - src/data/__tests__/genres.test.ts
    - src/data/__tests__/fixtures.test.ts
    - src/components/catalog/__tests__/CatalogSidebar.smoke.test.tsx
  modified:
    - src/data/genres.ts
decisions:
  - Lucide-only rendering path is canonical for genre icons; CDN attempt skipped (RESEARCH Open Question §1)
  - deriveOutdoorMainGenres preserves source-order of allGenres (no resorting) — game data already in stable game-defined order
  - persistMigrate.test.ts pre-existed from a prior 09-02 commit; reused unchanged (covers CATL-08 broader than this plan required)
metrics:
  duration: ~10min
  completed_date: 2026-05-08
---

# Phase 09 Plan 01: Wave 0 + pure-module foundation Summary

Wave 0 scaffolding plan for Phase 9 catalog overhaul: ship two pure helpers (`deriveOutdoorMainGenres` + `getGenreIcon`) and lay down failing vitest stubs for every phase requirement so subsequent waves implement against red tests.

## What Shipped

### GREEN at 09-01 completion (Wave 0 truths)

| Test | File | Covers | Status |
|------|------|--------|--------|
| `deriveOutdoorMainGenres` 5 cases | `src/data/__tests__/genres.test.ts` | CATL-06 | GREEN |
| `getGenreIcon` 5 cases | `src/components/chrome/__tests__/genreIcons.test.ts` | CATL-09 | GREEN |
| `persist v3→v4 migrate` 9 cases | `src/stores/__tests__/persistMigrate.test.ts` | CATL-08 | GREEN (was pre-staged in commit 9afe3e0; the underlying migrate hook was also pre-landed in commit e973ec5 from a prior 09-02 session — **see deviation note below**) |

### RED-by-design (turn GREEN downstream)

| Test | File | Covers | RED until plan |
|------|------|--------|----------------|
| `filterByPhase7Category not exported` 2 cases | `src/data/__tests__/fixtures.test.ts` | CATL-05 | **09-05** (deletes Phase7Category + filterByPhase7Category) |
| `CatalogSidebar` smoke 6 cases | `src/components/catalog/__tests__/CatalogSidebar.smoke.test.tsx` | CATL-07 / CATL-10 / CATL-11 | **09-04** (rewires CatalogSidebar with chip strip + search-takeover + breadcrumb pill) |

### Helpers & module changes

- **`src/data/genres.ts`** — Removed `.sort((a, b) => a.seq - b.seq)` from both `fetchMainGenres` and `fetchSubGenres` (the live JSON has no `seq` field — silent NaN no-op per RESEARCH anti-pattern). Added exported `deriveOutdoorMainGenres(fixtures, allGenres)` per RESEARCH Pattern 4. Updated DocOps L3 header.
- **`src/components/chrome/genreIcons.ts`** — New file. 15-row `ICON_BY_BUNDLE` table keyed on `assetbundleName` (14 curated outdoor mainGenres + `icon_all` sentinel). `getGenreIcon` falls back to `MoreHorizontal` for unknown bundles (forward-compat — sekai-master-db-diff later adds a new outdoor genre). No `<img>` element, no `storage.sekai.best` fetch (RESEARCH Open Question §1 + Pitfall §4 — avoid 14 simultaneous 404s on every rail mount).

## Commits

| Hash | Message |
|------|---------|
| `12e3b65` | feat(09-01): add deriveOutdoorMainGenres helper + drop broken seq sort |
| `dd2dce9` | feat(09-01): add genreIcons.ts lucide-only mapping + CATL-09 unit test |
| `351ac56` | test(09-01): add Wave 0 RED stubs for CATL-05 + CATL-07/10/11 |

## Verification

```
pnpm vitest run src/data/__tests__/genres.test.ts \
                 src/components/chrome/__tests__/genreIcons.test.ts \
                 --reporter=dot
# 2 files, 10 tests, all GREEN

pnpm vitest run src/data/__tests__/fixtures.test.ts \
                 src/components/catalog/__tests__/CatalogSidebar.smoke.test.tsx \
                 --reporter=dot
# RED-by-design: 2 fail (CATL-05) + 1+ fail (CATL-07/10/11)
```

```
grep -c 'seq' src/data/genres.ts        # → 0  (broken sort fully removed)
grep -c '^export ' src/data/genres.ts   # → 3  (fetchMainGenres, fetchSubGenres, deriveOutdoorMainGenres)
grep -c '^  icon_' src/components/chrome/genreIcons.ts  # → 15
```

## Deviations from Plan

### Pre-existing Work Reused

**1. [Rule 3 — Blocking issue avoided] persistMigrate.test.ts and editorStore migrate hook pre-existed**
- **Found during:** Task 3 file creation
- **Issue:** The plan instructed creating `src/stores/__tests__/persistMigrate.test.ts` as a new RED-by-design stub. Inspecting the working tree showed the file already existed (commit `9afe3e0` — `test(09-02): add failing persist v3→v4 migrate tests for CATL-08`) AND the corresponding implementation in `editorStore.ts` (`version: 4`, v3→v4 migrate case, `setActiveSubGenreId`, `searchActiveBeforeQuery`) had already landed in commit `e973ec5` — `feat(09-02): migrate editorStore to Phase 9 catalog shape (CATL-08)`. Both commits predated this 09-01 execution.
- **Decision:** Reuse the pre-existing test file unchanged. It is broader than the plan's 4-test stub (covers 9 cases including activeSubGenreId reset semantics, partialize exclusion, persist version assertion, and the legacy v1→v4 chain) and currently passes against the already-merged 09-02 implementation. Acceptance criteria for Task 3 (file exists, contains `activeCategory` + `version` strings, has L3 header) are all satisfied.
- **Implication for STATE.md:** This plan's `requirements: [CATL-06, CATL-09]` field (in 09-01-PLAN.md frontmatter) is the authoritative requirement set. The fact that CATL-08 also happens to be GREEN now is a side-effect of prior session work — it will be formally claimed by 09-02's SUMMARY when that plan is re-marked complete.
- **Files modified:** None — pre-existing file untouched.
- **Commit:** No new commit; existing `9afe3e0` covers the test, `e973ec5` covers the implementation.

### Auto-fixed Issues

**1. [Rule 1 — Doc consistency] Removed `seq` substring entirely from genres.ts**
- **Found during:** Task 1 acceptance verification
- **Issue:** Initial implementation kept a Chinese comment explaining "原 .sort((a,b)=>a.seq-b.seq) 是 NaN 静默 no-op" — but the plan's acceptance criterion was strict: "`src/data/genres.ts` does NOT contain the substring `seq` (broken sort removed from both fetchers)".
- **Fix:** Reworded the comment to "上游 JSON 已按游戏定义的稳定顺序返回，无需排序。" — same intent, no `seq` substring.
- **Files modified:** `src/data/genres.ts`
- **Commit:** Folded into `12e3b65`

## Known Stubs

None. The two helpers (`deriveOutdoorMainGenres`, `getGenreIcon`) are complete pure modules. The RED tests are intentional Wave 0 scaffolding — they describe behavior to be implemented in plans 09-04 and 09-05 and are documented as such in their L3 headers.

## Authentication Gates

None — pure code/test plan, no external auth required.

## Self-Check: PASSED

- FOUND: src/data/genres.ts
- FOUND: src/data/__tests__/genres.test.ts
- FOUND: src/components/chrome/genreIcons.ts
- FOUND: src/components/chrome/__tests__/genreIcons.test.ts
- FOUND: src/data/__tests__/fixtures.test.ts
- FOUND: src/components/catalog/__tests__/CatalogSidebar.smoke.test.tsx
- FOUND commit: 12e3b65 (feat(09-01): add deriveOutdoorMainGenres helper)
- FOUND commit: dd2dce9 (feat(09-01): add genreIcons.ts lucide-only mapping)
- FOUND commit: 351ac56 (test(09-01): add Wave 0 RED stubs)
- VERIFIED: 10 GREEN tests pass on Wave-0 truth files
- VERIFIED: RED stubs fail-by-design on the 2 turn-green-downstream files
- VERIFIED: `grep seq src/data/genres.ts` returns nothing
- VERIFIED: `grep -c '^export ' src/data/genres.ts` ≥ 3
