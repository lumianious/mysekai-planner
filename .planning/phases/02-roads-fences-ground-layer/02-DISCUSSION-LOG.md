# Phase 2: Roads, Fences & Ground Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 02-roads-fences-ground-layer
**Areas discussed:** Road paint mechanics, Fence placement model, Tool discovery / UI, Paint-over + undo, Grid fidelity (user-introduced)

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Road paint mechanics | Hold-drag brush, click-line tool, rectangle fill, or reuse stamp mode; brush size; erase behavior | ✓ |
| Fence placement model | Edge-based vs tile-based; line tool vs drag vs single-click | ✓ |
| Tool discovery / UI | New toolbar button vs auto-switch vs catalog tab; rug handling; shortcut | ✓ |
| Paint-over + undo | Overwrite rules; layer coexistence; undo granularity | ✓ |

---

## Road Paint Mechanics

### Q1: How should road painting work primarily?

| Option | Description | Selected |
|--------|-------------|----------|
| Hold-drag paint (Recommended) | Mouse down + drag continuously paints; single click places one tile; matches Happy Island Designer | ✓ |
| Click-drag line tool | Click start → drag to end → line of tiles on release; awkward for curves | |
| Rectangle fill | Click-drag defines rectangle → fills on release; bad for winding paths | |
| Reuse stamp mode | No paint tool — click each tile individually | |

### Q2: Brush size

| Option | Description | Selected |
|--------|-------------|----------|
| 1x1 only (Recommended) | Single-tile brush, simplest, matches in-game granularity | ✓ |
| 1x1 and 3x3 | Toggle via button or `[ ]` keys | |
| Variable (1-5) | Slider / hotkey for radius | |

### Q3: Road erase

| Option | Description | Selected |
|--------|-------------|----------|
| Remove mode click-drag (Recommended) | Extend Remove tool for hold-drag on ground items; furniture stays single-click | ✓ |
| Dedicated eraser tool | New "Ground Eraser" toolbar button | |
| Paint with 'empty' road | Select eraser road type and paint over | |

**Notes:** All three questions answered with recommended defaults. Confirms brush model: hold-drag, 1x1, extend Remove for drag-erase on ground only.

---

## Fence Placement Model

### Q1: Fence grid model

| Option | Description | Selected |
|--------|-------------|----------|
| Tile-based, drag-paint (Recommended, initial) | 1x1 items on tile centers, same brush as roads, consistent | ✓ (initially) |
| Edge-based segments | Fences on borders between tiles, new geometry system, ~2x complexity | |
| Tile-based, single-click | 1x1 items via stamp mode only, tedious for long lines | |

**Notes:** User noted they were logging into the game to share a screenshot. Sent screenshot showing in-game fence tool uses click-start → click-end → confirm (line tool), not drag-paint. Re-asked Q1 after screenshot.

### Q2: Fence tool sharing

| Option | Description | Selected |
|--------|-------------|----------|
| Share brush tool (Recommended) | Same Brush mode handles roads, fences, and other ground paintables; fixture determines behavior | ✓ |
| Separate 'Fence' tool mode | Dedicated fence tool mode with fence-specific logic | |

### Q3 (post-screenshot): Match game UX?

| Option | Description | Selected |
|--------|-------------|----------|
| Match game: line tool (Recommended) | Click start → click end → ghost preview → Enter/✅ to confirm; axis-aligned only; different pattern from road brush but authentic to game muscle memory | ✓ |
| Keep drag-paint for fences | Original choice; hold-drag for all ground items | |
| Line tool for BOTH roads and fences | Apply line pattern to roads too for internal consistency | |

### Q4 (post-screenshot): Color tile as distinct category?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — three brush subtypes (Recommended) | 道 / カラータイル / 柵 mirror the three in-game categories | ✓ |
| No — treat all ground paintables the same | Flat list | |
| Discover from data | Defer to planner | |

**Notes:** Screenshot showed three in-game ground categories (道 / カラータイル / 柵) and fence tool's from/to/confirm UI. Locked fences to line-tool pattern matching the game. Color tiles elevated to first-class category alongside roads and fences.

---

## Tool Discovery / UI

### Q1: Tool access

| Option | Description | Selected |
|--------|-------------|----------|
| New toolbar button + auto-switch (Recommended) | Brush as 4th mode beside Select/Stamp/Remove; catalog click auto-switches | ✓ |
| New toolbar button only | Button but no auto-switch | |
| Auto-switch only (no new button) | Stamp button behavior changes based on fixture type | |
| Catalog Ground tab | Dedicated Ground tab in catalog sidebar | |

### Q2: Rug handling

| Option | Description | Selected |
|--------|-------------|----------|
| Stamp only (Recommended) | Rugs keep existing Stamp workflow; brush is for 1x1 paintables only | ✓ |
| Brush only | Rugs use brush mode; awkward for multi-tile rugs | |
| Both — auto-pick by size | 1x1 → brush, else → stamp; data-dependent, hard to predict | |

### Q3: Keyboard shortcut

| Option | Description | Selected |
|--------|-------------|----------|
| P for Paint (Recommended) | Mnemonic, unclaimed | ✓ |
| N for New | Avoids conflicts, not mnemonic | |
| No shortcut | Toolbar button + catalog auto-switch only | |

**Notes:** All three answered with recommended defaults. Clean path: new Brush button, shortcut P, catalog auto-switch, rugs untouched.

---

## Paint-over + Undo

### Q1: Paint-over behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Respect existing overwrite toggle (Recommended) | Reuse Phase 1 D-20 overwrite toggle and Shift/Alt modifier | ✓ |
| Always overwrite within ground layer | Brush always wins; no protection for existing work | |
| Smart: same-type replaces, different-type blocks | Rules per fixture type | |

### Q2: Layer coexistence

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — independent layers (Recommended) | Confirms Phase 1 D-28; roads and furniture coexist | ✓ |
| No — fully shared collision | Painted road blocks furniture | |

### Q3: Undo granularity

| Option | Description | Selected |
|--------|-------------|----------|
| One stroke = one undo step (Recommended) | Drag-paint stroke and confirmed fence line each collapse to one history entry | ✓ |
| One tile = one undo step | Every painted tile independent; miserable UX for long strokes | |
| Configurable | Toggle setting | |

**Notes:** All three answered with recommended defaults. Establishes that brush must integrate with zundo's batching capability (implementation detail for planner).

---

## Grid Fidelity (user-introduced, post-questions)

Not a multi-option question — user declared: **"I want you to replicate the in-game grid, this will be helpful for moving into it later."**

Captured as D-45, D-46, D-47:
- 1:1 coordinate fidelity between editor and game
- Visual grid style matches in-game dashed overlay
- Paint snaps to exact tile centers; no sub-tile drift

Added "Open research: confirm game tile origin" as a task for the planner.

## Claude's Discretion

- Exact shortcut key if P conflicts (D-29)
- Ghost line preview colors for fence line tool (D-34)
- Brush mode cursor icon
- Inline confirm/cancel overlay styling (D-36)
- Dashed grid line stroke specifics (D-46)
- Line rasterization algorithm choice (D-33)

## Deferred Ideas

- Auto-tiling for roads (Phase 5+)
- Diagonal fence lines (v2)
- Multi-tile brush (v2)
- Paint-stroke cursor preview polish
- Rectangle / flood-fill tools
- Fence orientation / sprite rotation (Phase 5)
- Brush hotbar slots (v2)
