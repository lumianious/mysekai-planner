# Domain Pitfalls

**Domain:** Browser-based 2D grid editor / tile planner (MySekai Planner)
**Researched:** 2026-04-09

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: No Top-Down Sprites Exist in Game Data

**What goes wrong:** The fixture data uses `assetbundleName` references like `"mdl_mis0001_house_house1"` -- these are 3D model bundles, not 2D sprite images. There are no top-down 2D sprite images in the sekai-master-db-diff data or storage.sekai.best CDN. Building the entire editor UI around the assumption that sprites exist, then discovering they don't, forces a late-stage redesign.

**Why it happens:** The "mdl_" prefix indicates 3D model assets. Project Sekai renders MySekai as a 3D environment. The community data pipeline extracts database records but not rendered sprite sheets.

**Consequences:** If you build image-loading pipelines, sprite atlas management, and rendering code expecting raster sprites, all of that becomes throwaway work. The editor looks broken or empty.

**Prevention:** Design the rendering layer as an abstraction from day one. Phase 1 MUST use colored rectangles with labels (using `gridSize.width` x `gridSize.depth` from fixture data) as the canonical rendering mode. Treat any future sprite support as an enhancement layer on top, never as the foundation. The colored-rectangle approach is actually quite functional -- Happy Island Designer started similarly for terrain.

**Detection:** Check early by fetching a few `assetbundleName` values from storage.sekai.best. If they return Unity asset bundles (binary), not PNGs, sprites are confirmed unavailable.

**Phase:** Must be resolved in Phase 1. The fallback IS the primary rendering strategy.

### Pitfall 2: URL Hash Blueprint Encoding Hits Length Limits

**What goes wrong:** A fully furnished MySekai layout could have 100+ placed items, each with position (x, y), rotation, and fixture ID. Naive JSON encoding of this data easily exceeds 2,000 characters. While Chrome technically handles longer URLs, sharing URLs via Discord, Twitter, LINE, and other platforms truncates them silently. Users share a link, the recipient opens a broken/incomplete layout.

**Why it happens:** URL length limits are not from browsers alone -- intermediary platforms (social media, chat apps, URL shorteners) impose their own limits, often around 2,000-4,000 characters. URL encoding of special characters inflates size further (each non-ASCII char becomes 3+ bytes).

**Consequences:** The core sharing feature silently corrupts data. Users lose trust. No error message -- just a broken layout.

**Prevention:**
1. Use a compact binary encoding, not JSON. Encode fixture placement as fixed-width binary records: fixture ID (2 bytes) + x (1 byte) + y (1 byte) + rotation (2 bits). For 100 items, that is ~500 bytes raw.
2. Apply compression (pako/deflate) before base64url encoding.
3. Implement a URL length budget check: if encoded data exceeds 1,800 characters, warn the user before sharing.
4. Design the encoding format with a version byte prefix so you can change the format later without breaking old links.
5. Measure actual encoded sizes during development with realistic layouts (50-150 items).

**Detection:** Write a size estimation test early. If a 50-item layout exceeds 1,000 URL characters, the encoding scheme is too wasteful.

**Phase:** Must be designed in Phase 1 (data model), implemented in Phase 2 (sharing feature). Retrofitting a compact encoding onto an existing verbose format is painful.

### Pitfall 3: External Data Dependency on sekai-master-db-diff

**What goes wrong:** The entire furniture catalog, material costs, and grid dimensions come from `Sekai-World/sekai-master-db-diff` on GitHub. This is a community-maintained reverse-engineered database. Game updates can: (a) change data structure (add/remove/rename fields), (b) add new furniture that breaks assumptions, (c) cause the maintainers to stop updating, (d) change the repository structure. Any of these breaks the app silently.

**Why it happens:** Community-maintained game data projects depend on volunteer effort and reverse engineering. Game version updates (especially major ones) can restructure internal databases. The MySekai feature itself is relatively new in Project Sekai and still evolving.

**Consequences:** Furniture catalog shows stale data, material costs are wrong, new items are missing. Users make plans based on incorrect information.

**Prevention:**
1. Build a data transformation layer that maps raw API data to your internal schema. Never use raw API field names directly in rendering/logic code.
2. Pin a known-good data snapshot as a local fallback (committed to the repo or cached).
3. Add a data version/timestamp display in the UI so users know data freshness.
4. Validate fetched data against expected schema at load time -- if fixtures lack `gridSize`, show a warning rather than crashing.
5. Since the sister project `pjsk` already consumes this data, share validation logic or at least coordinate on data pipeline patterns.

**Detection:** Monitor the sekai-master-db-diff repo for structural changes. Add a CI job or manual check after each game update (roughly monthly for Project Sekai).

**Phase:** Data abstraction layer in Phase 1. Fallback/caching in Phase 2. Freshness indicators in Phase 3.

### Pitfall 4: Canvas Rendering Performance Death by Redraw

