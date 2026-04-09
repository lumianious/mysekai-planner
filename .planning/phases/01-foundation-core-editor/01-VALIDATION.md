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
| 01-01-01 | 01 | 0 | GRID-01 | unit | `pnpm vitest run src/data/__tests__/grid-config.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | GRID-02 | unit | `pnpm vitest run src/components/__tests__/grid-canvas.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | GRID-03 | unit | `pnpm vitest run src/components/__tests__/grid-canvas.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | CATL-01 | unit | `pnpm vitest run src/data/__tests__/fixtures.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 1 | CATL-02 | unit | `pnpm vitest run src/data/__tests__/fixtures.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-03 | 03 | 1 | CATL-03 | unit | `pnpm vitest run src/components/__tests__/catalog.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-04 | 03 | 1 | CATL-04 | unit | `pnpm vitest run src/components/__tests__/catalog.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | GRID-04 | unit | `pnpm vitest run src/store/__tests__/editor-store.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-02 | 04 | 2 | GRID-05 | unit | `pnpm vitest run src/store/__tests__/editor-store.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-03 | 04 | 2 | GRID-06 | unit | `pnpm vitest run src/store/__tests__/editor-store.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-04 | 04 | 2 | GRID-07 | unit | `pnpm vitest run src/store/__tests__/editor-store.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-05 | 04 | 2 | GRID-08 | unit | `pnpm vitest run src/components/__tests__/grid-interactions.test.ts` | ❌ W0 | ⬜ pending |
| 01-05-01 | 05 | 3 | GRID-09 | unit | `pnpm vitest run src/store/__tests__/undo-redo.test.ts` | ❌ W0 | ⬜ pending |
| 01-05-02 | 05 | 3 | GRID-10 | unit | `pnpm vitest run src/components/__tests__/pan-zoom.test.ts` | ❌ W0 | ⬜ pending |
| 01-05-03 | 05 | 3 | GRID-11 | unit | `pnpm vitest run src/store/__tests__/editor-store.test.ts` | ❌ W0 | ⬜ pending |
| 01-05-04 | 05 | 3 | GRID-12 | unit | `pnpm vitest run src/store/__tests__/editor-store.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@vitest/coverage-v8` — install test framework
- [ ] `vitest.config.ts` — configure with jsdom environment for React components
- [ ] `src/data/__tests__/grid-config.test.ts` — stubs for GRID-01
- [ ] `src/data/__tests__/fixtures.test.ts` — stubs for CATL-01, CATL-02
- [ ] `src/store/__tests__/editor-store.test.ts` — stubs for GRID-04 through GRID-12
- [ ] `src/components/__tests__/grid-canvas.test.ts` — stubs for GRID-02, GRID-03
- [ ] `src/components/__tests__/catalog.test.ts` — stubs for CATL-03, CATL-04
- [ ] `src/components/__tests__/grid-interactions.test.ts` — stubs for GRID-08
- [ ] `src/store/__tests__/undo-redo.test.ts` — stubs for GRID-09
- [ ] `src/components/__tests__/pan-zoom.test.ts` — stubs for GRID-10

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ghost preview follows cursor smoothly | GRID-08 | Visual rendering timing | 1. Select furniture from catalog 2. Move mouse over grid 3. Verify ghost preview follows without jitter |
| Pan/zoom feels responsive | GRID-10 | Subjective UX quality | 1. Mouse-wheel zoom at various levels 2. Middle-click drag to pan 3. Verify no visible lag |
| Catalog thumbnail images load from CDN | CATL-03 | Network-dependent CDN fetch | 1. Open catalog panel 2. Scroll through items 3. Verify thumbnails display correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
