# Architecture Patterns

**Domain:** Browser-based 2D grid/tile editor (furniture placement planner)
**Researched:** 2026-04-09

## Recommended Architecture

### High-Level Overview

```
+------------------------------------------------------------------+
|                        React App Shell                            |
|  +-------------------+  +--------------------+  +--------------+ |
|  |   Toolbar / UI    |  |  Furniture Catalog  |  | Cost Panel   | |
|  |   (React DOM)     |  |  (React DOM)        |  | (React DOM)  | |
|  +-------------------+  +--------------------+  +--------------+ |
|  +-----------------------------------------------------------+   |
|  |                   Canvas Viewport                          |   |
|  |  +--------------------------------------------------+     |   |
|  |  |  Konva Stage (react-konva)                        |     |   |
|  |  |  +------------------+  +----------------------+  |     |   |
|  |  |  | Grid Layer       |  | Objects Layer        |  |     |   |
|  |  |  | (lines, labels)  |  | (placed furniture)   |  |     |   |
|  |  |  +------------------+  +----------------------+  |     |   |
|  |  |  +------------------+  +----------------------+  |     |   |
|  |  |  | Preview Layer    |  | Selection Layer      |  |     |   |
|  |  |  | (ghost item)     |  | (highlight, handles) |  |     |   |
|  |  |  +------------------+  +----------------------+  |     |   |
|  |  +--------------------------------------------------+     |   |
|  +-----------------------------------------------------------+   |
+------------------------------------------------------------------+
         |                    |                    |
   +-----v------+    +-------v--------+    +------v-------+
   |  Zustand    |    | Data Service   |    | Serializer   |
   |  Store      |    | (fetch catalog)|    | (URL/storage)|
   +-------------+    +----------------+    +--------------+
```

### Why This Stack (Not Paper.js Like Happy Island Designer)

Happy Island Designer uses Paper.js, a vector graphics library oriented toward freeform drawing (paths, brushes, bezier curves). MySekai Planner is fundamentally different: it places discrete rectangular objects on a grid. This is a **scene graph problem**, not a drawing problem.

**react-konva** is the right choice because:
1. Declarative React components map directly to canvas objects -- each placed furniture is a `<Rect>` or `<Image>` in JSX
2. Built-in drag-and-drop with snap-to-grid (`dragBoundFunc`)
3. Layer system matches our needs (grid, objects, preview, selection)
4. Hit detection for click/select on placed items comes free
5. Sister project already uses React -- consistent DX

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **App Shell** | Layout, routing between edit/share views, top-level providers | All components via context/store |
| **Canvas Viewport** | Konva Stage: pan, zoom, coordinate transforms | Store (reads placed items), Toolbar (active tool) |
| **Grid Layer** | Renders grid lines matching in-game dimensions | Canvas Viewport (coordinate system) |
| **Objects Layer** | Renders placed furniture as Konva nodes, handles drag/select | Store (placed items state) |
| **Preview Layer** | Ghost image showing where item will be placed on hover | Canvas Viewport (mouse position), Store (active catalog item) |
| **Selection Layer** | Highlight selected item, show rotation/delete handles | Store (selection state) |
| **Toolbar** | Tool selection (place, select, delete, road brush), undo/redo buttons | Store (active tool, history) |
| **Furniture Catalog** | Searchable/filterable list of available furniture | Data Service (catalog data), Store (sets active item for placement) |
| **Cost Panel** | Shows material costs for all placed items, inventory delta | Store (placed items), Data Service (recipe data) |
| **Data Service** | Fetches and caches furniture catalog, recipes, materials from sekai-master-db-diff | External API (GitHub raw URLs) |
| **Serializer** | Encodes/decodes blueprint to URL hash, reads/writes localStorage | Store (full placement state) |
| **Zustand Store** | Central state: placed items, selection, active tool, undo history, inventory | All UI components |

### Data Flow

