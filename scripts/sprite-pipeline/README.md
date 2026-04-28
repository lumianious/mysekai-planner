# sprite-pipeline

Offline pipeline that produces top-down PNG sprites for MySekai outdoor fixtures.
Outputs land in `../../public/sprites/` and ship via GitHub Pages.

## Prerequisites

- **Python 3.11** (3.9+ tolerated for tests; render path may require 3.11)
- **Blender 4.5 LTS** on `PATH` (or set `BLENDER_BIN` env var)
- **pnpm install** in repo root (web-side `use-image` dep + frontend tests)

> First commit of `public/sprites/` will be sizeable (~50–100 MB). Subsequent
> re-renders create big delta commits. Re-extraction trigger is data-driven
> (D-11): only re-run when `mysekaiFixtures.json` shows new fixture IDs.

## Setup

```bash
cd scripts/sprite-pipeline
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run recipe (Wave 3 will fill in details — placeholder)

The full pipeline will be invoked as:

```bash
python -m pipeline download             # → assets-cache/bundles/
python -m pipeline extract-2d           # → ../../public/sprites/<bundle>.png
python -m pipeline render-3d            # → ../../public/sprites/<bundle>.png
python -m pipeline assemble-manifest    # → ../../public/sprites/manifest.json
python -m pipeline run-all              # all of the above in order
```

The `download` step uses `sssekai abcache` per D-12 — exact command is documented
once the Wave 3 download wrapper lands.

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
