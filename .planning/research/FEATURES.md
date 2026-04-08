# Feature Landscape

**Domain:** 2D Grid/Tile Planner for Project Sekai MySekai Outdoor Area
**Researched:** 2026-04-09

## Game Data Availability (sekai-master-db-diff)

**Confidence: HIGH** -- Validated by directly fetching raw JSON files from GitHub.

### Available Data

| Data | File | Key Fields | Status |
|------|------|------------|--------|
| Furniture items | `mysekaiFixtures.json` | id, name, pronunciation, flavorText, gridSize (width/depth/height), mysekaiFixtureType, assetbundleName, firstPutCost, secondPutCost, colorCode, mysekaiFixturePutType | CONFIRMED |
| Crafting blueprints | `mysekaiBlueprints.json` | id, mysekaiCraftType, craftTargetId, isEnableSketch, craftCountLimit | CONFIRMED |
| Crafting costs | `mysekaiBlueprintMysekaiMaterialCosts.json` | mysekaiBlueprintId, mysekaiMaterialId, quantity, seq | CONFIRMED |
| Materials | `mysekaiMaterials.json` | id, name, mysekaiMaterialType, mysekaiMaterialRarityType, iconAssetbundleName | CONFIRMED |
| Site layouts | `mysekaiSiteLayouts.json` | mysekaiSiteLevelId, mysekaiLayoutType, width/height/depth | CONFIRMED |
| Fixture tags | `mysekaiFixtureTags.json` | name, mysekaiFixtureTagType (game_character, unit, series, none) | CONFIRMED |
| Fixture labels | `mysekaiFixtureLabels.json` | name, mysekaiFixtureLabelType (e.g. size: S/M/L) | CONFIRMED |
| Sub-genres | `mysekaiFixtureSubGenres.json` | Categories: bed, table, chair, shelving, plants, appliances, dolls, wall-mounted, collections, wallpaper, flooring, rugs, paths, fences, buildings | CONFIRMED |
| Main genres | `mysekaiFixtureMainGenres.json` | home, road, fence, none | CONFIRMED |
| Sites | `mysekaiSites.json` | housing_home, housing_room, harvest (outdoor), delivery | CONFIRMED |
| Tab views | `mysekaiFixtureTabViews.json` | edit_layout_home, edit_layout_home_road, edit_layout_home_phenomena, craft_tool_mysekai_fixture | CONFIRMED |

### Key Data Relationships

```
mysekaiFixtures.id
  -> mysekaiBlueprints.craftTargetId (via mysekaiCraftType = "mysekai_fixture")
    -> mysekaiBlueprintMysekaiMaterialCosts.mysekaiBlueprintId
      -> mysekaiMaterials.id (via mysekaiMaterialId)
```

### Grid Dimensions (from mysekaiSiteLayouts)

| Level | Type | Width x Depth | Notes |
|-------|------|---------------|-------|
| 1 | Outdoor (floor) | 36 x 36 | Starting area |
| 2 | Outdoor (floor) | 36 x 36 | Early expansion |
| 3 | Outdoor (floor) | 70 x 70 | Mid-level |
| 4 | Outdoor (floor) | 90 x 90 | Later expansion |
| 5 | Outdoor (floor) | 100 x 100 | Max outdoor |
| 6-12 | Indoor (rooms) | 10x10 to 24x20 | Out of scope |
| 13-17 | Specialized | 100x100 to 150x150 | Large flat zones |

### Sprite/Texture Availability -- CRITICAL FINDING

**Confidence: LOW -- Could not verify; needs manual browser inspection.**

**Finding: Top-down 2D sprites for furniture almost certainly DO NOT EXIST as extractable assets.**

Evidence:
- All furniture `assetbundleName` fields reference 3D model bundles (e.g., `mdl_mis0001_house_house1`)
- The game renders MySekai in a 3D isometric perspective, not top-down 2D
- Furniture assets are 3D models, not sprite sheets
- Could not find any 2D top-down sprite assets on `storage.sekai.best` (multiple URL pattern guesses returned 404)
- The Spriters Resource page for Project Sekai returned 403 -- unable to verify if anyone has extracted top-down views
- sekai.best fixture list page is a JS SPA; could not scrape to see what thumbnails it renders

**Recommended fallback approach (priority order):**
1. **Colored rectangles with item names** -- Simplest, most readable for planning. Use grid dimensions from data. Color by sub-genre category.
2. **Icon thumbnails from sekai.best** -- Material icons exist (`iconAssetbundleName` field on materials). Fixture thumbnails may exist but URL pattern is unknown. Needs manual browser network inspection of `sekai.best/mysekai/fixture` to discover.
3. **User-contributed screenshots** -- Community could contribute top-down screenshots, but this adds complexity and is a future differentiator, not MVP.

