# 05-02 Pilot Findings

> Wave 2 (plan 05-02) sign-off. Locks Wave 3 design. Generated 2026-04-29.

## Status flags

```yaml
wave1_visual_signoff: true
wave3_blocker_count: 2
cdn_verdict: LIVE_OK
scope_additions: [thumbnails]
```

## CDN viability

See `05-02-CDN-PROBE.md` for full evidence.

- **Verdict**: `LIVE_OK` after refresh
- **Frozen apphash 6.3.0 (Feb-2026 mos9527/sekai-apphash)** → HTTP 426 Upgrade Required on `/api/user`. Repo is archived; the JP server will reject any pinned credentials older than the live client.
- **Resolution**: extracted current credentials from JP `6.4.1` xapk via `sssekai apphash --apk-src` → appVersion `6.4.1`, abVersion `6.4.0`, appHash `d67a688b-…`. Probe flipped to `LIVE_OK`; 89,036 bundles indexed; all 3 probe fixtures (`mdl_mis0001_house_house1`, `mdl_env0010_fixture_canvas1`, `mdl_non0006_gate_lon1`) downloaded with valid SHA256s.
- **Path-prefix correction**: real abcache path is `mysekai/fixture/<assetbundleName>`, not bare `<assetbundleName>`. The original plan's regex matched zero bundles before this fix.

### Wave 3 inheritance

Refresh apphash from a current xapk whenever the live JP version increments. Document the cadence in the Wave 3 README. The `data/apphash.json` snapshot is a credentials *cache*, not a source of truth.

## Open question resolutions

### Q1 — sssekai_blender_io headless viability

**Decision: NO. Use Option B (glb_writer fallback) for all 3D fixtures.**

Pilot ran `blender --background --python pipeline/blender_render.py -- --asset <unity3d>`. The script tried `bpy.ops.sssekai.import_unity` and failed with `[FALLBACK] sssekai_blender_io unavailable in headless` (exit 2) for both 3D pilot fixtures (`mdl_mis0001_fixture_lamp1`, `mdl_mis0001_house_house1`).

Root cause: `sssekai_blender_io` is a **separate Blender addon** (`mos9527/sssekai_blender_io` GitHub), not the `sssekai` pip package. The repo was archived 2026-02-26 and was developed for Blender 4.x; we run Blender 5.1.1. We did not install the addon into Blender's user scripts, and even if we did, archived-Blender-4.x-era addons frequently break under 5.x and rarely register operators in `--background` mode.

**Wave 3 implication**:
- Promote `pipeline/glb_writer.py` from stub → real implementation.
- Use `pygltflib` (or `trimesh.exchange.gltf`) to convert UnityPy mesh + diffuse → GLB.
- `pipeline.pilot._render_3d` and Wave 3's full driver will: (a) `unity_bundle_to_glb(bundle, tmp.glb)`, (b) call existing `blender_render.py` against the GLB.
- `blender_render.py` already supports `.glb` via `bpy.ops.import_scene.gltf` (validated in Task 3 with Khronos Box.glb test).

### Q2 — floor_appearance routing & 2D-branch rug behavior

**Decision: Keep `floor_appearance` defaulting to 2D in `routing.py`. Add a Wave 3 sub-task to render rugs/floor_appearance items as TILED top-down images (or push tiling to Konva).**

Pilot 2D-branch fixture was the rug `mdl_mis0001_rug_rug1` (6×6 grid). The extracted texture is a **single tileable seam-pattern tile**, not a whole-rug image:

| Surface | Visual |
|---|---|
| `public/sprites/mdl_mis0001_rug_rug1.png` (768×768, top-down) | one tile of the diagonal-seam pattern with corner stars — clearly designed for runtime tiling |
| `public/sprites/thumbnails/mdl_mis0001_rug_rug1_1.png` (152×152, iso) | single rug seen from 45° — looks like one flat blue diamond, no tiling |

These are two genuinely different views. The catalog thumbnail is **complete and usable as-is**; the top-down sprite is **incomplete** for canvas display unless we tile it.

**Wave 3 implication**:
- For all 2D-branch fixtures, `extract_2d.extract_to_png` should not just resize the texture to the grid canvas — it should tile the source texture to produce a `width*TILE_PX × depth*TILE_PX` output. New helper, ~10 lines.
- Alternative: emit the source texture at its native size + tile-flag in manifest; Konva runs `fillPatternImage` at runtime. Cheaper but bleeds Wave 3 concerns into Wave 4.
- **Recommended**: tile in pipeline. Cleaner manifest schema, no frontend coupling.

`floor_appearance` (27 fixtures) was not pilot-tested (no fixture in our 3-pick was that layoutType). Treat as the same routing as `road`/`rug` — texture-tile-then-resize. Wave 3 spot-checks 1–2 floor_appearance fixtures and revises if needed.

### Q3 — Camera framing (AABB vs grid-based)

**Decision: `ortho_scale = max(grid_size, AABB_xy) * 1.3` (30% margin). Revisit in Wave 3 after non-zero 3D samples exist.**

The pilot could not exercise this against real 3D MySekai content (Q1 blocked all 3D fixtures). The Khronos Box.glb test confirmed the formula produces a 1×1 box rendering with both opaque and transparent pixels at 128×128 — sanity passes but doesn't validate against the actual MySekai scale convention.

