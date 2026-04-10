# Phase 2: Roads, Fences & Ground Layer - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Add ground-layer placement tools for roads, color tiles, fences, and rugs, mirroring the three in-game categories (道 / カラータイル / 柵) plus the existing rug concept. Introduces a new **Brush tool mode** with two interaction patterns — **hold-drag paint** for roads and color tiles, and a **click-start → click-end → confirm line tool** for fences. Rugs continue to use the existing Stamp flow from Phase 1. Does not introduce sprites, auto-tiling, or new data schemas; ground items remain colored rectangles per Phase 1 until Phase 5 delivers sprites.

Phase 1 already provides the layer infrastructure (`GroundLayer.tsx` renders beneath `FurnitureLayer.tsx` in `EditorCanvas.tsx`) and `getItemLayer()` routing — this phase is about **producing** ground items efficiently, not rendering plumbing. ROAD-04 (ground renders beneath furniture) is effectively already implemented and only needs verification.

</domain>

<decisions>
## Implementation Decisions

### Brush Tool Mode
- **D-29:** Add a fourth tool mode `'brush'` to `ToolMode` type (alongside `'select' | 'stamp' | 'remove'`). New toolbar button in `Toolbar.tsx`, positioned after Stamp. Keyboard shortcut **P** (mnemonic for Paint). Cursor style: `crosshair` (same as stamp) or a brush-specific cursor.
- **D-30:** Clicking a ground-layer fixture (road / color tile / fence) in the catalog **auto-switches to Brush mode** (parallel to how stamp mode auto-activates today via `setActiveFixture`). Clicking a rug or furniture item still auto-switches to Stamp mode. Router: `setActiveFixture` needs to check fixture's brush-eligibility and pick the right mode.

### Road & Color Tile Painting (hold-drag)
- **D-31:** **Hold-drag paint** is the primary interaction for roads and color tiles. Mouse down → drag → every tile the cursor passes over receives a placement; mouse up ends the stroke. Single click = single tile. Works only in Brush mode with a road or color-tile fixture active.
- **D-32:** **Brush size is 1×1 only** for v1. No multi-tile brush, no variable radius. Keeps the tool simple and matches in-game tile granularity.
- **D-33:** Paint strokes must interpolate between cursor samples — if the mouse moves fast from tile `(5,5)` to `(5,8)`, all intermediate tiles `(5,6)` and `(5,7)` get painted. Naive per-frame sampling will leave gaps at high drag velocity; use line rasterization (Bresenham or similar) between the last painted tile and the current one.

### Fence Placement (line tool)
- **D-34:** Fences use a **click-start → click-end → confirm line tool**, matching the in-game UX (see in-game screenshot referenced in specifics). First click sets the start tile, second click sets the end tile, a ghost line preview renders all intermediate tiles, then user confirms (Enter / click confirm button) or cancels (Escape / click cancel button).
- **D-35:** Fence line is **axis-aligned only** (horizontal or vertical) for v1. Diagonal lines are not supported — if start and end are not on the same row or column, the ghost snaps to the axis with the larger delta. Diagonal corners / L-shapes require two separate strokes. This matches the straight fence segments shown in the game.
- **D-36:** Inline confirmation UI overlay near the line end point with 「キャンセル」(cancel) and 「決定」(confirm) buttons, styled to loosely match the in-game overlay. Keyboard: Enter confirms, Escape cancels. Clicking elsewhere on the canvas cancels and starts a new line.

### Shared Brush Infrastructure
- **D-37:** **One Brush tool mode** handles all three in-game ground subtypes (道 / カラータイル / 柵). The active fixture determines *which* interaction pattern is used: fixtures tagged as fences trigger line-tool mode; roads and color tiles trigger hold-drag mode. The user does not pick between "drag" and "line" manually — the fixture's subtype decides.
- **D-38:** Ground categorization is data-driven. Planner must discover which fields in `mysekaiFixtures.json` distinguish roads, color tiles, and fences. Likely candidates: `mysekaiFixtureMainGenreId`, `mysekaiFixtureSubGenreId`, or a combination with `mysekaiSettableLayoutType`. Until confirmed, a client-side classifier function (e.g. `getGroundSubtype(fixture) → 'road' | 'color-tile' | 'fence' | 'rug' | null`) encapsulates the logic so it can be updated when data is verified.

