---
phase: 9
slug: catalog-overhaul-genre-driven-categories-with-search
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
updated: 2026-05-08
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Populated by gsd-planner from RESEARCH.md `## Validation Architecture` section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2.1 + @testing-library/react 16.0.0 + jsdom 26.1.0 |
| **Config file** | vite.config.ts (test block) + vitest.setup.ts (memoryStorage polyfill) |
| **Quick run command** | `pnpm vitest run --reporter=dot` (focused per task) |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | full suite < 30 s (per Phase 7 baseline; Phase 9 adds ~5 unit tests + 1 RTL smoke = +~3 s) |

---

## Sampling Rate

- **After every task commit:** Run focused command from the per-task map below
- **After every plan wave:** Run `pnpm vitest run --reporter=dot` (full suite)
- **Before `/gsd:verify-work`:** Full suite + `pnpm tsc --noEmit` + `pnpm build` must all be green
- **Max feedback latency:** ≤ 30 s for any task-level command; ≤ 60 s for the full suite

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-T1 | 09-01 | 1 | CATL-06 | unit | `pnpm vitest run src/data/__tests__/genres.test.ts --reporter=dot` | ❌ Wave 0 creates | ⬜ |
| 09-01-T2 | 09-01 | 1 | CATL-09 | unit | `pnpm vitest run src/components/chrome/__tests__/genreIcons.test.ts --reporter=dot` | ❌ Wave 0 creates | ⬜ |
| 09-01-T3 | 09-01 | 1 | CATL-05 (RED stub) | unit (negative) | `pnpm vitest run src/data/__tests__/fixtures.test.ts --reporter=dot` | ❌ Wave 0 creates | ⬜ |
| 09-01-T3 | 09-01 | 1 | CATL-08 (RED stub) | unit | `pnpm vitest run src/stores/__tests__/persistMigrate.test.ts --reporter=dot` | ❌ Wave 0 creates | ⬜ |
| 09-01-T3 | 09-01 | 1 | CATL-07 / CATL-10 / CATL-11 (RED stub) | RTL smoke | `pnpm vitest run src/components/catalog/__tests__/CatalogSidebar.smoke.test.tsx --reporter=dot` | ❌ Wave 0 creates | ⬜ |
| 09-02-T1 | 09-02 | 1 | CATL-08 | unit | `pnpm vitest run src/stores/__tests__/persistMigrate.test.ts --reporter=dot` | ✅ (after 09-01-T3) | ⬜ |
| 09-03-T1 | 09-03 | 2 | CATL-05 (rail half), CATL-06, CATL-09 | unit (regression) + tsc | `pnpm vitest run src/components/chrome/__tests__/genreIcons.test.ts --reporter=dot && pnpm tsc --noEmit` | ✅ | ⬜ |
| 09-04-T1 | 09-04 | 2 | CATL-05 (sidebar half) | tsc + unit regression | `pnpm tsc --noEmit && pnpm vitest run src/components/chrome/__tests__/genreIcons.test.ts src/data/__tests__/genres.test.ts --reporter=dot` | ✅ | ⬜ |
| 09-04-T2 | 09-04 | 2 | CATL-07, CATL-10, CATL-11 | RTL smoke | `pnpm vitest run src/components/catalog/__tests__/CatalogSidebar.smoke.test.tsx --reporter=dot` | ✅ | ⬜ |
| 09-05-T1 | 09-05 | 3 | CATL-05 (final gate) | full suite + build | `pnpm vitest run --reporter=dot && pnpm tsc --noEmit && pnpm build` | ✅ | ⬜ |
| 09-05-T2 | 09-05 | 3 | UI-SPEC interactions | manual UAT | n/a (human checkpoint, 19-step walkthrough) | ✅ (UI-SPEC.md) | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 lives entirely in plan **09-01** (parallel with 09-02 in Wave 1; both are Wave-1 plans, but 09-01's Task 3 lays down all RED stubs that downstream plans turn GREEN — this is the Nyquist scaffolding).

**Stubs created by 09-01:**
- [x] `src/data/__tests__/genres.test.ts` — covers CATL-06 (`deriveOutdoorMainGenres`). GREEN immediately (helper lands in same task).
- [x] `src/components/chrome/__tests__/genreIcons.test.ts` — covers CATL-09 (`getGenreIcon` map + fallback). GREEN immediately.
- [x] `src/data/__tests__/fixtures.test.ts` — covers CATL-05 negative (Phase7Category / filterByPhase7Category must be undefined). RED until plan 09-05 deletes the symbols.
- [x] `src/stores/__tests__/persistMigrate.test.ts` — covers CATL-08 (v3 → v4 migrate hook). RED until plan 09-02 lands the hook.
- [x] `src/components/catalog/__tests__/CatalogSidebar.smoke.test.tsx` — covers CATL-07 + CATL-10 + CATL-11 (chip strip, search-bypass + snapshot/restore + breadcrumb, empty state). RED until plan 09-04 wires the sidebar.

**Framework readiness:** vitest + RTL + jsdom + memory-storage polyfill all in place from Phase 7. No new install.

---

## Manual-Only Verifications

UAT in plan 09-05 Task 2 (19-step human walkthrough). Checks that automation cannot perform:

- Visual sky-gradient active treatment on rail buttons (color rendering / box-shadow)
- Vertical scroll engagement on viewport resize (jsdom doesn't reflect viewport overflow correctly)
- Network panel: zero `storage.sekai.best/...icon_*` 404s on initial mount (lucide-only path)
- Animation timing on chip-strip slide-in (`opacity .18s ease, transform .18s ease`)
- Breadcrumb pill legibility against real tile gradients (3-col grid, sprite + label)
- LocalStorage migration in a real browser (DevTools edit → reload → visual confirmation)
- No regressions in Phase 7 chrome (rail collapse, hotbar, floatbar, popover, zoom dock, top rail)

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every code task has a vitest/tsc gate)
- [x] Wave 0 covers all 7 phase requirements (CATL-05..CATL-11)
- [x] No watch-mode flags (`--run` semantics via `vitest run`)
- [x] Feedback latency target met (≤ 30 s task-level, ≤ 60 s full suite)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned 2026-05-08 by gsd-planner; executor must confirm at each plan completion.
