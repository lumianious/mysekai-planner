---
phase: 1
slug: foundation-core-editor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (Wave 0 installs) |
| **Quick run command** | `pnpm vitest run --reporter=verbose` |
| **Full suite command** | `pnpm vitest run --reporter=verbose --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `pnpm vitest run --reporter=verbose --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | GRID-01 | unit | `pnpm vitest run src/__tests__/areaLevels.test.ts` | Plan 01 creates | pending |
| 01-01-02 | 01 | 1 | GRID-01 | unit | `pnpm vitest run src/__tests__/grid.test.ts` | Plan 01 creates | pending |
| 01-02-01 | 02 | 2 | CATL-01, CATL-02, CATL-03, CATL-04 | unit | `pnpm vitest run src/__tests__/fixtures.test.ts` | Plan 02 creates | pending |
| 01-02-02 | 02 | 2 | GRID-03, GRID-04, GRID-05, GRID-06, GRID-07, GRID-09 | unit | `pnpm vitest run src/__tests__/editorStore.test.ts` | Plan 02 creates | pending |
| 01-04-01 | 04 | 3 | CATL-02, CATL-03, CATL-04 | unit | `pnpm vitest run src/__tests__/catalogFilter.test.ts` | Plan 04 creates | pending |
| 01-05-01 | 05 | 3 | GRID-10 | unit | `pnpm vitest run src/__tests__/ghostPreview.test.ts` | Plan 05 creates | pending |
| 01-06-01 | 06 | 4 | GRID-09 | unit | `pnpm vitest run src/__tests__/editorStore.test.ts` | Plan 06 extends | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] `vitest` + `@vitest/coverage-v8` — install test framework (Plan 01, Task 1)
- [x] `vitest.config.ts` — configure with jsdom environment for React components (Plan 01, Task 1)

**Test files created by plans (NOT pre-stubbed — each plan creates its own tests):**

- Plan 01: `src/__tests__/areaLevels.test.ts` — area level grid dimensions (GRID-01)
- Plan 01: `src/__tests__/grid.test.ts` — grid math utilities (snap, collision, effective size)
- Plan 02: `src/__tests__/fixtures.test.ts` — fixture data filtering, search, genre filter, CDN URL (CATL-01..04)
- Plan 02: `src/__tests__/editorStore.test.ts` — store actions, undo/redo, occupancy grid, previewRotation (GRID-03..09)
- Plan 04: `src/__tests__/catalogFilter.test.ts` — catalog search+filter pipeline (CATL-02..04)
- Plan 05: `src/__tests__/ghostPreview.test.ts` — ghost preview validity logic (GRID-10)
- Plan 06: `src/__tests__/editorStore.test.ts` — extends with startEditor, system fixtures, flash tests (GRID-09)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ghost preview follows cursor smoothly | GRID-08 | Visual rendering timing | 1. Select furniture from catalog 2. Move mouse over grid 3. Verify ghost preview follows without jitter |
| Pan/zoom feels responsive | GRID-10 | Subjective UX quality | 1. Mouse-wheel zoom at various levels 2. Middle-click drag to pan 3. Verify no visible lag |
| Catalog thumbnail images load from CDN | CATL-03 | Network-dependent CDN fetch | 1. Open catalog panel 2. Scroll through items 3. Verify thumbnails display correctly |
| Grass texture renders as background | D-13 | Visual asset verification | 1. Start editor 2. Verify canvas background is a grass texture (NOT solid green) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