## Table Stakes

Features users expect. Missing = tool feels incomplete and users return to in-game planning.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Accurate grid matching in-game dimensions | Wrong grid = useless planner. Users must trust 1:1 accuracy | Med | Data available in mysekaiSiteLayouts. Support level 1-5 outdoor sizes |
| Place furniture on grid | Core purpose of the tool | Med | Snap to grid, respect item gridSize (width x depth) |
| Move placed furniture | Users iterate on designs constantly | Low | Drag-and-drop with grid snapping |
| Remove placed furniture | Basic editing operation | Low | Click/select then delete, or eraser tool |
| Furniture catalog with search | 800+ fixtures. Browsing without search is unusable | Med | Use name, sub-genre, tags from data. Japanese names with search |
| Filter catalog by category | Sub-genres (bed, table, chair, etc.) are natural mental model | Low | Data available from mysekaiFixtureSubGenres |
| Pan and zoom the grid | Grid up to 100x100 -- must navigate large area | Low | Standard canvas controls: scroll to zoom, drag to pan |
| Undo/redo | Every editor without undo feels broken | Med | Command pattern. At minimum 20-step history |
| Save design locally | Users don't finish in one session | Low | localStorage serialization of placed items |
| Visual distinction between items | Must tell items apart at a glance | Med | Colored rectangles + abbreviated names as MVP. Color by category |
| Road placement tool | Roads are a major MySekai feature; separate placement mode in-game | Med | Bulk/paint mode like in-game. mainGenre "road" items |
| Fence placement tool | Fences are a distinct placement type in-game | Med | Line-drawing mode. mainGenre "fence" items |
| Material cost calculator | Core value proposition per PROJECT.md. Shows total crafting costs | High | Join fixtures -> blueprints -> materialCosts -> materials |
| Clear/new design | Start fresh without refreshing page | Low | Confirm dialog, then reset state |

## Differentiators

Features that set this apart. Not expected, but create real value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Blueprint sharing via URL hash | Share designs without accounts; proven pattern from Happy Island Designer | Med | Encode placed items + positions into URL hash. Compress with LZ-string or similar |
| Inventory tracking (owned materials) | Know exactly what you still need to farm. No other MySekai tool does this | Med | localStorage input form for material quantities. Subtract from total costs |
| Remaining cost calculation | "You need 50 more wood" is more useful than "total cost is 200 wood" | Low | Depends on inventory tracking. Simple subtraction |
| Multiple grid size support | Support level 1-5 outdoor areas. Users at different progression stages | Low | Dropdown selector, resize grid. Data from mysekaiSiteLayouts |
| Bilingual item names (JP + CN) | Serving Chinese-speaking ProSeka community. JP names for in-game matching | Med | CN translations not in sekai-master-db-diff (JP only). Need translation source or manual translation |
| Color variant selection | Fixtures have color variants (mysekaiFixtureAnotherColors field). Visual distinction | Med | Show available colors, update rectangle fill color |
| Furniture cost indicator | Show firstPutCost/secondPutCost on placed items; warn when approaching placement limit | Low | Data available in mysekaiFixtures. Sum and display remaining budget |
| Import/export as image | Screenshot equivalent for sharing on social media, not just URL | Med | Canvas.toBlob() or html2canvas. Happy Island Designer encodes data IN the PNG |
| Keyboard shortcuts | Power users expect Ctrl+Z, Delete key, spacebar to pan | Low | Standard patterns from Happy Island Designer (Photoshop-style) |
| Multi-select and bulk operations | Select multiple items, move/delete together | Med | Selection box or shift+click. Important for large redesigns |
| Design templates/presets | Pre-made layouts for common designs (from MySEKAI Design Contest winners) | Med | Curated URL-encoded designs. Community-contributed |

## Anti-Features

Features to explicitly NOT build. Each one is a scope trap.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| 3D rendering / isometric view | Massive complexity for marginal planning value. 3D models not available as web-ready assets. The game already provides 3D view. | Top-down 2D grid with colored rectangles. Planning needs clarity, not aesthetics |
| Indoor room planning | Different grid system, different furniture rules, different site types. Doubles scope | Outdoor only. Document as future expansion possibility |
| User accounts / authentication | Requires backend server. Contradicts GitHub Pages hosting model | localStorage + URL sharing covers all use cases |
| Real-time collaboration | WebSocket infrastructure, conflict resolution, massive complexity | URL sharing for async collaboration. Copy-paste URLs in Discord |
| Automatic game data sync | Fetching live from sekai-master-db-diff adds complexity and CORS issues | Bundle data at build time. Periodic manual updates via CI/CD |
| Material farming guide / optimization | Separate product entirely. Requires harvest rate data not in available DBs | Link to existing community resources (Sekaipedia, Fandom wiki) |
| Character placement / interaction simulation | MySekai has character visiting mechanics but this is about LAYOUT planning | Out of scope. Characters are irrelevant to furniture layout |
| Mobile-native app | Web-first on GitHub Pages. Mobile grid editing UX is poor anyway | Responsive web if feasible, but don't compromise desktop UX for mobile |
| Pixel-perfect visual reproduction | Game uses 3D. Attempting visual accuracy without 3D is uncanny valley | Embrace the schematic/blueprint aesthetic. Clarity over beauty |
| Phenomena/weather/BGM settings | These are atmospheric settings, not spatial layout | Maybe a dropdown in future, but not part of grid editor |

