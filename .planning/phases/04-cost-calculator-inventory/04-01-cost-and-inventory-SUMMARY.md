---
phase: 04-cost-calculator-inventory
plan: 01
subsystem: cost-and-inventory
tags: [cost, inventory, persist, popover, material-icons, backfill]
backfilled: true
dependency_graph:
  requires:
    - phase: 01-foundation-core-editor
      provides: ["placedItems", "fixtureMap", "Zustand persist middleware"]
    - phase: 07-editor-chrome-redesign
      provides: ["CostPanelPopover shell", "CostPill in top rail"]
  provides:
    - "Material cost breakdown per blueprint (needed/owned/remaining)"
    - "Inventory input + localStorage persistence"
    - "Real-time layout cost (firstPutCost) vs area cap (putCostLimit) display"
  affects: []
tech-stack:
  added: []  # All deps already in place from prior phases
  patterns:
    - "needed/owned/remaining row computed in store-pure helpers (computeMaterialTotals)"
    - "inventory persisted via Zustand partialize, NOT in temporal (won't pollute undo history)"
    - "system items (gate/house) skipped in cost computation — game treats them as cap-free"
key-files:
  created:
    - "src/data/cost.ts (computeMaterialTotals, computeLayoutCost, buildCostIndex, fetch* helpers)"
    - "src/types/cost.ts (Material, Blueprint, MaterialCost, MaterialRow, FixtureMaterialNeed)"
    - "src/data/__tests__/cost.test.ts"
    - "src/components/costs/CostPanel.tsx (the popover body)"
    - "src/components/chrome/CostPill.tsx (top-rail layout-cost pill)"
    - "src/components/chrome/CostPanelPopover.tsx (popover shell)"
  modified:
    - "src/stores/editorStore.ts (inventory slice + setters + persist partialize)"
    - "src/data/areaLevels.ts (added putCostLimit per level from mysekaiFixturePutLimitLevels.json)"
    - "src/types/editor.ts (Fixture.firstPutCost / secondPutCost optional fields)"
    - "src/components/chrome/TopRail.tsx (wires CostPill to computeLayoutCost)"
key-decisions:
  - "Layout cost (firstPutCost) and material cost are different things; top-rail pill shows layout cost, popover body shows material cost"
  - "Per-area cap sourced from mysekaiFixturePutLimitLevels.json (housing_home category): 10000/11000/11000/12000/13000 for Lv.1–5"
  - "Material icons hotlink-protected by storage.sekai.best CDN; bypassed with referrerPolicy=no-referrer"
  - "Hide MaterialRow subtitle entirely when mysekaiMaterialType has no friendly Japanese label (avoids leaking raw types like 'game_character')"
  - "Furniture inventory deferred — game crafting consumes materials, not pre-built furniture, so material-only inventory is sufficient"
patterns-established:
  - "Cost helpers in src/data/cost.ts pure + index-driven; UI components stay thin"
  - "Hotlink-protected CDN images: always set referrerPolicy='no-referrer'"
requirements-completed: ["COST-01", "COST-02", "COST-03", "COST-04"]
metrics:
  status: shipped
  primary_phase_landed: "07 (plan 06: cost-popover)"
  post_phase_correction_commits: 4
  completed: "2026-05-06"
---

# Phase 04: Cost Calculator & Inventory Summary

