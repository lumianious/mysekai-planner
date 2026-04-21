---
phase: 03
slug: persistence-sharing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Materialized from `03-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `pnpm test --run src/__tests__/persist*.test.ts src/__tests__/urlShare*.test.ts` |
| **Full suite command** | `pnpm test --run` |
| **Estimated runtime** | ~3s quick, ~5s full |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

Populated by planner when plans are created. Each task must map to a REQ-ID and have an automated command or explicit Wave 0 dependency.

---

## Wave 0 Requirements

- [ ] `src/__tests__/persist.test.ts` — stubs for PERS-01, PERS-02
- [ ] `src/__tests__/urlShareRoundTrip.test.ts` — stubs for PERS-03, PERS-04, PERS-05
- [ ] `src/__tests__/urlShareSizeBudget.test.ts` — stubs for PERS-05 URL length budget
- [ ] `src/__tests__/temporalAfterRehydrate.test.ts` — stubs for persist+zundo composition invariant

*Vitest already configured — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Toast appears after clipboard copy | PERS-03 | Visual + OS clipboard integration | Click Share button, verify toast appears and pasted URL matches |
| Import dialog blocks before overwrite | PERS-04 | Visual modal flow | Open shared URL with existing design, verify dialog appears before replacement |
| Auto-save survives hard reload | PERS-01, PERS-02 | Browser session boundary | Place items, hard-reload page, verify design restored |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
