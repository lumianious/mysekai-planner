---
phase: 07-editor-chrome-redesign
plan: 06
subsystem: editor-chrome-cost-popover
tags: [chrome, cost-panel, popover, animation]
requirements: [SC-3, SC-4, SC-7]
dependency_graph:
  requires:
    - "07-01: chrome state slice (costPanelOpen, setCostPanelOpen) + persist v2 + EditorLayout slot C"
    - "07-02: top-rail CostPill (toggleCostPanel + aria-controls=cost-panel)"
  provides:
    - "CostPanelPopover.tsx — Slot C popover wrapper with cream header + close X + scale/opacity transition"
    - "Re-skinned CostPanel body with sky→green progress meter and UI-SPEC token-driven row layout"
    - "id=cost-panel anchor that fulfills CostPill's aria-controls reference"
  affects: ["closes phase 07 — final plan"]
tech_stack:
  added: []
  patterns:
    - "Two-step mount lifecycle: mounted state defers unmount by 200ms so the closing transform/opacity transition has time to play before the dialog leaves the DOM"
    - "Component-scoped inline-style tokens (var(--radius-tile), var(--radius-chip), var(--color-tan-edge), --color-surplus/--color-shortfall) instead of utility classes — keeps the panel re-skin self-contained and aligned with UI-SPEC token surface"
    - "CostPanel splits chrome (popover) from content (body) — body is now fragment-style, fills its parent; the popover provides border/shadow/header/close"
key_files:
  created:
    - "src/components/chrome/CostPanelPopover.tsx"
  modified:
    - "src/components/costs/CostPanel.tsx (full re-skin: drop outer aside, add summary card + sky→green meter, switch row labels to 必要/持/差)"
    - "src/components/layout/EditorLayout.tsx (slot C: replace conditional CostPanel with always-mounted CostPanelPopover; drop costPanelOpen gate + useEditorStore import)"
decisions:
  - "Popover mount lifecycle uses a deferred unmount (200ms timeout) instead of CSS-only display:none — guarantees the closing scale/opacity transition runs even when costPanelOpen flips to false"
  - "Header chrome (cream gradient + h3 + close X) lives on the popover wrapper, NOT on CostPanel body — keeps CostPanel reusable and lets the popover own all dialog-shell concerns (role=dialog, aria-label, transformOrigin)"
  - "Inline-style token usage over Tailwind utilities for the re-skin — UI-SPEC defines exact px values for radii/spacing/font-size that are easier to read literally than via classnames; matches Phase 7 component pattern (TopRail/CatalogRail/ZoomDock all do the same)"
  - "TOTAL_CAP=18000 stays as a module constant in CostPanelPopover (mirrors Phase 7 UI-SPEC subhead `133 件 / 18,000`); not a real game-data lookup yet — see Known Stubs"
metrics:
  duration: "~3min"
  tasks_completed: 2
  files_modified: 3
  completed: "2026-05-04"
---

# Phase 7 Plan 6: Cost Popover Summary

**One-liner:** Cost panel becomes a Slot-C popover that mounts only when `costPanelOpen=true` — re-skinned body with cream summary card + sky→green progress meter, cream-gradient header + close X, and a scale .95→1 / opacity 0→1 / .18s ease entry transition triggered by the top-rail CostPill toggle.

## What Shipped

- **`CostPanelPopover.tsx` (new, Slot C).** 320×580 popover with `role="dialog"`, `aria-label="材料コスト"`, `id="cost-panel"` (resolves the CostPill `aria-controls`). Outer chrome: white→cream vertical gradient body, panel-edge border, `--radius-panel`, `--shadow-lg`. Header: cream gradient (`#fff8e7` → `#ecdfb8`), tan-edge separator, Display-tier `<h3>材料コスト</h3>` + Label-tier subhead `{itemCount} 件 / 18,000`, plus 28×28 close button (`<X>` 16px, `aria-label="閉じる"`, white-50 chip background). Entry/exit driven by `transform: scale(0.95)→1 + opacity 0→1`, `transformOrigin: 'top right'`, `transition: .18s ease`.
- **Two-step mount lifecycle.** A local `mounted` state stays `true` for 200ms after `open` flips to `false`, then unmounts. This guarantees the exit transition actually plays — without the defer, React would unmount on the same frame that flips the transform/opacity, and the user would see a snap.
- **`CostPanel.tsx` re-skinned (full body rewrite).** Outer `<aside class="w-72 bg-surface-raised border-l border-default ...">` deleted — the popover provides chrome. Body is now a fragment-style `<div class="flex flex-col h-full overflow-hidden">` containing:
  - **Summary card** (margin 16, padding 16, `--radius-tile`, cream gradient + tan-edge border): caption `レイアウトコスト`, baseline-aligned `{owned}` (16/800 ink) + `/ {totalNeeded}` (11/800 muted), then the meter — 8px-tall track (`rgba(60,80,140,.10)`, `--radius-chip`) with fill width `min(100, owned/needed*100)%` and `linear-gradient(90deg, #69c8ff, #8fdf6c)` (sky→green per UI-SPEC color-reserved item 6).
  - **`在庫をクリア` link** (Label-tier, no chrome) — re-style of the legacy "库存清零" button.
  - **Material rows** (padding 8 16, `--radius-tile`, panel-edge bottom border) with UI-SPEC copy: `必要 {needed}` / `持 {input}` / `差 {N}` or `✓ 足`. Status color uses semantic tokens `--color-surplus` / `--color-shortfall`.
