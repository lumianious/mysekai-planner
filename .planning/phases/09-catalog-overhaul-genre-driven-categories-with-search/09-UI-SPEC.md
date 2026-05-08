---
phase: 9
slug: catalog-overhaul-genre-driven-categories-with-search
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-08
inherits_from: .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md
---

# Phase 9 — UI Design Contract

> Visual and interaction contract for the catalog overhaul. Phase 9 lives entirely inside the chrome shell that Phase 7 established — it inherits Phase 7's tokens (palette, fonts, radii, shadows, spacing scale, animation timings) verbatim and changes only the catalog rail's content source (8 hardcoded → 14 game-data-driven), introduces a subGenre chip strip in the catalog body, and broadens search behavior. No new tokens, no new fonts, no new layout regions. Pre-populated almost entirely from CONTEXT.md (D-01..D-17) and RESEARCH.md (CATL-05..CATL-11). The user was not re-asked any question already answered upstream.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (shadcn NOT initialized — inherits Phase 7 decision) |
| Preset | not applicable |
| Component library | Radix UI primitives (`@radix-ui/react-tooltip`, `@radix-ui/react-dropdown-menu` — already in repo) |
| Styling engine | Tailwind CSS 4 with `@theme` block in `src/index.css` (Phase 7 light-cream + sky-blue palette) |
| Icon library | Lucide React (already in deps) |
| Font (UI) | `'Nunito', 'M PLUS Rounded 1c', system-ui, sans-serif` (700 axis self-hosted via `@fontsource/nunito`) |
| Font (display / numerics / Japanese headers) | `'M PLUS Rounded 1c'` (800 axis self-hosted via `@fontsource/m-plus-rounded-1c`) |

No design-system changes from Phase 7. No new dependencies. No CDN fonts. Phase 9 reuses every Phase 7 token byte-for-byte.

---

## Spacing Scale

Inherited from Phase 7 — strict 4-multiple set `{4, 8, 16, 24, 32, 48, 64}`. No new tokens introduced by this phase.

| Token | Value | Phase 9 usage |
|-------|-------|---------------|
| xs | 4px | Chip strip horizontal gap, breadcrumb icon-text gap |
| sm | 8px | Catalog header → chip-strip vertical gap, breadcrumb pill internal h-padding, rail button vertical gap |
| md | 16px | Catalog body padding (unchanged from Phase 7), chip-strip horizontal page padding, search input → chip-strip vertical gap |
| lg | 24px | (unused this phase — reserved by Phase 7 contract) |

**Component sizes (ergonomic exceptions, recorded explicitly — these are component dimensions, not spacing tokens):**
- Cat-rail button: `60×52` (Phase 7 inherited; non-square, NOT a spacing token).
- SubGenre chip: `≈28px` tall, `padding 4px 10px` — same visual as Phase 7's existing CategoryFilter.tsx (chip strip in Phase 1 catalog).
- Breadcrumb pill (search-active result tile overlay): `≈18px` tall, `padding 2px 6px`, `radius-badge 6px`.

**Borders:** rail button `border-radius` already 12px (Phase 7 `radius-tile`). Chip uses `radius-chip 10px`. Breadcrumb uses `radius-badge 6px`. All inherited.

---

## Typography

Inherited from Phase 7 — exactly **4 sizes (16 / 13 / 11 / 10)**, exactly **2 weights (700 / 800)**, **2 fonts (Nunito / M PLUS Rounded 1c)**. No new tier introduced.

| Tier | Size | Weight | Line Height | Font | Phase 9 usage |
|------|------|--------|-------------|------|---------------|
| Display | 16px | 800 | 1.2 | M PLUS Rounded 1c | (unchanged — catalog header `家具目録` h3) |
| Body | 13px | 700 | 1.4 | Nunito | SubGenre chip text, search input, tile labels (unchanged from Phase 7) |
| Label | 11px | 800 | 1.3 | M PLUS Rounded 1c | Breadcrumb pill text (`一般 · テーブル`), result count badges |
| Micro | 10px | 800 | 1.1 | M PLUS Rounded 1c | Cat-rail button label (Japanese genre name, e.g. `ぬいぐるみ`) — D-11 explicitly mandates 10px M PLUS Rounded 1c |

