# Phase 9: Catalog overhaul — genre-driven categories with search - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the Phase 7 catalog rail's eight hardcoded categories — which rely on
fragile name-heuristic matching for `shelf` / `plant` / `block` / `display` — with
a category system driven directly by the game's `mysekaiFixtureMainGenres.json`
and `mysekaiFixtureSubGenres.json` data, and present subGenres as a second-level
filter inside the catalog body. Improve search ergonomics so users can find a
fixture by name or pronunciation across every genre, with the active category
gracefully expanding to "all" while a breadcrumb keeps the result's home genre
visible.

In scope:
- Curated mainGenre source-of-truth replaces the Phase 7 8-key enum and the
  `filterByPhase7Category` heuristics (`src/data/fixtures.ts:120-168`).
- SubGenre chip strip inside `CatalogSidebar` body when a mainGenre is active.
- Game-data icon (`assetbundleName`) rendering on the 72-px rail with vertical
  scroll for 16+ genres.
- Search keeps the existing name + pronunciation matching (Phase 1 behavior),
  but auto-broadens scope to "all" while typing and shows a per-result genre
  breadcrumb. Clearing search restores the previously selected genre.

Out of scope (deferred):
- Tag/label-based search across `mysekaiFixtureLabels.json` /
  `mysekaiFixtureTags.json` — explicitly rejected this phase, see deferred.
- Mobile-specific layout changes (rail width, drawer behavior).
- Re-ranking / fuzzy matching beyond substring.
- Color-variant grouping (already tracked as v2 VIS-02).

</domain>

<decisions>
## Implementation Decisions

### Category source

- **D-01:** Catalog categories are driven by
  `mysekaiFixtureMainGenres.json` (fetched via existing `fetchMainGenres()` in
  `src/data/genres.ts`), filtered to the curated set of outdoor-relevant
  genres. Indoor-only genres, unit logos (Leo/need, MORE MORE JUMP！, etc.),
  achievement/event genres, and tool genres (オノ / ツルハシ) are excluded.
- **D-02:** The exact list of "outdoor-relevant" mainGenre IDs is research's
  job — derive empirically by intersecting `mainGenreId` values present in the
  outdoor-filtered fixture set (`filterOutdoorFixtures`) with
  `mysekaiFixtureMainGenres.json`. A genre that has zero outdoor fixtures is
  hidden automatically (existing `visibleCategories` pattern in
  `CatalogRail.tsx:67-72`).
- **D-03:** The Phase 7 `Phase7Category` union and `filterByPhase7Category`
  function are replaced — not extended. Heuristic name-matching for
  `shelf` / `plant` / `block` / `display` is removed entirely. The CONTEXT
  refers to it only because the planner must not preserve it.
- **D-04:** Persisted `activeCategory` migrates from `Phase7Category` strings
  ('all' | 'display' | 'canvas' | 'rug' | …) to mainGenre IDs (number) plus a
  sentinel `'all'`. Existing localStorage values must be migrated to `'all'` on
  load (lossless, never crashes) — not silently dropped.

### SubGenre presentation

- **D-05:** When a mainGenre is selected, its subGenres render as a horizontal
  scrollable chip strip at the top of the catalog body, above the thumbnail
  grid. An "全部" chip resets to the mainGenre-wide view. This pattern matches
  the existing `CategoryFilter.tsx` style.
- **D-06:** SubGenre chips are derived empirically: only show subGenres that
  have at least one fixture in the currently active mainGenre's outdoor set
  (no empty chips).
- **D-07:** Selecting "全部" on the rail (no mainGenre) hides the subGenre chip
  strip entirely.
- **D-08:** Active subGenre is in-memory only — it does NOT persist to
  localStorage (avoid Phase 7 chrome state bloat; user can re-pick after
  reload). This is a deliberate scope-cap.

### Rail UX

- **D-09:** The 72-px catalog rail keeps its width but switches its category
  list to vertical scroll when curated mainGenres exceed the visible column.
  The hamburger / grip controls remain pinned at the top.
