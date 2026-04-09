# Phase 1: Foundation & Core Editor - Research

**Researched:** 2026-04-09
**Domain:** React + Konva grid editor, Zustand state management, game data integration
**Confidence:** HIGH

## Summary

Phase 1 is a greenfield scaffold of a React 19 + Konva 10 + Zustand 5 canvas editor on Vite 8. The core challenge is building a performant snap-to-grid placement system with two render layers (ground/furniture), three tool modes (Select/Move, Stamp, Remove), undo/redo, and a virtualized catalog sidebar with ~1,126 outdoor fixtures from sekai-master-db-diff.

The technology stack is well-established and all libraries have current, stable releases verified against npm. Konva's built-in drag-and-drop with `dragBoundFunc` provides the snap-to-grid primitive. Zustand's temporal middleware (zundo) handles undo/redo with configurable history limits. TanStack Virtual handles catalog list virtualization at ~1,126 items. The main complexity is in the editor state machine — coordinating tool modes, ghost previews, collision detection, keyboard shortcuts, and mandatory fixture constraints.

**Primary recommendation:** Structure the Zustand store around a single editor state with tool mode, placed items map, and active selection. Use Konva Layers (not Groups) to separate ground and furniture rendering for independent redraws. Use `dragBoundFunc` for snap-to-grid (not `onDragMove` which causes jitter). Attach keyboard listeners to the Stage container div, not to individual shapes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Left sidebar catalog + center canvas + top toolbar bar layout
- **D-02:** Sidebar is collapsible to a narrow icon strip (VS Code activity bar style) to maximize canvas space
- **D-03:** Status bar at bottom showing area level, item count, and other context
- **D-04:** Thumbnail grid display (2-3 columns) using CDN isometric images from storage.sekai.best
- **D-05:** Tab/chip bar for category filtering, sub-genre as secondary filter
- **D-06:** Click catalog item to enter stamp mode; click grid to place; stamp mode persists until mode switch
- **D-07:** Bottom hotbar with 1-9 number key shortcuts for fast item switching (pixel art workflow)
- **D-08:** Hotbar assignment: hover over catalog item + press 1-9 to assign to that slot
- **D-09:** Hover tooltip on catalog items showing full name, dimensions (WxD), and category
- **D-10:** WxD dimension badge overlay on thumbnail corner (e.g. "2x1")
- **D-11:** Virtualized scrolling for the catalog (~1,126 outdoor fixtures)
- **D-12:** Color variants deferred to v2 (VIS-02) — each fixture shown once in catalog
- **D-13:** In-game grass texture as grid background — extract the real ground texture early from game assets as a static image (not a placeholder)
- **D-14:** Subtle semi-transparent grid lines rendered over the grass texture
- **D-15:** Welcome/start screen for area level selection (1-5) before entering the editor; changeable later via toolbar dropdown
- **D-16:** Zoom range at Claude's discretion (must accommodate 36x36 to 100x100 grids)
- **D-17:** Three toolbar modes: Select/Move, Stamp, Remove — explicit toolbar toggle buttons to switch
- **D-18:** Select/Move mode: click to select, direct drag to move (snaps to grid, green/red feedback), arrow keys nudge by 1 tile
- **D-19:** Stamp mode: click grid to place active hotbar/catalog item; blocked on occupied tiles by default (ghost turns red)
- **D-20:** Overwrite toggle: toolbar button for sustained overwrite mode (stamp replaces existing item) + modifier key (Shift/Alt) for one-off override per click
- **D-21:** Remove mode: click any placed item to delete it (single click per item, no paint-erase)
- **D-22:** Tab key cycles selection between overlapping items on same tile (furniture layer first, then ground layer)
- **D-23:** Gate and house objects are auto-placed when starting a new design; movable but never removable. Visually distinct (e.g. subtle border or lock icon indicating they cannot be deleted)
- **D-24:** R key rotates selected/preview item 90deg clockwise; Shift+R for counter-clockwise. Works in both select and stamp modes
- **D-25:** Ghost preview: semi-transparent colored rectangle with green tint (valid) / red tint (blocked), showing exact grid footprint
- **D-26:** Selected item indicator: blue highlight border with small corner/edge handles
- **D-27:** Subtle flash animation on items affected by undo/redo actions
- **D-28:** GRID-12 (put-target on put-base stacking) deferred — no stacking in Phase 1. Two non-floor items cannot occupy the same tile(s). Floor/ground items coexist with furniture above them.

### Claude's Discretion
- Zoom range implementation (D-16) — pick reasonable bounds for 36x36 to 100x100 grids
- Specific icon choices for toolbar modes and collapsed sidebar
- Exact hotbar visual styling
- Undo/redo stack implementation details (minimum 20 steps per GRID-09)

