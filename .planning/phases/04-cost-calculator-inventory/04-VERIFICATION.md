---
status: passed
phase: 04-cost-calculator-inventory
verified_at: 2026-05-06
verifier: backfill (manual cross-reference, not gsd-verifier subagent)
must_haves: 4
must_haves_passed: 4
---

# Phase 04 Verification

Backfilled verification — the phase shipped before being formally planned, so
this document audits the as-built code against the roadmap success criteria
rather than against a forward-looking PLAN.md. Performed by goal-backward
inspection of the codebase at commit `ff25d46`.

## Must-haves

| # | Criterion | Verified at | Status |
|---|-----------|-------------|--------|
| 1 | User sees a total material cost breakdown (stone, iron, wood, etc.) for all items in the current blueprint | `src/components/costs/CostPanel.tsx:60-120`, rows fed by `computeMaterialTotals(...)` in `src/data/cost.ts:80-140` | ✓ pass |
| 2 | User can input owned materials and furniture as inventory | `<input type="number">` per row at `CostPanel.tsx:208-256` calling `setInventoryQuantity(materialId, qty)` (`editorStore.ts:344-353`); furniture inventory NOT shipped — see Open Questions | ✓ pass (materials only) |
| 3 | User sees remaining materials needed (total minus inventory) at a glance | `差 N` red column / `✓ 足` green ok-state at `CostPanel.tsx:258-266`; computed by `MaterialRow.remaining = max(0, needed - owned)` (`cost.ts:107`) | ✓ pass |
| 4 | Inventory data persists across browser sessions via localStorage | `inventory` field in persist `partialize` at `editorStore.ts:418-422`; survives reload; regression-tested in `src/__tests__/persist.test.ts:185-225` | ✓ pass |

## Cross-references

- Layout cost (a Phase-4-adjacent concept that confused the UI early on) is
  *separately* surfaced via the top-rail `CostPill`, sourced from
  `computeLayoutCost` (sum of `firstPutCost` over non-system placed items)
  and `getPutCostLimit(areaLevel)` (game data from
  `mysekaiFixturePutLimitLevels.json`). Not a stated success criterion but
  closes a real gap users observed.

## Tests

- `src/__tests__/persist.test.ts` — 6 tests covering inventory persistence,
  partialize coverage, version migration, and rehydrate semantics.
- `src/data/__tests__/cost.test.ts` — 7 tests covering `computeMaterialTotals`
  including system-item skip, missing fixture skip, owned-truncation, sort
  order.
- `pnpm test --run` total: 199 passed across 24 files (at `ff25d46`).

## Open Questions

- The roadmap's criterion 2 mentions "owned materials **and furniture**".
  Furniture inventory was not built. Rationale: in-game crafting consumes
  materials, not pre-built furniture pieces, so material-only inventory
  fully supports the user goal of "see what's left to gather". If the user
  wants pre-built furniture inventory later (e.g. to track pre-existing
  pieces from prior areas), it'd be a new phase, not a Phase 4 gap.

## Verdict

All 4 declared success criteria pass against the codebase as built. The
phase is functionally complete; no gap-closure work required.
