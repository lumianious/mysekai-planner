# Phase 04 — Cost Calculator & Inventory: Context (backfilled)

> ⚠ This phase is backfilled. Implementation landed *during* Phase 7 work,
> not as a discrete planned phase, because the cost UI and the editor chrome
> redesign touched the same surfaces (top rail cost pill + cost popover).
> This document is paperwork to close the phase honestly without rewriting
> history.

## Goal (from ROADMAP.md)

Users can see material costs for their blueprint and track what they still
need to gather.

## Success Criteria (from ROADMAP.md)

1. User sees a total material cost breakdown (stone, iron, wood, etc.) for
   all items in the current blueprint
2. User can input owned materials and furniture as inventory
3. User sees remaining materials needed (total minus inventory) at a glance
4. Inventory data persists across browser sessions via localStorage

## Why backfilled, not pre-planned

- `src/data/cost.ts` + `src/types/cost.ts` existed locally and were imported
  by Phase 7 work, but went uncommitted until `432fb9e` (chore: track …).
  Tests (`src/data/__tests__/cost.test.ts`) were already passing in the
  vitest auto-discovery sweep.
- The cost popover UI was implemented as Plan 06 of Phase 7
  (`07-06-cost-popover`, commit `4988c58 / 722d770 / 20425ca`) — that plan
  framed the work as "chrome redesign" rather than "Phase 4".
- Post-Phase-7 user testing surfaced three correctness issues the original
  CostPanel had missed:
  - layout cost (firstPutCost cap) was conflated with material cost in the
    top-rail pill
  - material icon CDN URL was 404
  - material rows leaked raw `mysekaiMaterialType` (e.g. `game_character`)
  Fixed in `7932a85`, `7a6b29c`, `ff25d46`.

## What's covered by this backfill

A single plan summary (`04-01-cost-and-inventory-SUMMARY.md`) captures the
actual code that satisfies all 4 success criteria, with pointers to the
real commits across Phase 7 and the post-phase fixes. No code is written
or moved in this backfill — only documentation.

## Dependencies

- Phase 1 (foundation) — placedItems, fixtureMap, persist middleware
- Phase 7, plan 06 — CostPanelPopover shell that hosts the material list