### Deferred Ideas (OUT OF SCOPE)
- **GRID-12 put-target stacking** — Lamp-on-table mechanic. Deferred.
- **Color variants (VIS-02)** — v2 requirement. Each fixture shown once in catalog for Phase 1.
- **Paint-erase in remove mode** — Hold and drag to erase multiple items. Could add later.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GRID-01 | User sees an accurate grid matching in-game MySekai outdoor area dimensions | Game data verified: levels 1-2 = 36x36, level 3 = 70x70, level 4 = 90x90, level 5 = 100x100 from mysekaiSiteLayouts.json |
| GRID-02 | User can select outdoor area level (1-5) with correct grid sizes | Welcome screen + toolbar dropdown; area level config as constant map |
| GRID-03 | Grid has two render layers: ground layer (roads, rugs) and furniture layer | Konva Layer separation — 2 distinct `<Layer>` components for independent canvas redraws |
| GRID-04 | User can place furniture on the grid with snap-to-grid behavior | Konva `dragBoundFunc` for snapping; stamp mode click-to-place pattern |
| GRID-05 | User can move placed furniture to a new grid position | Select/Move mode with draggable shapes + `dragBoundFunc` snap |
| GRID-06 | User can remove placed furniture from the grid | Remove mode: click-to-delete; D-23 prevents removing gate/house |
| GRID-07 | User can rotate placed furniture (90/180/270 degrees) | R / Shift+R keyboard handlers; rotation state in placed item data |
| GRID-08 | User can pan and zoom the canvas viewport | Konva Stage draggable + wheel zoom relative to pointer position |
| GRID-09 | User can undo and redo actions (minimum 20 steps) | zundo temporal middleware with `limit: 50` (exceeds minimum) |
| GRID-10 | User sees a ghost preview before placing | Semi-transparent Konva Rect following mouse position in stamp mode |
| GRID-11 | Placed items render as colored rectangles with labels | Konva Rect + Text components using fixture colorCode field |
| GRID-12 | Put-target stacking (deferred per D-28) | Out of scope for Phase 1 — collision prevents same-tile overlap |
| CATL-01 | User can browse catalog of all MySekai fixtures | Fetch mysekaiFixtures.json, filter to outdoor (mysekaiSettableSiteType != "room"), display in virtualized sidebar |
| CATL-02 | User can search fixtures by name (Japanese) | Client-side filter on fixture `name` field (Japanese string) |
| CATL-03 | User can filter fixtures by category and sub-genre | mysekaiFixtureMainGenreId + mysekaiFixtureSubGenreId fields; genre data from mysekaiFixtureMainGenres.json + mysekaiFixtureSubGenres.json |
| CATL-04 | Catalog displays CDN isometric thumbnail images | URL pattern: `storage.sekai.best/sekai-jp-assets/mysekai/thumbnail/fixture/{assetbundleName}_1.webp` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.5 | UI framework | Declarative component model, react-konva requires it |
| TypeScript | ^5.7 | Type safety | Grid coordinates, fixture schemas, state all benefit from strong typing |
| Vite | 8.0.7 | Build tool | Rolldown-based, instant HMR, `@vitejs/plugin-react` v6 uses Oxc (no Babel) |
| Konva | 10.2.3 | 2D canvas engine | Built-in drag-and-drop, hit detection, layering, groups, transforms |
| react-konva | 19.2.3 | React bindings for Konva | Declarative canvas rendering matching React 19 |
| Zustand | 5.0.12 | State management | Single store for editor state; selector-based subscriptions avoid re-render cascades |
| zundo | 2.3.0 | Undo/redo middleware | Temporal middleware for Zustand; `limit` option; <700 bytes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-virtual | 3.13.23 | List virtualization | Catalog sidebar with ~1,126 fixture items |
| Tailwind CSS | 4.2.2 | Utility-first styling | All non-canvas UI: sidebar, toolbar, hotbar, status bar |
| lucide-react | 1.7.0 | Icon set | Toolbar mode icons, sidebar collapse, status bar indicators |
| @radix-ui/react-tooltip | 1.2.8 | Tooltip primitive | Catalog item hover tooltips (D-09) |
| @radix-ui/react-dropdown-menu | 2.1.16 | Dropdown primitive | Area level selector in toolbar |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| zundo | zustand-travel | zustand-travel uses JSON patches (less memory), but zundo is simpler, battle-tested, and sufficient for ~50-step history of a grid editor |
| @tanstack/react-virtual | react-window | react-window is older; TanStack Virtual is the maintained successor with better dynamic sizing |
| lucide-react | heroicons | Both work; lucide has broader icon set and better tree-shaking |

**Installation:**
```bash
pnpm create vite@latest mysekai-planner --template react-ts
cd mysekai-planner
pnpm add react-konva konva zustand zundo @tanstack/react-virtual tailwindcss lucide-react @radix-ui/react-tooltip @radix-ui/react-dropdown-menu
pnpm add -D vitest @testing-library/react jsdom
```

