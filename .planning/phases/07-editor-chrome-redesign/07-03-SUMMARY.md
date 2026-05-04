---
phase: 07-editor-chrome-redesign
plan: 03
subsystem: editor-chrome-catalog-rail
tags: [chrome, catalog, cat-rail, category-filter, persist]
requirements: [SC-2, SC-7]
dependency_graph:
  requires:
    - "07-01: chrome state slice (catalogCollapsed, activeCategory + setters), persist v2, EditorLayout slot B"
    - "07-02: TopRail mounted in slot A (independent — no direct coupling beyond shared shell)"
  provides:
    - "CatalogRail outer shell (72px tan cat-rail + 248px white body) wired to store-backed catalogCollapsed/activeCategory"
    - "Phase7Category union + filterByPhase7Category in src/data/fixtures.ts (8 fixed categories)"
    - "Re-skinned CatalogSidebar body (sky-gradient header, count chip, light-blue rounded search, empty state)"
  affects: ["plan 04 (floatbar — co-existence at top:76 left:360 transitional slot remains untouched)"]
tech_stack:
  added: []
  patterns:
    - "Heuristic name-matching for game-data-absent categories (shelf/plant/block/display) — documented as intentional in fixtures.ts L3"
    - "Inline width-animation owned by component (CatalogRail) rather than its slot — slot becomes a positional anchor only"
    - "Store-backed UI state replaces useState in CatalogSidebar — collapse + activeCategory now persist via plan 01 partialize"
key_files:
  created:
    - "src/components/chrome/CatalogRail.tsx"
  modified:
    - "src/data/fixtures.ts (+ Phase7Category type, + filterByPhase7Category function)"
    - "src/components/catalog/CatalogSidebar.tsx (rewrite: drops local state, reads activeCategory from store, sky header + count chip + empty state, no CategoryFilter, no collapse button)"
    - "src/components/catalog/CatalogSearch.tsx (re-skin: 18px radius, light-blue bg #eaf6ff, Nunito 700 13px, placeholder 家具を検索…)"
    - "src/components/layout/EditorLayout.tsx (CatalogSidebar → CatalogRail in slot B; slot loses inline width/transition style; catalogCollapsed selector removed)"
decisions:
  - "Cat-rail width animation owned by CatalogRail itself (not its slot wrapper) — keeps slot a pure positional anchor; consistent with plan 01 contract that slots only do absolute positioning"
  - "Phase7Category fixed list of 8 keys (UI-SPEC) deliberately decoupled from game-data mainGenres — game data has no shelf/plant/block top-level field, so heuristic name matches are accepted Phase 7 trade-off (chrome layout > perfect categorization)"
  - "CategoryFilter component left on disk but no longer imported anywhere — kept as dead code for one plan rather than deleted, in case plan 06 wants to repurpose it for sub-genre filtering inside the body"
  - "CatalogSidebar interface signature kept unchanged (still accepts mainGenres/fixtureMap) so CatalogRail can pass them through without refactoring CatalogGrid; mainGenres now intentionally unused inside CatalogSidebar"
metrics:
  duration: "~2min"
  tasks_completed: 2
  files_modified: 5
  completed: "2026-05-04"
---

# Phase 7 Plan 3: Catalog Rail Summary

**One-liner:** Catalog gains an always-visible 72px tan cat-rail (8 store-backed category buttons + hamburger collapse) plus a 248px sky-headed body — 320px total expanded, collapses to 72px while keeping categories one-click-reachable; collapse + active category now persist across reloads.

## What Shipped