**Material cost breakdown per blueprint, inline `持` (owned) inputs persisted to localStorage, and a separate top-rail layout-cost pill (firstPutCost vs area's putCostLimit) — all delivered through the Phase 7 chrome redesign rather than as a discrete planned phase.**

## What ships in production

- **Cost popover** (top-rail cost pill → `CostPanelPopover`):
  - Material rows: icon + name + `必要 N / 持 [input] / 差 M` (or `✓ 足` when met)
  - Material icons via storage.sekai.best `mysekai/thumbnail/material/<name>.webp`
  - `在庫をクリア` link to wipe owned counts
- **Top-rail cost pill** (`CostPill`):
  - `コスト 0 / 12000` style readout
  - Sources: `computeLayoutCost(placedItems, fixtureMap)` over non-system items
    vs `getPutCostLimit(areaLevel)` (game's `mysekaiFixturePutLimitLevels.json`)
- **Inventory persistence**:
  - `inventory: Record<materialId, owned>` in `useEditorStore`
  - Lives in persist `partialize` only (NOT in temporal — owned-count edits
    are not undoable, by design — they reflect real-world state)
  - Survives full page reload (regression-tested in `src/__tests__/persist.test.ts`)

## Real commits (chronological)

This plan was *not* executed in a single Phase-4 session. Implementation
landed in three waves:

1. **Pre-Phase-7 (uncommitted local files):** `src/data/cost.ts`,
   `src/types/cost.ts`, `src/data/__tests__/cost.test.ts` — formally tracked
   in `432fb9e` (chore: track src/types/cost.ts and cost.test.ts).
2. **Phase 7, plan 02** (`7538e60`) — `CostPill` mounted in top rail.
3. **Phase 7, plan 06** (`4988c58`, `722d770`, `20425ca`) — `CostPanelPopover`
   built; `CostPanel` re-skinned with sky→green progress meter.
4. **Post-Phase-7 corrections:**
   - `7932a85` (fix(cost)): separate layout cost from material cost; fix
     material icon path; hide raw `mysekaiMaterialType` for unmapped types
   - `7a6b29c` (fix(cost)): explicit inline icon size, drop silent onError
   - `ff25d46` (fix(cost)): `referrerPolicy=no-referrer` to bypass CDN
     hotlink protection on localhost
   - `432fb9e` (chore): track cost.ts deps

## Verification

| Success criterion | Status |
|-------------------|--------|
| 1 — material breakdown per blueprint | ✓ visible in popover, one row per material |
| 2 — input owned materials | ✓ `<input type="number">` per row → `setInventoryQuantity` |
| 3 — remaining at a glance | ✓ red `差 N` on shortfall, green `✓ 足` when met |
| 4 — localStorage persistence | ✓ `inventory` in `partialize`; reload retains values; covered by `src/__tests__/persist.test.ts` |

`pnpm test --run` — 199 passed across 24 files (last verified at `ff25d46`).
`pnpm build` — exit 0 at the same commit.

## Decisions Made

See frontmatter `key-decisions`. Headline calls:
- Layout cost ≠ material cost; surface them in different chrome.
- Skip system items (gate/house) in both layout and material cost — matches
  in-game behavior (those don't consume player resources).
- Drop the spec phrase "owned materials and furniture" — only materials.

## Deviations from Plan

The plan didn't exist at execution time. The deviation is the existence of
this backfill itself. No code is being changed in this plan.

## Issues Encountered

Three surfaced during user testing immediately after Phase 7 verification:

1. **Layout cost / material cost conflation** — top-rail pill summed material
   totals while labelled `コスト` (which the user reads as the in-game layout
   cost). Fixed in `7932a85` by adding `computeLayoutCost` + per-level cap
   from `mysekaiFixturePutLimitLevels.json`.
2. **Material icon 404** — wrong CDN sub-path. Fixed in `7932a85`.
3. **CDN hotlink protection on `localhost`** — Referer-based 403. Fixed by
   `referrerPolicy="no-referrer"` in `ff25d46`. (Same root cause also fixed
   for catalog cards + hotbar slots in `42ad003`, outside Phase 4 scope.)

## Next Phase Readiness

- Phase 4 functionally shipped. No follow-up code work required.
- Open question: Phase 4 spec mentions "furniture inventory" (own pre-built
  furniture pieces). We didn't build that because the game consumes materials,
  not furniture. If the user wants it later, flag as a new phase.
- Phase 6 (i18n) is the only remaining unplanned phase in the milestone.

---
*Phase: 04-cost-calculator-inventory*
*Backfilled: 2026-05-06*