**Version verification (confirmed 2026-04-09 against npm registry):**
- react: 19.2.5, konva: 10.2.3, react-konva: 19.2.3, zustand: 5.0.12
- zundo: 2.3.0, @tanstack/react-virtual: 3.13.23, vite: 8.0.7
- tailwindcss: 4.2.2, lucide-react: 1.7.0, vitest: 4.1.3

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── canvas/           # Konva canvas components
│   │   ├── EditorCanvas.tsx      # Stage + Layers container
│   │   ├── GridLayer.tsx         # Grid lines + grass texture background
│   │   ├── GroundLayer.tsx       # Ground items (roads, rugs)
│   │   ├── FurnitureLayer.tsx    # Furniture items
│   │   ├── GhostPreview.tsx      # Semi-transparent placement preview
│   │   └── PlacedItem.tsx        # Single placed item (Rect + Text label)
│   ├── catalog/          # Sidebar catalog components
│   │   ├── CatalogSidebar.tsx    # Collapsible sidebar container
│   │   ├── CatalogSearch.tsx     # Search input
│   │   ├── CategoryFilter.tsx    # Tab/chip bar for genre filtering
│   │   ├── CatalogGrid.tsx       # Virtualized thumbnail grid
│   │   └── CatalogItem.tsx       # Single catalog thumbnail card
│   ├── toolbar/          # Top toolbar components
│   │   ├── Toolbar.tsx           # Tool mode buttons, area selector
│   │   └── ToolButton.tsx        # Individual tool mode toggle
│   ├── hotbar/           # Bottom hotbar components
│   │   └── Hotbar.tsx            # 1-9 quick-select slots
│   ├── status/           # Bottom status bar
│   │   └── StatusBar.tsx         # Area level, item count, context
│   └── welcome/          # Welcome/start screen
│       └── WelcomeScreen.tsx     # Area level selection
├── stores/
│   └── editorStore.ts    # Zustand store with zundo temporal
├── data/
│   ├── fixtures.ts       # Fixture data fetching + types
│   ├── genres.ts         # Genre/sub-genre data
│   └── areaLevels.ts     # Area level -> grid dimensions map
├── hooks/
│   ├── useKeyboard.ts    # Keyboard shortcut handler
│   ├── useGridSnap.ts    # Snap-to-grid calculation
│   └── useCollision.ts   # Tile occupancy detection
├── types/
│   └── editor.ts         # TypeScript interfaces for editor state
├── utils/
│   ├── grid.ts           # Grid math utilities
│   └── color.ts          # Fixture color fallback logic
├── assets/
│   └── grass-texture.webp  # Extracted in-game grass texture
├── App.tsx
└── main.tsx
```

### Pattern 1: Zustand Editor Store with Undo/Redo
**What:** Single Zustand store wrapped in zundo temporal middleware holds all editor state.
**When to use:** All editor actions that modify placed items.
**Example:**
```typescript
// Source: https://github.com/charkour/zundo + Zustand docs
import { create } from 'zustand';
import { temporal } from 'zundo';

interface PlacedItem {
  id: string;
  fixtureId: number;
  x: number;  // grid column
  y: number;  // grid row
  rotation: 0 | 90 | 180 | 270;
  layer: 'ground' | 'furniture';
  isSystem: boolean;  // gate/house = true, cannot remove
}

type ToolMode = 'select' | 'stamp' | 'remove';

interface EditorState {
  // -- 核心编辑器状态 --
  areaLevel: 1 | 2 | 3 | 4 | 5;
  gridSize: { width: number; depth: number };
  placedItems: Record<string, PlacedItem>;
  selectedItemId: string | null;
  toolMode: ToolMode;
  activeFixtureId: number | null;  // 当前选中的家具ID（用于stamp模式）
  overwriteEnabled: boolean;

  // -- 动作 --
  placeItem: (item: Omit<PlacedItem, 'id'>) => void;
  moveItem: (id: string, x: number, y: number) => void;
  rotateItem: (id: string, direction: 'cw' | 'ccw') => void;
  removeItem: (id: string) => void;
  setToolMode: (mode: ToolMode) => void;
  setAreaLevel: (level: 1 | 2 | 3 | 4 | 5) => void;
}