**What goes wrong:** Every mouse move, scroll, or zoom event triggers a full canvas redraw of ALL grid cells, ALL placed items, ALL labels. With a 36x36+ grid and 100+ items, this means thousands of draw calls per frame. The editor becomes laggy, especially on mobile devices or older hardware.

**Why it happens:** The naive approach is `clearRect()` + redraw everything. Canvas 2D has no scene graph -- it is an immediate-mode API. Without explicit optimization, every visual change redraws the entire scene.

**Consequences:** Unusable on mobile. Stuttery pan/zoom. Users abandon the tool.

**Prevention:**
1. Layer canvases: static grid on one canvas, placed items on another, selection/cursor overlay on a third. Only redraw the layer that changed.
2. Use `requestAnimationFrame` and dirty-flag pattern: mark regions as changed, only redraw those regions.
3. For the grid background, render once to an offscreen canvas and blit it. The grid lines never change unless zoom level changes.
4. Batch text rendering -- text is the most expensive canvas operation. Cache item labels as pre-rendered offscreen canvases.
5. Use `will-change: transform` on canvas CSS for GPU compositing of pan/zoom transforms.

**Detection:** Profile with Chrome DevTools Performance tab. If paint time exceeds 8ms per frame during pan/zoom, optimization is needed.

**Phase:** Layered canvas architecture must be designed in Phase 1. Retrofitting layers onto a single-canvas implementation is a near-rewrite.

## Moderate Pitfalls

### Pitfall 5: Grid Coordinate System Mismatch with Game Data

**What goes wrong:** The fixture data has `gridSize` with `width`, `depth`, and `height` (3D coordinates). The editor is 2D top-down. Mapping 3D dimensions to 2D placement is ambiguous -- does `depth` map to screen-Y or is it the vertical stacking axis? Getting this wrong means furniture appears the wrong size or orientation.

**Prevention:**
1. Study the actual MySekai game: take screenshots of known furniture and measure their grid footprint.
2. The site layouts data shows outdoor areas as `width` x `depth` with separate `height`. For top-down view, use `width` x `depth` as the 2D footprint, `height` is irrelevant.
3. Document the coordinate mapping explicitly in code comments and stick to it.
4. Handle rotation correctly: a 2x3 item rotated 90 degrees becomes 3x2. Use `gridSize.width` and `gridSize.depth` and swap on rotation.

**Detection:** Place a known asymmetric item (e.g., a fence section) and compare with in-game appearance.

**Phase:** Phase 1, during grid system implementation.

### Pitfall 6: localStorage Corruption and Size Limits

**What goes wrong:** localStorage has a 5-10MB limit per origin (browser-dependent). Inventory data seems small, but if you also store blueprint autosaves, undo history, or cached furniture data in localStorage, you can hit the quota. The `QuotaExceededError` crashes the save silently if not caught. Additionally, localStorage stores only strings -- serialization bugs corrupt data.

**Prevention:**
1. Wrap ALL `localStorage.setItem()` calls in try/catch. On QuotaExceededError, warn the user.
2. Keep localStorage lean: only inventory + current blueprint + user preferences. Never cache API data in localStorage (use sessionStorage or in-memory cache).
3. Add a data integrity check: store a version number and validate schema on load. If corrupted, offer to reset rather than showing a broken state.
4. Estimate storage budget: inventory for ~500 items at ~50 bytes each = ~25KB. Blueprint with 150 placed items at ~20 bytes each = ~3KB. Total well under limits if disciplined.
5. Happy Island Designer suffered autosave corruption -- learn from their mistake by using atomic writes (write to a temp key, then rename).

**Detection:** Test in Safari private browsing mode (historically stricter limits). Test with localStorage disabled entirely.

**Phase:** Phase 1 for basic persistence. Corruption recovery in Phase 2.

### Pitfall 7: Touch/Mobile Support as an Afterthought

**What goes wrong:** Canvas touch events behave differently from mouse events. Pinch-to-zoom conflicts with browser native zoom. Long-press triggers context menus. Drag gestures conflict with scroll. Touch targets are too small for fat fingers on a tile grid. The editor works great on desktop, is unusable on mobile.

**Prevention:**
1. Use pointer events (not mouse events) from the start -- they unify mouse, touch, and pen input.
2. Implement `touch-action: none` on the canvas CSS to prevent browser default touch handling.
3. Design minimum touch target sizes: grid cells must be at least 44x44px at default zoom on mobile (Apple HIG guideline).
4. Handle pinch-to-zoom explicitly: track two-finger distance delta, apply to canvas transform. On trackpad, detect via `ctrlKey` on wheel events.
5. Accept that some features may be desktop-only (bulk selection, keyboard shortcuts) but core placement must work on mobile.

**Detection:** Test on actual phones early, not just Chrome DevTools device emulation (which does not accurately simulate touch event timing).

**Phase:** Pointer events in Phase 1. Full mobile gesture support in Phase 2. Polish in Phase 3.

### Pitfall 8: Undo/Redo Complexity Explosion

