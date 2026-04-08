# Project Research Summary

**Project:** MySekai Planner
**Domain:** Browser-based 2D grid/tile editor (game furniture layout planner)
**Researched:** 2026-04-09
**Confidence:** HIGH

## Executive Summary

MySekai Planner is a client-only, static-hosted web tool for planning outdoor furniture layouts in Project Sekai's MySekai feature. This is a greenfield product — no existing MySekai planner exists — making it a clear opportunity. The right mental model is a schematic/blueprint editor, not a visual reproduction of the game. Successful planners in adjacent games (Animal Crossing, Stardew Valley) all converge on the same principles: accurate grid dimensions are non-negotiable, URL sharing is the killer social feature, and colored-rectangle representations work fine for planning purposes.

The recommended approach is React + Vite + Konva (react-konva) for declarative canvas rendering, Zustand with zundo middleware for state and undo/redo, and lz-string for URL compression. All game data is available as static JSON from the community-maintained sekai-master-db-diff GitHub repository. The app deploys as a static site on GitHub Pages with no backend required. This stack is well-validated by prior art and requires no speculative technology choices.

The dominant risk is the assumption that 2D top-down sprites exist for furniture — they almost certainly do not. The game renders in 3D and the data only contains Unity 3D model bundle references, not sprite images. This must be treated as a confirmed constraint in Phase 1: colored rectangles keyed by category are the primary rendering strategy, not a fallback. Secondary risks include URL length limits for shared blueprints (design compact binary encoding from the start), and potential upstream data schema changes in sekai-master-db-diff (require a data abstraction layer between raw API and application logic).

## Key Findings

### Recommended Stack

The stack is entirely client-side with no backend. React 19 + TypeScript + Vite 8 forms the foundation. Canvas rendering uses react-konva (Konva.js v10), which provides declarative scene graph, built-in drag-and-drop with snap-to-grid, hit detection, and a layered canvas system. State management uses Zustand v5 with zundo middleware — the unified store pattern suits an editor where furniture placement simultaneously affects grid state, cost calculations, and undo history.

Game data comes entirely from sekai-master-db-diff as static JSON. Critical data (fixtures, materials, site layouts) should be bundled at build time for offline capability. lz-string handles URL compression for blueprint sharing.

**Core technologies:**
- React 19 + TypeScript: UI framework with type safety for grid coordinates and data schemas
- Vite 8: Build tool with Rolldown engine; trivial GitHub Pages deployment
- Konva + react-konva: Declarative 2D canvas with built-in drag/snap/hit detection
- Zustand v5 + zundo: Central editor state with snapshot-based undo/redo via middleware
- lz-string v1.5: URL-safe blueprint compression, proven pattern from Happy Island Designer
- i18next + react-i18next: Bilingual UI (Chinese + Japanese), lazy-loaded language bundles
- Tailwind CSS v4: Utility-first styling, zero runtime, fast prototyping

### Expected Features

**Must have (table stakes):**
- Accurate grid matching in-game dimensions (outdoor levels 1-5: 36x36 up to 100x100)
- Place, move, remove furniture on grid with snap-to-grid
- Furniture catalog with search and category filter (800+ fixtures)
- Pan and zoom canvas viewport
- Undo/redo (minimum 20 steps)
- Road and fence placement tools (distinct modes matching in-game behavior)
- Material cost calculator (fixture -> blueprint -> materials join)
- Save/load via localStorage
- Visual distinction between items (colored rectangles by sub-genre category)

**Should have (differentiators):**
- Blueprint sharing via URL hash (lz-string encoded, compact binary format)
- Inventory tracking with remaining cost calculation
- Export design as image (canvas.toBlob())
- Keyboard shortcuts (Ctrl+Z, Delete, spacebar pan)
- Multiple grid size support (level selector for outdoor areas 1-5)

**Defer (v2+):**
- Chinese translations for item names (data source needed)
- Color variant selection
- Multi-select and bulk operations
- Design templates and presets
- Indoor room planning

