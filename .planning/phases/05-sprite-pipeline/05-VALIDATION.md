---
phase: 5
slug: sprite-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: `05-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (frontend)** | Vitest 3 (already configured per `package.json`) |
| **Framework (pipeline)** | pytest 8.x (NEW — added by Wave 0 in `scripts/sprite-pipeline/requirements.txt`) |
| **Config files** | `vitest.config.ts` (existing); `scripts/sprite-pipeline/pytest.ini` (NEW — Wave 0) |
| **Quick run command (frontend)** | `pnpm test` |
| **Quick run command (pipeline)** | `cd scripts/sprite-pipeline && pytest -x -m "not slow"` |
| **Full suite command** | `pnpm test && cd scripts/sprite-pipeline && pytest` |
| **Estimated runtime** | ~30s (frontend quick) / ~1–2 min (full suite, Blender included) |

---

## Sampling Rate

- **After every task commit (frontend):** `pnpm test`
- **After every task commit (pipeline):** `cd scripts/sprite-pipeline && pytest -x -m "not slow"`
- **After every plan wave:** `pnpm test && cd scripts/sprite-pipeline && pytest` (Blender tests included)
- **Before `/gsd:verify-work`:** Full suite green + 10-fixture end-to-end run + manual editor spot-check of 5 sprites (1×1 furniture, large furniture, road, fence, rug)
- **Max feedback latency:** 30s for quick suite; 120s for full

---

## Per-Task Verification Map

> Concrete `<task-id>` values are filled in once `gsd-planner` produces PLANs. The
> matrix below enumerates the requirement → test mapping that every plan task must hook into.

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| SPRT-01 | `download.py` invokes `sssekai abcache` with correct args | integration (dry-run, no network) | `python -m pipeline download --dry-run` (assert command-string equality) | ❌ W0 — `tests/test_download_dryrun.py` | ⬜ pending |
| SPRT-02 | UnityPy 2D-branch produces non-empty PNG of expected dimensions for sample bundle | unit | `pytest tests/test_extract_2d.py::test_known_bundle -x` | ❌ W0 — `tests/test_extract_2d.py` + sample bundles in `tests/fixtures/` | ⬜ pending |
| SPRT-02 | `getGroundSubtype` (Python) parity with JS implementation in `src/data/fixtures.ts` | unit (parity) | `pytest tests/test_routing.py -x` | ❌ W0 — `tests/test_routing.py` + JS-generated snapshot | ⬜ pending |
| SPRT-03 | Blender headless render produces transparent RGBA PNG of correct dimensions for sample GLB | integration (slow; Blender on PATH) | `pytest tests/test_render_3d.py::test_sample_glb -x --slow` | ❌ W0 — `tests/test_render_3d.py` + sample GLB | ⬜ pending |
| SPRT-04 | Output PNG dimensions = `gridSize.width × 128` × `gridSize.depth × 128`, RGBA, non-zero alpha | unit | `pytest tests/test_output_dimensions.py -x` | ❌ W0 | ⬜ pending |
| SPRT-04 | Output PNG aggregate size ≤ 150 MB | manual (post-batch) | `du -sm public/sprites/ \| awk '{ if ($1 > 150) exit 1 }'` | ❌ W0 — `pipeline/check_size.py` | ⬜ pending |
| SPRT-05 | Pipeline iterates all outdoor fixtures (~1,126) without manual prompting | integration (dry-run) | `python -m pipeline run-all --dry-run` (assert iteration count = `len(outdoor_fixtures)`) | ❌ W0 | ⬜ pending |
| SPRT-05 | All manifest entries have corresponding PNG on disk | unit | `pytest tests/test_manifest_completeness.py -x` | ❌ W0 | ⬜ pending |
| SPRT-06 | Vite build emits `dist/sprites/manifest.json` + PNGs | integration | `pnpm build && test -f dist/sprites/manifest.json` | ✅ existing build; W0 adds assertion script | ⬜ pending |
| SPRT-07 | PlacedItem renders `<Image>` when manifest hit | unit (Vitest + RTL) | `pnpm test src/components/canvas/__tests__/PlacedItem.sprite.test.tsx` | ❌ W0 | ⬜ pending |
| SPRT-07 | PlacedItem falls back to `<Rect fill={fillColor}>` when manifest miss (D-17) | unit | `pnpm test src/components/canvas/__tests__/PlacedItem.fallback.test.tsx` | ❌ W0 | ⬜ pending |
| SPRT-07 | `spriteManifest` fetch + cache + 404 fallback to empty Map | unit | `pnpm test src/data/__tests__/spriteManifest.test.ts` | ❌ W0 | ⬜ pending |
| SPRT-07 (visual) | Sprite renders at correct grid size with rotation 0/90/180/270 | manual (visual) | Place sample fixture in each rotation; screenshot diff | n/a — manual checklist | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/sprite-pipeline/pytest.ini` — pytest config + `slow` marker registered
- [ ] `scripts/sprite-pipeline/requirements.txt` — add `pytest>=8.0`, `UnityPy`, `sssekai`
- [ ] `scripts/sprite-pipeline/tests/conftest.py` — shared fixture-bundle loader + sample paths
- [ ] `scripts/sprite-pipeline/tests/fixtures/sample_2d_bundle.unity3d` — small known Unity bundle (2D)
- [ ] `scripts/sprite-pipeline/tests/fixtures/sample_3d.glb` — small known GLB (3D render input)
- [ ] `scripts/sprite-pipeline/tests/test_routing.py` — parity test for `getGroundSubtype` (Python ↔ JS)
- [ ] `scripts/sprite-pipeline/tests/test_extract_2d.py` — sample bundle → PNG hash
- [ ] `scripts/sprite-pipeline/tests/test_render_3d.py` — sample GLB → PNG (`@pytest.mark.slow`)
- [ ] `scripts/sprite-pipeline/tests/test_output_dimensions.py` — RGBA + grid-size dimension checks
- [ ] `scripts/sprite-pipeline/tests/test_manifest_completeness.py` — manifest entry ↔ PNG existence
- [ ] `scripts/sprite-pipeline/tests/test_download_dryrun.py` — assert sssekai command string
- [ ] `scripts/sprite-pipeline/pipeline/check_size.py` — aggregate-size guard
- [ ] `src/data/__tests__/spriteManifest.test.ts` — fetch + cache + 404 → empty Map
- [ ] `src/components/canvas/__tests__/PlacedItem.sprite.test.tsx` — `<Image>` on manifest hit
- [ ] `src/components/canvas/__tests__/PlacedItem.fallback.test.tsx` — `<Rect>` on manifest miss

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual fidelity of generated sprites against in-game references | SPRT-03, SPRT-04 | Pixel-perfect match cannot be auto-asserted without committed reference images at scale | Place 5 fixtures (small furniture, large furniture, road, fence, rug) in editor; compare against in-game screenshot; sign-off in PR description |
| sssekai network download against live JP servers | SPRT-01 | External service, auth token churn | Run `python -m pipeline download --dry-run` then a single live invocation manually before phase gate |
| GitHub Pages deploy actually serves PNGs at expected URLs | SPRT-06 | Live deploy required | After merge, hit `https://<org>.github.io/<repo>/sprites/manifest.json` and one PNG; confirm 200 + correct content-type |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies declared
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all `❌ W0` references in the per-task map above
- [ ] No watch-mode flags in any test command
- [ ] Feedback latency < 30s for per-commit, < 120s for full suite
- [ ] `nyquist_compliant: true` set in frontmatter once Wave 0 lands

**Approval:** pending