```
[Startup]
  Data Service --fetch--> GitHub raw (sekai-master-db-diff)
    --> mysekaiFixtures.json (furniture catalog with gridSize)
    --> mysekaiItems.json (crafting recipe costs)
    --> mysekaiMaterials.json (material definitions)
  Data Service --cache--> in-memory Map + sessionStorage
  
  Serializer --check--> URL hash present?
    YES --> decompress (lz-string) --> hydrate Store with blueprint
    NO  --> Serializer --check--> localStorage has autosave?
      YES --> hydrate Store with last session
      NO  --> empty grid

[Editing]
  User clicks catalog item --> Store.activeItem = fixtureId
  User moves mouse over grid --> Preview Layer shows ghost at snapped position
  User clicks grid cell --> Store.placeItem(fixtureId, position, rotation)
    --> command pushed to undo history
    --> Objects Layer re-renders (React reconciliation)
    --> Cost Panel recalculates totals
  
  User drags placed item --> snap to grid --> Store.moveItem(id, newPos)
  User presses R --> Store.rotateItem(id)
  User presses Delete --> Store.removeItem(id)
  User presses Ctrl+Z --> Store.undo() --> restore previous state snapshot

[Saving]
  Autosave timer (10s idle) --> Serializer.saveToLocalStorage(store.state)
  User clicks "Share" --> Serializer.encodeToURL(store.placedItems)
    --> JSON.stringify --> lz-string compressToEncodedURIComponent
    --> set window.location.hash
    --> copy URL to clipboard

[Cost Calculation]
  Store.placedItems changes --> Cost Panel derives:
    fixtureId --> lookup recipe --> sum material quantities
    --> subtract user inventory (from localStorage)
    --> display remaining costs
```

## Core Data Model

```typescript
// =====================================================
// 核心数据模型
// =====================================================

/** 家具目录条目 - 来自 mysekaiFixtures.json */
interface CatalogFixture {
  id: number;
  name: string;                       // 日文名
  gridWidth: number;                  // 格子宽度
  gridDepth: number;                  // 格子深度
  mysekaiFixtureMainGenreId: number;  // 分类ID
  mysekaiSettableSiteType: string;    // "outdoor" | "indoor" | ...
  mysekaiSettableLayoutType: string;  // "floor" | "wall" | ...
  thumbnailAssetBundleName?: string;  // CDN图片资源名
}

/** 放置的物品实例 */
interface PlacedItem {
  instanceId: string;       // 唯一实例ID (nanoid)
  fixtureId: number;        // 关联目录ID
  gridX: number;            // 网格列
  gridY: number;            // 网格行
  rotation: 0 | 90 | 180 | 270;
}

/** 蓝图 - 用于序列化/分享 */
interface Blueprint {
  version: number;
  siteType: string;         // 哪个户外区域
  items: PlacedItem[];
}

/** 撤销/重做历史 */
interface HistoryEntry {
  placedItems: PlacedItem[];  // 完整快照 (简单可靠)
}
```

## Patterns to Follow

### Pattern 1: Zustand Store with Temporal Middleware (Undo/Redo)

**What:** Use zustand for state management with zundo middleware for undo/redo.
**Why:** Zustand is lightweight (~1KB), works naturally with React, and zundo adds undo/redo as middleware with <700 bytes. No need for a custom command pattern -- snapshot-based undo is simpler and sufficient for this scale (a blueprint is just an array of ~100-200 items).
**Confidence:** HIGH (zundo is well-maintained, 1.6k GitHub stars, published approach)

```typescript
import { create } from 'zustand';
import { temporal } from 'zundo';

interface EditorState {
  placedItems: PlacedItem[];
  selectedId: string | null;
  activeTool: 'place' | 'select' | 'delete' | 'road';
  activeFixtureId: number | null;
  
  placeItem: (fixtureId: number, x: number, y: number) => void;
  moveItem: (id: string, x: number, y: number) => void;
  rotateItem: (id: string) => void;
  removeItem: (id: string) => void;
}

const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
      placedItems: [],
      selectedId: null,
      activeTool: 'select',
      activeFixtureId: null,
      // ... actions that call set()
    }),
    { limit: 50 } // 最多保留50步历史
  )
);
```

### Pattern 2: Collision Detection via Occupancy Grid

**What:** Maintain a 2D boolean/ID array representing occupied cells. Check before placement.
**Why:** O(1) lookup per cell vs. O(n) scanning all placed items. Grid is small enough (outdoor areas are roughly 20x20 to 40x40 cells) to keep a full array in memory.

```typescript
// occupancyGrid[y][x] = instanceId | null
const checkCollision = (
  grid: (string | null)[][],
  item: PlacedItem,
  fixture: CatalogFixture
): boolean => {
  const [w, d] = item.rotation % 180 === 0
    ? [fixture.gridWidth, fixture.gridDepth]
    : [fixture.gridDepth, fixture.gridWidth];
  
  for (let dy = 0; dy < d; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (grid[item.gridY + dy]?.[item.gridX + dx] != null) {
        return true; // 碰撞
      }
    }
  }
  return false;
};
```

### Pattern 3: Separation of React DOM UI and Canvas

