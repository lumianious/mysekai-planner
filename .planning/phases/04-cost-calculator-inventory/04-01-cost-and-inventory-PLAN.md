---
phase: 04-cost-calculator-inventory
plan: 01
subsystem: cost-and-inventory
tags: [cost, inventory, persist, popover, material-icons]
wave: 1
requirements: [COST-01, COST-02, COST-03, COST-04]
backfilled: true
backfilled_reason: |
  Implementation landed across Phase 7 (plan 06) + post-Phase-7 fixes;
  this plan documents the as-built shape rather than driving execution.
dependency_graph:
  requires:
    - phase: 01-foundation-core-editor
      provides: ["placedItems", "fixtureMap", "Zustand persist middleware"]
    - phase: 07-editor-chrome-redesign
      provides: ["CostPanelPopover shell (Slot C)", "CostPill in top rail"]
  provides:
    - "Material cost calculator: needed/owned/remaining per material across placedItems"
    - "Inventory input: number-per-material, persisted to localStorage"
    - "Layout cost cap (firstPutCost vs putCostLimit per area level) on top-rail pill"
  affects: ["Phase 7 chrome (CostPill, CostPanelPopover, CostPanel body)"]
---

# Plan 01: Cost Calculator & Inventory (backfill)

## Objective

Document the shipped capability that satisfies Phase 4's four success
criteria. No new code; this is the close-out artifact.

## Tasks (already done — pointers only)

| # | Capability | Where it lives | First landed |
|---|------------|----------------|--------------|
| 1 | Material cost computation | `src/data/cost.ts: computeMaterialTotals` | uncommitted-then-tracked in `432fb9e` |
| 2 | Layout cost computation | `src/data/cost.ts: computeLayoutCost` | `7932a85` |
| 3 | Per-area `putCostLimit` mapping | `src/data/areaLevels.ts: AREA_LEVELS[].putCostLimit` | `7932a85` |
| 4 | Inventory state slice | `src/stores/editorStore.ts: inventory + setInventoryQuantity + clearInventory` | pre-Phase-7 (in store, persisted) |
| 5 | Material list UI (必要 / 持 / 差) | `src/components/costs/CostPanel.tsx` | `4988c58` (Phase 7 plan 06) |
| 6 | Cost popover shell | `src/components/chrome/CostPanelPopover.tsx` | `722d770` (Phase 7 plan 06) |
| 7 | Top-rail cost pill | `src/components/chrome/CostPill.tsx` + wired in `TopRail.tsx` | `7538e60` (Phase 7 plan 02), corrected in `7932a85` |
| 8 | Material icon (CDN, hotlink-bypassed) | `MaterialIcon` in `CostPanel.tsx`, `referrerPolicy=no-referrer` | `ff25d46` |
| 9 | localStorage persistence | `inventory` field in persist `partialize` (editorStore.ts) | pre-Phase-7 |

## Verification mapping

| Success criterion | Evidence |
|-------------------|----------|
| 1 — material cost breakdown | `CostPanel` renders one row per material with 必要/持/差 |
| 2 — input owned materials | `<input type="number">` per row → `setInventoryQuantity` |
| 3 — remaining at a glance | `差` column + `差 N` red on shortfall, `✓ 足` green when met |
| 4 — localStorage persistence | `inventory` in `partialize` (editorStore.ts), survives reload (verified in `src/__tests__/persist.test.ts`) |

## Out of scope

- Furniture inventory (Phase 4 spec text mentions "owned materials and
  furniture") — only materials are tracked; furniture inventory was not
  pursued because in-game crafting consumes materials, not pre-built
  furniture pieces. Owners of unbuilt blueprints just track materials.
  Logged for a future phase if the user disagrees.