- **`Phase7Category` + `filterByPhase7Category` (`src/data/fixtures.ts`).** New exported union of 8 fixed UI-SPEC keys (`all` / `display` / `canvas` / `rug` / `road` / `shelf` / `plant` / `block`) plus a filter that maps each to fixture data: `road`/`color-tile` via `getGroundSubtype`, `rug` via subtype, `canvas` via `mysekaiSettableLayoutType` (`floor_appearance` | `wall_appearance`), and `display`/`shelf`/`plant`/`block` via best-effort name regex (game data has no top-level shelf/plant/block field — documented inline as Phase 7 trade-off).
- **`CatalogRail.tsx` (Slot B owner).** Outer shell `width: collapsed ? 72 : 320`, height 740, `transition: width 0.22s ease`, `--shadow-lg` + `--radius-panel`. Cat-rail (left 72px) renders linear-gradient tan band (`#ecdfb8 → #e0cf9a`), inner-light shadow, hamburger `Menu` 18px (aria-label switches between `家具目録を展開` / `家具目録を折りたたむ`), and 8 category buttons (60×52, M PLUS Rounded 1c 800 10px label) in exact UI-SPEC order. Active state paints a 4×28 sky-gradient bar at left edge (offset −10) + 36×36 sky-tinted rounded tile behind icon + sky stroke color `#2ea8ee` + bumped strokeWidth 2.4. Click handler: `setActiveCategory(key)` and, if collapsed, `setCatalogCollapsed(false)` — collapsed-cat-rail click expands and selects in one gesture. Body half mounts only when expanded (`!collapsed`) and embeds the existing `<CatalogSidebar>` re-skinned per task 2.
- **`CatalogSidebar.tsx` (re-skinned body).** Removed `useState` for `activeGenreId`/`collapsed`, removed `<CategoryFilter>`, removed `ChevronsLeft`/`ChevronsRight` collapse branch — cat-rail owns categories and collapse now. Reads `activeCategory` from store (typed as `Phase7Category`), filters via new `filterByPhase7Category(searchFixtures(...), activeCategory)`. Visible structure: sky-gradient header (`linear-gradient(180deg, #9bdcff, #69c8ff)`, 40h, padding 8 16, M PLUS 800 16px `家具目録` + count chip `{N} 件` rgba(255,255,255,.4) Label 11/800 6px-radius). Search wrapper padded 16. Tile grid `flex-1 overflow-hidden`. Empty state (`filteredFixtures.length === 0`) shows `該当する家具はありません` (M PLUS 800 13px ink) + `検索語またはカテゴリを変更してみてください` (Nunito 700 11px muted).
- **`CatalogSearch.tsx` (token re-skin).** Placeholder `家具を検索…`. Box: `height: 36`, `border-radius: var(--radius-search, 18px)`, `background: #eaf6ff`, `border: 1px solid rgba(60,80,140,.14)`, font Nunito 700 13px ink. Clear-X retains existing behavior; added `aria-label="検索をクリア"`.
- **`EditorLayout.tsx` (slot B swap).** Import `CatalogSidebar` → `CatalogRail`. Slot B inline `style` simplified to `{ top: 76, left: 16, height: 740 }` (CatalogRail owns its own width animation). The `catalogCollapsed` selector becomes unused inside the layout and is removed. The transitional `data-chrome-slot="legacy-tools"` block from plan 02 is **untouched** — plan 04 owns its deletion.

## Verification

- `pnpm build` exits 0 (Vite + Rolldown, 1.89s). Final bundle 711 KB JS / 180 KB CSS — +5 KB JS vs plan 02 (the new CatalogRail component + its 8 lucide icons not previously imported by chrome).
- `pnpm test` 199/199 pass — no test changes needed; existing persist test continues to verify chrome keys (including `catalogCollapsed` and `activeCategory`) round-trip correctly.
- Acceptance grep contract (Task 1): `export type Phase7Category` MATCH (line 129), `export function filterByPhase7Category` MATCH (line 139), `width: collapsed ? 72 : 320` MATCH, `aria-label={collapsed ? '家具目録を展開' : '家具目録を折りたたむ'}` MATCH, `transition: 'width 0.22s ease'` MATCH, sky-bar `width: 4` and `height: 28` MATCH, all 8 lucide imports MATCH, all 8 Japanese labels MATCH.
- Acceptance grep contract (Task 2): `filterByPhase7Category` in CatalogSidebar = 2 matches (import + call), `<CategoryFilter` in CatalogSidebar = 0 matches (chip row removed), `ChevronsLeft|ChevronsRight` in CatalogSidebar = 0 matches (collapse button removed), `家具を検索` in CatalogSearch MATCH, `<CatalogRail` in EditorLayout = 1 match, `<CatalogSidebar` in EditorLayout = 0 matches, `該当する家具はありません` in CatalogSidebar MATCH.

