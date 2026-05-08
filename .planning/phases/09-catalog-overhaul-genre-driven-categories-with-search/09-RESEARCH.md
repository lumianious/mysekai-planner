# Phase 9: Catalog overhaul — genre-driven categories with search - Research

**Researched:** 2026-05-08
**Domain:** React 19 + Zustand catalog UI driven by sekai-master-db-diff genre data
**Confidence:** HIGH (data shape, existing code, store migration), MEDIUM (interaction details), LOW (genre icon CDN path — see "Open Questions")

## Summary

Phase 9 replaces the Phase 7 hardcoded 8-category list and `filterByPhase7Category` heuristic regexes with a genre-driven category system fed by `mysekaiFixtureMainGenres.json` (33 genres in source, **14 surviving the outdoor filter**). The active category type changes from `Phase7Category` (string union) to `number | 'all'` (mainGenre id), requiring a Zustand persist version bump (3 → 4) with a migrate hook that coerces unknown old strings to `'all'`. SubGenres render as a chip strip inside `CatalogSidebar` (matching `CategoryFilter.tsx`), but only for mainGenres that have ≥2 subgenres with outdoor fixtures present (avoid one-chip strips). Search keeps name + pronunciation matching, broadens to "all" while typing, restores prior selection on clear, and tags each search result with a genre breadcrumb.

The largest unknown is **D-10 — the CDN path for genre icons.** I empirically probed 30+ candidate paths under `storage.sekai.best/sekai-jp-assets/` and **all returned 404**. Sekai-Viewer's own UI does NOT render genre icons (it uses an MUI Autocomplete dropdown with text names only). Phase 9 should ship with a lucide-icon-per-genre fallback table as the **primary** rendering path and treat any future genre-icon discovery as a polish enhancement — do not block the phase on the CDN.

**Primary recommendation:** Replace the 8-key `Phase7Category` enum with `mainGenreId | 'all'` everywhere; reuse `filterByGenre()` and `searchFixtures()` (already exist, currently unused for catalog filtering); render lucide icons keyed by `assetbundleName` slug as the canonical rail icon source; persist-migrate `activeCategory` from string → number with `'all'` as the universal fallback.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Category source**
- **D-01:** Catalog categories are driven by `mysekaiFixtureMainGenres.json` (fetched via existing `fetchMainGenres()` in `src/data/genres.ts`), filtered to the curated set of outdoor-relevant genres. Indoor-only genres, unit logos (Leo/need, MORE MORE JUMP！, etc.), achievement/event genres, and tool genres (オノ / ツルハシ) are excluded.
- **D-02:** The exact list of "outdoor-relevant" mainGenre IDs is research's job — derive empirically by intersecting `mainGenreId` values present in the outdoor-filtered fixture set (`filterOutdoorFixtures`) with `mysekaiFixtureMainGenres.json`. A genre that has zero outdoor fixtures is hidden automatically (existing `visibleCategories` pattern in `CatalogRail.tsx:67-72`).
- **D-03:** The Phase 7 `Phase7Category` union and `filterByPhase7Category` function are replaced — not extended. Heuristic name-matching for `shelf` / `plant` / `block` / `display` is removed entirely.
- **D-04:** Persisted `activeCategory` migrates from `Phase7Category` strings to mainGenre IDs (number) plus a sentinel `'all'`. Existing localStorage values must be migrated to `'all'` on load (lossless, never crashes) — not silently dropped.

**SubGenre presentation**
- **D-05:** When a mainGenre is selected, its subGenres render as a horizontal scrollable chip strip at the top of the catalog body, above the thumbnail grid. An "全部" chip resets to the mainGenre-wide view. Pattern matches existing `CategoryFilter.tsx`.
- **D-06:** SubGenre chips are derived empirically: only show subGenres that have at least one fixture in the currently active mainGenre's outdoor set.
- **D-07:** Selecting "全部" on the rail (no mainGenre) hides the subGenre chip strip entirely.
- **D-08:** Active subGenre is in-memory only — does NOT persist to localStorage.

**Rail UX**
- **D-09:** The 72-px catalog rail keeps its width but switches its category list to vertical scroll when curated mainGenres exceed the visible column.
- **D-10:** Each rail button uses the genre's game-data icon, fetched from the Sekai CDN using `assetbundleName`. Exact CDN path is research's responsibility. **If the CDN icon 404s, the rail must fall back to a neutral lucide icon — never an empty button.**
- **D-11:** Rail button labels remain Japanese (genre `name`), 10-px M PLUS Rounded 1c.

**Search**
- **D-12:** Search scope stays as today: `fixture.name` + `fixture.pronunciation` substring match. Genre/subGenre names NOT in search corpus. Tag/label JSON files NOT loaded.
- **D-13:** When search input is non-empty, active category filter is bypassed: results drawn from full outdoor fixture set across all genres. Selecting a category while a search is active does not narrow the result set — the search input wins.
- **D-14:** Each result tile in search-active mode displays a small genre breadcrumb (mainGenre name, optionally subGenre).
- **D-15:** Clearing the search input restores the previously selected mainGenre/subGenre filters. The store must remember the pre-search selection.

**Empty states & migration**
- **D-16:** A mainGenre with zero outdoor fixtures is hidden from the rail. If localStorage holds a now-hidden category ID after migration, fall back to `'all'`.
- **D-17:** Search with no results shows an empty state with the query echoed back.