### Architecture Approach

The architecture cleanly separates React DOM UI (toolbar, catalog panel, cost panel) from the Konva canvas viewport, communicating exclusively through the Zustand store. The canvas uses four layers: Grid Layer (static background, cached offscreen), Objects Layer (placed furniture), Preview Layer (ghost item on hover), and Selection Layer (highlights and handles). This layer separation is essential for rendering performance and must be established in Phase 1.

**Major components:**
1. Konva Stage (Canvas Viewport) — pan/zoom, coordinate transforms, hosts four canvas layers
2. Zustand Store + zundo — placed items, active tool, selection, undo history; single source of truth
3. Data Service — fetches and caches fixtures/materials/recipes with schema validation
4. Serializer — encodes blueprint to URL hash (lz-string), reads/writes localStorage with corruption recovery
5. Furniture Catalog Panel — virtualized list, search/filter, sets active placement item
6. Cost Panel — derives material requirements, subtracts inventory, shows remaining costs

### Critical Pitfalls

1. **No 2D sprites exist** — All fixture assets are Unity 3D model bundles. Colored rectangles with labels IS the primary rendering strategy; design the rendering layer as an abstraction from day one.
2. **URL encoding too verbose** — Naive JSON of 100+ items exceeds platform sharing limits. Design compact binary encoding (fixture ID: 2 bytes + x/y: 1 byte each + rotation: 2 bits) with a version byte prefix in Phase 1 data model.
3. **External data dependency fragility** — sekai-master-db-diff can change structure on game updates. Build a data transformation/validation layer; never use raw API field names in rendering logic; pin a local fallback snapshot.
4. **Canvas performance with naive redraw** — Full redraw on every mouse move is unusable at scale. Layered canvas architecture must be designed in Phase 1; retrofitting layers is a near-rewrite.
5. **localStorage corruption** — Wrap all setItem calls in try/catch; use atomic writes; validate schema with version number on load.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Core Editing
**Rationale:** All rendering, grid, and state architecture decisions cascade into all later work. Canvas layer system, coordinate model, and rendering abstraction (no sprites) must be right before anything else is built.
**Delivers:** Working grid editor — place/move/remove furniture, undo/redo, catalog browsing, accurate grid dimensions
**Addresses:** All table-stakes placement features, grid accuracy, visual representation (colored rectangles)
**Avoids:** Canvas performance death by redraw (layered canvas from start), coordinate system mismatch, sprite assumption

### Phase 2: Persistence, Sharing, and Road/Fence Tools
**Rationale:** Data model must stabilize before URL encoding is designed (format must be versioned from day one). localStorage and URL sharing share the same serialization layer — build them together. Road/fence tools use same grid but need distinct interaction modes.
**Delivers:** Save/load, shareable URLs, road painting tool, fence line tool
**Uses:** lz-string, Zustand persist middleware, compact binary encoding with version prefix
**Implements:** Serializer component, URL hash encoding

### Phase 3: Cost Calculator and Inventory
**Rationale:** Depends on placement working correctly and recipe data pipeline being solid. This is the core value differentiator per the project brief.
**Delivers:** Total material cost for current layout, inventory input, remaining cost calculation
**Uses:** mysekaiBlueprints + mysekaiBlueprintMysekaiMaterialCosts + mysekaiMaterials join
**Implements:** Cost Panel component, inventory localStorage schema

### Phase 4: Polish and Internationalization
**Rationale:** Deferred until core UX is stable. i18n retrofitting is low-risk; export and shortcuts require stable foundation.
**Delivers:** Chinese + Japanese bilingual UI, export as image, keyboard shortcuts, responsive layout
**Uses:** i18next/react-i18next, canvas.toBlob()
**Implements:** Translation files (UI strings zh/ja; item names remain JP from game data)

### Phase Ordering Rationale