- **`EditorLayout.tsx` slot C update.** Drops the `costPanelOpen &&` conditional gate and the now-unused `useEditorStore` import; replaces the direct `<CostPanel ... />` mount with `<CostPanelPopover fixtureMap={fixtureMap} costIndex={costIndex} />`. The popover handles its own mount/unmount lifecycle, so the slot wrapper is now an unconditional positional anchor at `top:76, right:16`.

## Verification

- `pnpm build` exits 0 (Vite + Rolldown). Bundle 719.93 KB JS / 176.78 KB CSS — +1.86 KB JS vs plan 05 (the new popover + re-skinned CostPanel).
- `pnpm test` 199/199 pass (unchanged from plan 05 — no test-targeted code paths were touched; persist whitelist for `costPanelOpen` was already in place since plan 01).
- All Task 1 acceptance greps match: sky→green gradient string present (1), `レイアウトコスト` present (2 occurrences in card label + caption), `必要` present, `✓ 足` present, legacy `<aside class="w-72 bg-surface-raised border-l border-default` absent (0).
- All Task 2 acceptance greps match: `transformOrigin: 'top right'` (1), full transition string (1), `aria-label="閉じる"` (1), `材料コスト` (2 — h3 + aria-label), `<CostPanelPopover` in EditorLayout (1), `<CostPanel ` direct mount in EditorLayout (0), `id="cost-panel"` in popover (1).
- One acceptance grep (`grep "import.*CostPanel" src/components/layout/EditorLayout.tsx` returns 0) is technically nonzero because the substring "CostPanel" appears inside `CostPanelPopover`. The plan's intent — that the bare `CostPanel` is no longer imported by EditorLayout — IS satisfied: the only matching import line is `import { CostPanelPopover } from '../chrome/CostPanelPopover'`. Logged here for traceability; not a deviation.

## Deviations from Plan

None — both tasks executed exactly as written. No auto-fixes were needed.

## Authentication Gates

None — fully automated build + test execution.

## Known Stubs

- **`TOTAL_CAP = 18000` is a module constant**, not a real game-data lookup. UI-SPEC §Copywriting specifies the literal subhead `133 件 / 18,000`; the 18,000 value is treated as the in-game placement cap reference. If the cap ever becomes area-level-dependent, this constant moves to a data lookup. Documented inline.
- **Cost-panel numerics still depend on `costIndex !== null`.** When `useFixtureData` is loading or fails, the inner CostPanel renders an empty rows list ("家具がありません"). The popover itself is not gated on data-load state because its mount is driven by the user (cost-pill toggle); a user opening the panel before data loads would see the empty state. The TopRail's CostPill is gated on `!loading && !error` in EditorLayout, so the realistic path is "user can only open the panel after data loads" — but the empty fallback is the safety net. Acceptable for v1.

These stubs do not block SC-3 (panel hidden by default, opens/closes from cost pill, persists state).

## Commits

- `4988c58` — refactor(07-06): re-skin CostPanel body with cream summary card and sky-green progress meter
- `722d770` — feat(07-06): add CostPanelPopover and mount in slot C

## Self-Check: PASSED

- `src/components/chrome/CostPanelPopover.tsx`: FOUND (`transformOrigin: 'top right'`, `transition: 'transform .18s ease, opacity .18s ease'`, `aria-label="閉じる"`, `id="cost-panel"`, `role="dialog"` all present)
- `src/components/costs/CostPanel.tsx`: FOUND (`linear-gradient(90deg, #69c8ff, #8fdf6c)`, `レイアウトコスト`, `必要`, `✓ 足` all present; legacy `aside.w-72.bg-surface-raised.border-l.border-default` absent)
- `src/components/layout/EditorLayout.tsx`: FOUND (`<CostPanelPopover` present; bare `<CostPanel ` mount absent; `useEditorStore` import line removed)
- Commit `4988c58`: FOUND in `git log --oneline -- src/components/costs/CostPanel.tsx`
- Commit `722d770`: FOUND in `git log --oneline -- src/components/chrome/CostPanelPopover.tsx`
- `pnpm build`: PASSES (exit 0)
- `pnpm test`: 199/199 PASSES