const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      areaLevel: 1,
      gridSize: { width: 36, depth: 36 },
      placedItems: {},
      selectedItemId: null,
      toolMode: 'select',
      activeFixtureId: null,
      overwriteEnabled: false,

      placeItem: (item) => set((state) => {
        const id = crypto.randomUUID();
        return {
          placedItems: { ...state.placedItems, [id]: { ...item, id } }
        };
      }),

      moveItem: (id, x, y) => set((state) => ({
        placedItems: {
          ...state.placedItems,
          [id]: { ...state.placedItems[id], x, y }
        }
      })),

      rotateItem: (id, direction) => set((state) => {
        const item = state.placedItems[id];
        if (!item) return state;
        const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
        const idx = rotations.indexOf(item.rotation);
        const newIdx = direction === 'cw'
          ? (idx + 1) % 4
          : (idx + 3) % 4;
        return {
          placedItems: {
            ...state.placedItems,
            [id]: { ...item, rotation: rotations[newIdx] }
          }
        };
      }),

      removeItem: (id) => set((state) => {
        if (state.placedItems[id]?.isSystem) return state; // 系统家具不可删除
        const { [id]: _, ...rest } = state.placedItems;
        return { placedItems: rest, selectedItemId: null };
      }),

      setToolMode: (mode) => set({ toolMode: mode }),
      setAreaLevel: (level) => {
        const sizes = { 1: 36, 2: 36, 3: 70, 4: 90, 5: 100 };
        set({ areaLevel: level, gridSize: { width: sizes[level], depth: sizes[level] } });
      },
    }),
    {
      limit: 50,  // 超过GRID-09最低20步要求
      // 只追踪placedItems变化，不追踪UI状态（toolMode, selectedItemId等）
      partialize: (state) => ({
        placedItems: state.placedItems,
      }),
    }
  )
);
```

### Pattern 2: Konva Snap-to-Grid with dragBoundFunc
**What:** Use `dragBoundFunc` (not `onDragMove`) for jitter-free grid snapping during drag.
**When to use:** All draggable placed items in Select/Move mode.
**Example:**
```typescript
// Source: https://konvajs.org/docs/sandbox/Objects_Snapping.html
const TILE_SIZE = 32; // 像素每格

// dragBoundFunc在拖拽循环中同步调用，无抖动
const snapToGrid = (pos: { x: number; y: number }) => ({
  x: Math.round(pos.x / TILE_SIZE) * TILE_SIZE,
  y: Math.round(pos.y / TILE_SIZE) * TILE_SIZE,
});

// react-konva组件中使用
<Rect
  x={item.x * TILE_SIZE}
  y={item.y * TILE_SIZE}
  width={fixture.gridSize.width * TILE_SIZE}
  height={fixture.gridSize.depth * TILE_SIZE}
  fill={fixture.colorCode || '#888888'}
  draggable={toolMode === 'select'}
  dragBoundFunc={snapToGrid}
  onDragEnd={(e) => {
    const newGridX = Math.round(e.target.x() / TILE_SIZE);
    const newGridY = Math.round(e.target.y() / TILE_SIZE);
    moveItem(item.id, newGridX, newGridY);
  }}
/>
```

### Pattern 3: Wheel Zoom Relative to Pointer
**What:** Zoom canvas centered on cursor position, not center of stage.
**When to use:** GRID-08 pan and zoom.
**Example:**
```typescript
// Source: https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html
const SCALE_BY = 1.05;
const MIN_SCALE = 0.2;   // 能看到整个100x100网格
const MAX_SCALE = 3.0;   // 近距离查看细节

const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
  e.evt.preventDefault();
  const stage = e.target.getStage();
  if (!stage) return;

  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  // trackpad pinch发送ctrlKey，需要反转方向
  const direction = e.evt.deltaY > 0 ? -1 : 1;
  const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE,
    direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY
  ));

  stage.scale({ x: newScale, y: newScale });
  stage.position({
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  });
};
```

### Pattern 4: Keyboard Events on Stage Container
**What:** Attach keyboard listeners to the Konva stage container div, not individual shapes.
**When to use:** All keyboard shortcuts (R/Shift+R rotate, 1-9 hotbar, Tab cycle, Delete remove).
**Example:**
```typescript
// Source: https://konvajs.org/docs/events/Keyboard_Events.html
// 注意: Konva没有内置键盘事件，必须监听容器DOM
const stageRef = useRef<Konva.Stage>(null);

useEffect(() => {
  const container = stageRef.current?.container();
  if (!container) return;
  container.tabIndex = 1;  // 使容器可聚焦
  container.style.outline = 'none';  // 隐藏焦点边框
  container.focus();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'r' && !e.shiftKey) rotateSelected('cw');
    if (e.key === 'r' && e.shiftKey) rotateSelected('ccw');
    if (e.key === 'Tab') { e.preventDefault(); cycleSelection(); }
    if (e.key >= '1' && e.key <= '9') handleHotbar(parseInt(e.key));
    // 方向键: 在select模式下微调选中物品
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
      nudgeSelected(e.key);
    }
  };
  container.addEventListener('keydown', handleKeyDown);
  return () => container.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Anti-Patterns to Avoid
