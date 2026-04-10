---
phase: 2
slug: roads-fences-ground-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x (jsdom environment) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test --run <specific file>` |
| **Full suite command** | `pnpm test --run` |
| **Estimated runtime** | ~30 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run <specific file>`
- **After every plan wave:** Run `pnpm test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

*Populated by gsd-planner during planning. See RESEARCH.md §Validation Architecture for the source test matrix.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | ROAD-01/02/03/04 | TBD | TBD | TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

From RESEARCH.md §Validation Architecture:

- [ ] `src/__tests__/groundSubtype.test.ts` — classifier for ROAD-01 (road/color-tile/fence/rug)
- [ ] `src/__tests__/lineRasterize.test.ts` — Bresenham + axis snap (ROAD-01, ROAD-03)
- [ ] `src/__tests__/brushStroke.test.ts` — drag-paint + overwrite + layer independence (ROAD-01)
- [ ] `src/__tests__/fenceLineTool.test.ts` — line tool lifecycle (ROAD-03)
- [ ] `src/__tests__/brushErase.test.ts` — remove-mode drag across ground tiles (D-42)
- [ ] `src/__tests__/temporalBatch.test.ts` — zundo pause/resume batching (D-43)
- [ ] `src/__tests__/setActiveFixture.test.ts` — tool-mode auto-switch (D-30)
- [ ] Extend `src/__tests__/fixtures.test.ts` — `getItemLayer({layoutType:'road'}) === 'ground'`
- [ ] Extend `src/__tests__/editorStore.test.ts` — regression test for rug stamp unchanged
- [ ] Framework install: none — Vitest 3.x already installed

*Fixture data: use real-sample IDs (road id=111, fence id=114, color tile id=544) as static test inputs; no network calls in tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashed grid visual matches in-game screenshot | D-46 | Visual judgment | Open dev server at 0.15×, 1×, 3× zoom; compare subtlety/density to in-game screenshot in CONTEXT.md specifics |
| Fence confirm/cancel overlay is discoverable | D-36 | UX judgment | Enter brush mode with fence fixture → click start → click end → verify overlay is visible and keyboard-accessible (Enter confirms, Escape cancels) |
| Drag-paint feels responsive at 60fps | D-31, R-04 | Subjective performance | Drag-paint across a 100×100 grid with ~30 tiles/stroke; watch React DevTools frame timing — no dropped frames |
| Brush cursor is distinguishable from stamp | D-29 | Visual judgment | Cycle Select/Stamp/Brush/Remove; cursor must change visibly between stamp (crosshair) and brush |
| Undo of brush stroke: no flash (documented limitation R-03) | D-44 | Expected UX gap | After painting then Ctrl+Z, tiles disappear without flash animation; redo re-adds them WITH flash |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (Vitest uses `--run` consistently)
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter after planner populates task map

**Approval:** pending
