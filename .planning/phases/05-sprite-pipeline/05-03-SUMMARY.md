---
phase: 05-sprite-pipeline
plan: 03
subsystem: sprite-pipeline
tags: [pipeline, blender, unitypy, gltf, vite-static]
requires: [05-02]
provides:
  - "python -m pipeline subcommand router (download / extract-2d / render-3d / assemble-manifest / run-all)"
  - "real glb_writer.unity_bundle_to_glb (PILOT-FINDINGS Q1 Path B)"
  - "extract_to_tiled_png for 2D-branch tileable textures (PILOT-FINDINGS Q2)"
  - "AABB-only camera framing for 3D ortho render (PILOT-FINDINGS Q3 resolution)"
  - "public/sprites/manifest.json with 1116 entries + thumbnail variants"
affects: [vite static-asset deploy, frontend SpriteManifest consumer]
tech-stack:
  added:
    - pygltflib>=1.16
  patterns:
    - "argparse subcommand dispatch via sub._name_parser_map.pop + re-add_parser"
    - "OBJ-then-glTF intermediate: UnityPy.Mesh.export() → _parse_obj → pygltflib accessors"
    - ".extracted-with credential stamp (D-14) for cache invalidation"
key-files:
  created:
    - scripts/sprite-pipeline/pipeline/__main__.py
    - scripts/sprite-pipeline/pipeline/download.py
    - scripts/sprite-pipeline/pipeline/render_3d.py
    - scripts/sprite-pipeline/pipeline/run_all.py
    - scripts/sprite-pipeline/pipeline/assemble_manifest.py
    - scripts/sprite-pipeline/pipeline/check_size.py
    - scripts/sprite-pipeline/tests/test_download_dryrun.py
    - scripts/sprite-pipeline/tests/test_routing_outdoor_count.py
    - scripts/sprite-pipeline/tests/test_manifest_completeness.py
    - public/sprites/manifest.json (1116 entries)
    - public/sprites/*.png (1116 fixture sprites)
    - public/sprites/thumbnails/*.png (1929 catalog thumbs)
  modified:
    - scripts/sprite-pipeline/pipeline/glb_writer.py (stub → real impl)
    - scripts/sprite-pipeline/pipeline/extract_2d.py (+ extract_to_tiled_png + run handler + thumbnail extraction)
    - scripts/sprite-pipeline/pipeline/blender_render.py (camera fix)
    - scripts/sprite-pipeline/requirements.txt (+ pygltflib)
    - scripts/sprite-pipeline/README.md
    - scripts/sprite-pipeline/CLAUDE.md
decisions:
  - "Path B (glb_writer fallback) confirmed in code: USE_GLB_FALLBACK=True; sssekai_blender_io addon path stays disabled."
  - "Camera ortho_scale = max(AABB_xy, 0.4) * 1.15. Reason: Unity meshes are in meters, fixture.gridSize is in grid cells — they aren't comparable units."
  - "Thumbnail extraction batched into extract-2d run handler instead of a dedicated subcommand. Single CLI surface kept."
  - "TILE_PX stayed at 128 (no fallback to 96 needed; final size 135.7 MB / 150 MB cap)."
  - "DEFINED 'fixture coverage' as: outdoor count post-dedup vs PNG-on-disk count. 1138 raw outdoor → 1121 unique → 1116 PNGs (5 missing bundles)."
metrics:
  duration_minutes: 22  # rough wall-clock excluding ~12 min download + 14 min render
  fixtures_total: 1138
  fixtures_unique: 1121
  fixtures_extracted: 1116
  thumbnails_extracted: 1929
  sprite_dir_size_mb: 135.7
  size_cap_mb: 150
  completed_date: 2026-04-29
---

# Phase 05 Plan 03: Sprite Pipeline End-to-End Summary

End-to-end MySekai sprite pipeline: routes 1138 outdoor fixtures through 2D extract or 3D Blender render, ships 1116 PNGs + 1929 thumbnails + manifest.json totaling 135.7 MB to `public/sprites/` for Vite static-asset deploy.

## Coverage breakdown

| Bucket | Count | Notes |
|---|---|---|
| Outdoor fixtures (raw) | 1138 | Confirmed `mysekaiSettableSiteType != "room"` |
| Outdoor fixtures (deduped) | 1121 | 17 duplicates collapsed by assetbundleName (RESEARCH Q4: same bundle reused for `_before_sprout1`, `_before_sapling1` across 17 sub-IDs) |
| 2D-branch sprites | 52/52 OK | rugs/roads/floor_appearance via `extract_to_tiled_png` |
| 3D-branch sprites | 1081/1086 OK | 5 skipped (bundle missing on disk; not an extraction error) |
| Catalog thumbnails | 1929 | Covers every `mysekai/thumbnail/fixture/<name>_<v>` that downloaded |
| Manifest entries | 1116 | `mode`, `sprite`, `size_px`, `thumbnails[]` |

## Path A vs Path B for 3D rendering

**Chose Path B** (UnityPy → minimal GLB → Blender). PILOT-FINDINGS Q1 already locked this: `sssekai_blender_io` does not register under `blender --background` (the addon was archived 2026-02-26 for Blender 4.x; we run 5.1.1). `USE_GLB_FALLBACK = True` in `render_3d.py`.

`glb_writer.unity_bundle_to_glb` parses `Mesh.export()` OBJ output, picks the first non-shadow Mesh + first non-emissive Texture2D (or Material._MainTex), and writes a single-primitive PBR-baseColor GLB via `pygltflib`. Verified end-to-end on lamp (1×1, vertical), bed (4×6, horizontal), house (12×12, large).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Camera ortho_scale used incompatible units, clamping fixtures to <5% frame fill**
- **Found during:** First production render-3d run (after ~230 fixtures rendered visibly broken)
- **Issue:** `_setup_camera_and_light` did `max(grid_size, AABB_xy) * 1.3` where `grid_size` was `max(tile_w, tile_d)` in grid cells (e.g. 4, 12, 1) but `AABB_xy` was Unity meters (typically 0.21m–3.4m). The formula treated grid cells as if they were meters, producing wildly oversized ortho frustums for small meshes.
- **Fix:** Drop `grid_size` from the formula entirely. `ortho_scale = max(AABB_xy, 0.4) * 1.15`. Output resolution still uses `tile_w*128 × tile_d*128` so the visual semantics (each grid cell = 128 px) are preserved.
- **Verification:** bed coverage 2.7% → 72.1%; house 4.3% → reasonable; lamp 2.4% → 16.8% (lamp is naturally tall+thin, low XY footprint is correct).
- **Files modified:** `scripts/sprite-pipeline/pipeline/blender_render.py`
- **Commit:** `e9d3af2`
- **PILOT-FINDINGS reference:** This was the deferred Q3 question. Resolved.

**2. [Rule 2 - Missing critical functionality] glb_writer stub promoted to real implementation**
- **Found during:** Task 2 design (PILOT-FINDINGS Q1 explicitly required this)
- **Issue:** Wave 2 left `glb_writer.unity_bundle_to_glb` raising NotImplementedError. Without it no 3D fixture could render.
- **Fix:** Implemented OBJ-parser → pygltflib converter (~280 LOC). Selects largest non-shadow mesh, picks Material._MainTex with Texture2D fallback, builds VEC3 position + VEC3 normal + VEC2 UV + indices accessors, embeds the texture as a PNG buffer view, ships a one-primitive PBR-baseColor material with alphaMode=MASK.
- **Files modified:** `scripts/sprite-pipeline/pipeline/glb_writer.py`, `scripts/sprite-pipeline/requirements.txt`
- **Commit:** `9302583`

**3. [Rule 2 - Missing functionality] Thumbnail extraction not in original Task 2/3 plan**
- **Found during:** PILOT-FINDINGS scope-add reading
- **Issue:** PILOT-FINDINGS adds `thumbnails: string[]` to the manifest schema, but the plan tasks only mentioned `extract-2d`/`render-3d` over fixture bundles. The ~2000 thumbnail bundles were unmapped.
- **Fix:** Added `_extract_thumbnails_for(fx)` to `extract_2d.py` and a Phase-2 loop in `extract_2d.run` that iterates every outdoor fixture (not just 2D-branch) and pulls all variants from `mysekai/thumbnail/fixture/<name>_<v>`. `assemble_manifest.py`'s `_collect_thumbnails(fx)` discovers them on disk and writes `thumbnails[]` per entry.
- **Files modified:** `scripts/sprite-pipeline/pipeline/extract_2d.py`, `scripts/sprite-pipeline/pipeline/assemble_manifest.py`
- **Commit:** `9302583` (initial wiring) and `e9d3af2` (test coverage)

**4. [Rule 1 - Bug] `extract_to_tiled_png` was missing in Task 2 plan-as-written**
- **Found during:** PILOT-FINDINGS Q2 reading
- **Issue:** Plan said `extract-2d` should call `extract_to_png(..., target_size=(w_px, d_px))` which resizes a single seam tile to the whole-fixture canvas — making 6×6 rugs render as one giant blurry tile.
- **Fix:** Added `extract_to_tiled_png(bundle, out, grid_w, grid_d, tile_px)` that pastes the source tile (resized to tile_px square) across the canvas. The 2D-branch run handler now uses this. `extract_to_png` stays available for thumbnails (single texture, no tiling).
- **Files modified:** `scripts/sprite-pipeline/pipeline/extract_2d.py`
- **Commit:** `9302583`

### No Architectural Deviations

No Rule 4 escalations needed. All issues were correctness bugs, missing critical functionality, or minor blocking gaps.

## Authentication gates

None encountered. The cached `assets-cache/abcache.db` (built in Wave 2) plus `data/apphash.json` (refreshed from JP 6.4.1 xapk in Wave 2) were sufficient for the live download — `--no-update` reused the index, saving ~60s and avoiding any re-auth handshake.

## TILE_PX

Stayed at **128** (D-05 default). Final size 135.7 MB is comfortably under the 150 MB cap; no fallback to TILE_PX=96 was triggered.

## Verification — must_haves

| Truth | Status |
|---|---|
| `python -m pipeline download --dry-run` prints exact D-12 sssekai command | PASS (3 tests in test_download_dryrun.py) |
| `python -m pipeline run-all --dry-run` enumerates outdoor fixtures without prompting | PASS (1138 = 52 + 1086) |
| Real run-all produces manifest.json with every successfully-processed fixture + PNG on disk | PASS (1116 entries, every entry has corresponding PNG verified by test_manifest_completeness) |
| `public/sprites/` ≤ 150 MB | PASS (135.7 MB / 150 MB) |
| `pnpm build` succeeds; `dist/sprites/manifest.json` exists | PASS (built in 1.84s; 1116 entries in dist; 1116 PNGs copied) |

## Run-time profile

| Stage | Wall-clock |
|---|---|
| sssekai abcache download (1.2 GB, 1197 fixture + 2122 thumbnail bundles) | ~12 min |
| extract-2d (52 sprites + 1929 thumbnails) | ~12 sec |
| render-3d (1086 fixtures × Blender startup + render) | 14 min 22 sec |
| assemble-manifest + check-size | <1 sec |

## Known Stubs

None. Every code path is wired to real data; no placeholder PNGs, no mock manifest entries.

The 5 missing 3D bundles (out of 1086 expected) appear in the manifest as absent entries, not as broken PNGs — the sprite key simply isn't present in `manifest.fixtures`. Front-end consumers must handle missing fixture lookups gracefully (existing pattern: `PlacedItem.fallback.test.tsx` already covers this).

## Self-Check: PASSED

All claimed artifacts verified on disk; all claimed commits verified in git history.

- FOUND: scripts/sprite-pipeline/pipeline/__main__.py
- FOUND: scripts/sprite-pipeline/pipeline/download.py
- FOUND: scripts/sprite-pipeline/pipeline/render_3d.py
- FOUND: scripts/sprite-pipeline/pipeline/run_all.py
- FOUND: scripts/sprite-pipeline/pipeline/assemble_manifest.py
- FOUND: scripts/sprite-pipeline/pipeline/check_size.py
- FOUND: scripts/sprite-pipeline/pipeline/glb_writer.py (real impl, not stub)
- FOUND: scripts/sprite-pipeline/tests/test_download_dryrun.py
- FOUND: scripts/sprite-pipeline/tests/test_routing_outdoor_count.py
- FOUND: scripts/sprite-pipeline/tests/test_manifest_completeness.py
- FOUND: public/sprites/manifest.json
- FOUND: public/sprites/*.png (1116 entries)
- FOUND: public/sprites/thumbnails/*.png (1929 entries)
- FOUND: dist/sprites/manifest.json (1116 entries; pnpm build smoke pass)
- FOUND commits: 8d7c0d0, 9302583, e9d3af2, cad6f1d