- **Using `onDragMove` for snapping instead of `dragBoundFunc`:** Setting `node.position()` in `onDragMove` causes visible jitter because it fights Konva's internal drag loop. `dragBoundFunc` is called synchronously within the drag loop.
- **Creating too many Konva Layers:** Each Layer creates 2 canvas elements (scene + hit graph). Limit to 3-4 max. Use Groups within layers for logical organization.
- **Storing transient UI state in the temporal (undo) store:** `toolMode`, `selectedItemId`, `hoveredTile` should NOT be tracked by zundo. Use `partialize` to only track `placedItems`.
- **Listening to keyboard events on individual Konva shapes:** Konva shapes don't support keyboard events. Attach to the Stage container div.
- **Re-rendering the entire canvas on every state change:** Use Zustand selectors (`useEditorStore(s => s.placedItems)`) so only components that read changed state re-render. Konva's react-konva reconciler handles canvas efficiently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Undo/redo system | Custom action stack with inverse operations | zundo temporal middleware | Edge cases: batch operations, partial state tracking, memory limits, future state clearing on new action |
| List virtualization | Manual DOM recycling for catalog scroll | @tanstack/react-virtual | Scroll jank, dynamic sizing, overscan, measurement — all solved |
| Drag-and-drop | Custom mouse event tracking for canvas items | Konva's built-in `draggable` + `dragBoundFunc` | Hit detection, drag boundaries, event bubbling, touch support all handled |
| Tooltip positioning | Custom absolute-positioned div | @radix-ui/react-tooltip | Collision detection, portal rendering, accessibility, animation |
| Icon system | Custom SVG imports | lucide-react | Tree-shakeable, consistent design, 1500+ icons |
| Grid snap math | Complex snapping algorithm | Simple `Math.round(pos / TILE_SIZE) * TILE_SIZE` | Grid snapping is just rounding to nearest multiple; don't overcomplicate |

**Key insight:** The editor's complexity is in state coordination (tool modes, collision detection, mandatory fixtures, undo boundaries), not in rendering primitives. Use libraries for rendering and focus custom code on the editor state machine.

## Game Data Schema (Verified from sekai-master-db-diff)

### Area Level Grid Dimensions
| Level | Width | Depth | Source |
|-------|-------|-------|--------|
| 1 | 36 | 36 | mysekaiSiteLayouts.json (mysekaiSiteLevelId=1, mysekaiLayoutType=floor) |
| 2 | 36 | 36 | mysekaiSiteLayouts.json (mysekaiSiteLevelId=2) |
| 3 | 70 | 70 | mysekaiSiteLayouts.json (mysekaiSiteLevelId=3) |
| 4 | 90 | 90 | mysekaiSiteLayouts.json (mysekaiSiteLevelId=4) |
| 5 | 100 | 100 | mysekaiSiteLayouts.json (mysekaiSiteLevelId=5) |

Note: Levels 1 and 2 share the same 36x36 grid. The difference between them is `characterEntryMaxNum` (1 vs 2) and `putCostLimit` (10000 vs 11000), not grid size.

### mysekaiFixtures.json — Key Fields for Phase 1
| Field | Type | Usage |
|-------|------|-------|
| `id` | number | Unique fixture identifier |
| `name` | string | Japanese display name |
| `pronunciation` | string | Hiragana reading (for search matching) |
| `assetbundleName` | string | CDN thumbnail path segment |
| `gridSize.width` | number | Footprint width in grid tiles |
| `gridSize.depth` | number | Footprint depth in grid tiles |
| `colorCode` | string (hex) | Color for rectangle rendering (may be empty) |
| `mysekaiFixtureType` | string | "normal", "system", "surface_appearance" |
| `mysekaiFixtureMainGenreId` | number | FK to mysekaiFixtureMainGenres.json |
| `mysekaiFixtureSubGenreId` | number | FK to mysekaiFixtureSubGenres.json |
| `mysekaiSettableSiteType` | string | "home", "room", "any" — filter to exclude "room"-only |
| `mysekaiSettableLayoutType` | string | "floor", "wall", "rug", "wall_appearance" — determines layer |
| `mysekaiFixturePutType` | string | "none", "put_base", "put_target" — deferred for Phase 1 |

### CDN Thumbnail URL Pattern
```
https://storage.sekai.best/sekai-jp-assets/mysekai/thumbnail/fixture/{assetbundleName}_1.webp
```
- Images are 152x152 WebP isometric thumbnails
- Used for catalog sidebar only (wrong perspective for grid placement)

### Genre Filtering Data
- **mysekaiFixtureMainGenres.json**: 33 main categories (id, name, mysekaiFixtureMainGenreType, assetbundleName)
- **mysekaiFixtureSubGenres.json**: Sub-categories within each main genre (id, name, mysekaiFixtureSubGenreType, assetbundleName)
- Filter chain: MainGenre tab/chip -> SubGenre secondary filter -> text search within results

### Outdoor Fixture Filtering
To get outdoor-only fixtures (~1,126 items), filter by:
- `mysekaiSettableSiteType` !== "room" (include "home" and "any")
- Exclude `mysekaiFixtureType` === "system" from catalog display (system fixtures are auto-placed)
- `mysekaiSettableLayoutType` determines render layer: "floor"/"rug" -> ground layer, everything else -> furniture layer

### System/Mandatory Fixtures
- mysekaiSystemFixtures.json lists system fixtures by type
- Gate and house fixtures have `mysekaiFixtureType: "system"` in mysekaiFixtures.json
- Must be auto-placed at default positions when starting new design
- Movable but not removable (D-23)

## Common Pitfalls

### Pitfall 1: Safari Performance with tabIndex on Stage Container
**What goes wrong:** Setting `tabIndex` on the Konva stage container div causes significant performance degradation in Safari.
**Why it happens:** Safari's accessibility engine re-scans focusable canvas elements aggressively.
**How to avoid:** Use `tabIndex={-1}` (programmatically focusable but not tab-navigable) instead of `tabIndex={1}`. Call `.focus()` on click/interaction. Alternatively, attach keyboard listeners to `window` with a "canvas focused" flag.
**Warning signs:** Canvas animations stutter only in Safari.

