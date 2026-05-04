---
phase: 07-editor-chrome-redesign
plan: 02
type: execute
wave: 2
depends_on: [07-01]
files_modified:
  - src/components/chrome/TopRail.tsx
  - src/components/chrome/CostPill.tsx
  - src/components/chrome/AutosavePill.tsx
  - src/components/chrome/AreaLevelDropdown.tsx
  - src/components/chrome/TopRailKebab.tsx
  - src/components/chrome/CLAUDE.md
  - src/components/layout/EditorLayout.tsx
  - src/stores/editorStore.ts
  - src/components/status/StatusBar.tsx
autonomous: true
requirements: [SC-3, SC-4, SC-7]
must_haves:
  truths:
    - "Top rail shows a project title pill, cost pill, autosave indicator, area-level dropdown, and a kebab overflow menu"
    - "Clicking the cost pill toggles costPanelOpen and the chevron rotates 180°"
    - "User can change area level from a top-rail dropdown and the canvas grid resizes to match the selected level"
    - "Autosave indicator reflects the persist middleware's last-write timestamp via a relative-time string"
    - "Legacy StatusBar is removed from EditorLayout"
    - "Import + Export buttons relocate into the kebab menu"
  artifacts:
    - path: "src/components/chrome/TopRail.tsx"
      provides: "top rail container"
      min_lines: 30
    - path: "src/components/chrome/CostPill.tsx"
      provides: "cost pill toggling costPanelOpen"
      min_lines: 20
    - path: "src/components/chrome/AutosavePill.tsx"
      provides: "autosave status indicator"
      min_lines: 20
    - path: "src/components/chrome/AreaLevelDropdown.tsx"
      provides: "area-level pill + Radix dropdown"
      min_lines: 30
    - path: "src/components/chrome/TopRailKebab.tsx"
      provides: "kebab menu with import/export"
      min_lines: 20
  key_links:
    - from: "src/components/chrome/CostPill.tsx"
      to: "useEditorStore.toggleCostPanel"
      via: "onClick"
      pattern: "toggleCostPanel"
    - from: "src/components/chrome/AreaLevelDropdown.tsx"
      to: "useEditorStore.setAreaLevel"
      via: "DropdownMenu.Item onSelect"
      pattern: "setAreaLevel"
    - from: "src/components/layout/EditorLayout.tsx"
      to: "src/components/chrome/TopRail.tsx"
      via: "Slot A mount"
      pattern: "<TopRail"
---

<objective>
Build the top rail (Slot A) with five pill children: project title, cost pill (toggles cost panel), autosave indicator, area-level dropdown, and a kebab menu hosting Import/Export. Mount it in EditorLayout's `data-chrome-slot="top-rail"`. Add a `lastSaveAt` field to the persist middleware so the autosave pill can render relative time. Remove the legacy `StatusBar` and the legacy `Toolbar`'s area-level + import/export sections (the floatbar plan handles tool buttons; this plan only touches what the top rail covers).

Purpose: Replace the wide top toolbar's metadata area with a slim, glanceable rail. Cover SC-4 entirely and SC-3 (cost-pill toggle + persistence) partially (the popover lives in plan 06).
Output: Working top rail with all four pills + kebab; legacy StatusBar deleted; tool buttons remain in the legacy Toolbar (transitional) until plan 04 replaces them.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md
@.planning/phases/07-editor-chrome-redesign/07-01-foundation-PLAN.md
@CLAUDE.md
@src/components/layout/EditorLayout.tsx
@src/stores/editorStore.ts
@src/components/toolbar/Toolbar.tsx
@src/components/toolbar/ImportButton.tsx
@src/components/toolbar/ExportButton.tsx
@src/data/areaLevels.ts

<interfaces>
From src/data/areaLevels.ts (existing):
```ts
export const AREA_LEVELS: Record<AreaLevel, { label: string; gridSize: { width: number; depth: number }; ... }>
export function getGridSize(level: AreaLevel): { width: number; depth: number }
```

