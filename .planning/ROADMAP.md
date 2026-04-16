# Roadmap: MySekai Planner

## Overview

This roadmap delivers a browser-based 2D grid editor for planning MySekai outdoor layouts. The journey starts with a fully functional grid editor (browse, select, place furniture as colored rectangles), then extends with ground-layer tools, persistence/sharing, cost calculation, an offline sprite pipeline, and bilingual UI. The sprite pipeline is a separate Python/Blender toolchain that runs independently from the React web app. By the end, users can plan layouts with real top-down sprites, calculate material costs, and share blueprints via URL.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Core Editor** - Scaffold the app, build the layered canvas grid, furniture catalog, and complete place/move/remove/rotate workflow with colored rectangles
- [x] **Phase 2: Roads, Fences & Ground Layer** - Paint brush and segment tools for roads, rugs, and fences on the ground layer (completed 2026-04-10)
- [ ] **Phase 3: Persistence & Sharing** - Auto-save to localStorage, load designs, and share/import blueprints via URL
- [ ] **Phase 4: Cost Calculator & Inventory** - Material cost breakdown, inventory input, and remaining-cost calculation
- [ ] **Phase 5: Sprite Pipeline** - Offline Python/Blender pipeline to extract and render top-down sprites, integrate into grid editor
- [ ] **Phase 6: Internationalization** - Bilingual UI in Chinese and Japanese

## Phase Details

### Phase 1: Foundation & Core Editor
**Goal**: Users can browse the furniture catalog, select items, and place/move/rotate/remove them on an accurate MySekai grid rendered as colored rectangles
**Depends on**: Nothing (first phase)
**Requirements**: GRID-01, GRID-02, GRID-03, GRID-04, GRID-05, GRID-06, GRID-07, GRID-08, GRID-09, GRID-10, GRID-11, GRID-12, CATL-01, CATL-02, CATL-03, CATL-04
**Success Criteria** (what must be TRUE):
  1. User can select an outdoor area level (1-5) and sees a grid matching in-game dimensions (36x36 to 100x100)
  2. User can browse, search, and filter furniture in a catalog panel with CDN thumbnail images
  3. User can select a furniture item from the catalog, see a ghost preview on the grid, and place it with snap-to-grid behavior
  4. User can move, rotate (90/180/270), and remove placed items; items render as colored rectangles with labels on the correct layer
  5. User can pan and zoom the canvas, and undo/redo at least 20 actions
**Plans:** 6 plans
Plans:
- [x] 01-01-PLAN.md — Project scaffold, TypeScript types, test infra, area level config, grid/color utilities
- [x] 01-02-PLAN.md — Fixture data layer (fetch, filter, search, CDN URLs) and Zustand editor store with undo/redo
- [x] 01-03-PLAN.md — Welcome screen, editor layout shell, toolbar, hotbar, and status bar components
- [x] 01-04-PLAN.md — Catalog sidebar with search, category chips, virtualized thumbnail grid, tooltips, hotbar assignment
- [x] 01-05-PLAN.md — Konva canvas with grid layers, placed item rendering, ghost preview, pan/zoom
- [ ] 01-06-PLAN.md — Editor interactions: keyboard shortcuts, tool modes, mandatory fixtures, undo/redo flash
**UI hint**: yes

### Phase 2: Roads, Fences & Ground Layer
**Goal**: Users can paint roads, place rugs, and draw fences, with ground-layer items rendering beneath furniture
**Depends on**: Phase 1
**Requirements**: ROAD-01, ROAD-02, ROAD-03, ROAD-04
**Success Criteria** (what must be TRUE):
  1. User can select a road type and paint tiles on the ground layer using a brush tool
  2. User can place rug/mat items on the ground layer
  3. User can place fence segments on the grid
  4. Ground-layer items (roads, rugs) always render beneath furniture-layer items
**Plans:** 5/5 plans complete
Plans:
- [x] 02-01-PLAN.md — Schema fix (Fixture.handleType + layoutType) + getGroundSubtype classifier + road→ground routing
- [x] 02-02-PLAN.md — Brush tool mode infrastructure: ToolMode, zundo batching helpers, toolbar button, P shortcut, auto-switch routing
- [x] 02-03-PLAN.md — Drag-paint for roads/color-tiles + drag-erase for remove mode + Bresenham rasterizer + ghost preview
- [x] 02-04-PLAN.md — Fence line tool: click-start → click-end → axis-snap ghost → confirm/cancel overlay
- [x] 02-05-PLAN.md — Dashed grid overlay refinement (D-46) matching in-game visual
**UI hint**: yes

### Phase 02.1: Fence edge-based model and unified drag tool (INSERTED)

**Goal:** Re-architect fences as edge-based items (stored as `{x, y, orientation: 'h' | 'v'}` on the grid lattice) and unify roads/color-tiles/fences under a single hold-drag interaction. Fences should snap to the line *between* tiles and coexist with road tiles on the same grid square. Drag is axis-locked for fences (no diagonals).
**Requirements**: ROAD-03 (corrected — supersedes Phase 2 fence line tool)
**Depends on:** Phase 2
**Plans:** 4/4 plans complete
**UI hint**: yes