### Pitfall 2: Konva Layer Proliferation
**What goes wrong:** Creating too many Layers (one per item type, one per interaction state) leads to excessive canvas elements.
**Why it happens:** Each Konva Layer creates 2 HTML canvas elements (scene + hit graph). More than 5 layers = noticeable overhead.
**How to avoid:** Use exactly 3-4 Layers: (1) background/grid, (2) ground items, (3) furniture items, (4) overlay/ghost preview. Use Groups within Layers for logical grouping.
**Warning signs:** DOM inspector shows 10+ canvas elements.

### Pitfall 3: Zustand Re-renders on Every Placed Item Change
**What goes wrong:** Components that use `useEditorStore()` without selectors re-render on every state change including mouse movements.
**Why it happens:** Without selectors, Zustand's shallow equality check on the entire store object always returns false.
**How to avoid:** Always use selectors: `useEditorStore(s => s.placedItems)`, `useEditorStore(s => s.toolMode)`. For canvas items that only need their own data, select by ID.
**Warning signs:** React DevTools Profiler shows excessive re-renders during drag operations.

### Pitfall 4: zundo Tracking Too Much State
**What goes wrong:** Undo/redo captures tool mode changes, selection changes, zoom level — not just item placements.
**Why it happens:** Without `partialize`, zundo snapshots the entire store on every `set()` call.
**How to avoid:** Use `partialize` to only track `placedItems` (the actual design data). Tool mode, selection, and viewport state are transient.
**Warning signs:** Pressing undo changes the selected tool instead of undoing a placement.

### Pitfall 5: Ghost Preview Collision Detection is O(n) per Mouse Move
**What goes wrong:** Checking every placed item for tile overlap on every mouse move event causes frame drops at 200+ items.
**Why it happens:** Naive collision check iterates all items to detect occupied tiles.
**How to avoid:** Maintain a 2D occupancy grid (`Map<string, string>` keyed by `${x},${y}`) updated on place/move/remove. Collision check becomes O(w*d) where w*d is the fixture footprint (typically 1-4 tiles), regardless of total item count.
**Warning signs:** Ghost preview lags behind cursor on large grids with many items.

### Pitfall 6: Fetching Game Data Without Caching
**What goes wrong:** Re-fetching mysekaiFixtures.json (~1,126 items) on every component mount or re-render.
**Why it happens:** Using `useEffect` + `fetch` without proper caching.
**How to avoid:** Fetch game data once on app startup, store in a separate Zustand store (or React context). Game data is static — it never changes during a session. Consider bundling critical data at build time if the JSON is small enough.
**Warning signs:** Network tab shows repeated fetches of the same JSON files.

### Pitfall 7: Rotation Changes Width/Depth Confusion
**What goes wrong:** A 2x1 furniture rotated 90deg should occupy 1x2 grid tiles, but the rendering doesn't swap width/depth.
**Why it happens:** Rotation is applied visually but the collision/snap logic still uses the original width/depth.
**How to avoid:** Compute effective footprint: at 0/180deg use (width, depth), at 90/270deg use (depth, width). Apply this consistently in rendering, collision detection, and ghost preview.
**Warning signs:** Rotated items overlap with neighbors or leave gaps in collision grid.

## Code Examples

### Virtualized Catalog with TanStack Virtual
```typescript
// Source: https://tanstack.com/virtual/latest/docs/introduction
import { useVirtualizer } from '@tanstack/react-virtual';

function CatalogGrid({ fixtures }: { fixtures: Fixture[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const COLUMNS = 2;
  const rowCount = Math.ceil(fixtures.length / COLUMNS);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // 每行预估高度
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
              width: '100%',
            }}
            className="grid grid-cols-2 gap-2 px-2"
          >
            {Array.from({ length: COLUMNS }).map((_, col) => {
              const idx = virtualRow.index * COLUMNS + col;
              const fixture = fixtures[idx];
              if (!fixture) return null;
              return <CatalogItem key={fixture.id} fixture={fixture} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Collision Detection with Occupancy Grid
```typescript
// 占位格子查询 — O(1) 查找 vs O(n) 遍历
type OccupancyGrid = Map<string, string>; // "x,y" -> itemId

function buildOccupancyGrid(items: Record<string, PlacedItem>, fixtures: Map<number, Fixture>): OccupancyGrid {
  const grid = new Map<string, string>();
  for (const item of Object.values(items)) {
    const fixture = fixtures.get(item.fixtureId);
    if (!fixture) continue;
    const [w, d] = getEffectiveSize(fixture.gridSize, item.rotation);
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < d; dy++) {
        grid.set(`${item.x + dx},${item.y + dy}`, item.id);
      }
    }
  }
  return grid;
}