From src/stores/editorStore.ts (after plan 01):
- `areaLevel`, `gridSize`, `placedItems`, `costPanelOpen`, setters: `setAreaLevel`, `toggleCostPanel`, `setCostPanelOpen`
- The persist `onRehydrateStorage` callback already runs after load; we will add a `lastSaveAt: number | null` field captured by a custom storage wrapper.
- Cost data: `costIndex` is computed by `useFixtureData` and consumed by `CostPanel`. For this plan, the cost pill receives `current` and `max` numbers as props from `EditorLayout` via the existing `useFixtureData` hook + `computeMaterialTotals`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add lastSaveAt to persist middleware + create top-rail pill components</name>
  <read_first>
    - src/stores/editorStore.ts (persist config — extend with lastSaveAt)
    - src/components/toolbar/ImportButton.tsx (will be wrapped by kebab)
    - src/components/toolbar/ExportButton.tsx
    - .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md §Top rail children, §Copywriting Contract, §Color, §Typography, §Border Radii
    - src/data/areaLevels.ts
    - src/data/cost.ts (computeMaterialTotals — for cost pill numerics)
  </read_first>
  <files>
    - src/stores/editorStore.ts
    - src/components/chrome/CLAUDE.md
    - src/components/chrome/CostPill.tsx
    - src/components/chrome/AutosavePill.tsx
    - src/components/chrome/AreaLevelDropdown.tsx
    - src/components/chrome/TopRailKebab.tsx
  </files>
  <action>
    Step 1 — Add `lastSaveAt` persistence. In `src/stores/editorStore.ts`:

      a) Add `lastSaveAt: number | null` to `EditorState` (in `src/types/editor.ts`) with default `null` in the store initializer.
      b) Wrap `createJSONStorage(() => localStorage)` so we capture `Date.now()` on every successful `setItem`. Replace the `storage:` line with:

         storage: createJSONStorage(() => ({
           getItem: (name) => localStorage.getItem(name),
           setItem: (name, value) => {
             localStorage.setItem(name, value)
             // Module-level write timestamp (read by AutosavePill via getState())
             try { useEditorStore.setState({ lastSaveAt: Date.now() }) } catch { /* during init */ }
           },
           removeItem: (name) => localStorage.removeItem(name),
         })),

      c) DO NOT add `lastSaveAt` to the persist `partialize` whitelist (it's a derived runtime value, not user data).

    Step 2 — Create directory L2 doc `src/components/chrome/CLAUDE.md` with this header (per project DocOps rules):

      # chrome — 编辑器外围 UI 槽位组件

      Phase 7 chrome shell components. Each file declares INPUT/OUTPUT/POS in its L3 header.

      | File | Role |
      |------|------|
      | TopRail.tsx | Slot A 容器 |
      | CostPill.tsx | 顶栏成本药丸（点击切换 cost popover） |
      | AutosavePill.tsx | 自动保存指示器 |
      | AreaLevelDropdown.tsx | 区域等级下拉 |
      | TopRailKebab.tsx | Import/Export 溢出菜单 |
      | CatalogRail.tsx | Slot B（plan 03） |
      | CostPanelPopover.tsx | Slot C（plan 06） |
      | FloatbarToolPill.tsx | Slot D（plan 04） |
      | FloatbarDragHandle.tsx | Slot D（plan 04） |
      | ZoomDock.tsx | Slot F（plan 05） |

    Step 3 — Create `src/components/chrome/CostPill.tsx`. Use these exact tokens from UI-SPEC:
      - container: white pill, `radius: var(--radius-pill-inner)` (14px), `boxShadow: var(--shadow-md)`, padding `0 16px`, height 32, `gap: 8px`, `transition: transform .12s ease, box-shadow .12s ease, background .12s ease`
      - label font: Body tier (Nunito 700, 13px), color `var(--color-ink)`
      - numeric current: `var(--color-ink)` font M PLUS Rounded 1c 800 11px (Label tier)
      - numeric `/ 18,000`: `var(--color-muted)`
      - chevron: lucide `ChevronDown` size 14, `rotate(180deg)` when open, `transition: transform .18s ease`
      - props: `{ current: number; max: number }`
      - on click: `useEditorStore.getState().toggleCostPanel()`
      - aria-label: not needed (has visible text), but add `aria-expanded={costPanelOpen}` and `aria-controls="cost-panel"` for accessibility
      - copy: render `{current.toLocaleString()} / {max.toLocaleString()}` (UI-SPEC: `1,655 / 18,000`)

    Step 4 — Create `src/components/chrome/AutosavePill.tsx`:
      - Reads `lastSaveAt` from store. Computes `secondsAgo = Math.floor((Date.now() - lastSaveAt) / 1000)`.
      - Re-renders every 1s via a `useEffect` interval (cleanup on unmount).
      - Renders three states:
          • saving (lastSaveAt is null AND a save is mid-flight): text `保存中…`, no dot
          • idle (lastSaveAt has value): text `自動保存 · ${secondsAgo}s`, with pulsing green dot
          • error (future — gated by an optional `saveError?: boolean` prop, default false): text `保存エラー — 再試行`, role=button, `aria-label="保存を再試行"`, red dot
      - Pulsing dot: 8×8 circle, bg `var(--color-green)`, `animation: pulse 2s ease-in-out infinite`. Add the keyframes inline via a `<style>` tag inside the component OR add to `index.css` once.
      - Container: cream-fill pill, `background: linear-gradient(180deg, #fff8e7, #ecdfb8)`, `radius: var(--radius-pill-inner)` (14px), padding `0 16px`, height 32, `gap: 8px`, `boxShadow: var(--shadow-md)`, `border: 1px solid var(--color-tan-edge)`.
      - Text font: Nunito 700 13px, `var(--color-ink)`.

    Step 5 — Create `src/components/chrome/AreaLevelDropdown.tsx`:
      - Pill trigger: cream-fill, same chrome as AutosavePill, content `Lv.{areaLevel}` (Label tier, M PLUS 800 11px) + `{gridSize.width}×{gridSize.depth}` (`var(--color-muted)`, M PLUS 800 11px) + lucide `ChevronDown` size 14.
      - aria-label on the chevron icon button (NOT the pill itself, the pill's text is the label): per UI-SPEC §Icon-only button aria-labels — `aria-label="エリアレベルを変更"` on the trigger button.
      - Uses `@radix-ui/react-dropdown-menu`. Reuse the structure from current `Toolbar.tsx`'s area-level dropdown (lines 156–197) but apply new tokens:
          • Content: `bg: #ffffff`, `radius: var(--radius-tile)` (12px), `boxShadow: var(--shadow-lg)`, padding 8.
          • Items: padding `8 16`, font Nunito 700 13px, `var(--color-ink)`, hover `var(--color-cream-hover)` (#f1efe5), active `bg: linear-gradient(180deg, #9bdcff, #69c8ff)` + `color: var(--color-ink-on-sky)`.
      - Maps `AREA_LEVELS` exactly like the existing Toolbar dropdown.

    Step 6 — Create `src/components/chrome/TopRailKebab.tsx`:
      - Trigger: 32×32 button, white-fill, `radius: var(--radius-chip)` (10px), lucide `MoreVertical` icon size 18, `color: var(--color-ink-2)`, `aria-label="その他のアクション"`.
      - On click: opens Radix DropdownMenu with Content styling matching AreaLevelDropdown.
      - DropdownMenu.Items render the existing `<ImportButton />` and `<ExportButton />` components (re-render them inside the menu — they already self-contain their dialogs). Wrap each in a `DropdownMenu.Item asChild` so the menu closes after the dialog opens.
      - Order: Import first, Export second.
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -10 && grep -l "toggleCostPanel" src/components/chrome/CostPill.tsx && grep -l "lastSaveAt" src/stores/editorStore.ts && grep -l "MoreVertical" src/components/chrome/TopRailKebab.tsx && grep -l "Lv\\." src/components/chrome/AreaLevelDropdown.tsx</automated>
  </verify>
  <done>
    - All four pill files exist under `src/components/chrome/` with DocOps L3 headers.
    - `lastSaveAt` is wired through a wrapped storage adapter in `editorStore.ts`.
    - `src/components/chrome/CLAUDE.md` lists every chrome file expected by the phase.
    - `pnpm build` succeeds.
  </done>
  <acceptance_criteria>
    - `grep -l "lastSaveAt" src/stores/editorStore.ts` matches.
    - `grep -E "useEditorStore\\.setState\\(\\s*\\{\\s*lastSaveAt" src/stores/editorStore.ts` matches inside the storage `setItem` wrapper.
    - `src/components/chrome/CostPill.tsx` contains `toggleCostPanel` and `ChevronDown` and `aria-expanded`.
    - `src/components/chrome/AutosavePill.tsx` contains `自動保存` and `保存中…` and `保存エラー` and an interval that re-renders every 1s (`setInterval(`).
    - `src/components/chrome/AreaLevelDropdown.tsx` contains `setAreaLevel`, `AREA_LEVELS`, `Lv.`, and `aria-label="エリアレベルを変更"`.
    - `src/components/chrome/TopRailKebab.tsx` contains `MoreVertical`, `ImportButton`, `ExportButton`, and `aria-label="その他のアクション"`.
    - `src/components/chrome/CLAUDE.md` exists and lists at least 8 file rows.
    - `pnpm build` exit code 0.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Create TopRail container + mount in EditorLayout + remove legacy StatusBar</name>
  <read_first>
    - src/components/layout/EditorLayout.tsx (slot A is currently filled by legacy Toolbar — replace ONLY that slot's contents, keep the slot definition)
    - src/components/status/StatusBar.tsx (delete)
    - src/components/toolbar/Toolbar.tsx (DO NOT delete in this plan — plan 04 replaces it; only the area-level + import/export sections logically migrate)
    - .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md §Layout Regions, §Top rail children
    - src/data/cost.ts and src/hooks/useFixtureData.ts (to wire current/max into CostPill)
  </read_first>
  <files>
    - src/components/chrome/TopRail.tsx
    - src/components/layout/EditorLayout.tsx
    - src/components/status/StatusBar.tsx
  </files>
  <action>
    Step 1 — Create `src/components/chrome/TopRail.tsx` with this exact structure:

      // ======== 顶栏（Slot A） ========
      // INPUT: useEditorStore（placedItems, areaLevel, gridSize）, costIndex（来自 useFixtureData）
      // OUTPUT: 项目标题药丸 + 间距 + 成本药丸 + 自动保存药丸 + 区域等级下拉 + 溢出菜单
      // POS: src/components/chrome/TopRail.tsx — Phase 7 顶栏容器

      import { useEditorStore } from '../../stores/editorStore'
      import { computeMaterialTotals, type CostIndex } from '../../data/cost'
      import { CostPill } from './CostPill'
      import { AutosavePill } from './AutosavePill'
      import { AreaLevelDropdown } from './AreaLevelDropdown'
      import { TopRailKebab } from './TopRailKebab'
      import type { Fixture } from '../../types/editor'
      import { useMemo } from 'react'

      interface TopRailProps {
        fixtureMap: Map<number, Fixture>
        costIndex: CostIndex | null
      }

      export function TopRail({ fixtureMap, costIndex }: TopRailProps) {
        const placedItems = useEditorStore((s) => s.placedItems)
        const inventory = useEditorStore((s) => s.inventory)

        const costSummary = useMemo(() => {
          if (!costIndex) return { current: 0, max: 0 }
          const rows = computeMaterialTotals(Object.values(placedItems), fixtureMap, costIndex, inventory)
          const current = rows.reduce((s, r) => s + (r.needed - r.remaining), 0) // owned applied
          const max = rows.reduce((s, r) => s + r.needed, 0)
          return { current, max }
        }, [costIndex, placedItems, fixtureMap, inventory])

        return (
          <div
            id="top-rail"
            className="h-11 flex items-center gap-2"
            style={{ height: 44 }}
          >
            {/* Project title pill */}
            <div
              className="h-8 px-4 flex items-center"
              style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-pill-inner)',
                boxShadow: 'var(--shadow-md)',
                fontFamily: 'Nunito, system-ui, sans-serif',
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--color-ink)',
              }}
            >
              めだかな上面
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            <CostPill current={costSummary.current} max={costSummary.max} />
            <AutosavePill />
            <AreaLevelDropdown />
            <TopRailKebab />
          </div>
        )
      }

    Step 2 — Edit `src/components/layout/EditorLayout.tsx`:

      a) Import the new component:
         import { TopRail } from '../chrome/TopRail'

      b) Replace the contents of the `data-chrome-slot="top-rail"` div: remove `<Toolbar />` and render `<TopRail fixtureMap={fixtureMap} costIndex={costIndex} />` instead. Mount this only when `!loading && !error`; otherwise render nothing inside the slot.

      c) DELETE the entire `data-chrome-slot="legacy-status"` block including its `<StatusBar />` child. Remove the `import { StatusBar }` line.

      d) Keep the legacy `<Toolbar />` mounted somewhere transitional so tool buttons still work. Add a new transitional slot `data-chrome-slot="legacy-tools"` positioned at `top: 76, left: 360` (just right of the 320px catalog) — ONLY for the duration until plan 04 replaces it. Render `<Toolbar />` here with a wrapper that hides the area-level dropdown and import/export buttons (since the top rail now owns them). Use a CSS hack: wrap with a div and add a `<style>` block targeting child selectors to display:none on those, OR (cleaner) read `Toolbar.tsx` and add a prop `compact?: boolean` that hides the migrated sections — see Step 3.

    Step 3 — Edit `src/components/toolbar/Toolbar.tsx`:

      Add a `compact?: boolean` prop. When `compact === true`, hide:
        - The area-level DropdownMenu (the `<div className="ml-auto">...` block at the end).
        - The `<ExportButton />` and `<ImportButton />` calls.
      Keep tools, overwrite, and undo/redo visible. The legacy slot in EditorLayout passes `compact`.

    Step 4 — Delete `src/components/status/StatusBar.tsx` (file removal). Search for any remaining import:
      - `grep -rn "StatusBar" src/` should return zero matches after deletion.
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -10 && test ! -f src/components/status/StatusBar.tsx && grep -c "<TopRail" src/components/layout/EditorLayout.tsx && ! grep -rn "StatusBar" src/ 2>/dev/null</automated>
  </verify>
  <done>
    - `TopRail.tsx` mounted in slot A, renders all 5 pill children.
    - `StatusBar.tsx` deleted; no references remain.
    - `Toolbar.tsx` accepts `compact` prop and hides area/import/export.
    - Legacy Toolbar still visible in transitional slot for tool/overwrite/undo/redo until plan 04.
    - `pnpm build` succeeds.
  </done>
  <acceptance_criteria>
    - `test -f src/components/chrome/TopRail.tsx` returns 0 (file exists).
    - `grep -c "<TopRail" src/components/layout/EditorLayout.tsx` returns >= 1.
    - `test ! -f src/components/status/StatusBar.tsx` returns 0 (file deleted).
    - `grep -r "StatusBar" src/ 2>/dev/null | wc -l` returns 0.
    - `grep -E "compact\\?:\\s*boolean" src/components/toolbar/Toolbar.tsx` matches.
    - `grep "data-chrome-slot=\"legacy-tools\"" src/components/layout/EditorLayout.tsx` matches (transitional slot exists).
    - `grep "computeMaterialTotals" src/components/chrome/TopRail.tsx` matches (cost-pill numerics wired).
    - `pnpm build` exit code 0.
  </acceptance_criteria>
</task>

</tasks>

<verification>
- App boots, top rail visible at the very top.
- Click cost pill: `costPanelOpen` flips (verify in React DevTools); the chevron rotates 180°.
- Open a file in localStorage → after any edit, AutosavePill shows `自動保存 · 0s` then ticks up.
- Area-level dropdown opens; clicking Lv.3 changes the grid to 70×70.
- Kebab opens; Import + Export menu items still launch their existing dialogs.
- StatusBar.tsx is gone; no `import StatusBar` anywhere.
</verification>

<success_criteria>
SC-3 (cost pill toggles + persists) and SC-4 (top-rail children) are functionally complete. SC-7 progresses (top-rail visual treatment in place). Tool/overwrite/undo/redo still served by the legacy Toolbar in a transitional slot — plan 04 finishes the migration.
</success_criteria>

<output>
After completion, create `.planning/phases/07-editor-chrome-redesign/07-02-SUMMARY.md`.
</output>
