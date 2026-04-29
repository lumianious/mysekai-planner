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
| `pipeline/cdn_probe.py` | Wave 2 | CDN reachability probe (gates pilot) |
| `pipeline/download.py` | later wave | sssekai abcache wrapper |
| `pipeline/extract_2d.py` | Wave 2 | UnityPy → diffuse PNG (Material._MainTex with Texture2D fallback) |
| `data/apphash.json` | Wave 2 | Pinned JP production app credentials (refreshed from current xapk) |
| `pipeline/render_3d.py` | later wave | Spawn Blender headless per fixture |
| `pipeline/blender_render.py` | later wave | bpy script (invoked via `blender -b -P`) |
| `pipeline/assemble_manifest.py` | later wave | Write `public/sprites/manifest.json` |
| `pipeline/check_size.py` | later wave | Aggregate-size guard (D-02 ≤150MB) |
| `tests/__init__.py` | Wave 0 | Package marker |
| `tests/conftest.py` | Wave 0 | Shared pytest fixtures |
| `tests/test_routing.py` | Wave 0 | Parity test vs JS `getGroundSubtype` snapshot |
| `tests/test_routing_parity_fixtures.json` | Wave 0 | JS-generated snapshot (committed) |
| `tests/generate_parity_snapshot.mjs` | Wave 0 | Node script that writes the snapshot |
| `tests/fixtures/` | Wave 0 | Sample bundles + GLBs for unit tests (currently `.gitkeep` only) |
| `tests/test_extract_2d.py` | Wave 2 | Sample bundle → PNG (RGBA, dimensions, resample) |
| `tests/fixtures/sample_2d_bundle.unity3d` | Wave 2 | Real `mdl_non2001_road_soil1` bundle for offline tests |
| `tests/test_render_3d.py` | later wave | Sample GLB → PNG (`@pytest.mark.slow`) |
| `tests/test_output_dimensions.py` | Wave 2 | TILE_PX = 128 + grid-size canvas math |
| `tests/test_manifest_completeness.py` | later wave | Manifest entry ↔ PNG existence |
| `tests/test_download_dryrun.py` | later wave | Assert sssekai command string |
| `assets-cache/` | runtime, gitignored | Bundle cache + `.extracted-with` stamp |

## Conventions

- Python files use Chinese comment blocks with ASCII separators (`# ======== 段落标题 ========`)
- Every Python file has an L3 header: `# INPUT:`, `# OUTPUT:`, `# POS:`
- File ≤ 800 lines, function ≤ 50 lines, ≤ 3 nesting levels (per project CLAUDE.md)
- `pytest -m "not slow"` is the per-commit gate; `pytest` (full) is the per-wave gate
