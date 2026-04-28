---
phase: 05-sprite-pipeline
plan: 01
subsystem: sprite-pipeline-bootstrap
tags: [scaffolding, docops-l2, python-pipeline, manifest-loader, parity-test]
wave: 1
requirements: [SPRT-01, SPRT-02, SPRT-07]
dependency_graph:
  requires: []
  provides:
    - "scripts/sprite-pipeline/ as a top-level module with L2 CLAUDE.md"
    - "Python pytest infrastructure for Phase 5 pipeline code"
    - "get_ground_subtype Python parity port (D-19) with JS-snapshot test"
    - "loadSpriteManifest + getSpriteEntrySync (D-17 graceful fallback)"
    - "Wave 4 PlacedItem sprite-render test stubs (it.todo)"
  affects:
    - ".gitignore (assets-cache + .venv exclusions)"
    - "package.json (use-image dependency added)"
tech_stack:
  added:
    - "use-image ^1.1.1 (resolved 1.1.4) — npm dep for Wave 4 <Image> rendering"
    - "pytest 8.x — Python test framework for sprite-pipeline"
    - "sssekai==0.8.0, Pillow>=10.4, pyyaml>=6.0, tqdm>=4.66 — pinned in requirements.txt (not yet installed; Wave 3)"
  patterns:
    - "L2 CLAUDE.md per DocOps for new top-level module"
    - "L3 INPUT/OUTPUT/POS headers on every Python file"
    - "Chinese comment blocks with ASCII separators (mirrors TS convention)"
    - "JS-source-of-truth → JSON snapshot → Python parity assertion (D-19 pattern)"
    - "Module-level cache + in-flight Promise dedupe (matches existing fixtures.ts pattern)"
key_files:
  created:
    - "scripts/sprite-pipeline/CLAUDE.md"
    - "scripts/sprite-pipeline/README.md"
    - "scripts/sprite-pipeline/requirements.txt"
    - "scripts/sprite-pipeline/pytest.ini"
    - "scripts/sprite-pipeline/overrides.yaml"
    - "scripts/sprite-pipeline/pipeline/__init__.py"
    - "scripts/sprite-pipeline/pipeline/config.py"
    - "scripts/sprite-pipeline/pipeline/routing.py"
    - "scripts/sprite-pipeline/tests/__init__.py"
    - "scripts/sprite-pipeline/tests/conftest.py"
    - "scripts/sprite-pipeline/tests/test_routing.py"
    - "scripts/sprite-pipeline/tests/generate_parity_snapshot.mjs"
    - "scripts/sprite-pipeline/tests/test_routing_parity_fixtures.json"
    - "scripts/sprite-pipeline/tests/fixtures/.gitkeep"
    - "src/types/spriteManifest.ts"
    - "src/data/spriteManifest.ts"
    - "src/data/__tests__/spriteManifest.test.ts"
    - "src/components/canvas/__tests__/PlacedItem.fallback.test.tsx"
    - "src/components/canvas/__tests__/PlacedItem.sprite.test.tsx"
  modified:
    - ".gitignore"
    - "package.json"
    - "pnpm-lock.yaml"
decisions:
  - "use-image pinned at ^1.1.1; pnpm resolved 1.1.4 (latest 1.1.x)"
  - "Snapshot generator fetches mysekaiFixtures.json from sekai-master-db-diff GitHub raw URL when not on disk; URL mirrors src/data/fixtures.ts DATA_BASE_URL"
  - "1255 fixtures snapshotted (full upstream, not the ~1126 outdoor subset — outdoor filtering applied later by routing.is_outdoor + assemble_manifest)"
  - "PlacedItem.fallback test does NOT render through Konva Stage (jsdom incompatibility); guards the manifest-miss contract directly via getSpriteEntrySync"
  - "conftest.py prepends scripts/sprite-pipeline/ to sys.path so tests can import pipeline.* without external PYTHONPATH"
  - "Python 3.9 (system) used for pytest setup since python3.11 not on PATH; pytest 8.x supports 3.8+. Wave 3 README still pins 3.11 as the recommended runtime for the actual extraction tools (sssekai/UnityPy)"
metrics:
  duration: "~10min"
  tasks_completed: 3
  files_created: 19
  files_modified: 3
  commits: 3
  completed: "2026-04-28"
---

# Phase 05 Plan 01: Sprite Pipeline Bootstrap Summary

Wave 0 scaffolding for Phase 5: stood up `scripts/sprite-pipeline/` as a Python module with pytest, ported `getGroundSubtype` to Python with a 1255-fixture JS-parity snapshot, and added the frontend manifest loader + Wave 4 test stubs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Bootstrap pipeline scaffolding + DocOps L2 + use-image dep | `077a738` | .gitignore, package.json, pnpm-lock.yaml, scripts/sprite-pipeline/{CLAUDE.md, README.md, requirements.txt, pytest.ini, overrides.yaml, pipeline/__init__.py, pipeline/config.py, tests/__init__.py, tests/conftest.py, tests/fixtures/.gitkeep} |
| 2 | Port getGroundSubtype to Python + JS parity test (D-19) | `fa34e99` | scripts/sprite-pipeline/{pipeline/routing.py, tests/test_routing.py, tests/generate_parity_snapshot.mjs, tests/test_routing_parity_fixtures.json} |
| 3 | Frontend manifest types + loader + Wave 4 test scaffolding | `2edbde5` | src/types/spriteManifest.ts, src/data/spriteManifest.ts, src/data/__tests__/spriteManifest.test.ts, src/components/canvas/__tests__/{PlacedItem.fallback.test.tsx, PlacedItem.sprite.test.tsx} |

