# Phase 9: Catalog overhaul — genre-driven categories with search - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 09-catalog-overhaul-genre-driven-categories-with-search
**Areas discussed:** Category source & structure, Cat-rail UX with many genres, Search scope & matching, Search × filter interaction, SubGenre presentation, Rail icons

---

## Gray-area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Category source & structure | mainGenres vs subGenres vs curated subset | ✓ |
| Cat-rail UX with many genres | Scroll vs two-tier vs flatten | ✓ |
| Search scope & matching | Name/pronunciation/genre/labels | ✓ |
| Search + filter interaction | Scoped vs broaden vs intersect | ✓ |

**User's choice:** All four areas selected.

---

## Category source & structure

| Option | Description | Selected |
|--------|-------------|----------|
| Curated outdoor mainGenres + subGenre drill-down | Filter raw mainGenres to outdoor-relevant; subGenre chips inside body | ✓ |
| Raw mainGenres flat — no curation | Use all ~30 mainGenres including unit logos and tools | |
| Hybrid: curated mainGenres + free-text genre filter | Rail shows ~8 macro buttons + genre dropdowns | |
| Keep Phase 7 8-category rail; only fix heuristics | Don't restructure | |

**User's choice:** Curated outdoor mainGenres + subGenre drill-down (Recommended)
**Notes:** Phase 7 heuristic regex matching for shelf/plant/block/display is an explicit smell to remove. Curated outdoor list derived empirically — not hand-maintained.

---

## Cat-rail UX with many genres

| Option | Description | Selected |
|--------|-------------|----------|
| Vertical scroll inside the rail | Keep 72px width; genres scroll | ✓ |
| Two-tier: top-level rail + subGenres in body header | ~6 macro categories on rail, subGenres above grid | |
| Flatten — drop the rail | Single scrollable genre tree in body | |

**User's choice:** Vertical scroll inside the rail (Recommended)
**Notes:** Keeps Phase 7 chrome shell intact; ~16-20 curated items doesn't need virtualization.

---

## Search scope & matching

| Option | Description | Selected |
|--------|-------------|----------|
| Name (Japanese) — current | Substring match on fixture.name | ✓ |
| Pronunciation (kana/romaji-friendly) — current | Substring on fixture.pronunciation | ✓ |
| Genre + subGenre name | Searching '柵' or 'fence' surfaces items by category | |
| Labels/tags from labels/tags JSON | Richer corpus, two extra JSON fetches | |

**User's choice:** Name + pronunciation only (status quo).
**Notes:** Explicit scope cap — adding genre name to corpus or pulling labels/tags is rejected this phase. Captured as deferred ideas.

---

## Search × filter interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Search broadens to All; show genre breadcrumb on each result | Search wins; clear restores prior category | ✓ |
| Search stays scoped to active genre | Search filters within current category only | |
| Search + category intersect | Both apply; fall-back link if 0 results | |

**User's choice:** Search broadens to All; breadcrumb on results (Recommended)
**Notes:** Store must remember pre-search selection so clearing search restores it.

---

## SubGenre presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal chip strip at top of body | Reuses Phase 1 CategoryFilter pattern | ✓ |
| Second-level expansion inside the 72px rail | SubGenre buttons indented in rail | |
| Dropdown in body header | Compact <select> | |
| No subGenre UI — only mainGenre | Skip subGenres entirely | |

**User's choice:** Horizontal chip strip at top of body (Recommended)
**Notes:** "全部" chip resets to mainGenre-wide; only show subGenres with ≥1 fixture in active mainGenre.

---

## Rail icons

| Option | Description | Selected |
|--------|-------------|----------|
| Game-data assetbundleName icons via CDN | Authentic, matches in-game | ✓ |
| Lucide icon mapping per genre | Continues Phase 7 visual style; manual mapping | |
| Text-only — no icons | Genre name only | |

**User's choice:** Game-data assetbundleName icons via CDN (Recommended)
**Notes:** Exact CDN path for genre icons is research's responsibility. Lucide fallback required on 404 — never empty buttons.

---

## Claude's Discretion

- Exact curated list of outdoor mainGenre IDs (derived empirically)
- Whether breadcrumb shows mainGenre only or mainGenre + subGenre
- Native scroll vs custom virtual list (native is fine at this size)
- Animation timing for chip strip slide-in
- Test boundary (pure functions + one RTL smoke test)

## Deferred Ideas

- Tag/label-based search (mysekaiFixtureLabels.json / mysekaiFixtureTags.json)
- Romaji / fuzzy search
- Genre / subGenre name in search corpus
- Two-tier rail with subGenre overflow in body header
- Mobile catalog layout
