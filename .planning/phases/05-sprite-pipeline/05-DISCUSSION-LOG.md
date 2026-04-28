# Phase 5: Sprite Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 05-sprite-pipeline
**Areas discussed:** Pipeline location & deliverable, Output format & resolution, 3D-render vs 2D-texture split, Asset bundle sourcing & versioning, Rotation + coverage fallback

---

## Pipeline Location & Deliverable Shape

| Option | Description | Selected |
|--------|-------------|----------|
| `scripts/sprite-pipeline/` in this repo | Single source of truth, code+sprites in one PR | ✓ |
| Sister repo `mysekai-sprite-pipeline` | Clean stack separation | |
| Git submodule | Middle ground | |

| Option | Description | Selected |
|--------|-------------|----------|
| Commit to `public/sprites/` | Simplest deploy if total < ~50MB | ✓ |
| GitHub Releases | Pipeline uploads, Vite build downloads in CI | |
| Git LFS | Heavier setup | |

| Option | Description | Selected |
|--------|-------------|----------|
| Local-only execution | Manual run on game updates; no CI cost | ✓ |
| GitHub Actions self-hosted runner | More automation, infra to manage | |
| GitHub Actions hosted | Slow, fragile for Blender headless | |

**User's choice:** All defaults (recommendations) accepted via "looks ok so far".
**Notes:** User flagged Area 4 as the only concern requiring deeper research.

---

## Output Format & Resolution

| Option | Description | Selected |
|--------|-------------|----------|
| Per-fixture PNG | Direct `<Image>`, browser cache, easy iteration | ✓ |
| Single atlas + manifest | Fewer requests, harder to update | |
| Per-genre atlas | Compromise | |

| Option | Description | Selected |
|--------|-------------|----------|
| 64px/tile | 2× tile, smaller bundle | |
| 128px/tile | 4× tile, crisp on zoom | ✓ |
| 256px/tile | Too large (~400MB total) | |

| Option | Description | Selected |
|--------|-------------|----------|
| `{assetbundleName}.png` | Direct lookup from fixture data | ✓ |
| `{fixtureId}.png` | Stable across asset rename | |

| Option | Description | Selected |
|--------|-------------|----------|
| Transparent, no shadow | Konva can add shadow later | ✓ |
| Baked shadow | Matches in-game look | |

**User's choice:** Defaults accepted.

---

## 3D-Render vs 2D-Texture Split

| Option | Description | Selected |
|--------|-------------|----------|
| Use `getGroundSubtype` classifier | Already proven in Phase 2 routing | ✓ |
| Use `layoutType` field | More direct, less battle-tested | |
| Manual override list | Highest maintenance | |

**User's choice:** Default. Manual override list (`overrides.yaml`) added as escape hatch (D-09).

---

## Asset Bundle Sourcing & Versioning

| Option | Description | Selected |
|--------|-------------|----------|
| Manual one-off, documented | Resilient to game-update fragility | ✓ (revised) |
| Scripted download via URL pattern | Original recommendation; brittle on app-hash rotation | (rejected after research) |
| Mirror via community repo | No suitable mirror found for outdoor fixtures | |

| Option | Description | Selected |
|--------|-------------|----------|
| Manual on game update | High discipline cost | |
| Data-driven (compare fixture IDs vs manifest) | Runs only when needed | ✓ |
| Scheduled weekly | Wasteful, breaks on app-hash change | |

| Option | Description | Selected |
|--------|-------------|----------|
| Pin sssekai 0.8.0 + Blender 4.x + Python 3.11 | Reproducibility | ✓ (with twintail noted as fallback) |

**User's choice:** "the only concern is the game asset part, like how to obtain it, this requires more research, so i will leave you to it"

**Research conducted:** WebSearch + WebFetch on sssekai, twintail, sssekai_blender_io, prosekabeta archive, sekai.best.

**Notes:**
- sssekai archived Feb 25, 2026 (v0.8.0) — read-only repo, but tool works
- sssekai_blender_io also archived Feb 26, 2026 — designed interactive-first; headless batch is technically feasible but needs validation
- `abcache` requires app-version + app-hash UUID per build; rotates on game updates → fragile for CI automation
- Total bundle size ~50GB; MySekai filter narrows to ~2GB
- Twintail (Rust, active Sep 2025) viable as download+decrypt fallback but doesn't replace sssekai/UnityPy for asset extraction
- No existing community top-down render dataset for MySekai outdoor fixtures
- **Conclusion:** Refined Q4.1 from "scripted download" to "manual one-off with documented recipe + data-driven re-trigger". Pinned tools per D-13. Twintail noted as fallback in D-15.

---

## Rotation + Coverage Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| 1 sprite + Konva rotation | Pipeline ¼ size, already wired | ✓ |
| 4 sprites per fixture | Pixel-perfect symmetry, marginal gain | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to colored rectangle | Graceful, catalog unaffected | ✓ |
| Skip fixture | Breaks catalog | |
| Block deploy | Brittle | |

| Option | Description | Selected |
|--------|-------------|----------|
| `manifest.json` with mode + size | Web app reads for fallback decisions | ✓ |

**User's choice:** Defaults accepted.

---

## Claude's Discretion

- Pipeline file structure (single script vs split)
- Blender camera frustum / lighting / AA samples
- glTF vs FBX intermediate format
- Sprite preload strategy (eager vs lazy)
- Color variants (deferred from Phase 1)

## Deferred Ideas

- Color variants per fixture (Phase 1 D-12)
- Animated sprites
- Indoor fixtures (113 items excluded)
- Atlas / sprite sheet packing
- Baked shadow rendering
- Automated CI re-extraction
- Visual QA viewer (in-game vs render)
