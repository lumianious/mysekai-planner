# 05-02 Summary

Plan: `.planning/phases/05-sprite-pipeline/05-02-PLAN.md` (Wave 2 PILOT)
Status: **complete with partial sign-off** — 1 of 3 pilot fixtures rendered; 2 known gaps documented for Wave 3.

## What was built

| Component | Outcome |
|---|---|
| `data/apphash.json` | Pinned JP 6.4.1 credentials, refreshed from current xapk |
| `pipeline/cdn_probe.py` | CDN-reachability probe; verdict `LIVE_OK` after path-prefix fix |
| `pipeline/extract_2d.py` | UnityPy → RGBA PNG (with `FALLBACK_UNITY_VERSION = 2022.3.21f1`); also handles thumbnail bundles via Texture2D fallback |
| `pipeline/blender_render.py` | Headless ortho renderer; EEVEE_NEXT → EEVEE → CYCLES selection; 30%-margin framing; `[FALLBACK]` signal on addon failure |
| `pipeline/glb_writer.py` | Stub raising `NotImplementedError` — Wave 3 promotes to real impl |
| `pipeline/pilot.py` | 3-fixture orchestrator: download → route → render/extract → manifest, with thumbnail extraction per variant |
| `tests/fixtures/sample_2d_bundle.unity3d` | Real `mdl_non2001_road_soil1` bundle (~42 KB) for offline tests |
| `tests/fixtures/sample_3d.glb` | Khronos Box.glb (1.6 KB) for headless render tests |
| `tests/test_extract_2d.py` | 3 tests (RGBA, write, resample) — all green |
| `tests/test_output_dimensions.py` | 2 tests (TILE_PX = 128, canvas math) — all green |
| `tests/test_render_3d.py` | 1 slow test (Khronos Box → 128×128 RGBA) — green with Blender 5.1.1 |
| `src/types/spriteManifest.ts` | `SpriteManifestEntry.thumbnails: string[]` added |
| `public/sprites/mdl_mis0001_rug_rug1.png` + thumbnail | First real pilot output |
| `public/sprites/manifest.json` | 1 entry (rug); Wave 3 rewrites |

## Pilot results

| Fixture | Branch | Outcome |
|---|---|---|
| `mdl_mis0001_rug_rug1` (6×6, 1 variant) | 2D | OK — 768×768 PNG + 1 thumbnail |
| `mdl_mis0001_fixture_lamp1` (1×1, 5 variants) | 3D | BLOCKED — `addon-headless-failed` |
| `mdl_mis0001_house_house1` (12×12, 1 variant) | 3D | BLOCKED — `addon-headless-failed` |

## Findings → Wave 3 inputs

1. **Q1 = NO**: `sssekai_blender_io` is a separate (archived, Blender-4.x) addon, not the pip package. Wave 3 must implement `glb_writer.py` (UnityPy → GLB) and feed Blender's stock `import_scene.gltf`.
2. **Q2 partial**: 2D-branch extraction returns the *tileable texture*, not a *whole-fixture* image. Wave 3 adds a tiling step in `extract_2d.extract_to_png`.
3. **Q3 deferred**: 30% margin formula sanity-passed against Khronos Box; needs revalidation against real MySekai 3D fixtures after Wave 3 unblocks 3D rendering.
4. **Q5 = LIVE_OK**: refresh apphash from current xapk whenever JP version increments. Document in Wave 3 README. No mitigation paths needed.
5. **Scope addition (thumbnails)**: catalog 45° iso thumbnails ship as separate `mysekai/thumbnail/fixture/<name>_<variant>` bundles; manifest schema extended with `thumbnails: string[]`; Wave 3 downloads both model + thumbnail bundles for every fixture; Wave 4 catalog UI consumes `thumbnails[]`.

## Pointers

- `.planning/phases/05-sprite-pipeline/05-02-CDN-PROBE.md` — auth viability evidence
- `.planning/phases/05-sprite-pipeline/05-02-PILOT-FINDINGS.md` — full Q1/Q2/Q3/Q5 + scope-add resolutions, Wave 3 hand-off
- `.planning/phases/05-sprite-pipeline/05-RESEARCH.md` — original open-question framing

## Commits

```
ee26335 feat(05-02): CDN probe + frozen apphash snapshot, verdict FAILED
12148ee fix(05-02): refresh apphash to JP 6.4.1, fix bundle path prefix → LIVE_OK
4d34d22 feat(05-02): UnityPy 2D-texture extractor + tests
3b3949c feat(05-02): Blender headless ortho renderer + glb_writer stub + slow test
facbbf7 feat(05-02): pilot orchestrator + 1/3 PNGs + thumbnail scope add
```

## Wave 3 hand-off

Plan 05-03 should adopt as concrete tasks:

1. Implement `glb_writer.unity_bundle_to_glb(bundle_path, out_glb)` using `pygltflib`. Add `pygltflib` to `requirements.txt`. Validate by re-running pilot's lamp + house fixtures end-to-end.
2. Add `extract_to_tiled_png(bundle_path, out, grid_w, grid_d, tile_px)` to `extract_2d.py` — tiles the source texture across the canvas.
3. Spot-check `floor_appearance` (27 fixtures) — confirm 2D routing works; revise overrides if any need 3D.
4. Re-run pilot after (1) and (2) → 3/3 PNGs + all variants' thumbnails.
5. Scale to all ~1,138 outdoor fixtures (model bundles + ~2,000 thumbnail bundles).
6. Lock Q3 camera framing decision based on real-fixture rendering output.