**What:** All panels/toolbars are React DOM components. Only the viewport is Konva canvas. They communicate exclusively through the Zustand store.
**Why:** DOM is better for text, scrolling lists, inputs. Canvas is better for the interactive grid. Mixing them via Konva for UI would be fighting the tool. Happy Island Designer does this same split (React for UI, Paper.js for canvas).

### Pattern 4: URL Hash Serialization with lz-string

**What:** Blueprint state serialized to JSON, compressed with `lz-string.compressToEncodedURIComponent()`, stored in URL hash fragment.
**Why:** Proven pattern (Happy Island Designer, Compiler Explorer, countless playgrounds). No server needed. URL stays under browser limits for reasonable blueprints (~200 items compresses to ~2-4KB base64, well under the ~2KB-safe / 64KB-max URL limits).

```typescript
import LZString from 'lz-string';

const encodeBlueprint = (bp: Blueprint): string =>
  LZString.compressToEncodedURIComponent(JSON.stringify(bp));

const decodeBlueprint = (hash: string): Blueprint =>
  JSON.parse(LZString.decompressFromEncodedURIComponent(hash));

// 分享: window.location.hash = encodeBlueprint(blueprint)
// 加载: decodeBlueprint(window.location.hash.slice(1))
```

### Pattern 5: Lazy Data Fetching with SWR/React Query

**What:** Fetch furniture catalog from GitHub raw URLs using a data fetching library with built-in caching, deduplication, and stale-while-revalidate.
**Why:** sekai-master-db-diff updates when the game patches. SWR/TanStack Query handles caching, error states, and refetching cleanly. The sister project (pjsk) already uses this pattern for the same data source.

```typescript
// 数据获取URL模式 (来自 sekai-master-db-diff)
const BASE = 'https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main';
const FIXTURES_URL = `${BASE}/mysekaiFixtures.json`;
const ITEMS_URL = `${BASE}/mysekaiItems.json`;
const MATERIALS_URL = `${BASE}/mysekaiMaterials.json`;

// 缩略图资源URL模式 (来自 storage.sekai.best CDN)
const THUMBNAIL_URL = (bundleName: string) =>
  `https://storage.sekai.best/sekai-jp-assets/${bundleName}`;
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Full State in URL Hash
**What:** Encoding everything (inventory, settings, UI state) into the URL.
**Why bad:** URL becomes fragile and enormous. One extra field breaks all shared links.
**Instead:** URL hash = blueprint only (placed items + site type). Inventory and settings stay in localStorage only. Version the blueprint format from day one.

### Anti-Pattern 2: React State for Canvas Object Positions During Drag
**What:** Updating React state on every mousemove during drag operations.
**Why bad:** React re-renders the entire object tree on each frame. At 60fps this causes jank.
**Instead:** Let Konva handle drag internally (it updates canvas directly). Only commit to Zustand store on dragEnd. The preview/ghost layer can use Konva events without React state.

### Anti-Pattern 3: Fetching Full Sprite Sheets on Load
**What:** Loading all furniture images upfront.
**Why bad:** Hundreds of furniture items x image each = slow initial load, wasted bandwidth.
**Instead:** Use colored rectangles with labels as default. Lazy-load thumbnail images only for items visible in the catalog viewport and placed on the grid. Use `<Image>` with Konva's image loading pattern or IntersectionObserver for catalog.

### Anti-Pattern 4: Custom Command Pattern for Undo/Redo
**What:** Building a full command/memento pattern with forward/reverse operations per action type (like Happy Island Designer does).
**Why bad:** Complex, error-prone for multi-cell operations. HID's approach made sense for its freeform drawing (storing path diffs). Our data is small discrete objects.
**Instead:** Snapshot-based undo via zundo. Store complete `placedItems` array per history entry. At ~200 items x ~40 bytes each x 50 history entries = ~400KB. Negligible.

### Anti-Pattern 5: Direct DOM Manipulation for Grid
**What:** Using CSS Grid or HTML table elements for the placement grid.
**Why bad:** DOM nodes per cell (potentially 400-1600 elements) causes layout thrashing. No smooth pan/zoom. Poor drag performance.
**Instead:** Canvas rendering via Konva. Single DOM element (canvas), GPU-accelerated drawing, native pan/zoom via Konva Stage transforms.

## Scalability Considerations