### Claude's Discretion

- The exact curated list of outdoor mainGenre IDs (derived empirically — no hand-curated list).
- Whether the genre breadcrumb shows mainGenre only, or mainGenre + subGenre.
- Whether the rail's "scroll" is native-overflow or a custom virtual list (~14 items doesn't need virtualization, native scroll is fine).
- Animation timing for the subGenre chip strip slide-in.
- Test boundary: pure-function tests on the new category/search modules; one smoke RTL test for the rail + chip strip interaction is enough.

### Deferred Ideas (OUT OF SCOPE)

- Tag/label search (`mysekaiFixtureLabels.json` / `mysekaiFixtureTags.json`) — explicitly rejected this phase.
- Romaji / fuzzy search beyond substring on `pronunciation`.
- Genre/subGenre name in search corpus.
- Two-tier rail (top-level + subGenre overflow in body header) — rejected in favor of chip strip.
- Mobile catalog layout.
- Color-variant grouping (already tracked as v2 VIS-02).
</user_constraints>

## Project Constraints (from CLAUDE.md)

- **Three-question filter** before any change: real need vs speculation, simpler approach, what breaks.
- **Scope discipline:** no edits outside Phase 9 surface (catalog rail, sidebar, search, store activeCategory + new activeSubGenreId + searchActiveBeforeQuery).
- **Backward compatibility:** Persist version bump must be lossless — every existing localStorage payload (version ≤3) must rehydrate to a valid Phase 9 state. The persist `migrate` hook handles that for the `activeCategory` shape change; `'all'` is the universal safe fallback.
- **DocOps L3 headers:** every file touched in `src/components/catalog/`, `src/components/chrome/`, `src/data/`, `src/stores/` MUST keep the `// ======== name ========` + INPUT/OUTPUT/POS contract. New files require new headers. Update `src/components/chrome/CLAUDE.md` (L2) only if a new chrome file is added or a role meaningfully changes (CatalogRail's role is unchanged in placement/slot — just internals).
- **Simplicity first / 3+ branches:** the new category filter must NOT branch on heuristic strings. A single `filterByGenre(fixtures, mainId, subId)` call (already in `fixtures.ts`) replaces all 8 Phase 7 branches.
- **Code quality:** files ≤800 lines, functions ≤50 lines and ≤3 nesting levels. CatalogRail.tsx is currently 290 lines; adding the curated-genre table + lucide-icon mapping should keep it under 400.
- **GSD workflow:** all edits must originate inside this phase's task graph (start via `/gsd:plan-phase`).

## Phase Requirements

ROADMAP marks Phase 9 requirements as TBD. Derive them from the locked decisions above. Numbering uses `CATL` to align with existing v1 traceability (`CATL-01..04` are already complete).

| ID | Description | Research Support |
|----|-------------|------------------|
| **CATL-05** | Catalog categories are driven by `mysekaiFixtureMainGenres.json` (game data), not heuristic strings. Phase 7's `Phase7Category` and `filterByPhase7Category` are deleted. | D-01, D-03; existing `fetchMainGenres()` and `filterByGenre()` in `src/data/genres.ts` and `src/data/fixtures.ts` cover the read + filter; outdoor mainGenre id set empirically resolved (table below). |
| **CATL-06** | Categories with zero outdoor fixtures are hidden from the rail. The curated outdoor list is derived empirically — no hand-maintained allow-list. | D-02, D-16; reuses `visibleCategories` pattern in `CatalogRail.tsx:67-72`. |
| **CATL-07** | When a mainGenre is selected, a subGenre chip strip appears in the catalog body above the thumbnail grid; chips show only subGenres present in the current outdoor set. SubGenre selection is in-memory only. | D-05, D-06, D-07, D-08; reuses `CategoryFilter.tsx` visual pattern. |
| **CATL-08** | Persisted `activeCategory` migrates from `Phase7Category` string union to `number \| 'all'`; old strings rehydrate to `'all'`. | D-04; persist version 3 → 4 with migrate hook in `editorStore.ts`. |
| **CATL-09** | Each rail button shows a genre icon. CDN icons are attempted; on 404 (or unconfirmed path) falls back to a neutral lucide icon. Labels remain Japanese genre names. | D-10, D-11; CDN path empirically unconfirmed — lucide fallback table required (see Standard Stack). |
| **CATL-10** | Search bypasses the active category filter while non-empty (results from full outdoor set), shows a genre breadcrumb on each result, and restores the previously selected mainGenre/subGenre on clear. | D-12, D-13, D-14, D-15; reuses `searchFixtures()`; new transient store fields `activeSubGenreId` + `searchActiveBeforeQuery`. |
| **CATL-11** | Search empty state echoes the query back; no results = empty state, not a hidden grid. | D-17; existing `CatalogSidebar` empty state covers this — verify still works with the new filter pipeline. |

## Standard Stack

### Core (already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.2.4 | UI framework | Already the editor framework. |
| zustand | ^5.0.12 | Store + persist middleware | Already owns `activeCategory`; persist version-bump pattern already used twice (v1→v2, v2→v3). |
| lucide-react | already in deps | Genre icons (CDN fallback + always-on if CDN unavailable) | Already used by CatalogRail (Menu/Grid3x3/ImageIcon/Palette/Square/Route/LibraryBig/TreePine/Box). Same icon family keeps visual consistency. |

**No new dependencies required.** Phase 9 is a pure refactor + migration + UX improvement on existing infrastructure. Avoid adding fuzzy-search libraries (deferred), tag-data fetchers (deferred), or animation libraries (Tailwind transitions sufficient).

### Curated Outdoor MainGenres (empirically derived — D-02)

Filter: `f.mysekaiSettableSiteType !== 'room' && f.mysekaiFixtureType !== 'system'` (existing `filterOutdoorFixtures`). Sorted by outdoor fixture count, descending. Source data refreshed live from sekai-master-db-diff on 2026-05-08.

| id | name | type | assetbundleName | outdoor count | Suggested lucide fallback |
|----|------|------|-----------------|---------------|---------------------------|
| 29 | ぬいぐるみ | none | icon_stuffed_toy | 473 | `Cat` (closest to plush toy) |
| 2 | 一般 | none | icon_normal_furniture | 334 | `Sofa` |
| 3 | 小物 | none | icon_small_furniture | 107 | `Lamp` |
| 32 | ブロック | none | icon_block | 48 | `Box` |
| 26 | 植物 | none | icon_plant | 38 | `TreePine` |
| 4 | 壁掛け | none | icon_wall_furniture | 23 | `Frame` |
| 31 | カラータイル | road | icon_road_color | 20 | `Grid2x2` |
| 9 | ラグ | none | icon_rug | 18 | `Square` |
| 5 | ディスプレイ | none | icon_custom_furniture | 8 | `Image` |
| 13 | 柵 | fence | icon_fence | 7 | `Fence` |
| 12 | 道 | road | icon_road | 6 | `Route` |
| 6 | キャンバス | none | icon_canvas | 3 | `Palette` |
| 33 | 大型 | none | icon_outside | 2 | `Trees` |
| 30 | その他 | none | icon_others | 1 | `MoreHorizontal` |

**14 curated mainGenres total** (vs Phase 7's 8 hardcoded). Plus a synthetic "all" / 全部 entry that is always pinned at the top of the rail and never filtered out.

> **Note:** ROADMAP's Phase 9 entry (`docs(09): capture phase context` commit) cited 9 missing tabs including 壁(27), 床(27), 家(21). After running the actual `filterOutdoorFixtures`, those genres have **zero** outdoor fixtures (壁=0, 床=0, 家=0 outdoor — they're all wall_appearance/floor_appearance/system fixtures filtered out by `mysekaiSettableSiteType !== 'room'` + `mysekaiFixtureType !== 'system'`). The numbers in ROADMAP came from a pre-filter count. The list above is the post-filter truth.

### SubGenre Distribution (empirical, sample)
For sizing the chip strip:

| mainGenre | subGenres present (outdoor) | Notes |
|-----------|------------------------------|-------|
| 2 一般 | 7 chips (その他=143, チェア=63, テーブル=39, 棚=28, 家電=22, 観葉植物=20, ベッド=19) | Largest split — chip strip most useful here. |
| 3 小物 | 2 chips (その他=89, 家電=18) | Borderline; chip strip still useful. |
| 26 植物 | 2 chips (花=30, 木=8) | Useful. |
| 29 ぬいぐるみ | 1 chip only (ぬいぐるみ=473) | **Hide chip strip** when only 1 subgenre — adds no value. |
| 32 ブロック | 0 chips — `mysekaiFixtureSubGenreId` is `null` for all 48 fixtures | **Hide chip strip when all fixtures lack subgenre id.** |
| 4, 5, 6, 9, 12, 13, 30, 31, 33 | 0–1 chips | Hide chip strip. |

**Recommendation (Claude's Discretion):** show subGenre chip strip only when `derivedSubGenres.length >= 2`. Saves vertical space when there's nothing to choose between.

### Architecture Patterns

#### Pattern 1: Store shape change with persist migrate

```typescript
// editorStore.ts — version bump 3 → 4
{
  version: 4,
  migrate: (persistedState: any, fromVersion: number) => {
    let migrated = persistedState ?? {}
    // ... existing v1 → v2 → v3 migrations preserved verbatim ...
    if (fromVersion < 4) {
      // activeCategory: string ('all' | 'display' | ...) → number | 'all'
      // Old strings (display/canvas/rug/road/shelf/plant/block) all coerce to 'all'.
      // Old 'all' literal stays 'all'. Anything else → 'all'.
      migrated = { ...migrated, activeCategory: 'all' as const }
    }
    return migrated
  },
}
```

Coerce-to-'all' is the safe lossless migration: the user's prior heuristic-string selection has no clean mainGenre equivalent (棚 was a heuristic, not a real mainGenre), and `'all'` is always valid.

#### Pattern 2: Two-stage filter pipeline

`CatalogSidebar` body:
```typescript
const visibleFixtures = useMemo(() => {
  if (searchQuery) return searchFixtures(outdoorFixtures, searchQuery)
  return filterByGenre(outdoorFixtures, activeCategory === 'all' ? null : activeCategory, activeSubGenreId)
}, [outdoorFixtures, searchQuery, activeCategory, activeSubGenreId])
```

Both `filterByGenre` and `searchFixtures` already exist in `src/data/fixtures.ts` and are currently dead-code reachable only through Phase 1 code paths that the rail bypassed. Phase 9 wires them in.

#### Pattern 3: Search-active state preservation (D-15)

```typescript
// store
searchActiveBeforeQuery: { mainId: number | 'all'; subId: number | null } | null
// transient — NOT in persist partialize, NOT in temporal partialize
```

On search input change from empty → non-empty: snapshot `{ activeCategory, activeSubGenreId }` into `searchActiveBeforeQuery`.
On non-empty → empty: restore from snapshot, then clear snapshot.
On `setActiveCategory` while search active: still update store (so the user can pre-select for after-clear), but the visible result list ignores `activeCategory` until `searchQuery === ''`.

#### Pattern 4: Curated outdoor genre list, computed not hand-maintained

```typescript
// src/data/genres.ts — new exported helper
export function deriveOutdoorMainGenres(
  fixtures: Fixture[],   // already-outdoor-filtered set
  allGenres: FixtureMainGenre[],
): FixtureMainGenre[] {
  const presentIds = new Set(fixtures.map(f => f.mysekaiFixtureMainGenreId))
  return allGenres.filter(g => presentIds.has(g.id))
}
```

This automatically prunes Leo/need/MJ/event/tool/etc. — no hardcoded exclusion list. If sekai-master-db-diff later adds a new outdoor genre, it appears in the rail without code changes.

### Anti-Patterns to Avoid

- **Re-introducing string heuristics for any category** — D-03 is explicit. Don't replicate the `/植|花|tree/` trick anywhere new.
- **Persisting `activeSubGenreId` to localStorage** — D-08 forbids this. Add it to the `EditorState` interface and store shape, but exclude from both `partialize` and `temporal`.
- **Loading `mysekaiFixtureLabels.json` / `mysekaiFixtureTags.json`** — D-12 explicitly defers tag search. Don't add fetches.
- **Sorting by `seq`** — `mysekaiFixtureMainGenres.json` does NOT have a `seq` field. The current `genres.ts:14` `data.sort((a, b) => a.seq - b.seq)` produces NaN comparisons (silently no-op). Phase 9 should drop the sort or sort by `id` ascending (the data is already returned in a stable game-defined order).
- **Building a virtual scroller for 14 rail items** — native overflow + ~52px per button = ~728px max. The viewport-locked rail with `overflow-y: auto` is sufficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fixture name/pronunciation search | New filter regex | `searchFixtures(fixtures, query)` in `src/data/fixtures.ts:38` | Already exists, already tested-shaped, covers both name and pronunciation. |
| MainGenre + subGenre filter | New nested filter | `filterByGenre(fixtures, mainId, subId)` in `src/data/fixtures.ts:49` | Already exists; handles `mainId === null` and `subId === null` correctly. |
| MainGenre fetch + parse | New fetch wrapper | `fetchMainGenres()` / `fetchSubGenres()` in `src/data/genres.ts` | Already implemented. **Drop the broken `.sort((a,b) => a.seq - b.seq)`** — `seq` does not exist on the live JSON. |
| Hide-empty-category logic | New filter | `visibleCategories` memoization pattern in `CatalogRail.tsx:67-72` | Already established for Phase 7's 8 keys; same pattern works for the 14 curated genres. |
| Persist migration | New ad-hoc | `migrate` hook in `editorStore.ts` (already on `persist`) | Two prior migrations (v1→v2, v2→v3) are the established style. Add a v3→v4 case. |
| Chip strip UI | New component | `CategoryFilter.tsx` (parameterize) OR factor into a generic `<ChipStrip items=[...] activeId={...} onSelect={...} />` and have both call sites use it. | The visual contract is already implemented and styled. |

**Key insight:** Almost all primitives Phase 9 needs already exist as dead or under-used code from Phase 1. The Phase 7 chrome shell *bypassed* them with a heuristic-string approach. Phase 9 is largely a **rewiring** task — re-pointing CatalogRail and CatalogSidebar to call `filterByGenre`/`searchFixtures` instead of `filterByPhase7Category` — plus a persist migration and one new in-memory store field.

## Runtime State Inventory

> Phase 9 includes a state-shape migration (`activeCategory` string → number) which makes this a refactor with persisted-state impact. All five categories investigated.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | localStorage key `mysekai-planner-design`: persist payload contains `activeCategory: string` (one of `'all' \| 'display' \| 'canvas' \| 'rug' \| 'road' \| 'shelf' \| 'plant' \| 'block'`). Current persist version=3. Every existing user has one of these strings. | Persist version bump 3 → 4 + `migrate` hook that coerces all old strings to `'all'`. Lossless; user re-picks a genre after one click. |
| Live service config | None — static GitHub Pages site, no external service config. | None — verified by inspecting `.planning/config.json` and `package.json scripts`. |
| OS-registered state | None — pure browser app. | None. |
| Secrets/env vars | None — no auth, no API keys, all data is public CDN/raw GitHub URLs. | None. |
| Build artifacts | `dist/` (vite output) and any deploy `gh-pages` branch — these are reproducible from source so the migration applies on next visit, no artifact rewrite needed. **No localStorage shape is baked into the bundle**; the `partialize` / `migrate` config is read at runtime. | None — next deploy automatically picks up the new migrate hook. |

**Critical detail:** the migration must be additive — preserve all other v3 fields (`placedItems`, `placedEdges`, `areaLevel`, `gridSize`, `inventory`, `isEditorReady`, `catalogCollapsed`, `catalogTop`, `costPanelOpen`, `floatbarX`). Spread-based migrate (matching the existing v1→v2 / v2→v3 style in `editorStore.ts:415-440`) handles this naturally.

## Common Pitfalls

### Pitfall 1: Treating `activeCategory` as a discriminated union mid-typing
**What goes wrong:** TypeScript infers `string | number` for `activeCategory` after the migration, and consumers do `activeCategory === 'all'` checks correctly but `activeCategory === 12` checks fail because TS narrows to `string` after the literal compare.
**Why it happens:** Mixing primitive types in a single field requires either a tagged union or careful narrowing.
**How to avoid:** Type as `number | 'all'`. The compiler then forces the narrowing pattern: `activeCategory === 'all' ? null : activeCategory` (returns `number | null`) is the canonical form for handing to `filterByGenre(fixtures, mainId, ...)`.
**Warning signs:** TS errors `Type 'string' is not assignable to type 'number'` in CatalogSidebar.

### Pitfall 2: SubGenre chip strip flickering on mainGenre change
**What goes wrong:** When user clicks rail button → mainGenre changes → subGenre chip list rebuilds → if `activeSubGenreId` was set for the previous mainGenre, it now points at a chip that doesn't exist in the new derived list. UI shows no active chip; filter returns 0 fixtures.
**Why it happens:** SubGenre IDs are not unique to a mainGenre but are not present across all mainGenres either.
**How to avoid:** In the `setActiveCategory` action, also reset `activeSubGenreId: null`. Document this as part of the rail button onClick.
**Warning signs:** "Empty results" empty state appears immediately after switching categories.

### Pitfall 3: Persist version-bump dropped because migrate doesn't run
**What goes wrong:** Migration logic added, but version number not bumped in `persist({ version: 4 })`. Zustand sees `fromVersion === 3 === 3`, doesn't call migrate, hydrates the old string into the new store, downstream code treats it as a number, runtime error.
**Why it happens:** Easy to forget the version bump.
**How to avoid:** Mandatory verification step — search the project for `version: 3` in `editorStore.ts`, replace with `version: 4`. Add a unit test that hydrates a v3-shaped payload and asserts post-rehydrate `activeCategory === 'all'`.
**Warning signs:** Existing users (with v3 payload) crash on load; fresh-install users (no payload) work fine.

### Pitfall 4: Genre icon CDN promise rejection bubbles to React
**What goes wrong:** Image `<img src="https://storage.sekai.best/...">` fires `onerror` for every 404. If the rail uses `getRemoteImage()`-style promise wrappers, an unhandled rejection floods the console.
**Why it happens:** Genre icon CDN path is unconfirmed (see Open Questions). Every rail button might 404.
**How to avoid:** Use plain `<img>` with `onError={(e) => e.currentTarget.style.display='none'}` and lucide icon as the underlying element (always rendered, image overlays it). Or just always render the lucide icon and skip the image attempt entirely until the CDN path is found. **Recommendation: skip the CDN image until the path is confirmed; lucide icons are visually adequate.**
**Warning signs:** Network panel shows 14 simultaneous 404s on initial render.

### Pitfall 5: Reusing `CategoryFilter.tsx` for subGenres without parameterization
**What goes wrong:** `CategoryFilter.tsx` is typed `genres: FixtureMainGenre[]` and ID type `number | null`. Trying to feed `FixtureSubGenre[]` causes type errors. Quick-hacking with `as any` papers over the issue but loses the active-id discriminator.
**Why it happens:** The component was Phase 1, single-purpose.
**How to avoid:** Either (a) factor into a generic `<ChipStrip items={Array<{id: number; name: string}>} ... />` (preferred — both shapes satisfy this) or (b) duplicate as `SubGenreChipStrip` (acceptable; ~30 lines of code). Don't subtype-coerce.
**Warning signs:** `as any` or `as unknown as` casts appearing in a JSX prop.

### Pitfall 6: Stale `pronunciation` lowercasing
**What goes wrong:** `searchFixtures` does `pronunciation.includes(query.toLowerCase())`. The `pronunciation` field is hiragana/katakana, so `toLowerCase()` is a no-op. But if a future fixture has romaji in pronunciation, the contract is fine. **No bug here, but** if Phase 9 ever extends search corpus (it won't this phase per D-12), preserve this lowercase pattern.
**Why it happens:** Cargo-culting partial fixes.
**How to avoid:** Keep `searchFixtures` untouched. Phase 9 does not modify it.
**Warning signs:** N/A — flagged for awareness.

### Pitfall 7: ROADMAP's expected outdoor genre count mismatches reality
**What goes wrong:** The Phase 9 ROADMAP entry says "ぬいぐるみ 473, 一般 380, 小物 117, 壁掛け 79, 壁 27, 床 27, 家 21, 柵 7, 大型 2". Actual outdoor counts: ぬいぐるみ 473, 一般 **334** (not 380), 小物 **107** (not 117), 壁掛け **23** (not 79), 壁 **0** (not 27), 床 **0** (not 27), 家 **0** (not 21), 柵 7, 大型 2. The ROADMAP numbers came from `total fixture count per mainGenre`, NOT the post-`filterOutdoorFixtures` count.
**Why it happens:** The author did not run the outdoor filter before counting.
**How to avoid:** Reviewers comparing the new rail against the ROADMAP should expect 14 categories (above table), not the ROADMAP's 9. The empirical-derivation rule (D-02) is the source of truth.
**Warning signs:** PR review comment "where are 壁 and 床?"

## Code Examples

### 1. Wired-up `CatalogSidebar` filter pipeline

```typescript
// src/components/catalog/CatalogSidebar.tsx
// ======== 目录主体 — Phase 9 改：分类驱动 + 子分类芯片栏 + 搜索接管 ========
// INPUT: fixtures (outdoor-filtered), mainGenres, subGenres, fixtureMap; activeCategory + activeSubGenreId from store
// OUTPUT: 头部条 + 搜索 + 子分类芯片栏（条件渲染）+ 缩略图网格 + 搜索面包屑
// POS: src/components/catalog/CatalogSidebar.tsx — Phase 9 catalog body

import { useMemo, useState } from 'react'
import type { Fixture, FixtureMainGenre, FixtureSubGenre } from '../../types/editor'
import { searchFixtures, filterByGenre } from '../../data/fixtures'
import { useEditorStore } from '../../stores/editorStore'

interface Props {
  fixtures: Fixture[]
  mainGenres: FixtureMainGenre[]
  subGenres: FixtureSubGenre[]
  fixtureMap: Map<number, Fixture>
}

export function CatalogSidebar({ fixtures, mainGenres, subGenres, fixtureMap }: Props) {
  const activeCategory = useEditorStore(s => s.activeCategory)        // number | 'all'
  const activeSubGenreId = useEditorStore(s => s.activeSubGenreId)    // number | null
  const setActiveSubGenreId = useEditorStore(s => s.setActiveSubGenreId)
  const [searchQuery, setSearchQuery] = useState('')

  const isSearching = searchQuery.length > 0
  const mainId = activeCategory === 'all' ? null : activeCategory

  // Filter pipeline: search wins, otherwise genre filter
  const filtered = useMemo(() => {
    if (isSearching) return searchFixtures(fixtures, searchQuery)
    return filterByGenre(fixtures, mainId, activeSubGenreId)
  }, [fixtures, isSearching, searchQuery, mainId, activeSubGenreId])

  // SubGenre chips: only those with ≥1 outdoor fixture in the active mainGenre
  const visibleSubGenres = useMemo(() => {
    if (mainId === null) return []
    const present = new Set<number>()
    for (const f of fixtures) {
      if (f.mysekaiFixtureMainGenreId === mainId && f.mysekaiFixtureSubGenreId != null) {
        present.add(f.mysekaiFixtureSubGenreId)
      }
    }
    return subGenres.filter(s => present.has(s.id))
  }, [fixtures, mainId, subGenres])

  const showChipStrip = !isSearching && visibleSubGenres.length >= 2

  // ... render header, search, optional chip strip, grid (with breadcrumb in search mode) ...
}
```

### 2. Curated outdoor mainGenre derivation in `CatalogRail`

```typescript
// src/components/chrome/CatalogRail.tsx
const ALL_ENTRY = { id: 'all' as const, name: '全部', assetbundleName: 'icon_all' }

const visibleGenres = useMemo(() => {
  const presentIds = new Set(fixtures.map(f => f.mysekaiFixtureMainGenreId))
  const curated = mainGenres.filter(g => presentIds.has(g.id))
  return [ALL_ENTRY, ...curated]   // 'all' always pinned at top
}, [fixtures, mainGenres])
```

### 3. Lucide-icon fallback table (D-10 fallback path — recommended PRIMARY path)

```typescript
// src/components/chrome/genreIcons.ts — new file
import {
  Cat, Sofa, Lamp, Box, TreePine, Frame, Grid2x2, Square,
  Image, Fence, Route, Palette, Trees, MoreHorizontal, Grid3x3,
} from 'lucide-react'
import type React from 'react'

// Keyed by assetbundleName so the mapping survives future genre additions
// (we just need to add a row; outdoor-derivation auto-includes the genre).
const ICON_BY_BUNDLE: Record<string, React.ElementType> = {
  icon_all: Grid3x3,
  icon_stuffed_toy: Cat,
  icon_normal_furniture: Sofa,
  icon_small_furniture: Lamp,
  icon_block: Box,
  icon_plant: TreePine,
  icon_wall_furniture: Frame,
  icon_road_color: Grid2x2,
  icon_rug: Square,
  icon_custom_furniture: Image,
  icon_fence: Fence,
  icon_road: Route,
  icon_canvas: Palette,
  icon_outside: Trees,
  icon_others: MoreHorizontal,
}

export function getGenreIcon(assetbundleName: string): React.ElementType {
  return ICON_BY_BUNDLE[assetbundleName] ?? MoreHorizontal
}
```

### 4. Persist migration v3 → v4

```typescript
// src/stores/editorStore.ts (extend existing migrate function)
if (fromVersion < 4) {
  // Phase 7 Phase7Category strings ('display' | 'canvas' | 'rug' | 'road' |
  //  'shelf' | 'plant' | 'block') had no clean mainGenreId equivalent.
  // The 'shelf'/'plant'/'block' heuristic categories are deleted with no
  // surviving genre at all. Coerce everything to 'all' losslessly.
  migrated = { ...migrated, activeCategory: 'all' as const }
}
```

And bump `version: 3` → `version: 4` in the persist config.

### 5. Search-active state preservation (D-15)

```typescript
// src/components/catalog/CatalogSidebar.tsx — search input handler
const onSearchChange = (next: string) => {
  const wasSearching = searchQuery.length > 0
  const willSearch = next.length > 0
  if (!wasSearching && willSearch) {
    // Snapshot before entering search mode
    setSearchSnapshot({ mainId: activeCategory, subId: activeSubGenreId })
  } else if (wasSearching && !willSearch) {
    // Restore on clear
    if (searchSnapshot) {
      setActiveCategory(searchSnapshot.mainId)
      setActiveSubGenreId(searchSnapshot.subId)
      setSearchSnapshot(null)
    }
  }
  setSearchQuery(next)
}
```

`searchSnapshot` lives in either component-local state OR the store. Decision (Claude's discretion): **store** is preferable so the rail can know whether the user is "previewing a category for after-clear" and gray it out vs highlight, but local component state is simpler and acceptable. Recommend store.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 8 hardcoded categories with regex name matching | 14 game-data-driven mainGenres + chip-strip subGenres | Phase 9 (this phase) | Removes stale heuristic; new genres in source data appear automatically. |
| `activeCategory: string` (Phase7Category union) | `activeCategory: number \| 'all'` | Phase 9 | Persist version bump + migrate. |
| `genres.ts` sort by `seq` (no-op — field doesn't exist) | drop sort or sort by `id` ascending | Phase 9 | Bug fix (silent NaN sort). |
| `searchFixtures` and `filterByGenre` defined but unused for catalog filtering | wired into `CatalogSidebar` | Phase 9 | Dead code → live. |
| Phase 7 8-icon lucide table in `CatalogRail` | Lucide table keyed by `assetbundleName` for the 14 curated genres | Phase 9 | New mapping file `genreIcons.ts`. |

**Deprecated/outdated by this phase:**
- `Phase7Category` type and its union literals.
- `filterByPhase7Category` function (entirely deleted).
- `CATEGORIES` constant in `CatalogRail.tsx:26-39` (replaced by derived list).

## Open Questions

1. **What is the actual CDN path (if any) for genre icons?**
   - What we know: All 30+ probed paths under `storage.sekai.best/sekai-jp-assets/` returned 404. Sekai-Viewer (the canonical sekai.best frontend) does NOT render genre icons — its `MysekaiFixtureFilter.tsx` uses an MUI Autocomplete with text names only.
   - What's unclear: Whether genre icons are bundled inside the Unity AssetBundle and never extracted to `storage.sekai.best`, or whether they're at a path I haven't tried.
   - Recommendation: **Ship Phase 9 with the lucide fallback table as the primary rendering path** (Code Example 3). Skip the CDN attempt entirely until a confirmed path exists. Track "use real CDN icons" as a future enhancement (similar to v2 VIS-01 character-name translations). This honors D-10's "fallback to lucide" guarantee while avoiding 14 simultaneous 404s on every rail mount.

2. **Should "全部" appear as a rail button or a separate UI element?**
   - What we know: Phase 7 has 'all' as the first rail button. The chip strip uses "全部" as the first chip.
   - What's unclear: Whether visual consistency is best served by also putting an "全部" rail entry, or by treating "no selection" as the default (active when no main genre is selected).
   - Recommendation: keep parity with Phase 7 — "全部" rail button as the first entry, as in Code Example 2. User muscle memory from Phase 7 is preserved.

3. **Should `activeSubGenreId` reset when switching mainGenre, or persist if a same-id subGenre exists in both?**
   - What we know: SubGenre IDs are not unique to a mainGenre but are not reliably present across mainGenres either.
   - What's unclear: User mental model — if I'm in 一般 and selected `家電` (id 8), then click 小物, do I expect `家電` (id 12, different sub but same name) to stay selected?
   - Recommendation: **Reset to `null` on every mainGenre change.** Cleaner contract; user re-picks. This matches the "in-memory only" spirit of D-08.

4. **Where does the search-active "previously selected" snapshot live: store or local state?**
   - What we know: D-15 says "the store must remember the pre-search selection."
   - Recommendation: store. Add `searchActiveBeforeQuery: { mainId; subId } | null` to `EditorState`. Exclude from `partialize` and from `temporal.partialize`. This honors the explicit "store" wording in D-15 and makes the rail aware of the snapshot if it ever needs to render a hint.

## Environment Availability

> Pure code/config phase. No external runtime dependencies introduced.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| sekai-master-db-diff GitHub raw | mainGenres / subGenres fetch | ✓ | live | None — already a hard dependency since Phase 1. |
| storage.sekai.best CDN | Genre icons (D-10) | ✓ for fixture thumbnails (existing); ✗ for genre icons (path unconfirmed) | — | Lucide icon table (Code Example 3) — **recommended primary path**. |
| vitest | Unit tests | ✓ | ^3.2.1 | — |
| @testing-library/react | Smoke RTL test | ✓ | ^16.0.0 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Genre icon CDN — fall back to lucide. No new deps.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.2.1 + @testing-library/react 16.0.0 + jsdom 26.1.0 |
| Config file | `vite.config.ts` (vitest workspace) + `vitest.setup.ts` |
| Quick run command | `pnpm test src/data/__tests__/genres.test.ts src/data/__tests__/fixturesGenre.test.ts -- --run` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CATL-05 | `filterByPhase7Category` removed; `filterByGenre` is the only genre filter wired into CatalogSidebar. | unit (negative — file should not export the old symbol) | `pnpm test src/data/__tests__/fixtures.test.ts -- --run` | ❌ Wave 0 (new file `fixtures.test.ts`) |
| CATL-06 | `deriveOutdoorMainGenres(outdoorFixtures, allGenres)` returns exactly the 14 ids in the curated table when fed the canonical fixtures fixture. | unit | `pnpm test src/data/__tests__/genres.test.ts -- --run` | ❌ Wave 0 |
| CATL-07 | `CatalogSidebar` renders subGenre chips only for mainGenres with ≥2 outdoor subgenres; 全部 chip resets `activeSubGenreId` to null. | RTL smoke | `pnpm test src/components/catalog/__tests__/CatalogSidebar.smoke.test.tsx -- --run` | ❌ Wave 0 |
| CATL-08 | Persist v3 payload with `activeCategory: 'shelf'` rehydrates as `activeCategory: 'all'`; v4 payload with `activeCategory: 2` rehydrates unchanged. | unit | `pnpm test src/stores/__tests__/persistMigrate.test.ts -- --run` | ❌ Wave 0 |
| CATL-09 | `getGenreIcon('icon_normal_furniture')` returns Sofa; unknown bundle returns MoreHorizontal. | unit | `pnpm test src/components/chrome/__tests__/genreIcons.test.ts -- --run` | ❌ Wave 0 |
| CATL-10 | Search input non-empty bypasses category filter; clearing input restores prior `{mainId, subId}` snapshot. | RTL smoke (extends CATL-07 file) | (same as CATL-07) | ❌ Wave 0 |
| CATL-11 | Empty result set renders existing empty-state markup (該当する家具はありません). | RTL smoke (extends CATL-07 file) | (same as CATL-07) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test <focused-file> -- --run`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green AND `pnpm build` (tsc -b + vite build) AND `pnpm lint` clean before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/data/__tests__/genres.test.ts` — covers CATL-06 (`deriveOutdoorMainGenres`).
- [ ] `src/data/__tests__/fixtures.test.ts` — covers CATL-05 (negative: `filterByPhase7Category` import fails).
- [ ] `src/components/catalog/__tests__/CatalogSidebar.smoke.test.tsx` — covers CATL-07, CATL-10, CATL-11.
- [ ] `src/stores/__tests__/persistMigrate.test.ts` — covers CATL-08 (rehydrate v3 → v4 transformation).
- [ ] `src/components/chrome/__tests__/genreIcons.test.ts` — covers CATL-09.
- [ ] No new framework install needed — vitest + RTL + jsdom already in `package.json`.

## Sources

### Primary (HIGH confidence)
- `mysekaiFixtureMainGenres.json` (Sekai-World/sekai-master-db-diff main branch, fetched 2026-05-08) — 33 entries, no `seq` field, has `id`, `name`, `mysekaiFixtureMainGenreType`, `assetbundleName`, optional `groupId`.
- `mysekaiFixtureSubGenres.json` (same) — 33 entries, no `seq` field, has `id`, `name`, `mysekaiFixtureSubGenreType`, `assetbundleName`. Note: source `assetbundleName` for subGenres frequently collides with mainGenres (e.g. `icon_road`, `icon_fence`, `icon_rug`).
- `mysekaiFixtures.json` (same) — 1286 total, 1088 outdoor after `filterOutdoorFixtures`. Empirical mainGenre/subGenre distribution computed live.
- `src/data/fixtures.ts` lines 38-60 — confirms `searchFixtures` and `filterByGenre` already implemented and unused.
- `src/data/genres.ts` — confirms `fetchMainGenres`/`fetchSubGenres` already implemented, with the buggy `seq` sort.
- `src/stores/editorStore.ts` lines 394-440 — confirms persist version=3, established migrate-hook pattern (v1→v2, v2→v3) for additive field migrations.
- `src/components/chrome/CatalogRail.tsx` lines 26-72 — current 8-key CATEGORIES constant + visibleCategories memo pattern.
- `src/components/catalog/CategoryFilter.tsx` — current chip-strip visual contract.

### Secondary (MEDIUM confidence)
- `Sekai-World/sekai-viewer` (dev branch) `src/pages/mysekai/MysekaiFixtureFilter.tsx` and `MysekaiFixtureList.tsx` — confirms sekai-viewer uses MUI Autocomplete with genre names (no icons rendered), so it doesn't reveal a genre-icon CDN path.

### Tertiary (LOW confidence)
- Empirical CDN probing of `storage.sekai.best/sekai-jp-assets/` paths for genre icons — all 30+ candidates returned 404. **Strong evidence the CDN path either doesn't exist publicly or is at a path no major sekai web tool uses.** Recommendation is to skip CDN icons entirely and use lucide fallback as the primary path.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — no new deps; reuse of existing functions confirmed by reading source.
- Architecture: **HIGH** — persist migration pattern established; filter pipeline cleanly composes existing helpers.
- Outdoor genre list: **HIGH** — derived empirically from live data; will track future game updates automatically.
- Persist migration: **HIGH** — two prior migrations in the same file as templates.
- Genre icon CDN: **LOW** — 30+ probed paths all 404; recommend lucide-only path.
- Test architecture: **HIGH** — vitest + RTL + jsdom already in place from Phases 1, 3, 4, 5, 7.
- Pitfalls: **MEDIUM** — based on code reading + extrapolation; some pitfalls (icon flicker, type narrowing) are predictive rather than observed.

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (30 days — game data evolves but on monthly cadence; verify outdoor mainGenre id table before merge if delayed past mid-June).
