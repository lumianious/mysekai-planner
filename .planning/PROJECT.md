# MySekai Planner

## What This Is

A top-down 2D grid editor for Project Sekai's MySekai outdoor area — similar to Happy Island Designer for Animal Crossing. Players place furniture, roads, fences, and decorations on an accurate in-game grid to plan their sekai layout. Includes material cost calculation, inventory tracking, and URL-based blueprint sharing. Built for personal use first, shareable with the broader Project Sekai community. Hosted on GitHub Pages.

## Core Value

Users can visually plan their MySekai outdoor layout and know exactly what materials they need to build it.

## Requirements

### Validated

- [x] Top-down 2D grid editor matching in-game MySekai outdoor area dimensions (Phase 1)
- [x] Place, move, rotate, and remove furniture/decorations on the grid (Phase 1)
- [x] Furniture catalog with search/filter sourced from sekai.best data (Phase 1)
- [x] CDN isometric thumbnails from storage.sekai.best for catalog browsing (Phase 1)
- [x] Road and fence placement tools (Phase 2)

### Active

- [ ] Top-down 2D sprite rendering for placed items via offline pipeline (sssekai + Blender headless)
- [ ] Material cost calculator — shows total crafting costs for current blueprint
- [ ] Inventory input — users enter owned materials/furniture, see remaining costs
- [ ] Inventory persistence via localStorage
- [ ] Blueprint sharing via URL hash encoding (paste link to share/import designs)
- [ ] Bilingual UI (Chinese + Japanese), item names in Japanese

### Out of Scope

- MySekai indoor areas — outdoor only for this project
- In-game area editors (Wonderland, Street, etc.) — those are separate game features
- User accounts / backend — static GitHub Pages hosting only
- Real-time collaboration — single-user editor with async sharing
- Mobile-native app — web-first, responsive if feasible

## Context

- **Sister project:** `pjsk` — a ProSeka merchandise database that already fetches data from `Sekai-World/sekai-master-db-diff` (GitHub) and uses `storage.sekai.best` CDN for card art. The data pipeline and API patterns are well understood.
- **Data source:** Furniture information (crafting costs, dimensions, categories) is expected to be in sekai.best / sekai-master-db-diff. Needs validation during research.
- **Sprite pipeline — RESOLVED:** No pre-rendered top-down sprites exist. CDN has isometric thumbnails (152x152 WebP) at `storage.sekai.best/sekai-jp-assets/mysekai/thumbnail/fixture/{assetbundleName}_1.webp` — useful for catalog browsing but wrong perspective for grid view. Solution: offline pipeline using sssekai (game asset extraction) + Blender headless scripting (orthographic top-down renders). Community precedent exists for extracting MySEKAI 3D models. sssekai is archived at v0.8.0 but mature. Colored rectangles serve as development placeholders until sprites are generated.
- **Reference project:** [Happy Island Designer](https://eugeneration.github.io/HappyIslandDesigner/) — open-source Animal Crossing island planner. Similar concept adapted for Project Sekai's MySekai feature.

## Constraints

- **Hosting:** GitHub Pages (static files only) — no server-side logic, no database
- **Data pipeline:** Fixture metadata from Sekai-World GitHub data; sprites generated via sssekai + Blender offline pipeline
- **Grid accuracy:** Must match actual in-game MySekai outdoor area grid dimensions and tile sizes
- **Language:** UI in Chinese + Japanese; game item names in Japanese only (matching in-game data)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static site on GitHub Pages | No backend needed; sister project pjsk uses same hosting model | — Pending |
| localStorage for inventory | Only viable persistence for static hosting; no accounts to manage | — Pending |
| URL hash for blueprint sharing | Proven pattern (Happy Island Designer); no server needed | — Pending |
| sekai.best as primary data source | Already validated in pjsk project; richest ProSeka data available | — Pending |
| sssekai + Blender for sprite generation | No top-down sprites exist on CDN; 3D models must be rendered offline | — Pending |
| CDN thumbnails for catalog only | Isometric perspective doesn't work on top-down grid; use for browsing | — Pending |
| Outdoor area only | Indoor areas are separate feature with different constraints; focus scope | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-10 after Phase 2 completion*