**What goes wrong:** Starting with a simple "snapshot the entire state" approach works initially but becomes untenable: each undo step stores a full copy of all placed items, eating memory. Alternatively, implementing command pattern from scratch without clear boundaries leads to bugs where undo partially reverts state.

**Prevention:**
1. Use the command pattern with inverse operations (PlaceItem/RemoveItem, MoveItem stores old+new position).
2. Debounce drag operations: a drag-move should create ONE undo entry for the entire drag, not one per pixel moved. Commit the command on mouseup/pointerup, not during drag.
3. Cap undo history (50-100 steps). Clear redo stack on any new action.
4. Keep undo/redo operating on the placement data model only -- never try to undo UI state (zoom level, selected tool, panel visibility).
5. Test the edge case: undo a placement, then undo a move of a different item. Interleaved operations on different items are where bugs hide.

**Detection:** If undo/redo code touches more than the placement data model, scope is creeping.

**Phase:** Design command interface in Phase 1 (even if only place/remove). Extend to move/rotate in Phase 2.

## Minor Pitfalls

### Pitfall 9: Bilingual Content Handling Issues

**What goes wrong:** Fixture names in the data are in Japanese. UI text needs Chinese + Japanese. Mixing encodings, failing to handle text that does not fit in UI elements, or hardcoding strings makes localization painful.

**Prevention:** Use a simple i18n key-value map for UI strings from the start. Keep fixture names as-is from the API (Japanese). Use CSS `text-overflow: ellipsis` for long Japanese furniture names in the catalog.

**Phase:** Phase 1, bake in from the beginning.

### Pitfall 10: Asset Loading Waterfall on Startup

**What goes wrong:** Fetching furniture data, materials data, blueprint costs, and site layouts sequentially creates a slow startup. Each is a separate JSON file from GitHub raw content.

**Prevention:** Fetch all JSON files in parallel with `Promise.all()`. Consider bundling the most stable data (site layouts, materials) as local JSON files in the repo -- they change infrequently. Show a loading state with progress indication.

**Detection:** Measure time-to-interactive. If it exceeds 3 seconds on a decent connection, optimize.

**Phase:** Phase 1 for parallel loading. Phase 2 for local bundling of stable data.

### Pitfall 11: Cross-Browser Canvas Rendering Differences

**What goes wrong:** Text rendering (font metrics, anti-aliasing) differs across browsers. Sub-pixel rendering causes grid lines to appear blurry at certain zoom levels. High-DPI displays show blurry canvases if `devicePixelRatio` is not handled.

**Prevention:**
1. Always set canvas resolution to `width * devicePixelRatio` and scale context accordingly.
2. For grid lines, use integer coordinates and add 0.5px offset to avoid sub-pixel blurriness.
3. Use a single system font stack for canvas text -- do not rely on web fonts loading before canvas renders.

**Phase:** Phase 1, during canvas setup.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Grid & Rendering | No sprites exist (#1), Coordinate mismatch (#5), Canvas perf (#4) | Colored-rectangle rendering, document coord mapping, layered canvas from start |
| Phase 1: Data Model | URL encoding too verbose (#2), localStorage corruption (#6) | Design compact binary format early, try/catch all storage ops |
| Phase 2: Sharing | URL truncation by platforms (#2) | Test actual sharing on Discord/Twitter/LINE with real encoded URLs |
| Phase 2: Data Pipeline | API structure changes (#3) | Abstraction layer, pinned fallback snapshot |
| Phase 2: Interaction | Undo/redo bugs (#8), Touch issues (#7) | Command pattern with debounced drags, pointer events |
| Phase 3: Polish | Mobile usability (#7), Loading speed (#10) | Real device testing, bundle stable data locally |

## Sources

- [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [web.dev: Canvas performance](https://web.dev/articles/canvas-performance)
- [AG Grid: Canvas rendering best practices](https://blog.ag-grid.com/optimising-html5-canvas-rendering-best-practices-and-techniques/)
- [Konva.js: Performance tips](https://konvajs.org/docs/performance/All_Performance_Tips.html)
- [URL fragment length limits](https://www.codegenes.net/blog/maximum-length-of-url-fragments-hash/)
- [Browser URL max lengths](https://kajal13.hashnode.dev/maximum-length-of-a-url-in-different-browsers)
- [MDN: Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [localStorage quota handling](https://mmazzarolo.com/blog/2022-06-25-local-storage-status/)
- [Happy Island Designer (reference project)](https://github.com/eugeneration/HappyIslandDesigner)
- [sekai-master-db-diff](https://github.com/Sekai-World/sekai-master-db-diff) -- fixture data structure verified directly
- [Trackpad pinch vs scroll detection](https://tigerabrodi.blog/how-to-handle-trackpad-pinch-to-zoom-vs-two-finger-scroll-in-javascript-canvas-apps)
- [Canvas 2D context perf gotchas (2025)](https://stuff.tamius.net/sacred-texts/2025/04/27/browser-lied-performance-died-a-bit-about-html-canvas-2d-context-and-why-you-should-read-the-docs/)