No size, weight, font, or line-height is added by Phase 9. The `pronunciation` field is read for search matching only — it is never rendered as visible UI text.

---

## Color (60 / 30 / 10 split)

Inherited from Phase 7 verbatim. Phase 9 introduces **no new color tokens**.

| Role | Token | Phase 9 usage |
|------|-------|---------------|
| Dominant (60%) `#ffffff → #fbf6ea` | `--panel` / `--panel-2` | Catalog body background, chip-strip background, default rail button bg |
| Secondary (30%) `#fff8e7` / cream | `--cream` + tan gradient | Cat-rail tan band (unchanged), inactive chip background `#f1efe5` (Phase 7 hover-cream) |
| Accent (10%) `#69c8ff` / `#2ea8ee` | `--sky` / `--sky-deep` | Active rail button (sky-tint icon background + 4×28 left-edge bar), active subGenre chip (sky-gradient fill `#9bdcff → #69c8ff`, text `#0e3955`), search-active visual hint on cleared/restored category |
| Destructive | `--danger` `#ff7a8a` | Not used this phase. |
| Status / OK | `--green` / `--green-deep` | Not used this phase. |

### Accent reserved-for list (Phase 9 additions, additive to Phase 7's list)

Phase 7 already reserved accent for: active tool, active overwrite, active hotbar slot, selected catalog tile, selected category in cat-rail, cost meter, area-level badge, catalog header strip. Phase 9 inherits all eight unchanged and **adds**:

9. **Active subGenre chip in the chip strip** (sky-gradient fill, ink `#0e3955`) — visually mirrors the active-rail-button treatment to communicate that subGenre is a peer-level filter. The 全部 chip uses the same active treatment when no subGenre is selected.

**Accent is NEVER used for** (Phase 7 contract preserved): inactive subGenre chips (use `#f1efe5` cream-hover), inactive rail buttons, breadcrumb pills (cream surface + `--ink-2` text), the hover state of any chip or rail button, or any hover state at all.

### Text colors (inherited)

- `--ink` `#1f3556` — primary text (rail labels, chip labels)
- `--ink-2` `#4f6a8e` — breadcrumb text (mainGenre name in result tile)
- `--muted` `#8aa0bd` — breadcrumb separator dot, subGenre name in breadcrumb (when shown)
- `#0e3955` — text inside any active sky-gradient surface

---

## Layout — Catalog Region (Phase 9 additions only)

Phase 9 does NOT add new chrome regions. The catalog occupies the same Phase 7 slot (`top: 76px; left: 16px; height 740px; width 320 (default) ↔ 72 (collapsed)`). Internals change as follows:

### 1. Cat-rail (`CatalogRail.tsx` — 72px, always visible)

**Source change:** content list goes from 8 hardcoded `Phase7Category` entries to a derived list of `[ALL_ENTRY, ...curatedOutdoorMainGenres]`.

| Position | Item | Notes |
|----------|------|-------|
| Pinned top | Hamburger / grip controls | unchanged from Phase 7 |
| Row 1 | `全部` (`Grid3x3` lucide icon) — always pinned | sentinel `'all'`; matches Phase 7 muscle memory |
| Rows 2..N | 14 outdoor mainGenres in source order | derived empirically from `mysekaiFixtureMainGenres.json` ∩ `filterOutdoorFixtures()`; auto-prunes Leo/need/MJ/event/tool genres |
| Overflow | Native `overflow-y: auto` | ~52px per button × 15 = ~780px max; viewport-locked rail height (~740px) means at most one button crops; native scroll is sufficient (D-09, RESEARCH §"Don't Hand-Roll" pattern, RESEARCH anti-pattern §"Building a virtual scroller for 14 rail items") |

**Active rail button visual (Phase 7 inherited, unchanged):** `4×28px` sky-gradient left-edge bar via `::before`, sky-tint icon background, `#0e3955` ink, otherwise default cream/white surface.