| Concern | Current Scale (MVP) | Future Scale | Approach |
|---------|---------------------|--------------|----------|
| Placed items per blueprint | ~50-100 | ~200-300 | Array in Zustand, occupancy grid. No issues. |
| Furniture catalog size | ~200 items | ~500+ (game updates) | Virtualized list (react-window), lazy image loading |
| Blueprint URL size | ~1-2KB compressed | ~4-6KB | lz-string handles this. If exceeded, switch to share-via-paste with clipboard API |
| Canvas nodes | ~200 | ~500 | Konva handles this easily. Use Layer caching for static grid. |
| Data freshness | Fetch on load | Auto-update on game patch | SWR stale-while-revalidate, check GitHub commit dates |

## Suggested Build Order (Dependencies)

The architecture has clear dependency chains that dictate build order:

```
Phase 1: Foundation
  ├── Project scaffolding (Vite + React + TypeScript)
  ├── Zustand store (empty editor state)
  ├── Canvas viewport (Konva Stage with pan/zoom)
  └── Grid layer (static grid rendering)
  
Phase 2: Core Editing
  ├── Data service (fetch fixtures from GitHub)  [needs: nothing]
  ├── Furniture catalog panel (list + search)     [needs: data service]
  ├── Object placement on grid                    [needs: store, grid, catalog]
  ├── Collision detection (occupancy grid)        [needs: placement]
  ├── Select/move/rotate/delete                   [needs: placement]
  └── Undo/redo (zundo middleware)                [needs: store]

Phase 3: Persistence & Sharing
  ├── localStorage autosave                       [needs: store]
  ├── URL hash serialization                      [needs: store, lz-string]
  └── Import from shared URL                      [needs: URL serialization]

Phase 4: Cost & Inventory
  ├── Recipe/material data fetching               [needs: data service]
  ├── Cost calculator panel                       [needs: recipe data, store]
  ├── Inventory input UI                          [needs: localStorage]
  └── Remaining cost display                      [needs: cost calc, inventory]

Phase 5: Polish
  ├── Thumbnail images for furniture              [needs: CDN URL pattern]
  ├── Road/fence brush tools                      [needs: grid, placement]
  ├── Bilingual UI (zh + ja)                      [needs: i18n setup]
  └── Responsive layout                           [needs: all UI stable]
```

**Key dependency insight:** The data service and canvas viewport are independent -- they can be built in parallel. The cost panel depends on both placement working AND recipe data being available, so it naturally comes later. URL sharing is low-effort once the store exists, but should wait until the data model stabilizes to avoid breaking shared links.

## Technology Decisions Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| UI Framework | React 18+ | Sister project consistency, ecosystem |
| Canvas Rendering | react-konva (Konva.js) | Declarative scene graph, built-in drag/snap/hit-detection |
| State Management | Zustand + zundo | Lightweight, middleware undo/redo, no boilerplate |
| Data Fetching | TanStack Query or SWR | Caching, dedup, stale-while-revalidate for GitHub API |
| URL Compression | lz-string | Proven, tiny, URL-safe encoding |
| Build Tool | Vite | Fast dev, tree-shaking, GitHub Pages deploy |
| Styling | Tailwind CSS or CSS Modules | Quick iteration, no runtime cost |
| Catalog Virtualization | react-window | Render only visible items in long furniture list |
| i18n | i18next + react-i18next | HID uses it, mature, supports zh/ja |

## Sources

- [Happy Island Designer GitHub](https://github.com/eugeneration/HappyIslandDesigner) - Architecture reference (Paper.js + React, command-based undo, lz-string save)
- [Konva.js Drag and Drop](https://konvajs.org/docs/react/Drag_And_Drop.html) - Grid snapping, object placement
- [Konva.js Snap to Grid](https://codepen.io/pierrebleroux/pen/gGpvxJ) - Grid snap implementation
- [Konva.js Undo/Redo](https://konvajs.org/docs/react/Undo-Redo.html) - Canvas undo patterns
- [zundo (Zustand undo middleware)](https://github.com/charkour/zundo) - Snapshot-based undo/redo, <700 bytes
- [lz-string npm](https://www.npmjs.com/package/lz-string) - URL-safe compression
- [sekai-master-db-diff](https://github.com/Sekai-World/sekai-master-db-diff) - Furniture data source (mysekaiFixtures.json, mysekaiMaterials.json, etc.)
- [sekai.best MySekai Fixture List](https://sekai.best/mysekai/fixture) - Reference UI for fixture browsing
- [MDN Tilemaps Overview](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps) - Foundational tilemap concepts
- [react-super-tilemap](https://github.com/QADRAX/react-super-tilemap) - React tilemap rendering patterns
- [PixiJS vs Canvas comparison](https://aircada.com/blog/pixijs-vs-canvas) - Rendering library selection rationale