- **D-10:** Each rail button uses the genre's game-data icon, fetched from the
  Sekai CDN using the genre's `assetbundleName` field. The exact CDN path
  (`storage.sekai.best/sekai-jp-assets/...` — pattern unknown for genre icons,
  research must confirm) is research's responsibility before planning. If the
  CDN icon 404s, the rail must fall back to a neutral lucide icon — never an
  empty button.
- **D-11:** Rail button labels remain Japanese (genre `name`), 10-px M PLUS
  Rounded 1c, matching existing visual treatment.

### Search

- **D-12:** Search scope stays as today: `fixture.name` + `fixture.pronunciation`
  substring match. Genre / subGenre names are NOT added to the search corpus.
  Tag/label JSON files are NOT loaded. (Deliberate scope cap — see deferred.)
- **D-13:** When the search input is non-empty, the active category filter
  is bypassed: results are drawn from the full outdoor fixture set across all
  genres. Selecting a category while a search is active does not narrow the
  result set — the search input wins.
- **D-14:** Each result tile in search-active mode displays a small genre
  breadcrumb (mainGenre name, optionally subGenre) so the user knows the home
  category of each match.
- **D-15:** Clearing the search input (X button or empty string) restores the
  previously selected mainGenre / subGenre filters. The store must remember
  the pre-search selection.

### Empty states & migration

- **D-16:** A mainGenre with zero outdoor fixtures is hidden from the rail
  (already established pattern). If localStorage holds a now-hidden category
  ID after migration, fall back to `'all'`.
- **D-17:** Search with no results shows an empty state with the query echoed
  back (existing CatalogSidebar empty-state — verify it still works).

### Claude's Discretion

- The exact curated list of outdoor mainGenre IDs (derived empirically — no
  hand-curated list).