## Feature Dependencies

```
Accurate Grid (grid dimensions from data)
  -> Place Furniture (needs grid to snap to)
    -> Move Furniture (needs placement system)
    -> Remove Furniture (needs placement system)
    -> Furniture Cost Calculator (needs placed items list)
      -> Inventory Tracking (extends cost calculator)
        -> Remaining Cost Calculation (needs both cost + inventory)

Furniture Catalog (needs fixture data loaded)
  -> Search/Filter (needs catalog)
  -> Place Furniture (select from catalog to place)

Save Locally (needs serialization format)
  -> Blueprint URL Sharing (same serialization, different storage)
  -> Export as Image (needs canvas rendering)

Road Placement Tool (specialized brush mode)
  -> independent of furniture placement but same grid system

Fence Placement Tool (specialized line mode)
  -> independent of furniture placement but same grid system

Undo/Redo (command pattern)
  -> wraps all placement/move/remove operations
```

## MVP Recommendation

**Prioritize (Phase 1 -- functional planner):**
1. Accurate grid with level selector (outdoor levels 1-5)
2. Furniture catalog with search + category filter
3. Place, move, remove furniture on grid (colored rectangles with names)
4. Road and fence placement tools
5. Undo/redo
6. Save/load via localStorage
7. Material cost calculator (total costs for current layout)

**Phase 2 -- sharing and inventory:**
8. Blueprint sharing via URL hash
9. Inventory input + remaining cost calculation
10. Export design as image
11. Keyboard shortcuts

**Defer:**
- Bilingual UI: Need to source Chinese translations. Start with Japanese item names matching in-game data. Add CN translations incrementally
- Color variants: Nice visual touch but not critical for planning
- Design templates: Need community to create designs first
- Multi-select: Power user feature, add after core is solid

## Competitive Landscape

**No existing MySekai planner tool exists.** This is a greenfield opportunity.

Closest references:
- **sekai.best/mysekai/fixture**: Database viewer only. Lists fixtures with details but NO layout planning capability
- **Happy Island Designer**: Best reference for UX patterns (grid editor, tool selection, save/share), but it's for Animal Crossing
- **Stardew Valley Planner (stardew.info)**: More feature-rich reference -- supports save import, radius visualization, URL sharing
- **ACNH Island Planner (gamecalcs.com)**: Modern alternative with cleaner UX, exact grid matching

Key patterns from successful planners:
- Grid accuracy is non-negotiable (users lose trust if sizes don't match)
- URL sharing is the killer social feature (no accounts needed)
- Colored/iconic representations work fine -- users don't need photorealistic rendering
- Undo/redo + keyboard shortcuts separate "usable" from "frustrating"
- Save-as-image enables social media sharing which drives organic growth

## Sources

- [Sekai-World/sekai-master-db-diff](https://github.com/Sekai-World/sekai-master-db-diff) -- PRIMARY data source, directly validated
- [sekai.best MySekai Fixture List](https://sekai.best/mysekai/fixture) -- Existing database viewer
- [Happy Island Designer](https://eugeneration.github.io/HappyIslandDesigner/) -- UX reference
- [Happy Island Designer GitHub](https://github.com/eugeneration/HappyIslandDesigner) -- Technical reference (TypeScript, canvas-based)
- [CrossingCharm Happy Island Designer Guide](https://crossingcharm.wordpress.com/2020/03/11/happy-island-designer-guide/) -- Feature documentation
- [Happy Island Designer Blog - Tool Comparison](https://happyislanddesigner.com/blog/animal-crossing-island-designer-tools) -- Feature comparison across ACNH planners
- [Stardew Valley Interactive Planner](https://stardew.info/) -- Feature reference
- [colorfulstage.com MySekai](https://colorfulstage.com/aboutgame/mysekai/) -- Official game feature description
- [Sekaipedia - MySEKAI](https://www.sekaipedia.org/wiki/MySEKAI) -- Community wiki (403 on fetch, referenced for context)
- [Project SEKAI Wiki - My SEKAI](https://projectsekai.fandom.com/wiki/My_SEKAI) -- Fandom wiki (403 on fetch, referenced for context)
