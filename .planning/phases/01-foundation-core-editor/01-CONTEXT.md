# Phase 1: Foundation & Core Editor - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold the React + Konva + Zustand + Vite app, build the layered canvas grid with in-game grass texture, furniture catalog sidebar with CDN thumbnails, and deliver the complete place/move/rotate/remove workflow using colored rectangles. Includes a hotbar system for rapid item switching (pixel art workflow), three editor tool modes, and a welcome screen for area level selection.

</domain>

<decisions>
## Implementation Decisions

### Editor Layout
- **D-01:** Left sidebar catalog + center canvas + top toolbar bar layout
- **D-02:** Sidebar is collapsible to a narrow icon strip (VS Code activity bar style) to maximize canvas space
- **D-03:** Status bar at bottom showing area level, item count, and other context

### Catalog UX
- **D-04:** Thumbnail grid display (2-3 columns) using CDN isometric images from storage.sekai.best
- **D-05:** Tab/chip bar for category filtering, sub-genre as secondary filter
- **D-06:** Click catalog item to enter stamp mode; click grid to place; stamp mode persists until mode switch
- **D-07:** Bottom hotbar with 1-9 number key shortcuts for fast item switching (pixel art workflow)
- **D-08:** Hotbar assignment: hover over catalog item + press 1-9 to assign to that slot
- **D-09:** Hover tooltip on catalog items showing full name, dimensions (WxD), and category
- **D-10:** WxD dimension badge overlay on thumbnail corner (e.g. "2x1")
- **D-11:** Virtualized scrolling for the catalog (~1,126 outdoor fixtures)
- **D-12:** Color variants deferred to v2 (VIS-02) — each fixture shown once in catalog

### Grid Appearance
- **D-13:** In-game grass texture as grid background — extract the real ground texture early from game assets as a static image (not a placeholder)
- **D-14:** Subtle semi-transparent grid lines rendered over the grass texture
- **D-15:** Welcome/start screen for area level selection (1-5) before entering the editor; changeable later via toolbar dropdown
- **D-16:** Zoom range at Claude's discretion (must accommodate 36x36 to 100x100 grids)

### Tool Modes
- **D-17:** Three toolbar modes: Select/Move, Stamp, Remove — explicit toolbar toggle buttons to switch
- **D-18:** Select/Move mode: click to select, direct drag to move (snaps to grid, green/red feedback), arrow keys nudge by 1 tile
- **D-19:** Stamp mode: click grid to place active hotbar/catalog item; blocked on occupied tiles by default (ghost turns red)
- **D-20:** Overwrite toggle: toolbar button for sustained overwrite mode (stamp replaces existing item) + modifier key (Shift/Alt) for one-off override per click
- **D-21:** Remove mode: click any placed item to delete it (single click per item, no paint-erase)
- **D-22:** Tab key cycles selection between overlapping items on same tile (furniture layer first, then ground layer)

### Mandatory Fixtures
- **D-23:** Gate and house objects are auto-placed when starting a new design; movable but never removable. Visually distinct (e.g. subtle border or lock icon indicating they cannot be deleted)

### Item Interaction
- **D-24:** R key rotates selected/preview item 90° clockwise; Shift+R for counter-clockwise. Works in both select and stamp modes
- **D-25:** Ghost preview: semi-transparent colored rectangle with green tint (valid) / red tint (blocked), showing exact grid footprint
- **D-26:** Selected item indicator: blue highlight border with small corner/edge handles
- **D-27:** Subtle flash animation on items affected by undo/redo actions

### Scope Simplification
- **D-28:** GRID-12 (put-target on put-base stacking, e.g. lamp on table) deferred — no stacking in Phase 1. Two non-floor items cannot occupy the same tile(s). Floor/ground items coexist with furniture above them.

### Claude's Discretion
- Zoom range implementation (D-16) — pick reasonable bounds for 36x36 to 100x100 grids
- Specific icon choices for toolbar modes and collapsed sidebar
- Exact hotbar visual styling
- Undo/redo stack implementation details (minimum 20 steps per GRID-09)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, constraints, key decisions, sprite pipeline context
- `.planning/REQUIREMENTS.md` — GRID-01 through GRID-12, CATL-01 through CATL-04 requirements for this phase
- `.planning/ROADMAP.md` — Phase 1 success criteria and dependency chain

### Game Data
- `CLAUDE.md` §Technology Stack — Recommended stack with version constraints and rationale
- `CLAUDE.md` §Recommended Stack > Data Handling — Data file schemas (mysekaiFixtures.json, mysekaiBlueprints.json, etc.)

### Reference Projects
- [Happy Island Designer](https://github.com/eugeneration/HappyIslandDesigner) — Reference editor implementation (Paper.js, lz-string, TypeScript)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing codebase — greenfield project. Phase 1 scaffolds everything.

### Established Patterns
- None yet. This phase establishes the foundational patterns (state management with Zustand, canvas rendering with Konva, component structure, data fetching from sekai-master-db-diff).

### Integration Points
- CDN thumbnails: `storage.sekai.best/sekai-jp-assets/mysekai/thumbnail/fixture/{assetbundleName}_1.webp`
- Game data: `sekai-master-db-diff` GitHub repo JSON files (mysekaiFixtures.json, mysekaiFixtureLabels.json, mysekaiFixtureTags.json)
- Sister project `pjsk` has existing patterns for fetching from these same data sources

</code_context>

<specifics>
## Specific Ideas

- **Pixel art workflow:** Players commonly draw pixel art in their MySekai world using 1x1 colored furniture blocks. The hotbar (1-9 keys) and stamp mode with overwrite toggle are specifically designed to support this workflow efficiently.
- **Hotbar assignment UX:** Hover over catalog item + press number key to assign (game-style skill bar assignment pattern).
- **In-game grass texture:** Extract the real ground texture from game assets early rather than using a placeholder — authenticity matters for the planning experience.
- **Mandatory fixtures:** Gate and house must always exist in a valid MySekai layout. Auto-place them and prevent deletion to enforce this constraint visually.

</specifics>

<deferred>
## Deferred Ideas

- **GRID-12 put-target stacking** — Lamp-on-table mechanic. Players can figure out placement themselves for now. Revisit if user feedback demands it.
- **Color variants (VIS-02)** — v2 requirement. Each fixture shown once in catalog for Phase 1.
- **Paint-erase in remove mode** — Hold and drag to erase multiple items. Could add later if clearing large areas is painful.

</deferred>

---

*Phase: 01-foundation-core-editor*
*Context gathered: 2026-04-09*