## Deviations from Plan

None — plan executed exactly as written. Tasks 1 and 2 followed the prescribed structure; the only minor adjustment was removing the now-unused `catalogCollapsed` selector inside `EditorLayout.tsx` (the plan implicitly required this since the slot's inline `width:`/`transition:` was deleted, but the selector removal itself was a logical follow-on to keep the file lint-clean). Counted as part of Task 2's scope, not a separate deviation.

## Authentication Gates

None — fully automated build + test execution.

## Known Stubs

- **Heuristic name-match categories.** `display` / `shelf` / `plant` / `block` rely on regex against fixture `name` (Japanese + English). The mapping is intentionally imperfect — the plan documents this as acceptable Phase 7 scope (chrome layout, not data taxonomy). A future data-pipeline plan can replace these branches with proper genre/sub-genre fields when the master DB exposes them. Documented inline in `src/data/fixtures.ts` L3 header.
- **`mainGenres` prop on `CatalogSidebar`.** No longer consumed inside the sidebar (cat-rail uses fixed UI-SPEC keys instead) but the prop is kept on the interface so `CatalogRail` can forward it without restructuring `CatalogGrid`/parent data flow. Marked unused inside the component; if a future plan re-introduces sub-genre filtering inside the body, the prop is already plumbed.
- **`CategoryFilter.tsx` is now dead code.** Not imported anywhere. Left on disk for one plan in case plan 06 wants to repurpose it for sub-genre selection inside the body — otherwise plan 04 or a cleanup task can delete the file. Tracked here so the verifier doesn't flag it as a missed import.

These stubs do not block the plan's stated goal: cat-rail visible at all times, body collapses to 0 / expands to 248, category icons drive a working filter, collapse + active category persist across reloads.

## Commits

- `09879b1` — feat(07-03): add Phase 7 category filter + CatalogRail outer container
- `8e3e845` — feat(07-03): re-skin CatalogSidebar body, mount CatalogRail in slot B

## Self-Check: PASSED

- `src/components/chrome/CatalogRail.tsx`: FOUND (8 lucide icons imported, 8 Japanese labels present, `width: collapsed ? 72 : 320`, aria-label switch, sky-bar `width: 4` / `height: 28`, `transition: 'width 0.22s ease'`)
- `src/data/fixtures.ts`: FOUND (`export type Phase7Category`, `export function filterByPhase7Category`)
- `src/components/catalog/CatalogSidebar.tsx`: FOUND (`filterByPhase7Category` imported + called, `家具目録` header, `該当する家具はありません` empty state, no `CategoryFilter` import, no `ChevronsLeft`/`ChevronsRight`)
- `src/components/catalog/CatalogSearch.tsx`: FOUND (`家具を検索…` placeholder, `var(--radius-search, 18px)`, `#eaf6ff` background)
- `src/components/layout/EditorLayout.tsx`: FOUND (`<CatalogRail` mounted in slot B, no `<CatalogSidebar` reference, slot B style simplified, `legacy-tools` transitional slot intact)
- Commit `09879b1`: FOUND in `git log --oneline`
- Commit `8e3e845`: FOUND in `git log --oneline`
- `pnpm build`: PASSES (exit 0)
- `pnpm test`: 199/199 PASSES