**Wave 3 implication**:
- After `glb_writer.py` is live, render 5–10 sample 3D fixtures at varied gridSizes (1×1, 2×2, 3×3, 6×6, 12×12).
- If small fixtures render with too much empty margin → switch to AABB-only with a fixed 1.1× margin.
- If large fixtures get clipped → keep grid-based with a 1.5× margin.
- Lock the choice in Wave 3's `assemble_manifest.py` doc and remove this open question.

### Q5 — Frozen apphash CDN coverage

**Decision: Refresh on demand. No mitigation needed today.**

Resolved by Task 1: refreshed apphash from current xapk → LIVE_OK. The frozen Feb-2026 snapshot (6.3.0) was 1 minor version behind live (6.4.1) and the JP `/api/user` endpoint enforces version compatibility with HTTP 426. The auth scheme itself is unchanged — only `appVersion` + `appHash` need refresh.

Coverage: all 3 probe fixtures (oldest id=1, mid-life id=661, newest id=900002) reachable. 89,036 bundles indexed in the live abcache. No fixture-id cutoff observed.

**Wave 3 implication**: when JP updates (typically every 2–4 weeks), re-run `sssekai apphash --apk-src <new-xapk>` and re-pin `data/apphash.json`. Document this as a manual step in `scripts/sprite-pipeline/README.md`. No other escalation paths needed unless the auth scheme itself changes.

## Mid-execution scope additions (not in original plan)

### Catalog thumbnails (45° iso PNGs)

User flagged in-game catalog UI uses 45° iso fixture thumbnails (not top-down). Verified the game ships these as separate Unity bundles at `mysekai/thumbnail/fixture/<assetbundleName>_<variant>` — 152×152 RGBA, ~7 KB each, one Texture2D per bundle. `extract_2d.extract_to_png` handles them via the Texture2D-fallback branch with no code changes.

**Manifest schema add**: `SpriteManifestEntry.thumbnails: string[]` — paths to per-variant thumbnail PNGs. Empty array if not yet extracted. Backward-compatible.

**Pilot output**: 1 thumbnail extracted (`mdl_mis0001_rug_rug1_1.png`); the lamp's 5 variants and house's 1 variant were not extracted because the model bundle download succeeded but the 3D path then failed before reaching `_extract_thumbnails()`. Re-running the pilot after Wave 3 fixes Q1 will populate them.

**Wave 3 implication**:
- Download both `mysekai/fixture/<name>` AND `mysekai/thumbnail/fixture/<name>_1..N` for every outdoor fixture (~1,138 model bundles + ~2,000 thumbnail bundles).
- Total thumbnail payload: ~14 MB (negligible vs the D-02 150 MB cap).
- Update `assemble_manifest.py` to populate `thumbnails`.

**Wave 4 implication**:
- Catalog/sidebar UI consumes `entry.thumbnails[0]` by default with a variant picker for `thumbnails[1..]`.
- Variant picker maps `mysekaiFixtureAnotherColors[i]` → `thumbnails[i+1]`.

## Wave 3 blocker count: 2

1. **Implement `glb_writer.py` (Q1)** — UnityPy → GLB → file. Without this no 3D fixture renders.
2. **Tile 2D-branch textures (Q2)** — `extract_to_png` needs a tiling step to produce whole-fixture top-down images for rug / road / floor_appearance.

Both are scoped, well-defined Wave 3 tasks. Neither blocks Wave 2 sign-off.

## Visual sign-off (incomplete)

Pilot generated **1 of 3 expected canvas PNGs** + **1 of ~7 expected thumbnails**:

- `public/sprites/mdl_mis0001_rug_rug1.png` (768×768) — visually one rug-pattern tile; correct given Q2 finding
- `public/sprites/thumbnails/mdl_mis0001_rug_rug1_1.png` (152×152) — visually correct single iso rug
- Lamp + house canvas PNGs blocked on Q1
- Lamp's 5 thumbnails + house's 1 thumbnail blocked because pipeline halted on 3D-render failure before reaching the thumbnail step

**User accepts partial sign-off.** The two failing 3D fixtures' PNGs will be regenerated as the first action of Wave 3 once `glb_writer.py` lands.

## Files in evidence

| Artifact | Purpose |
|---|---|
| `.planning/phases/05-sprite-pipeline/05-02-CDN-PROBE.md` | Auth viability evidence + per-bundle SHA256s |
| `scripts/sprite-pipeline/data/apphash.json` | Pinned JP 6.4.1 credentials (manual refresh cadence) |
| `scripts/sprite-pipeline/pipeline/cdn_probe.py` | Probe + verdict generator |
| `scripts/sprite-pipeline/pipeline/extract_2d.py` | 2D-branch UnityPy extractor (also serves thumbnails) |
| `scripts/sprite-pipeline/pipeline/blender_render.py` | Headless ortho renderer (works with .glb today; .unity3d after Wave 3 glb_writer) |
| `scripts/sprite-pipeline/pipeline/glb_writer.py` | Stub — Wave 3 promotes to real impl |
| `scripts/sprite-pipeline/pipeline/pilot.py` | 3-fixture orchestrator |
| `public/sprites/manifest.json` | 1-entry pilot manifest (Wave 3 rewrites with all fixtures) |
| `public/sprites/*.png`, `public/sprites/thumbnails/*.png` | Pilot output |
| `src/types/spriteManifest.ts` | Manifest types — `thumbnails` field added |

## Resume signal

`approved` — partial pilot accepted. Wave 3 design inherits Q1/Q2 as concrete tasks.