**Genre icon source (D-10 resolution):** RESEARCH.md empirically probed 30+ candidate `storage.sekai.best/sekai-jp-assets/` paths for genre icons — **all returned 404**. Sekai-Viewer itself does not render genre icons. Phase 9 ships with **lucide-react as the PRIMARY rendering path**. The CDN attempt is skipped entirely (no `<img>` element, no `onerror` handler) until a confirmed CDN path exists. This honors D-10's "fallback to lucide — never an empty button" guarantee while avoiding 14 simultaneous 404s on every rail mount (RESEARCH pitfall §4).

| `assetbundleName` | Lucide icon | Genre name (Japanese label, 10px M PLUS Rounded 1c, weight 800) |
|-------------------|-------------|------------------------------------------------------------------|
| `icon_all` (synthetic) | `Grid3x3` | 全部 |
| `icon_stuffed_toy` | `Cat` | ぬいぐるみ |
| `icon_normal_furniture` | `Sofa` | 一般 |
| `icon_small_furniture` | `Lamp` | 小物 |
| `icon_block` | `Box` | ブロック |
| `icon_plant` | `TreePine` | 植物 |
| `icon_wall_furniture` | `Frame` | 壁掛け |
| `icon_road_color` | `Grid2x2` | カラータイル |
| `icon_rug` | `Square` | ラグ |
| `icon_custom_furniture` | `Image` | ディスプレイ |
| `icon_fence` | `Fence` | 柵 |
| `icon_road` | `Route` | 道 |
| `icon_canvas` | `Palette` | キャンバス |
| `icon_outside` | `Trees` | 大型 |
| `icon_others` | `MoreHorizontal` | その他 |

Unknown bundle (forward-compat — sekai-master-db-diff later adds a new outdoor genre) falls back to `MoreHorizontal`. The mapping lives in a new file `src/components/chrome/genreIcons.ts` (RESEARCH Code Example 3) so a new genre is one row of code, not a component edit.

### 2. Catalog body (`CatalogSidebar.tsx` — 248px when expanded)

Body vertical stack, top → bottom:

| Slot | Element | Spacing below | Conditional? |
|------|---------|---------------|--------------|
| 1 | Header strip (`家具目録` h3 + count chip `133 件`) | sm 8px | always |
| 2 | Search input (`家具を検索…`, radius-search 18px) | md 16px | always |
| 3 | **SubGenre chip strip** (NEW Phase 9 — D-05) | sm 8px | only when `!isSearching && visibleSubGenres.length >= 2` |
| 4 | Thumbnail grid (3-col tiles, radius-tile 12px) | — | always |
| 5 | Empty state (`該当する家具はありません`) | — | when filtered set is empty |

The chip strip uses Phase 1 `CategoryFilter.tsx`'s exact visual contract — Phase 9 either reuses that component parameterized by subGenre or factors it into a generic `<ChipStrip>` (planner's discretion per RESEARCH §"Don't Hand-Roll"). Either way, the visual treatment must match: horizontal scroll, `overflow-x: auto` with hidden scrollbar (`scrollbarWidth: 'none'`), `gap 4px` (xs), `py 8px / px 4px`, chip body `padding 4px 10px`, `radius-chip 10px`, Body 13px / weight 700 (Nunito), active chip = sky-gradient fill + `#0e3955` ink, inactive = cream `#f1efe5` + `--ink-2` text. The first chip is always `全部` and resets `activeSubGenreId` to `null`.

### 3. Search-active result tile breadcrumb (NEW Phase 9 — D-14)

When `searchQuery.length > 0`, each thumbnail tile in the grid renders a small breadcrumb pill overlaid on the tile's bottom-left corner (or below the label — planner's discretion based on tile internal layout):

