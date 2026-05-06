# scripts/sprite-pipeline (Phase 5 — sprite asset pipeline)

> L2 module map per DocOps protocol. Updated when files in this directory change.

## Purpose

Offline, locally-run Python toolchain that produces transparent top-down PNG sprites for
~1,126 MySekai outdoor fixtures plus a `manifest.json`. Pipeline has three stages:

1. **download** — sssekai `abcache` pulls Unity asset bundles from JP CDN
2. **route** — `getGroundSubtype` (Python parity port) decides 2D-texture-extract vs 3D-render
3. **render/export** — UnityPy diffuse-texture dump for 2D items; Blender headless ortho render for 3D items

Outputs land in `../../public/sprites/` (committed, served by GitHub Pages).
Pipeline runs **LOCAL ONLY** (D-03). `assets-cache/` is gitignored.

## Members

| File / Dir | Status | Purpose |
|------------|--------|---------|
| `README.md` | Wave 0 | Prerequisites + run recipe + testing instructions |
| `CLAUDE.md` | Wave 0 | This module map |
| `requirements.txt` | Wave 0 | Pinned Python deps |
| `pytest.ini` | Wave 0 | pytest config + `slow` marker registration |
| `overrides.yaml` | Wave 0 | D-09 manual classification overrides (empty by default) |
| `pipeline/__init__.py` | Wave 0 | Package marker |
| `pipeline/config.py` | Wave 0 | Constants: paths, TILE_PX, size budget |
| `pipeline/routing.py` | Wave 0 | Python port of `getGroundSubtype` (D-08, D-19 parity gate) |
| `pipeline/__main__.py` | Wave 3 | Subcommand router: download / extract-2d / render-3d / assemble-manifest / run-all |
| `pipeline/cdn_probe.py` | Wave 2 | CDN reachability probe (gates pilot) |
| `pipeline/download.py` | Wave 3 | sssekai abcache wrapper + .extracted-with stamp (D-12, D-14) |
| `pipeline/extract_2d.py` | Wave 2/3 | UnityPy → diffuse PNG (incl. extract_to_tiled_png + batch run + thumbnail extraction) |
| `data/apphash.json` | Wave 2 | Pinned JP production app credentials (refreshed from current xapk) |
| `pipeline/render_3d.py` | Wave 3 | Batch 3D dispatcher (UnityPy → GLB → Blender per fixture) |
| `pipeline/blender_render.py` | Wave 2 | bpy script: ortho top-down render, EEVEE→CYCLES fallback |
| `pipeline/glb_writer.py` | Wave 3 | UnityPy Mesh + Texture2D → minimal PBR-baseColor GLB via pygltflib |
| `pipeline/run_all.py` | Wave 3 | Drives extract-2d → render-3d → assemble-manifest |
| `pipeline/sync.py` | post-Phase 5 | Pulls latest mysekaiFixtures.json, diffs vs manifest, optionally chains a render limited to the new IDs via `--ids` filter |
| `pipeline/pilot.py` | Wave 2 | 3-fixture pilot: download → route → render/extract → manifest |
| `pipeline/assemble_manifest.py` | Wave 3 | Writes `public/sprites/manifest.json` (incl. thumbnails[]) |
| `pipeline/check_size.py` | Wave 3 | Aggregate-size guard (D-02 ≤150MB) |
| `tests/__init__.py` | Wave 0 | Package marker |
| `tests/conftest.py` | Wave 0 | Shared pytest fixtures |
| `tests/test_routing.py` | Wave 0 | Parity test vs JS `getGroundSubtype` snapshot |
| `tests/test_routing_parity_fixtures.json` | Wave 0 | JS-generated snapshot (committed) |
| `tests/generate_parity_snapshot.mjs` | Wave 0 | Node script that writes the snapshot |
| `tests/fixtures/` | Wave 0 | Sample bundles + GLBs for unit tests (currently `.gitkeep` only) |
| `tests/test_extract_2d.py` | Wave 2 | Sample bundle → PNG (RGBA, dimensions, resample) |
| `tests/fixtures/sample_2d_bundle.unity3d` | Wave 2 | Real `mdl_non2001_road_soil1` bundle for offline tests |
| `tests/test_render_3d.py` | Wave 2 | Khronos Box.glb → 128×128 RGBA (`@pytest.mark.slow`) |
| `tests/fixtures/sample_3d.glb` | Wave 2 | Khronos Box.glb (1664 B, public domain) |
| `tests/test_output_dimensions.py` | Wave 2 | TILE_PX = 128 + grid-size canvas math |
| `tests/test_manifest_completeness.py` | Wave 3 | Manifest entry ↔ PNG existence + schema check |
| `tests/test_download_dryrun.py` | Wave 3 | Assert sssekai command string + subcommand --help completeness |
| `tests/test_routing_outdoor_count.py` | Wave 3 | Outdoor fixture count + 2D/3D split sanity |
| `assets-cache/` | runtime, gitignored | Bundle cache + `.extracted-with` stamp |

## Conventions

- Python files use Chinese comment blocks with ASCII separators (`# ======== 段落标题 ========`)
- Every Python file has an L3 header: `# INPUT:`, `# OUTPUT:`, `# POS:`
- File ≤ 800 lines, function ≤ 50 lines, ≤ 3 nesting levels (per project CLAUDE.md)
- `pytest -m "not slow"` is the per-commit gate; `pytest` (full) is the per-wave gate