### Rug Handling
- **D-39:** **Rugs remain in the existing Stamp workflow** (Phase 1 D-06). They already route to the ground layer via `getItemLayer()` (layoutType `'rug'`), and rug fixtures are typically multi-tile (2×3, 3×3, etc.) — drag-painting larger items would cause overlaps and is not how rugs are placed in-game. Rugs do **not** trigger brush mode when clicked in the catalog.

### Interaction Rules
- **D-40:** **Overwrite toggle (Phase 1 D-20) applies to brush paint** the same way it applies to stamp. Off → paint is blocked on occupied ground tiles (ghost/cursor feedback: red). On → paint replaces the existing ground item at that tile. Shift/Alt modifier grants one-off override per click/stroke.
- **D-41:** **Ground and furniture layers remain independent** (confirming Phase 1 D-28). A painted road tile at `(x,y)` does not block placing a chair at the same `(x,y)` on the furniture layer, and vice versa. Collision checks run per-layer via the existing `buildOccupancyGrid(items, map, layer)` signature.
- **D-42:** **Brush erase**: Remove mode (Phase 1 D-21) gains click-drag behavior **for ground items only**. In Remove mode, hold-drag removes every ground item the cursor passes over (one tile per cursor sample, same interpolation as paint). Furniture still requires single-click per D-21 (no drag-erase for furniture). Rationale: removing a 30-tile road otherwise takes 30 clicks.

### Undo / History
- **D-43:** **One drag-stroke = one undo step**, and **one confirmed fence line = one undo step**. The Zustand `temporal` middleware must batch multi-tile paint into a single history entry. Implementation options: (a) pause temporal tracking during the drag and resume + commit on mouse up, (b) use a transient local buffer that gets flushed as one state update on mouse up. Planner to choose based on `zundo` API capabilities.
- **D-44:** Undo of a paint stroke triggers the existing flash animation (Phase 1 D-27) on all tiles restored by the undo. `findChangedItemIds()` already returns multiple IDs — no change needed there, only that the batching in D-43 preserves atomicity.

### Grid Fidelity (new principle)
- **D-45:** **1:1 coordinate fidelity with the in-game grid.** A painted tile at editor position `(x, y)` must correspond to the same tile at `(x, y)` in the game, so players can reproduce layouts by walking the editor and game in parallel. This requires confirming the game's tile origin (likely the fixed gate position or a corner of the outdoor area) and aligning Phase 1's origin to match. Planner to investigate and document the origin mapping.
- **D-46:** **Visual grid style should resemble the in-game dashed overlay** (subtle white dashed lines on the ground, visible in the in-game screenshot). Phase 1 D-14 already specified "subtle semi-transparent grid lines"; this phase refines that to a **dashed stroke** matching the game's visual treatment. Minor revision to `GridLayer.tsx` — change stroke style, not layout.
- **D-47:** **Paint snaps to exact tile centers** — no sub-tile smoothing, no half-tile offsets. Every painted item's `x, y` is an integer grid coordinate.

### Claude's Discretion
- Exact shortcut key if `P` conflicts with future needs (D-29)
- Ghost line preview color for the fence line tool (D-34) — suggest: same green/red valid/blocked scheme as stamp ghost
- Cursor icon for Brush mode — Claude picks from Lucide icons or a custom cursor
- Inline confirm/cancel overlay styling (D-36) — just needs to be discoverable and keyboard-accessible
- Dashed grid line stroke pattern specifics (D-46) — dash length, gap length, opacity; pick values that look like the screenshot
- Line rasterization algorithm for drag interpolation (D-33) — Bresenham or simple linear stepping, whichever is cleaner

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Core value, hosting constraints, sprite pipeline context
- `.planning/REQUIREMENTS.md` §Roads & Fences — ROAD-01, ROAD-02, ROAD-03, ROAD-04 acceptance criteria
- `.planning/ROADMAP.md` §Phase 2 — Success criteria and dependency on Phase 1

### Phase 1 Foundation (carried-forward decisions)
- `.planning/phases/01-foundation-core-editor/01-CONTEXT.md` — Tool modes (D-17), stamp flow (D-06), overwrite toggle (D-20), remove mode (D-21), R-rotation (D-24), ghost preview (D-25), flash animation (D-27), layer independence (D-28)
- `.planning/phases/01-foundation-core-editor/` — All plans and verification artifacts from Phase 1

