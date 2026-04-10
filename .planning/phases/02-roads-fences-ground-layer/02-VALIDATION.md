---
phase: 2
slug: roads-fences-ground-layer
status: planned
nyquist_compliant: true
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

Every Phase 2 task maps to at least one automated verification command or is a Wave 0 test-creation task. Sampling continuity rule (no 3 consecutive tasks without automated verify) is satisfied because each plan terminates with a test-gated task.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-T1 | 02-01 | 1 | ROAD-04, ROAD-01 | type-check | `pnpm exec tsc --noEmit` | extend existing | ⬜ pending |
| 02-01-T2 | 02-01 | 1 | ROAD-04, ROAD-01 | unit (Wave 0 creates file) | `pnpm test --run src/__tests__/groundSubtype.test.ts src/__tests__/fixtures.test.ts` | ❌ Wave 0 creates `groundSubtype.test.ts` + extends `fixtures.test.ts` | ⬜ pending |
| 02-02-T1 | 02-02 | 2 | ROAD-01, ROAD-02 | unit (Wave 0) | `pnpm test --run src/__tests__/temporalBatch.test.ts src/__tests__/setActiveFixture.test.ts src/__tests__/editorStore.test.ts` | ❌ Wave 0 creates `temporalBatch.test.ts` + `setActiveFixture.test.ts`; extends `editorStore.test.ts` | ⬜ pending |
| 02-02-T2 | 02-02 | 2 | ROAD-01 | regression | `pnpm test --run && pnpm exec tsc --noEmit` | ✅ (uses existing suite) | ⬜ pending |
| 02-03-T1 | 02-03 | 3 | ROAD-01 | unit (Wave 0) | `pnpm test --run src/__tests__/lineRasterize.test.ts` | ❌ Wave 0 creates `lineRasterize.test.ts` (+ `src/utils/rasterize.ts` source) | ⬜ pending |
| 02-03-T2 | 02-03 | 3 | ROAD-01 | integration (Wave 0) | `pnpm test --run src/__tests__/brushStroke.test.ts src/__tests__/brushErase.test.ts && pnpm exec tsc --noEmit` | ❌ Wave 0 creates `brushStroke.test.ts` + `brushErase.test.ts` | ⬜ pending |
| 02-04-T1 | 02-04 | 4 | ROAD-03 | integration (Wave 0) | `pnpm test --run src/__tests__/fenceLineTool.test.ts && pnpm exec tsc --noEmit` | ❌ Wave 0 creates `fenceLineTool.test.ts` | ⬜ pending |
| 02-05-T1 | 02-05 | 1 | (supports D-46) | regression | `pnpm exec tsc --noEmit && pnpm test --run` | ✅ (uses existing suite — manual visual check documented below) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Nyquist Sampling Continuity Check

Task sequence (topological): 02-01-T1 → 02-01-T2 → 02-05-T1 → 02-02-T1 → 02-02-T2 → 02-03-T1 → 02-03-T2 → 02-04-T1

Every task in that sequence has an automated verify command. Longest gap between test-gated tasks: 1 task. Rule "no 3 consecutive tasks without automated verify" is satisfied.

---

## Requirement → Test Map (from RESEARCH.md §Validation Architecture)

| Req ID | Behavior | Test File | Plan |
|--------|----------|-----------|------|
| ROAD-01 | `getGroundSubtype` classifies roads/color-tiles correctly | `groundSubtype.test.ts` | 02-01 |
| ROAD-01 | `rasterizeLine` produces step-aware tile chains | `lineRasterize.test.ts` | 02-03 |
| ROAD-01 | 5-tile drag-paint = 1 history entry | `brushStroke.test.ts` | 02-03 |
| ROAD-01 | Undo/redo of paint stroke | `brushStroke.test.ts` | 02-03 |
| ROAD-01 | Overwrite OFF skips occupied | `brushStroke.test.ts` | 02-03 |
| ROAD-01 | Overwrite ON replaces | `brushStroke.test.ts` (implicit via placeItem-after-removeItem pattern tested in integration) | 02-03 |
| ROAD-01 | Layer independence (ground+furniture coexist) | `brushStroke.test.ts` | 02-03 |
| ROAD-02 | Rug click → stamp mode (not brush) | `setActiveFixture.test.ts` | 02-02 |
| ROAD-02 | Rug stamp flow unchanged (regression) | `editorStore.test.ts` (extended) | 02-02 |
| ROAD-03 | `snapToAxis` tie-break behavior | `lineRasterize.test.ts` | 02-03 |
| ROAD-03 | Fence line axis snap | `fenceLineTool.test.ts` | 02-04 |
| ROAD-03 | Confirmed line = 1 history entry | `fenceLineTool.test.ts` | 02-04 |
| ROAD-03 | Cancel leaves zero items | `fenceLineTool.test.ts` | 02-04 |
| ROAD-04 | `getItemLayer({layoutType:'road'}) === 'ground'` | `fixtures.test.ts` (extended) | 02-01 |
| ROAD-04 | `<GroundLayer>` renders before `<FurnitureLayer>` | existing Phase 1 behavior — asserted via layer ordering in `EditorCanvas.tsx` | 02-01 |
| D-42 | Remove drag across 3 ground tiles = 1 history entry | `brushErase.test.ts` | 02-03 |
| D-42 | Remove drag ignores furniture | `brushErase.test.ts` | 02-03 |
| D-43 | `withBatchedUndo` writes exactly 1 entry | `temporalBatch.test.ts` | 02-02 |
| D-43 | `startStrokeBatch`/`endStrokeBatch` pause/resume zundo | `temporalBatch.test.ts` | 02-02 |
| D-46 | Dashed grid prop | manual visual check (documented below) | 02-05 |