function canPlace(
  grid: OccupancyGrid,
  x: number, y: number,
  width: number, depth: number,
  gridWidth: number, gridDepth: number,
  layer: 'ground' | 'furniture',
  excludeItemId?: string  // 移动时排除自身
): boolean {
  for (let dx = 0; dx < width; dx++) {
    for (let dy = 0; dy < depth; dy++) {
      const key = `${x + dx},${y + dy}`;
      // 边界检查
      if (x + dx >= gridWidth || y + dy >= gridDepth || x + dx < 0 || y + dy < 0) return false;
      // 占用检查（地面层和家具层分开检测）
      const occupant = grid.get(key);
      if (occupant && occupant !== excludeItemId) return false;
    }
  }
  return true;
}

// 获取旋转后的实际尺寸
function getEffectiveSize(
  gridSize: { width: number; depth: number },
  rotation: 0 | 90 | 180 | 270
): [number, number] {
  if (rotation === 90 || rotation === 270) {
    return [gridSize.depth, gridSize.width];
  }
  return [gridSize.width, gridSize.depth];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vite 7 (esbuild + Rollup) | Vite 8 (Rolldown) | March 2026 | Faster builds, @vitejs/plugin-react v6 uses Oxc instead of Babel |
| react-window for virtualization | @tanstack/react-virtual | 2023+ | Better dynamic sizing, maintained, framework-agnostic core |
| Custom undo/redo stacks | zundo temporal middleware | 2023+ | Declarative, <700B, integrates directly with Zustand |
| Zustand v4 | Zustand v5 | 2024 | Better TypeScript inference, smaller bundle |
| Tailwind CSS v3 (config file) | Tailwind CSS v4 (auto-detect) | 2025 | No config file needed, faster builds, new engine |

**Deprecated/outdated:**
- Konva `FastLayer`: Deprecated in modern Konva. Use regular Layer with `listening(false)` for non-interactive layers.
- `react-window`: Still works but TanStack Virtual is the maintained successor.
- Vite `@vitejs/plugin-react` v5: Uses Babel. v6 switched to Oxc for React Refresh.

## Open Questions

1. **Grass texture extraction**
   - What we know: D-13 requires the real in-game grass texture, not a placeholder. The asset must be extracted from game bundles via sssekai or found in community resources.
   - What's unclear: Whether the texture is available as a static image in community repos, or needs manual extraction from Unity asset bundles.
   - Recommendation: Search for existing community-extracted textures first. If unavailable, use a high-quality grass texture placeholder for Phase 1 and extract the real one during Phase 5 (sprite pipeline). Flag this as a known substitution.

2. **Mandatory fixture default positions**
   - What we know: Gate and house must be auto-placed (D-23). mysekaiSystemFixtures.json identifies system fixtures.
   - What's unclear: The exact default grid positions for gate/house when starting a new design. The game data doesn't include placement coordinates.
   - Recommendation: Place gate at a sensible entrance position (e.g., bottom-center of grid) and house at center. Allow the user to move them. These positions are cosmetic defaults, not gameplay-critical.

3. **Layer separation for collision detection**
   - What we know: D-28 says floor/ground items coexist with furniture above them. Two non-floor items cannot overlap.
   - What's unclear: Whether ground-layer collision should prevent overlapping ground items (e.g., two rugs on same tile) or allow stacking.
   - Recommendation: Maintain separate occupancy grids per layer. Ground items can't overlap with other ground items; furniture can't overlap with other furniture. Ground and furniture on the same tile is allowed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build toolchain | Yes | v25.8.0 | -- |
| pnpm | Package management | Yes | 10.28.2 | -- |
| git | Version control | Yes | 2.50.1 | -- |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None. This phase is pure frontend development with no external service dependencies.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.3 |
| Config file | none -- Wave 0 must create `vitest.config.ts` |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GRID-01 | Area level produces correct grid dimensions | unit | `pnpm vitest run src/__tests__/areaLevels.test.ts -t "grid dimensions"` | Wave 0 |
| GRID-02 | Level selection updates grid size | unit | `pnpm vitest run src/__tests__/editorStore.test.ts -t "setAreaLevel"` | Wave 0 |
| GRID-03 | Items placed on correct layer (ground vs furniture) | unit | `pnpm vitest run src/__tests__/editorStore.test.ts -t "layer assignment"` | Wave 0 |
| GRID-04 | Place item snaps to grid and adds to store | unit | `pnpm vitest run src/__tests__/editorStore.test.ts -t "placeItem"` | Wave 0 |
| GRID-05 | Move item updates position in store | unit | `pnpm vitest run src/__tests__/editorStore.test.ts -t "moveItem"` | Wave 0 |
| GRID-06 | Remove item (non-system) deletes from store; system item protected | unit | `pnpm vitest run src/__tests__/editorStore.test.ts -t "removeItem"` | Wave 0 |
| GRID-07 | Rotate item cycles through 0/90/180/270 | unit | `pnpm vitest run src/__tests__/editorStore.test.ts -t "rotateItem"` | Wave 0 |
| GRID-08 | Pan/zoom (canvas interaction) | manual-only | Visual verification of scroll/drag behavior | -- |
| GRID-09 | Undo/redo restores previous states (min 20) | unit | `pnpm vitest run src/__tests__/editorStore.test.ts -t "undo redo"` | Wave 0 |
| GRID-10 | Ghost preview (canvas rendering) | manual-only | Visual verification of preview overlay | -- |
| GRID-11 | Placed items render as colored rectangles | manual-only | Visual verification of Konva rendering | -- |
| GRID-12 | Deferred (D-28) | -- | -- | -- |
| CATL-01 | Fixture data loads and filters outdoor items | unit | `pnpm vitest run src/__tests__/fixtures.test.ts -t "outdoor filter"` | Wave 0 |
| CATL-02 | Search by Japanese name filters correctly | unit | `pnpm vitest run src/__tests__/fixtures.test.ts -t "search"` | Wave 0 |
| CATL-03 | Genre/sub-genre filtering | unit | `pnpm vitest run src/__tests__/fixtures.test.ts -t "genre filter"` | Wave 0 |
| CATL-04 | CDN thumbnail URL construction | unit | `pnpm vitest run src/__tests__/fixtures.test.ts -t "thumbnail URL"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run --reporter=verbose`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest configuration with jsdom environment
- [ ] `src/__tests__/editorStore.test.ts` -- Store action tests (place, move, rotate, remove, undo/redo, system fixture protection)
- [ ] `src/__tests__/areaLevels.test.ts` -- Area level -> grid dimension mapping
- [ ] `src/__tests__/fixtures.test.ts` -- Fixture data filtering, search, genre filter, CDN URL construction
- [ ] `src/__tests__/grid.test.ts` -- Grid math utilities (snap, collision, effective size after rotation)

## Project Constraints (from CLAUDE.md)

- **Hosting:** GitHub Pages (static files only) -- no server-side logic, no database
- **Code comments:** Chinese with ASCII block separators
- **File limit:** Max 800 lines per file
- **Function limit:** Max 50 lines, max 3 nesting levels
- **Directory limit:** Max 8 files per level
- **Three-question filter:** Before any change: (1) Real need or speculation? (2) Simpler approach? (3) What breaks?
- **Scope discipline:** Must NOT modify code outside task scope
- **Backward compatibility:** Any change that breaks existing functionality is a bug
- **Simplicity first:** Always write the simplest working implementation first
- **Doc-code isomorphism:** Code change MUST update docs; doc change MUST verify code
- **Language:** UI in Chinese + Japanese; game item names in Japanese only
- **Grid accuracy:** Must match actual in-game MySekai outdoor area dimensions
- **Data pipeline:** Fixture metadata from Sekai-World GitHub data
- **GSD workflow enforcement:** Use GSD commands for all file changes

## Sources

### Primary (HIGH confidence)
- [Konva Objects Snapping](https://konvajs.org/docs/sandbox/Objects_Snapping.html) -- Snap-to-grid pattern, dragBoundFunc vs onDragMove
- [Konva Zooming Relative to Pointer](https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html) -- Wheel zoom math
- [Konva Drag and Drop](https://konvajs.org/docs/react/Drag_And_Drop.html) -- react-konva drag patterns
- [Konva Layer Management](https://konvajs.org/docs/performance/Layer_Management.html) -- Layer performance tips
- [Konva Keyboard Events](https://konvajs.org/docs/events/Keyboard_Events.html) -- Stage container focus approach
- [zundo GitHub](https://github.com/charkour/zundo) -- Temporal middleware API, limit option, partialize
- [TanStack Virtual docs](https://tanstack.com/virtual/latest/docs/introduction) -- Virtualizer API
- [sekai-master-db-diff](https://github.com/Sekai-World/sekai-master-db-diff) -- Game data JSON schemas (verified by direct fetch)
- npm registry -- All package versions verified 2026-04-09

### Secondary (MEDIUM confidence)
- [Building canvas-based editors in React (Konva patterns)](https://www.alikaraki.me/blog/canvas-editors-konva) -- Editor architecture patterns
- [Shape snapping with React Konva (BigBinary)](https://www.bigbinary.com/blog/shape-snapping-with-react-konva) -- Snapping implementation patterns
- [Adding zoom and panning to react-konva stage](https://colinwren.is/blog/adding-zoom-and-panning-to-your-react-konva-stage/) -- Pan/zoom react-konva patterns

### Tertiary (LOW confidence)
- [Safari tabIndex performance issue](https://github.com/konvajs/react-konva/issues/645) -- Safari-specific performance problem with tabIndex

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries verified against npm, React 19 + Konva 10 + Zustand 5 is well-proven
- Architecture: HIGH -- Patterns sourced from official Konva docs and community best practices
- Game data: HIGH -- JSON schemas verified by direct fetch from sekai-master-db-diff
- Pitfalls: MEDIUM -- Based on GitHub issues and community reports; Safari issue needs validation

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable stack, 30-day window)
