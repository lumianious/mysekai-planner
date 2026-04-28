# Phase 5: Sprite Pipeline - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Build an offline Python + Blender toolchain that:
1. Downloads MySekai outdoor fixture asset bundles from the game (via sssekai)
2. Extracts 3D meshes/materials/textures (via UnityPy)
3. Renders orthographic top-down PNGs of 3D fixtures (via headless Blender bpy)
4. Pulls 2D textures directly for flat items (roads, fences, floor surfaces)
5. Outputs per-fixture transparent PNG sprites + a `manifest.json`
6. Wires sprites into `PlacedItem.tsx`, replacing colored-rectangle placeholders, with graceful fallback to colored rectangles when a sprite is missing

Pipeline is **offline / local-only**. Sprites ship as static assets in `public/sprites/` for GitHub Pages.

**Out of scope for this phase:**
- CI-driven re-extraction (sssekai's app-hash rotation makes this fragile — keep manual)
- Animated sprites
- Indoor fixtures (113 indoor-only items excluded)
- Color-variant sprites (D-12 from Phase 1 — single sprite per fixture; variants deferred to v2)

</domain>

<decisions>
## Implementation Decisions

### Pipeline Location & Deliverable Shape

- **D-01:** Python toolchain lives in `scripts/sprite-pipeline/` in this repo — single source of truth, code+sprites land in the same PRs.
- **D-02:** Generated PNGs commit directly to `public/sprites/` — total expected ~50–100MB worst case (1,126 fixtures × ~50–100KB at 128px/tile). If real output exceeds ~150MB, revisit GitHub Releases as deliverable.
- **D-03:** Pipeline runs **local-only** — no CI execution. Blender headless in GitHub Actions is heavy and the app-hash rotation issue (see D-13) makes scheduled CI fragile.

### Output Format & Resolution

- **D-04:** Per-fixture PNG, no atlas — Konva `<Image>` loads directly, browser caches per-file, easy to update one fixture in isolation.
- **D-05:** **128px per grid tile** — at `TILE_SIZE = 32` in source, this is 4× oversampling. Crisp on zoom-in, ~tens-to-hundreds of KB per file. Cap total bundle at ~150MB; if exceeded, fall back to 96px/tile.
- **D-06:** Filename = `{assetbundleName}.png` — direct lookup from `fixture.assetbundleName` (already in fixture data from `mysekaiFixtures.json`).
- **D-07:** Transparent PNG, **no baked shadow** — Konva can add shadow via filters or a lower-z drop-shadow rect later if needed. Keeps pipeline output deterministic.

### 3D-Render vs 2D-Texture Split

- **D-08:** Use the existing `getGroundSubtype` classifier (`src/utils/getGroundSubtype.ts`) as the routing rule:
  - Returns truthy (road / floor / rug / color-tile / fence) → **2D texture extraction** (UnityPy → save material's main texture as PNG, top-down already)
  - Returns falsy → **3D Blender render** (UnityPy → glb → Blender ortho top-down PNG)
- **D-09:** Manual override list available at `scripts/sprite-pipeline/overrides.yaml` for edge cases (e.g., a "flat" item that's actually 3D, or vice versa). Empty by default.

### Asset Bundle Sourcing & Versioning

- **D-10:** **Manual one-off extraction with documented recipe.** User runs sssekai locally with the current `app-version` + `app-hash`; bundles cache to `scripts/sprite-pipeline/assets-cache/` (gitignored, checksummed). Pipeline reads from cache, never from network in normal operation.
- **D-11:** Re-extraction trigger: **data-driven** — when `mysekaiFixtures.json` (upstream Sekai-World repo) shows new fixture IDs not in the local manifest. User runs the documented recipe; runs maybe 1–2× per year.
- **D-12:** Sourcing recipe (documented in `scripts/sprite-pipeline/README.md`):
  ```bash
  sssekai abcache \
    --db .sssekai-cache/abcache.db \
    --app-region jp \
    --app-version <CURRENT> \
    --app-appHash <CURRENT_UUID> \
    --download-filter ".*mysekai.*" \
    --download-ensure-deps \
    --download-dir scripts/sprite-pipeline/assets-cache/bundles/
  ```
  Current `app-version` + `app-hash` sourced from community trackers (sekai.best, twintail config) — researcher must document where to find these.
- **D-13:** Pin tool versions in `scripts/sprite-pipeline/requirements.txt`:
  - `sssekai==0.8.0` (archived; no future updates anyway — pinning prevents accidental upgrade if PyPI restores activity)
  - Blender 4.x LTS (document in README; not a Python dep)
  - Python 3.11
  - `UnityPy` (latest stable; sssekai's own dep version satisfies)
- **D-14:** Stamp the extraction context in `assets-cache/.extracted-with` (app-version, app-hash, sssekai version, date) so future re-runs can match the same input.
- **D-15:** **Twintail noted as fallback** for download+decrypt only — if sssekai breaks on a future game format change, twintail (Rust, actively maintained Sep 2025) can replace the download step; sssekai/UnityPy still needed for asset extraction downstream.

### Rotation & Coverage Fallback

- **D-16:** Render once, rotate in Konva — `PlacedItem.tsx` already passes `rotation={item.rotation * 90}` to the `<Group>`. Pipeline produces 1 PNG per fixture, not 4. ¼ the output size.
- **D-17:** **Graceful fallback when a sprite is missing** — `PlacedItem.tsx` keeps the existing colored-rectangle + label render path. New behavior: if `manifest.json` lists a sprite for the fixture, render `<Image>`; otherwise render the rectangle. Catalog and editor never break on missing sprites.
- **D-18:** Pipeline writes `public/sprites/manifest.json`:
  ```json
  {
    "version": "1",
    "extracted_at": "<ISO date>",
    "fixtures": {
      "<assetbundleName>": { "mode": "3d" | "2d", "sprite": "sprites/<assetbundleName>.png", "size_px": [W, H] }
    }
  }
  ```
  Web app fetches once on app boot; sprite resolver in `src/components/canvas/PlacedItem.tsx` consults it.

### Claude's Discretion

- Pipeline internal architecture (whether to split into `extract.py` + `render.py` + `assemble.py`, or use a single `pipeline.py` with subcommands) — let researcher/planner decide based on Blender headless ergonomics.
- Specific Blender camera setup (orthographic frustum size, lighting rig, anti-aliasing samples) — researcher's prototype call.
- glTF vs FBX as Blender intermediate format — UnityPy → glTF is the modern path; FBX if glTF roundtrip loses materials. Researcher validates.
- Web-side sprite preloading strategy (eager-load all in catalog vs lazy-load on first render) — implementation detail.
- Color-variant handling (Phase 1 D-12 already deferred to v2) — only render base variant per fixture; ignore `colorCode` field for sprite selection.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project artifacts
- `.planning/PROJECT.md` — Core value, sprite pipeline context (RESOLVED note in Context section)
- `.planning/REQUIREMENTS.md` §SPRT-01 through §SPRT-07 — All 7 sprite requirements for this phase
- `.planning/ROADMAP.md` Phase 5 — Goal and success criteria
- `.planning/phases/01-foundation-core-editor/01-CONTEXT.md` D-12 (color variants deferred), D-13 (real game asset preference established)
- `.planning/phases/02-roads-fences-ground-layer/02-CONTEXT.md` — `getGroundSubtype` classifier rationale (drives D-08 routing here)

### Codebase integration points
- `src/components/canvas/PlacedItem.tsx` — Current colored-rectangle render; the swap-in target for sprite `<Image>` + fallback logic
- `src/data/fixtures.ts` — `assetbundleName` field is the filename key (D-06)
- `src/utils/getGroundSubtype.ts` — Routing classifier (D-08)
- `src/types/editor.ts` — `Fixture`, `PlacedItem` types

### External tooling docs
- `https://github.com/mos9527/sssekai` — Asset utility (archived 2026-02-25, v0.8.0). Wiki has `abcache` command reference.
- `https://github.com/mos9527/sssekai_blender_io` — Blender addon (archived 2026-02-26). **Designed for interactive Blender** — researcher must validate headless usage; likely better path is UnityPy → glTF → Blender bpy directly, bypassing the addon.
- `https://github.com/duosii/twintail` — Active alternative for download+decrypt (Rust, Sep 2025). Documented as fallback per D-15.
- `https://github.com/Sekai-World/sekai-master-db-diff` — Source of `mysekaiFixtures.json` (already used by Phase 1 catalog)
- Community app-version/app-hash trackers — researcher documents where current values are published (sekai.best repo, twintail config, or Discord)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/canvas/PlacedItem.tsx` — Konva `<Group>` already wired with rotation, drag, selection. Adding `<Image>` is a drop-in replacement for the `<Rect fill={fillColor}>` block (lines ~137–144). Keep `<Text>` label as fallback overlay or for hover info.
- `src/data/fixtures.ts` — `assetbundleName` per fixture is the canonical filename key.
- `src/utils/getGroundSubtype.ts` — Phase 2 classifier directly drives the 2D-vs-3D extraction split (D-08).
- React Konva supports `useImage` hook from `use-image` package for async sprite loading; integrates cleanly with the existing render pipeline.

### Established Patterns
- **Static-asset hosting:** `public/` is served at root by Vite; existing pattern includes images. Adding `public/sprites/` follows convention.
- **Manifest-driven config:** Phase 1 already loads `mysekaiFixtures.json` at app boot. Adding `public/sprites/manifest.json` follows the same fetch-once-at-boot pattern.
- **Graceful degradation:** Phase 1 placeholders (colored rectangles) and Phase 5 sprites coexist via fallback (D-17). No flag-flip migration.

### Integration Points
- **Boot:** App-init fetch of `manifest.json` alongside fixtures data
- **Render:** `PlacedItem.tsx` reads manifest entry, branches on presence
- **Build:** Vite picks up `public/sprites/*` automatically; no config change needed
- **Catalog:** Phase 1 thumbnails (`storage.sekai.best` CDN, isometric) stay for catalog browsing; sprites only replace the editor canvas render

</code_context>

<specifics>
## Specific Ideas

- **Match in-game authenticity** — Phase 1 D-13 ("real grass texture, not placeholder") establishes the user's preference. Sprites should look like the actual game's top-down view, not stylized.
- **Don't over-automate sourcing** — User explicitly flagged asset acquisition as the most concerning part. Manual + documented recipe (D-10/D-12) is acceptable; fragile CI automation is not.
- **Coverage gaps are OK** — User didn't push for 100% coverage. D-17 graceful fallback means launching with partial coverage is acceptable; remaining items render as colored rectangles.

</specifics>

<deferred>
## Deferred Ideas

- **Color variants per fixture** — Already deferred from Phase 1 D-12. Single sprite per fixture in this phase.
- **Animated sprites** — Some MySekai fixtures animate in-game (e.g., decorations with idle motion). Out of scope; static frame only.
- **Indoor fixtures** — 113 indoor-only items excluded from outdoor scope.
- **Atlas / sprite sheet packing** — Not needed at 1,126-fixture scale with HTTP/2; revisit if request count becomes a measurable problem.
- **Shadow rendering** — D-07 keeps PNG transparent and shadow-free; canvas-side shadow can be added later if visual feedback demands it.
- **Automated CI re-extraction** — D-03/D-10 keep extraction manual. Reconsider only if (a) a stable community feed of app-version/app-hash emerges, AND (b) the fragility cost of manual exceeds the maintenance cost of fragile CI.
- **glTF roundtrip QA tool** — A visual side-by-side viewer comparing the in-game look vs our render. Useful but not required to ship.

</deferred>

---

*Phase: 05-sprite-pipeline*
*Context gathered: 2026-04-28*
