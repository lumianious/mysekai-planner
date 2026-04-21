# Requirements: MySekai Planner

**Defined:** 2026-04-09
**Core Value:** Users can visually plan their MySekai outdoor layout and know exactly what materials they need to build it.

## v1 Requirements

### Grid Editor

- [x] **GRID-01**: User sees an accurate grid matching in-game MySekai outdoor area dimensions
- [x] **GRID-02**: User can select outdoor area level (1-5) with correct grid sizes (36x36 to 100x100)
- [x] **GRID-03**: Grid has two render layers: ground layer (roads, rugs) and furniture layer (everything else)
- [x] **GRID-04**: User can place furniture on the grid with snap-to-grid behavior
- [x] **GRID-05**: User can move placed furniture to a new grid position
- [x] **GRID-06**: User can remove placed furniture from the grid
- [x] **GRID-07**: User can rotate placed furniture (90/180/270 degrees)
- [x] **GRID-08**: User can pan and zoom the canvas viewport
- [x] **GRID-09**: User can undo and redo actions (minimum 20 steps)
- [x] **GRID-10**: User sees a ghost preview of the item before placing it on the grid
- [x] **GRID-11**: Placed items render as colored rectangles with labels initially, replaced by top-down sprites when available
- [x] **GRID-12**: Put-target items (e.g. table lamps) can only be placed on put-base items (e.g. tables)

### Sprite Pipeline

- [ ] **SPRT-01**: Asset extraction pipeline downloads MySekai fixture 3D models from game bundles via sssekai
- [ ] **SPRT-02**: Pipeline extracts 2D textures directly for flat items (roads, fences, floor surfaces)
- [ ] **SPRT-03**: Pipeline renders orthographic top-down view of 3D furniture models via Blender headless scripting
- [ ] **SPRT-04**: Pipeline outputs transparent PNG sprites at consistent resolution per grid unit
- [ ] **SPRT-05**: Pipeline is batch-automated for all ~1,126 outdoor-placeable fixtures (excluding 113 indoor-only items) with no manual intervention
- [ ] **SPRT-06**: Generated sprites are served as static assets alongside the web app on GitHub Pages
- [ ] **SPRT-07**: Grid editor renders generated top-down sprites for placed items (replacing colored rectangles)

### Furniture Catalog

- [x] **CATL-01**: User can browse a catalog of all MySekai fixtures sourced from sekai-master-db-diff
- [x] **CATL-02**: User can search fixtures by name (Japanese)
- [x] **CATL-03**: User can filter fixtures by category and sub-genre
- [x] **CATL-04**: Catalog displays CDN isometric thumbnail images from storage.sekai.best for visual identification

### Cost Calculator

- [ ] **COST-01**: User sees total material cost breakdown for the current blueprint (stone, iron, wood, etc.)
- [ ] **COST-02**: User can input owned materials/furniture as inventory
- [ ] **COST-03**: User sees remaining materials needed (total cost minus inventory)
- [ ] **COST-04**: Inventory persists across sessions via localStorage

### Persistence & Sharing

- [ ] **PERS-01**: User's current design auto-saves to localStorage
- [ ] **PERS-02**: User can load a previously saved design from localStorage
- [ ] **PERS-03**: User can generate a shareable URL that encodes the current blueprint
- [ ] **PERS-04**: User can import a design from a shared URL
- [x] **PERS-05**: URL encoding uses compact binary format with version byte (lz-string compressed)

### Roads & Fences

- [x] **ROAD-01**: User can place road tiles on the ground layer using a paint/brush tool
- [x] **ROAD-02**: User can place rug/mat items on the ground layer
- [x] **ROAD-03**: User can place fence segments on the grid
- [x] **ROAD-04**: Ground layer items render beneath furniture layer items

### Internationalization

- [ ] **I18N-01**: UI text is available in Chinese and Japanese
- [ ] **I18N-02**: Item names display in Japanese (matching in-game data)

## v2 Requirements

### Enhanced Visuals

- **VIS-01**: Chinese translations for item names (requires localized data source)
- **VIS-02**: Color variant selection for fixtures with multiple color options
- **VIS-03**: Export design as downloadable PNG image

### Advanced Editing

- **EDIT-01**: Multi-select and bulk move/delete operations
- **EDIT-02**: Keyboard shortcuts (Ctrl+Z undo, Delete remove, spacebar pan)
- **EDIT-03**: Design templates and presets for common layouts

### Pipeline Enhancements

- **PIPE-01**: CI/CD automation to regenerate sprites on game updates (GitHub Actions)
- **PIPE-02**: Sprite quality improvements (better lighting, materials in Blender renders)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Indoor room planning | Different grid system and constraints; outdoor-only focus for v1 |
| In-game area editors (Wonderland, Street) | Separate game features unrelated to MySekai |
| User accounts / backend | Static GitHub Pages hosting only; no server-side logic |
| Real-time collaboration | Single-user editor; async sharing via URL is sufficient |
| Mobile-native app | Web-first; responsive layout if feasible but not a priority |
| Runtime 3D rendering in browser | Sprites are pre-generated offline; no 3D libraries shipped to client |
| Replicating Unity NPR shaders perfectly | Basic Blender materials sufficient for top-down planning sprites |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GRID-01 | Phase 1 | Complete |
| GRID-02 | Phase 1 | Complete |
| GRID-03 | Phase 1 | Complete |
| GRID-04 | Phase 1 | Complete |
| GRID-05 | Phase 1 | Complete |
| GRID-06 | Phase 1 | Complete |
| GRID-07 | Phase 1 | Complete |
| GRID-08 | Phase 1 | Complete |
| GRID-09 | Phase 1 | Complete |
| GRID-10 | Phase 1 | Complete |
| GRID-11 | Phase 1 | Complete |
| GRID-12 | Phase 1 | Complete |
| SPRT-01 | Phase 5 | Pending |
| SPRT-02 | Phase 5 | Pending |
| SPRT-03 | Phase 5 | Pending |
| SPRT-04 | Phase 5 | Pending |
| SPRT-05 | Phase 5 | Pending |
| SPRT-06 | Phase 5 | Pending |
| SPRT-07 | Phase 5 | Pending |
| CATL-01 | Phase 1 | Complete |
| CATL-02 | Phase 1 | Complete |
| CATL-03 | Phase 1 | Complete |
| CATL-04 | Phase 1 | Complete |
| COST-01 | Phase 4 | Pending |
| COST-02 | Phase 4 | Pending |
| COST-03 | Phase 4 | Pending |
| COST-04 | Phase 4 | Pending |
| PERS-01 | Phase 3 | Pending |
| PERS-02 | Phase 3 | Pending |
| PERS-03 | Phase 3 | Pending |
| PERS-04 | Phase 3 | Pending |
| PERS-05 | Phase 3 | Complete |
| ROAD-01 | Phase 2 | Complete |
| ROAD-02 | Phase 2 | Complete |
| ROAD-03 | Phase 2 | Complete |
| ROAD-04 | Phase 2 | Complete |
| I18N-01 | Phase 6 | Pending |
| I18N-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after roadmap creation*