- **Content:** mainGenre name only — e.g. `一般` (decision: Claude's discretion — show mainGenre name only, NOT mainGenre + subGenre, to keep the pill at one line of 11px text and avoid cluttering 3-col tiles. RESEARCH Open Question §3 recorded this. SubGenre information is intentionally elided in the breadcrumb; users who want to drill into a subGenre clear the search.)
- **Visual:** `radius-badge 6px`, `padding 2px 6px`, surface `--cream` `#fff8e7`, text `--ink-2` `#4f6a8e` at 11px M PLUS Rounded 1c weight 800 (Label tier), `box-shadow --shadow-sm` for legibility against the tile gradient.
- **No pill at all** when `searchQuery === ''` — the genre is implied by the active rail button.
- **Unknown mainGenre** (fixture's `mysekaiFixtureMainGenreId` matches a genre that was filtered out — should not happen given the curated derivation, but defensive): omit the pill rather than render a "?" label.

---

## Component Inventory

### New components (Phase 9)

| Component | Location | Reads from store | Writes to store |
|-----------|----------|------------------|-----------------|
| `genreIcons.ts` (helper module, not a component) | `src/components/chrome/genreIcons.ts` | — | — |
| `(optional) ChipStrip.tsx` (if planner factors `CategoryFilter.tsx`) | `src/components/catalog/ChipStrip.tsx` | — | — |

### Existing components touched

| Component | Phase 9 change |
|-----------|----------------|
| `CatalogRail.tsx` | Replace `CATEGORIES` constant + `visibleCategories` memo with derived `[ALL_ENTRY, ...curatedOutdoorMainGenres]` from `mainGenres` prop ∩ outdoor fixture mainGenreIds. Replace 8 hardcoded lucide icons with `getGenreIcon(assetbundleName)` lookup. Active state visual unchanged. Vertical scroll added (`overflow-y: auto`). Hamburger / grip pinned at top — unchanged. |
| `CatalogSidebar.tsx` | Wire `searchFixtures()` and `filterByGenre()` from `src/data/fixtures.ts` (currently dead code; Phase 9 makes them live). Add subGenre chip strip render conditional on `!isSearching && visibleSubGenres.length >= 2`. Add breadcrumb pill render in tile when `isSearching`. Read `mainGenres` and `subGenres` from props (planner threads them via `EditorLayout`). Empty state markup unchanged — already matches D-17 (`該当する家具はありません`). |
| `CategoryFilter.tsx` | Either parameterize the type from `FixtureMainGenre[]` to a generic `{id; name}[]` so the same component renders subGenres, OR keep this file unchanged and add a `SubGenreChipStrip.tsx` sibling. Planner's choice. Visual contract is identical either way. |
| `src/data/fixtures.ts` | **Delete** `Phase7Category` type union + `filterByPhase7Category` function (D-03 — heuristic regexes are removed wholesale). Keep `searchFixtures` and `filterByGenre` unchanged — they already match Phase 9 needs. |
| `src/data/genres.ts` | Drop the broken `data.sort((a, b) => a.seq - b.seq)` (the `seq` field does not exist on the live JSON — RESEARCH anti-pattern). Add new exported helper `deriveOutdoorMainGenres(fixtures, allGenres)` (RESEARCH Pattern 4). |
| `src/stores/editorStore.ts` | Bump persist `version: 3` → `version: 4`. Extend `migrate` hook with v3→v4 case that coerces `activeCategory` (any old string) to `'all'` (RESEARCH Code Example 4). Add new field `activeSubGenreId: number | null = null` to state — **excluded** from persist `partialize` AND from `temporal.partialize` (D-08 enforcement: in-memory only). Add new field `searchActiveBeforeQuery: { mainId: number \| 'all'; subId: number \| null } \| null = null` — same exclusion (transient). Add `setActiveSubGenreId(id)` action. Modify `setActiveCategory(id)` action to also reset `activeSubGenreId = null` (RESEARCH pitfall §2: prevents stale subGenre pointing at a chip that no longer exists in the new mainGenre). Re-type `activeCategory: number \| 'all'`. |
| `src/components/chrome/CLAUDE.md` (L2 doc) | Update INPUT/OUTPUT/POS for `CatalogRail.tsx` to reflect new prop reads (`mainGenres` is now consumed, not unused). No new chrome file added → no new L2 entry needed. |

---

## Interaction Contract

### Catalog rail click (`CatalogRail.tsx`)

| Trigger | Effect |
|---------|--------|
| Click `全部` button | `setActiveCategory('all')`; `setActiveSubGenreId(null)`; if catalog is collapsed, also un-collapse (Phase 7 inherited behavior). SubGenre chip strip becomes hidden (D-07). |
| Click any genre button | `setActiveCategory(genre.id)`; `setActiveSubGenreId(null)` (RESEARCH pitfall §2); un-collapse if collapsed. SubGenre chip strip renders only if the new mainGenre has ≥2 subGenres with outdoor fixtures. |
| Genre with zero outdoor fixtures | NEVER appears in the rail (D-02, D-16 — auto-pruned by `deriveOutdoorMainGenres`). |

### SubGenre chip strip click (catalog body)

| Trigger | Effect |
|---------|--------|
| Click `全部` chip | `setActiveSubGenreId(null)`. Filter widens to mainGenre-only. |
| Click subGenre chip | `setActiveSubGenreId(subGenre.id)`. Filter narrows. |
| Strip rendered when | `activeCategory !== 'all' && !isSearching && visibleSubGenres.length >= 2` (D-05, D-06, D-07 + Claude's discretion based on RESEARCH SubGenre Distribution table — single-chip strips add no value and waste vertical space) |
| Strip hidden when | `activeCategory === 'all'` OR `isSearching === true` OR fewer than 2 derivable subGenres |

### Search input (`CatalogSidebar.tsx`)

| Trigger | Effect |
|---------|--------|
| Type any character (`searchQuery.length > 0`) | Filter pipeline switches to `searchFixtures(outdoorFixtures, query)` — **active mainGenre and subGenre are bypassed** (D-13, the search input wins). The chip strip hides. Each result tile gets a breadcrumb pill (D-14). |
| Empty → non-empty transition | Snapshot `{ mainId: activeCategory, subId: activeSubGenreId }` into `searchActiveBeforeQuery` (D-15). |
| Click rail button while searching | `setActiveCategory` still updates the store (so the user can pre-stage a category for after-clear), but the visible result list does NOT narrow — the search input wins (D-13). |
| Non-empty → empty transition (X button or backspace to empty) | Restore `activeCategory` and `activeSubGenreId` from `searchActiveBeforeQuery`, then clear the snapshot. The chip strip re-appears if the restored mainGenre warrants it. |
| No results (filtered set is empty) | Render existing empty-state markup `該当する家具はありません` + body `検索語またはカテゴリを変更してみてください` (D-17, Phase 7 contract preserved). The query string itself is NOT echoed in the heading — Phase 7's existing copy already references "検索語" generically; no new copy added. |

### Persisted state migration (CATL-08)

| Trigger | Effect |
|---------|--------|
| User loads page with v3 localStorage | persist middleware sees `version: 3` < new `version: 4`, calls `migrate`. v3→v4 case sets `activeCategory: 'all'`. All other v3 fields preserved (placedItems, placedEdges, areaLevel, gridSize, inventory, isEditorReady, catalogCollapsed, catalogTop, costPanelOpen, floatbarX). User sees the rail's 全部 button highlighted on first Phase 9 load — they re-pick a genre after one click. Lossless, never crashes (D-04). |
| Edge case: v3 had `activeCategory: 'all'` already | After migrate, still `'all'`. Visually indistinguishable from any other v3 string — same coercion path. |
| Fresh install (no localStorage) | persist middleware initializes at `version: 4` with default state — no migrate runs. |

### Animation timings (inherited from Phase 7 — Phase 9 adds none)

| Element | Transition |
|---------|------------|
| SubGenre chip-strip slide-in / out | `opacity .18s ease, transform .18s ease` (matches Phase 7 cat-main fade — uses Phase 7's existing transition tokens; Claude's discretion per RESEARCH §"Animation timing for the subGenre chip strip slide-in") |
| Chip hover | `transform .12s ease, background .12s ease` (Phase 7 pill/button hover token, inherited) |
| Active chip color change | instant (no transition — matches Phase 1 `CategoryFilter.tsx` current behavior) |

---

## Copywriting Contract

Phase 9 introduces only **two new strings** beyond Phase 7. Every other label is inherited verbatim.

| Element | Copy |
|---------|------|
| Cat-rail button labels | (14 Japanese genre names from `mysekaiFixtureMainGenres.json` `name` field — see Layout table above; D-11) |
| Cat-rail `全部` button label | `全部` (synthetic ALL_ENTRY — matches Phase 7 muscle memory) |
| **SubGenre chip strip — `全部` chip** | `全部` (D-05 — explicit) |
| SubGenre chip labels | (Japanese subGenre names from `mysekaiFixtureSubGenres.json` `name` field — derived empirically per active mainGenre, D-06) |
| **Result tile breadcrumb (NEW Phase 9, search-active only)** | mainGenre `name` field, e.g. `一般` / `ぬいぐるみ` / `植物` (D-14, Claude's discretion for mainGenre-only — RESEARCH Open Question §3) |
| Catalog header h3 | `家具目録` (Phase 7 inherited, unchanged) |
| Catalog count chip | `{N} 件` (Phase 7 inherited; `{N}` reflects the post-filter count) |
| Search placeholder | `家具を検索…` (Phase 7 inherited) |
| Empty state heading | `該当する家具はありません` (Phase 7 inherited; D-17) |
| Empty state body | `検索語またはカテゴリを変更してみてください` (Phase 7 inherited) |

### Icon-only button aria-labels (Phase 9 additions)

Each rail button MUST declare an `aria-label`. The pattern matches Phase 7's icon-only-button rule.

| Button | `aria-label` |
|--------|------|
| Rail `全部` button | `全てのカテゴリ` |
| Rail genre button | (genre `name` field — e.g. `ぬいぐるみ` — repeated as the aria-label for screen readers, since the visible 10px label may be too small to read) |
| SubGenre chip `全部` | `この分類の全て` |
| SubGenre chip | (subGenre `name` field) |
| Result-tile breadcrumb pill | not interactive — no aria-label needed (it's a span, not a button) |

### Destructive actions in this phase

**None.** Phase 9 is a refactor + UX improvement. No destructive operations are added. Switching categories does not destroy state; clearing search restores prior selection (D-15). No confirmation dialogs are introduced.

### Error states

- **mainGenres / subGenres fetch failure:** `fetchMainGenres()` / `fetchSubGenres()` already throw — `EditorLayout`'s existing error path (red text in 320×viewport rail, Phase 7 contract) catches them. Phase 9 does NOT add a new error UI.
- **Empty derived genre list (no outdoor fixtures resolve to any mainGenre — should not happen given the data, but defensive):** rail still renders the `全部` ALL_ENTRY pinned at top; user sees only that single button. No banner or toast.
- **localStorage persist v3→v4 migration:** lossless by construction (everything coerces to `'all'`). If a future hand-edited payload contains a malformed `activeCategory`, the migrate `'all'` coercion still applies — no error path needed.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| (none — shadcn not initialized; Phase 7 decision inherited) | n/a | not applicable |

No third-party shadcn registry blocks are declared. No new npm dependencies. No new CDN assets (genre icon CDN attempt is explicitly skipped in favor of bundled lucide-react — see Layout §"Genre icon source"). Registry vetting gate is therefore not run.

---

## Open Decisions Resolved

Phase 9 had four discretionary items (CONTEXT.md §"Claude's Discretion") and one unanswerable upstream question (D-10's CDN path). All resolved in this contract:

| # | Question | Resolution | Source |
|---|---------|------------|--------|
| 1 | Curated outdoor mainGenre id list | Empirically derived at runtime via `deriveOutdoorMainGenres(outdoorFixtures, allGenres)`. 14 genres on current data — listed in Layout §1 above. No hand-maintained allow-list. | RESEARCH §"Curated Outdoor MainGenres" |
| 2 | Breadcrumb scope (mainGenre only vs mainGenre + subGenre) | **MainGenre name only.** Keeps the pill at one line of 11px Label-tier text and avoids cluttering 3-col tiles. Users who want subGenre detail clear the search. | RESEARCH Open Question §3 |
| 3 | Rail vertical scroll: native overflow vs virtual list | **Native `overflow-y: auto`.** ~52px × 15 ≈ 780px max; viewport-locked rail is ~740px tall — at most one button crops. No virtualization library. | RESEARCH anti-pattern §"Building a virtual scroller for 14 rail items" |
| 4 | SubGenre chip-strip slide-in animation timing | `opacity .18s ease, transform .18s ease` — reuses Phase 7's existing cat-main fade token. No new transition declared. | Phase 7 inherited; Phase 9 §Interaction Contract Animation table |
| 5 | Genre icon CDN path (D-10 unconfirmed) | **Lucide-react is the PRIMARY rendering path.** No `<img>` element is rendered. The CDN attempt is skipped entirely until a confirmed path exists. Honors D-10's "fallback to lucide — never an empty button" guarantee while avoiding 14 simultaneous 404s. | RESEARCH Open Question §1 + Pitfall §4 |
| 6 | Show single-chip subGenre strip? | **Hide when `visibleSubGenres.length < 2`.** Single-chip strips waste vertical space (e.g. ぬいぐるみ has only 1 subgenre with outdoor fixtures, ブロック has 0). | Claude's discretion based on RESEARCH SubGenre Distribution table |
| 7 | `searchActiveBeforeQuery` snapshot location: store vs local component state | **Store.** D-15 explicitly says "the store must remember the pre-search selection." Excluded from persist `partialize` and from `temporal.partialize` (transient runtime field). | D-15 + RESEARCH Open Question §4 |

---

## Inheritance Summary

What Phase 9 inherits from Phase 7 byte-for-byte (no changes):

- Color palette (60/30/10 split, all hex tokens, all gradient stops)
- Typography (4 sizes, 2 weights, 2 fonts, line heights)
- Spacing scale (4-multiples + radii table)
- Shadow tokens (--shadow-lg / -md / -sm)
- Layout regions (chrome slot positions, sizes, transitions)
- Top rail, floatbar, hotbar, zoom dock, cost panel popover (untouched this phase)
- All animation timings except the new chip-strip fade (which reuses Phase 7's cat-main fade token — no new value)
- All copywriting except the two strings explicitly listed above
- Lucide as the icon family (additive — Phase 9 maps 14 new genre→icon entries; the Phase 7 8-icon mapping is deleted)
- Radix UI primitives (no new primitive consumed this phase)
- Self-hosted fonts via `@fontsource` (no new font axis loaded)

What Phase 9 deletes (D-03):

- `Phase7Category` string union from `src/types` / `src/data/fixtures.ts`
- `filterByPhase7Category` function from `src/data/fixtures.ts` (heuristic regexes for `shelf` / `plant` / `block` / `display` removed wholesale)
- Hardcoded `CATEGORIES` constant in `CatalogRail.tsx` (8 entries)
- Phase 7 lucide mapping for the 8 hardcoded categories (replaced by 14-entry `genreIcons.ts` keyed on `assetbundleName`)
- Broken `data.sort((a,b) => a.seq - b.seq)` in `genres.ts` (silent NaN no-op — RESEARCH anti-pattern)

What Phase 9 adds:

- `genreIcons.ts` (15-entry `assetbundleName → lucide icon` mapping + `getGenreIcon` helper)
- `deriveOutdoorMainGenres(fixtures, allGenres)` exported helper in `src/data/genres.ts`
- Two store fields (`activeSubGenreId`, `searchActiveBeforeQuery`) — both transient, both excluded from persist + temporal partialize
- One persist version bump (3 → 4) + migrate case
- One conditional UI region (subGenre chip strip in catalog body)
- One conditional UI element (breadcrumb pill on each search-result tile)

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