### Existing Code (Phase 1 implementation)
- `src/types/editor.ts` — `ToolMode`, `PlacedItem`, `EditorState`, `Fixture` types; new `'brush'` mode must be added to `ToolMode` union (D-29)
- `src/stores/editorStore.ts` — Zustand store with `zundo` temporal middleware; D-43 batching must integrate with `temporal.pause()` / `temporal.resume()` or equivalent API
- `src/hooks/useEditorActions.ts` — `handleCanvasClick()` currently handles stamp/remove/select; brush mode dispatch will extend this or add a parallel `handleBrushPaint(gridX, gridY)` / `handleBrushDragStart` / `handleBrushDragEnd` handler
- `src/components/canvas/EditorCanvas.tsx` — Stage-level event routing; `handleStageClick` and `handleMouseMove` are the extension points for drag-paint and the fence line tool
- `src/components/canvas/GroundLayer.tsx` — Already renders ground items; no structural change expected, just receives more items
- `src/components/canvas/GridLayer.tsx` — D-46 dashed-grid refinement goes here
- `src/components/toolbar/Toolbar.tsx` — Add the Brush button and shortcut mapping (D-29)
- `src/data/fixtures.ts` — `getItemLayer()` classifies `floor`/`rug` as ground; new `getGroundSubtype()` classifier from D-38 belongs here
- `src/hooks/useKeyboard.ts` — Add `P` → brush mode, Enter/Escape → confirm/cancel fence line (D-34, D-36)

### Game Data
- `CLAUDE.md` §Technology Stack > Data Handling — Fixture JSON schemas; planner should read `mysekaiFixtures.json` samples to confirm D-38 subtype classification
- Live data URL: `https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main/mysekaiFixtures.json`