- Whether the genre breadcrumb shows mainGenre only, or mainGenre + subGenre.
- Whether the rail's "scroll" is native-overflow or a custom virtual list
  (~16-20 items doesn't need virtualization, native scroll is fine).
- Animation timing for the subGenre chip strip slide-in.
- Test boundary: pure-function tests on the new category/search modules; one
  smoke RTL test for the rail + chip strip interaction is enough.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Catalog architecture (current state to replace/extend)

- `src/data/fixtures.ts` — `filterByPhase7Category`, `Phase7Category` union,
  outdoor filter, search, layer classifier. Phase 9 replaces the
  Phase7Category portion.
- `src/data/genres.ts` — `fetchMainGenres()` / `fetchSubGenres()` (already
  defined and unused since Phase 7).
- `src/components/chrome/CatalogRail.tsx` — 72-px rail + collapsible body,
  `activeCategory` state, vertical drag, hamburger toggle.
- `src/components/catalog/CatalogSidebar.tsx` — body that hosts search + grid.
- `src/components/catalog/CategoryFilter.tsx` — Phase 1 chip-strip pattern that
  D-05 should reuse for subGenres.
- `src/components/catalog/CatalogSearch.tsx` — search input visual contract
  (preserve styling).
- `src/types/editor.ts` — `Fixture`, `FixtureMainGenre`, `FixtureSubGenre`
  types (the data schema this phase consumes).

### Persisted state contract

- `src/stores/editorStore.ts` — owns `activeCategory`, `catalogCollapsed`,
  `catalogTop`. Phase 9 changes the type of `activeCategory` and adds a
  transient `searchActiveBeforeQuery` snapshot for D-15.

### UI brand / visual

- `.planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md` §Catalog Rail —
  Phase 7 visual contract for the rail (preserve gradients, radii, shadow
  tokens). The genre-driven rail must remain visually consistent.
- `src/components/chrome/CLAUDE.md` — chrome shell L2 doc (Slot B is the
  catalog rail; preserve INPUT/OUTPUT/POS headers per DocOps).

### Game data

- `https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main/mysekaiFixtureMainGenres.json`
  — mainGenre source of truth (id, name, mysekaiFixtureMainGenreType,
  assetbundleName).
- `https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main/mysekaiFixtureSubGenres.json`
  — subGenre source of truth.
- `src/data/mysekaiFixtures.json` — local fixture catalog (pinned snapshot;
  contains `mysekaiFixtureMainGenreId` / `mysekaiFixtureSubGenreId` per item).

### Prior decisions still binding

- Phase 1 — `01-CONTEXT.md`: catalog must support search by name +
  pronunciation, filter by mainGenre + subGenre. Phase 9 honors this.
- Phase 7 — `07-CONTEXT.md` / `07-UI-SPEC.md`: 72-px rail + 248-px body
  collapsible shell. Phase 9 lives inside that shell.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- `fetchMainGenres()` / `fetchSubGenres()` in `src/data/genres.ts` — already
  fetch and sort by `seq`. Not currently called anywhere; Phase 9 wires them
  in.
- `CategoryFilter.tsx` — exact chip-strip visual pattern needed for D-05.
  Either reuse it directly (parameterized over genres) or factor into a shared
  `<ChipStrip>`.
- `searchFixtures(fixtures, query)` and `filterByGenre(fixtures, mainId,
  subId)` in `src/data/fixtures.ts` — pure functions that already cover the
  search and genre-filter primitives Phase 9 needs. Reuse instead of
  rewriting.
- `visibleCategories` memo pattern in `CatalogRail.tsx:67-72` — apply the
  same "filter empty categories" treatment to the genre-driven list.
- `getThumbnailUrl(assetbundleName)` in `src/data/fixtures.ts` — same CDN
  pattern that the genre icons (D-10) likely follow.

### Established patterns

- Persisted Zustand state migrates via the persist middleware's `version` +
  `migrate` options (see `editorStore.ts`). Use this for the
  `activeCategory` type change in D-04.
- DocOps L3 file headers (`// ======== name ========` + INPUT/OUTPUT/POS)
  are mandatory on every catalog file (see `chrome/CLAUDE.md`).
- Tests live next to data modules under `src/data/__tests__/`. Pure functions
  are unit-tested; UI gets a smoke test only.

### Integration points

- `EditorLayout.tsx` mounts `CatalogRail` in Slot B and threads `fixtures`,
  `mainGenres`, `fixtureMap` via props (see `CatalogRail` component
  signature). `mainGenres` is already a prop — currently unused; Phase 9
  consumes it.
- `editorStore.activeCategory` is read by `CatalogRail` and (potentially) by
  `CatalogSidebar` to drive the grid filter. Phase 9 adds an
  `activeSubGenreId` field used only by `CatalogSidebar`.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly framed the goal as: "category source = game data, not
  heuristic strings." The Phase 7 heuristic regexes (e.g.
  `/植|花|tree|plant|flower/`, `/棚|shelf|rack|display/`) are a known smell —
  Phase 9 deletes them.
- Recommended-default flow: user opens catalog → rail shows curated outdoor
  genres → click 一般 → subGenre chips appear (テーブル / チェア / 棚 / …) →
  thumbnail grid filters → typing in search expands to all genres with
  breadcrumbs → clearing search returns to 一般 → テーブル selection.

</specifics>

<deferred>
## Deferred Ideas

- **Tag/label search** (`mysekaiFixtureLabels.json` /
  `mysekaiFixtureTags.json`) — would enrich search but adds two more JSON
  fetches and surface area. User chose name + pronunciation only this phase.
  Re-evaluate post-Phase 9 if users report finding items hard.
- **Romaji / fuzzy search** — pronunciation already lets romaji match because
  the data field is hiragana/katakana indexed; explicit fuzzy matching is a
  v2 enhancement.
- **Genre/subGenre name in search corpus** — could boost discoverability
  (e.g. type "fence" finds 柵 items by category name) but conflicts with
  D-12. Track as a follow-up if needed.
- **Two-tier rail (top-level + subGenre overflow in body header)** —
  considered and rejected in favor of the chip-strip pattern (D-05) because
  the rail rejects rendering rail-internal subGenre buttons in 72 px.
- **Mobile catalog layout** — out of scope for v1.

</deferred>

---

*Phase: 09-catalog-overhaul-genre-driven-categories-with-search*
*Context gathered: 2026-05-08*