- Canvas architecture (layers, coordinate system, rendering abstraction) cannot be bolted on — precedes all canvas work
- URL encoding format must be versioned from Phase 2 since any format change breaks all existing shared links
- Cost calculator comes after placement is working AND data pipeline is validated
- i18n is lowest-risk to defer because Japanese names from game data work for MVP
- Data abstraction layer (validating sekai-master-db-diff schema) belongs in Phase 1 data service

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (URL Encoding):** Compact binary encoding format needs design — bit packing for fixture ID range, coordinate range validation, version scheme
- **Phase 2 (Road/Fence Tools):** In-game road/fence placement mechanics need verification — brush mode vs. line-drawing, mainGenre field interpretation

Phases with standard patterns (skip research-phase):
- **Phase 1:** Konva layer system, Zustand store, Vite scaffold — well-documented with abundant examples
- **Phase 3:** Data join pattern is a straightforward relational lookup; schema confirmed
- **Phase 4:** i18next integration is thoroughly documented; standard hook pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies stable releases with confirmed compatibility; version constraints documented; Happy Island Designer validates most choices |
| Features | HIGH | Game data schema directly validated; competitive feature set derived from 3 analogous successful planners |
| Architecture | HIGH | Component boundaries and data flow clear; patterns documented with code examples in ARCHITECTURE.md |
| Pitfalls | HIGH | All critical pitfalls are evidence-based — no-sprites confirmed from asset naming; URL limits from real platform behavior |

**Overall confidence:** HIGH

### Gaps to Address

- **2D sprite/thumbnail availability:** Verify early in Phase 1 by inspecting network requests on sekai.best/mysekai/fixture. If thumbnails exist via CDN, catalog UX improves; if not, proceed with colored rectangles (already the planned primary approach).
- **Chinese translation source:** No CN translations in sekai-master-db-diff. Treat as planning decision: defer item-name translation to v2 or identify a CN-localized sekai data source. Not a Phase 1 blocker.
- **Road/fence in-game mechanics:** Exact behavior (fill brush? tile-by-tile? line segment?) needs gameplay verification before Phase 2 interaction design.
- **Fixture icon URL pattern on CDN:** iconAssetbundleName on materials is confirmed; fixture thumbnail URL pattern on storage.sekai.best is unverified. Needs network tab inspection.

## Sources

### Primary (HIGH confidence)
- [Sekai-World/sekai-master-db-diff](https://github.com/Sekai-World/sekai-master-db-diff) — Game data schema directly validated; fixtures, materials, blueprints, site layouts confirmed
- [Konva.js docs](https://konvajs.org/) — Canvas rendering, drag-and-drop, layering, snapping patterns
- [react-konva npm](https://www.npmjs.com/package/react-konva) — React 19 compatibility confirmed (v19.2.3)
- [zustand npm](https://www.npmjs.com/package/zustand) — v5.0.12 stable
- [zundo GitHub](https://github.com/charkour/zundo) — Snapshot-based undo middleware
- [lz-string](https://pieroxy.net/blog/pages/lz-string/index.html) — URL-safe compression, v1.5.0
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8) — Rolldown-based build, 2026-03-12

### Secondary (MEDIUM confidence)
- [Happy Island Designer GitHub](https://github.com/eugeneration/HappyIslandDesigner) — Architecture reference; validates lz-string URL sharing, i18next, canvas-over-DOM approach
- [Stardew Valley Planner](https://stardew.info/) — Feature reference for URL sharing and inventory UX patterns
- [PixiJS vs Konva comparison](https://aircada.com/blog/pixijs-vs-konva) — Library selection rationale

### Tertiary (LOW confidence)
- [sekai.best/mysekai/fixture](https://sekai.best/mysekai/fixture) — Fixture database viewer; thumbnail URL patterns not extractable (JS SPA)
- [Sekaipedia - MySEKAI](https://www.sekaipedia.org/wiki/MySEKAI) — Game mechanics reference

---
*Research completed: 2026-04-09*
*Ready for roadmap: yes*