### Reference Projects
- [Happy Island Designer](https://github.com/eugeneration/HappyIslandDesigner) — Paper.js-based paint tool for terrain/paths; good reference for drag-paint line rasterization even though the framework differs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`GroundLayer.tsx` / `FurnitureLayer.tsx`** — Already render separated layers with the correct z-order. ROAD-04 is essentially complete; verification task only.
- **`getItemLayer(fixture)` in `src/data/fixtures.ts:71`** — Already routes `floor`/`rug` layoutTypes to `'ground'`. Brush-eligibility classifier (D-38) extends this file.
- **`buildOccupancyGrid(items, fixtureMap, layer)` in `editorStore.ts:39`** — Per-layer occupancy grid is the exact primitive needed for D-40 (overwrite) and D-41 (layer-independent collision).
- **`checkCanPlace()` in `editorStore.ts:59`** — Collision checker accepts bounds + excludeItemId; reusable for brush paint-over checks.
- **`removeItemsInFootprint()` in `useEditorActions.ts:38`** — Private helper that clears occupants in a rect; brush overwrite can reuse the per-tile variant.
- **Ghost preview system** (`GhostPreview.tsx`, `useEditorStore.previewRotation`) — Can be extended to show brush ghost (1 tile under cursor) and fence line ghost (multi-tile preview).
- **Flash animation infrastructure** (`undoWithFlash` / `redoWithFlash` / `flashItemIds`) — Already handles multi-item flashes; D-44 works without changes once D-43 batching is in place.
- **Zustand `temporal` middleware with `partialize`** — Already scoped to `placedItems`. D-43 needs investigation into `zundo`'s batching/pause API.

### Established Patterns
- **Tool-mode dispatch in `handleCanvasClick`** — switch on `state.toolMode` then read `state.activeFixtureId`. Brush mode follows the same shape but splits into `handleBrushMouseDown` / `handleBrushMouseMove` / `handleBrushMouseUp` for drag, plus fence line state (firstClickTile, previewEnd, isConfirming).
- **`setActiveFixture` routes to `stamp` mode today** (`editorStore.ts:152`) — Must be extended to route to `brush` mode when the fixture is a ground-layer paintable (D-30).
- **Toolbar buttons follow the `toolButtons` array pattern** in `Toolbar.tsx:58` — Brush button is a fourth entry in this array with appropriate icon (e.g., `Brush` or `Paintbrush` from Lucide).
- **Keyboard shortcuts via `useKeyboard` hook** — Add `P`, `Enter`, `Escape` handlers here.

### Integration Points
- **`ToolMode` union in `src/types/editor.ts`** — Must add `'brush'` as a literal.
- **`EditorCanvas.handleMouseMove` / `onMouseMove`** — Already tracks mouse grid position for ghost preview; extend to also drive drag-paint tile commits when in brush mode with mouse held down.
- **`Konva.Stage` event model** — `onMouseDown` / `onMouseUp` on the Stage drive drag detection. Existing `draggable={toolMode === 'select'}` must be updated to exclude brush mode from Stage panning (otherwise drag-paint conflicts with pan).
- **Welcome screen / start flow** — No changes needed; brush mode is only active post-start.

### Risks / Unknowns (for researcher)
- **Data schema uncertainty** — `mysekaiSettableLayoutType` has `floor | wall | rug | wall_appearance`. Fences are likely `floor` with a fence-specific genre ID, but could be `wall`. Researcher must sample real data before planner writes the classifier.
- **zundo batching API** — The `temporal` middleware's ability to group updates into one history entry needs verification (looking at `pause()` / `resume()` or similar). D-43 depends on this working cleanly.
- **Game tile origin (D-45)** — Where is `(0,0)` in the actual game? The welcome screen currently places mandatory gate/house at computed positions; that placement should align with the game's origin. Needs research — possibly by comparing screenshots to Phase 1's current auto-placement logic.
- **Drag-paint vs Stage pan conflict** — Phase 1 uses Stage `draggable={toolMode === 'select'}` for panning. Brush mode must not propagate mousedown to Stage drag; brush handles must stop propagation cleanly.

</code_context>

<specifics>
## Specific Ideas

### In-game reference (user screenshot, 2026-04-10)
The user shared a live in-game screenshot showing the MySekai outdoor ground-layer tool with:
- **Left tool rail** with three icon buttons: **道** (roads), **カラータイル** (color tiles), **柵** (fences, highlighted active). These are the three first-class ground-layer categories and the source for D-37 and D-38.
- **Fence placement in progress**: A ghost fence line on the ground with overlay labels 「ここから」 (from here) / 「ここまで」 (to here) and buttons 「キャンセル」 / 「決定」. This is the direct source for D-34, D-35, D-36.
- **Visible grid**: Subtle white dashed grid overlay on the ground surface, informing D-46.
- **Mixed content**: Color tile plaza (pink tiles) with furniture (chairs, table, fountain) placed on top — confirming D-41 (layer independence).

### Pixel art + ground layer workflow
Phase 1's hotbar + stamp workflow was specifically designed for pixel art via 1×1 colored furniture. The brush tool extends this aesthetic — players can paint pixel art paths/backgrounds with road and color-tile tiles, then place furniture "sprites" on top. The brush tool should feel equally fast and keyboard-driven.

### In-game reproducibility is the north star (D-45, D-46, D-47)
The user explicitly requested grid replication to make moving designs into the game easier. Every decision in Phase 2 should preserve this property: if a design in the editor looks like layout X, the player should be able to walk to the exact same tiles in-game and reproduce layout X step-by-step. This elevates grid fidelity from "nice to have" to a non-negotiable principle.

### Matching the game's mental model beats internal consistency
When the game uses different interactions for different tools (hold-drag for roads, click-line-confirm for fences), Phase 2 matches the game rather than forcing one interaction for everything. Rationale: users already have muscle memory from playing MySekai. Breaking that memory for "consistency" costs more than it saves.

</specifics>

<deferred>
## Deferred Ideas

- **Auto-tiling for roads** — Road edges adapting to neighbors (corner pieces, T-junctions, caps). Requires sprite pipeline (Phase 5) AND a tile-connection rule table. Revisit in Phase 5 or later.
- **Diagonal fence lines** — D-35 limits fences to axis-aligned lines. Diagonal / L-shape line tools could come in a v2 pass if user feedback demands it.
- **Multi-tile brush (3×3, radius 5)** — Rejected for v1 (D-32). If painting huge plazas becomes painful, revisit.
- **Paint-stroke cursor preview with size indicator** — Small UX polish; let Claude's discretion handle v1 styling, revisit if feedback is poor.
- **Rectangle / flood-fill tools** — Useful for filling large plaza areas, not in scope. Mention in roadmap backlog if users request.
- **Fence orientation / sprite rotation** — Fences in-game rotate based on their line direction (horizontal vs vertical segments). Handled by colored rectangles for now; becomes relevant in Phase 5 when real sprites arrive.
- **Paint stroke visual feedback (the trail showing where you've painted)** — Minor; Claude can add simple cursor highlighting in v1 without calling it out.
- **Brush hotbar slots** — Separate hotbar for ground items or share the existing 1-9 hotbar. v1 just uses catalog click; hotbar integration can follow if users want it.

</deferred>

---

*Phase: 02-roads-fences-ground-layer*
*Context gathered: 2026-04-10*