---

## Wave 0 Requirements

Task creation order (each test file is created by the plan that introduces the behavior it validates):

- [ ] **02-01:** `src/__tests__/groundSubtype.test.ts` — classifier for ROAD-01 (road/color-tile/fence/rug)
- [ ] **02-01:** extend `src/__tests__/fixtures.test.ts` — add `getItemLayer({layoutType:'road'})` regression
- [ ] **02-02:** `src/__tests__/temporalBatch.test.ts` — zundo pause/resume batching (D-43)
- [ ] **02-02:** `src/__tests__/setActiveFixture.test.ts` — tool-mode auto-switch (D-30, D-39)
- [ ] **02-02:** extend `src/__tests__/editorStore.test.ts` — rug stamp regression (ROAD-02)
- [ ] **02-03:** `src/__tests__/lineRasterize.test.ts` — Bresenham + axis snap (ROAD-01, ROAD-03)
- [ ] **02-03:** `src/__tests__/brushStroke.test.ts` — drag-paint + overwrite + layer independence (ROAD-01)
- [ ] **02-03:** `src/__tests__/brushErase.test.ts` — remove-mode drag across ground tiles (D-42)
- [ ] **02-04:** `src/__tests__/fenceLineTool.test.ts` — line tool lifecycle + commit (ROAD-03)

Framework install: none — Vitest 3.x already installed.

*Fixture data: real sample IDs (road id=111, fence id=114, color tile id=544) baked into test files as static literals; no network calls.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashed grid visual matches in-game screenshot | D-46 | Visual judgment | Open dev server at 0.15×, 1×, 3× zoom; compare subtlety/density to in-game screenshot in CONTEXT.md specifics. Dashes should be visible but "barely there." |
| Fence confirm/cancel overlay is discoverable | D-36 | UX judgment | Enter brush mode with fence fixture → click start → click end → verify overlay is visible, buttons clickable, and keyboard-accessible (Enter confirms, Escape cancels) |
| Drag-paint feels responsive at 60fps | D-31, R-04 | Subjective performance | Drag-paint across a 100×100 grid with ~30 tiles/stroke; watch React DevTools frame timing — no dropped frames |
| Brush cursor is distinguishable from stamp | D-29 | Visual judgment | Cycle Select/Stamp/Brush/Remove; cursor should change from crosshair (stamp) to cell (brush) — visible distinction |
| Undo of brush stroke: no flash (documented limitation R-03) | D-44 | Expected UX gap | After painting then Ctrl+Z, tiles disappear without flash animation; redo re-adds them (with flash only if `findChangedItemIds` handles the redo diff — otherwise both sides have no flash) |
| R-06 cleanup: drag off canvas during paint doesn't leave zundo paused | R-06 | Integration | Start a brush stroke, drag cursor off the canvas, release outside — verify subsequent Ctrl+Z still works and `useEditorStore.temporal.getState().isTracking === true` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify OR are listed as Wave 0 test-creation
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (longest gap is 1)
- [x] Wave 0 covers all MISSING references (9 test-file tasks distributed across plans 02-01..02-04)
- [x] No watch-mode flags (Vitest uses `--run` consistently)
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter after planner populates task map

**Approval:** planner-green (pending checker review)
