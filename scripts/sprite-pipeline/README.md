# sprite-pipeline

Offline pipeline that produces top-down PNG sprites + 45° catalog thumbnails for
MySekai outdoor fixtures. Outputs land in `../../public/sprites/` and ship via
GitHub Pages.

## Prerequisites

- **Python 3.12** (`.venv` already provisioned)
- **Blender 5.x** on `PATH` (or set `BLENDER_BIN`). Headless ortho render path.
- **pnpm install** in repo root (front-end build verification step).
- Live JP credentials at `data/apphash.json` (already populated; refreshed from xapk).

> First commit of `public/sprites/` is sizeable (target ≤ 150 MB; D-02 cap).
> Re-extraction trigger (D-11): run only when `mysekaiFixtures.json` upstream
> lists IDs absent from the current `manifest.json`. Typical cadence: 1–2× / year.

## Setup

```bash
cd scripts/sprite-pipeline
source .venv/bin/activate           # already provisioned, do NOT recreate
pip install -r requirements.txt     # idempotent
```

## Live run recipe

```bash
# 0) Verify dry-run: ~52 + ~1086 ≈ 1138 outdoor fixtures enumerated
python -m pipeline run-all --dry-run

# 1) Download bundles (one-off; ~1.2 GB; ~minutes). --no-update reuses abcache.db.
python -m pipeline download --no-update

# 2) 2D branch + all thumbnails (rug/road/floor textures tiled per PILOT-FINDINGS Q2)
python -m pipeline extract-2d

# 3) 3D branch (UnityPy → minimal GLB → Blender ortho top-down; PILOT-FINDINGS Q1 Path B)
python -m pipeline render-3d

# 4) Manifest assembly (with thumbnail discovery + size cap check)
python -m pipeline assemble-manifest --check-size
# (or) python -m pipeline.check_size  # standalone size guard

# 5) Front-end smoke test
cd ../.. && pnpm build && test -f dist/sprites/manifest.json

# 6) Commit generated assets
git add public/sprites/
git commit -m "feat(sprites): regenerate from app-version 6.4.1"
```

`run-all` chains stages 2–4 (omitting `download`).

## Refresh credentials

When the JP client updates (every 2–4 weeks):

```bash
sssekai apphash --apk-src <new-jp-xapk-from-apkpure>
# copy output into data/apphash.json (preserve existing schema)
```

## Architecture decisions

- **2D branch tiling** — Pilot found rug/road textures ship as single-tile seam patterns.
  `extract_to_tiled_png` pastes the source tile across a `grid_w × grid_d` canvas at
  `TILE_PX = 128` so the front-end sees a complete sprite (no runtime tiling).
- **3D branch via GLB** — `sssekai_blender_io` does not register under
  `blender --background` (Blender 5.x). `glb_writer` parses Mesh.export() OBJ + first
  usable Texture2D into a one-primitive PBR-baseColor GLB via `pygltflib`. Blender
  then imports the GLB through built-in `import_scene.gltf`.
- **Camera** — orthographic top-down; `ortho_scale = max(grid_size, AABB_xy) * 1.3`
  (D-04). Re-evaluated against real 3D content in Wave 3 once `glb_writer` lands.
- **Thumbnails** — every outdoor fixture pulls `mysekai/thumbnail/fixture/<name>_<v>`
  for `v = 1..1+len(otherColors)` and writes to `public/sprites/thumbnails/`.
  `manifest.fixtures[name].thumbnails[]` indexes them by variant.

## Testing

```bash
# Quick — skip Blender / network slow tests (per-commit gate)
pytest -x -m "not slow"

# Full — including Blender headless render tests (per-wave gate)
pytest

# Regenerate the JS-parity snapshot for routing tests
node tests/generate_parity_snapshot.mjs
```

## Layout

See `CLAUDE.md` for the L2 module map.