**Why inserted:** Phase 2 closed Fence as a tile-based item placed via click-line tool (D-34, D-35, D-36). User feedback during human verification revealed two architectural mistakes:
  1. Fences in MySekai live on grid lines (edges), not in tile cells — they sit *between* tiles and coexist with roads
  2. The interaction should be unified: roads, color tiles, AND fences all use hold-drag (dragging "draws a line" — for roads it fills tiles, for fences it fills edges)

**Replaces from Phase 2:**
- D-34, D-35, D-36 (fence click-line tool with confirm overlay) → superseded by drag-paint
- `useFenceLineTool.ts`, `FenceLineTool.tsx`, `FenceConfirmOverlay.tsx` → to be deleted
- `fenceLineTool.test.ts` → replaced with edge-based fence drag tests

**New constraints:**
- Fence drag is axis-locked: dominant drag direction (Δx vs Δy) determines whether the stroke lays horizontal or vertical edges; diagonals collapse to the dominant axis (no L-shapes from a single drag)
- Fences and roads share the same `'brush'` ToolMode and the same drag handler but route to different occupancy grids (tile occupancy vs new edge occupancy)
- Phase 3 URL encoding must accommodate the new edge type alongside existing PlacedItem schema

Plans:
- [x] 02.1-01-PLAN.md — Delete Phase 2 fence line tool and rename brush-interaction discriminator to drag-paint-edge
- [x] 02.1-02-PLAN.md — PlacedEdge type, edgeRasterize utility, placedEdges store slice with extended zundo partialize
- [x] 02.1-03-PLAN.md — Unified drag handler: paintEdgeStroke helper + axis-lock + edge-aware remove mode
- [x] 02.1-04-PLAN.md — FenceLayer rendering between GroundLayer and FurnitureLayer + human visual verification
- [ ] 02.1-05-PLAN.md — Tests: edgeRasterize unit tests + fenceEdgeBrush integration tests (axis-lock, undo, coexistence)

### Phase 3: Persistence & Sharing
**Goal**: Users can save their designs locally and share/import blueprints via URL
**Depends on**: Phase 2
**Requirements**: PERS-01, PERS-02, PERS-03, PERS-04, PERS-05
**Success Criteria** (what must be TRUE):
  1. User's current design auto-saves to localStorage and persists across browser sessions
  2. User can load a previously saved design from localStorage
  3. User can generate a shareable URL and send it to another user who can import the design
  4. URL encoding uses compact binary format with version byte, keeping URLs within platform sharing limits
**Plans**: TBD

### Phase 4: Cost Calculator & Inventory
**Goal**: Users can see material costs for their blueprint and track what they still need to gather
**Depends on**: Phase 1
**Requirements**: COST-01, COST-02, COST-03, COST-04
**Success Criteria** (what must be TRUE):
  1. User sees a total material cost breakdown (stone, iron, wood, etc.) for all items in the current blueprint
  2. User can input owned materials and furniture as inventory
  3. User sees remaining materials needed (total minus inventory) at a glance
  4. Inventory data persists across browser sessions via localStorage
**Plans**: TBD
**UI hint**: yes

### Phase 5: Sprite Pipeline
**Goal**: Top-down sprites are generated for all outdoor fixtures and rendered in the grid editor, replacing colored rectangles
**Depends on**: Phase 1
**Requirements**: SPRT-01, SPRT-02, SPRT-03, SPRT-04, SPRT-05, SPRT-06, SPRT-07
**Success Criteria** (what must be TRUE):
  1. Running the pipeline extracts 3D models via sssekai and renders orthographic top-down PNGs via Blender headless for all ~1,126 outdoor-placeable fixtures with no manual intervention
  2. Flat items (roads, fences, floor surfaces) have 2D textures extracted directly instead of 3D renders
  3. Generated sprites are deployed as static assets alongside the web app on GitHub Pages
  4. Placed items in the grid editor render with top-down sprites instead of colored rectangles
**Plans**: TBD

### Phase 6: Internationalization
**Goal**: Users can use the application in Chinese or Japanese
**Depends on**: Phase 1
**Requirements**: I18N-01, I18N-02
**Success Criteria** (what must be TRUE):
  1. User can switch between Chinese and Japanese UI, with all interface text translated
  2. Furniture item names display in Japanese matching in-game data
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Core Editor | 0/6 | Planning complete | - |
| 2. Roads, Fences & Ground Layer | 0/5 | Complete    | 2026-04-10 |
| 3. Persistence & Sharing | 0/TBD | Not started | - |
| 4. Cost Calculator & Inventory | 0/TBD | Not started | - |
| 5. Sprite Pipeline | 0/TBD | Not started | - |
| 6. Internationalization | 0/TBD | Not started | - |