## Verification

- `cd scripts/sprite-pipeline && pytest -x -m "not slow"` — **4 passed in 0.01s**
- `pnpm test --run` — **190 passed | 3 todo (193 total) across 22 files**
- `grep '"use-image"' package.json` — present at `^1.1.1`
- `grep 'scripts/sprite-pipeline/assets-cache/' .gitignore` — present
- Snapshot regeneration: `node tests/generate_parity_snapshot.mjs` is deterministic (zero diff on second run)

## Must-Haves Status

| Truth | Status |
|-------|--------|
| Python pytest runs in scripts/sprite-pipeline/ with all-passing tests | ✅ 4/4 passing |
| Frontend test suite (pnpm test) stays green with new placeholder tests | ✅ 190/190 + 3 todos |
| Python `get_ground_subtype` returns identical classifications to JS over snapshot | ✅ 1255 fixtures, zero mismatches |
| use-image is added to package.json | ✅ `^1.1.1` (resolved 1.1.4) |
| scripts/sprite-pipeline/ is registered as a top-level module with L2 CLAUDE.md | ✅ |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PlacedItem.fallback test cannot render through Konva Stage in jsdom**

- **Found during:** Task 3 verification
- **Issue:** Konva 10 + react-konva 19 in jsdom errors on `Cannot read properties of null (reading 'scale')` because `HTMLCanvasElement.getContext()` returns `null` in jsdom — Konva's `Stage._buildDOM` then crashes. The plan's smoke-test pattern (`render(<Stage>...<PlacedItem/></Stage>)`) is incompatible with this environment.
- **Evidence:** No existing tests in this repo render `<Stage>` in jsdom; they exercise the underlying logic (store, hooks, helpers) directly. Confirmed via `grep -rn "Stage\|react-konva" src/__tests__/` returning zero matches.
- **Fix:** Rewrote PlacedItem.fallback.test.tsx to test the **fallback contract** at the manifest layer: with empty manifest, `getSpriteEntrySync()` returns `undefined`, which is the precondition that drives PlacedItem to render `<Rect>` in Wave 4. Visual verification of the actual `<Image>` vs `<Rect>` branch remains in the manual checklist for Wave 4 (already in 05-VALIDATION.md).
- **Files modified:** `src/components/canvas/__tests__/PlacedItem.fallback.test.tsx`
- **Commit:** `2edbde5`

**2. [Rule 3 - Blocking] python3.11 not on PATH; Python 3.9 used for tests**

- **Found during:** Task 1 verification
- **Issue:** Plan's verify command uses `python3.11`; system only has `python3` (3.9.6).
- **Fix:** Used `python3 -m venv .venv` instead. pytest 8.x supports Python 3.8+, so all current tests run cleanly. Wave 3 will still need 3.11 for the actual extraction tools (sssekai/UnityPy/Pillow have wheels for 3.11) — README continues to document 3.11 as the recommended runtime.
- **Note:** sssekai/Pillow not yet installed (deferred to Wave 3 when the actual extraction code lands); only pytest is in the venv today.

### Planned Adaptations

- **PlacedItem prop signature in fallback test:** the plan suggested `fixtureMap` + `onSelect`, but PlacedItem.tsx actually uses `fixture` (singular), `toolMode`, `stageScale`, `onItemClick`, `onItemDragEnd` (verified against FurnitureLayer.tsx call site). Test now uses the actual signature — fully typed against `Fixture` and `PlacedItem` from `src/types/editor.ts`.
- **Snapshot source resolution:** plan said "fetch URL from fixtures.ts if mysekaiFixtures.json missing on disk" — confirmed missing (data is fetched at runtime in the app), so snapshot generator now fetches `https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main/mysekaiFixtures.json` (URL constructed from `DATA_BASE_URL` in fixtures.ts). Yields 1255 fixtures.

## Authentication Gates

None encountered.

## Self-Check: PASSED

**Files verified:**
- ✅ scripts/sprite-pipeline/CLAUDE.md
- ✅ scripts/sprite-pipeline/README.md
- ✅ scripts/sprite-pipeline/requirements.txt
- ✅ scripts/sprite-pipeline/pytest.ini
- ✅ scripts/sprite-pipeline/overrides.yaml
- ✅ scripts/sprite-pipeline/pipeline/config.py
- ✅ scripts/sprite-pipeline/pipeline/routing.py
- ✅ scripts/sprite-pipeline/tests/conftest.py
- ✅ scripts/sprite-pipeline/tests/test_routing.py
- ✅ scripts/sprite-pipeline/tests/generate_parity_snapshot.mjs
- ✅ scripts/sprite-pipeline/tests/test_routing_parity_fixtures.json
- ✅ src/types/spriteManifest.ts
- ✅ src/data/spriteManifest.ts
- ✅ src/data/__tests__/spriteManifest.test.ts
- ✅ src/components/canvas/__tests__/PlacedItem.fallback.test.tsx
- ✅ src/components/canvas/__tests__/PlacedItem.sprite.test.tsx

**Commits verified:**
- ✅ 077a738 chore(05-01): bootstrap sprite-pipeline scaffolding + use-image dep
- ✅ fa34e99 feat(05-01): port getGroundSubtype to Python with JS parity gate (D-19)
- ✅ 2edbde5 feat(05-01): sprite manifest types + loader + Wave 4 test scaffolding

## Known Stubs

None. All stubs are intentional Wave 4 placeholders (3 `it.todo` in PlacedItem.sprite.test.tsx) explicitly documented in their test descriptions and tracked by Phase 5 Plan 04.
