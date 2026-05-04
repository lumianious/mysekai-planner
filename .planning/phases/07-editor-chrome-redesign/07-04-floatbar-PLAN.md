---
phase: 07-editor-chrome-redesign
plan: 04
type: execute
wave: 4
depends_on: [07-01, 07-03]
files_modified:
  - src/components/chrome/FloatbarToolPill.tsx
  - src/components/chrome/FloatbarDragHandle.tsx
  - src/components/toolbar/ToolButton.tsx
  - src/components/toolbar/Toolbar.tsx
  - src/components/layout/EditorLayout.tsx
  - src/hooks/useKeyboard.ts
autonomous: true
requirements: [SC-1, SC-6, SC-7]
must_haves:
  truths:
    - "Bottom-centered floatbar holds tool segments (V/B/P/X), an overwrite toggle (O), and undo/redo segments (⌘Z / ⌘⇧Z)"
    - "Drag handle on the floatbar moves it between left/center/right snap positions, persisted via floatbarPosition"
    - "Active tool segment renders sky-gradient (or red-gradient for remove); active overwrite renders sky-gradient"
    - "Keyboard shortcuts V/B/P/X/O/Cmd+Z/Cmd+Shift+Z still work and tool-mode + overwrite remain mutually independent"
    - "Legacy Toolbar.tsx is removed; legacy-tools transitional slot is removed"
  artifacts:
    - path: "src/components/chrome/FloatbarToolPill.tsx"
      provides: "centered bottom floatbar with tool/overwrite/undo/redo segments"
      min_lines: 60
    - path: "src/components/chrome/FloatbarDragHandle.tsx"
      provides: "drag handle that snaps left/center/right"
      min_lines: 30
  key_links:
    - from: "src/components/chrome/FloatbarToolPill.tsx"
      to: "useEditorStore.setToolMode / toggleOverwrite + temporal undo/redo"
      via: "click handlers"
      pattern: "setToolMode|toggleOverwrite|undoWithFlash|redoWithFlash"
    - from: "src/components/chrome/FloatbarDragHandle.tsx"
      to: "useEditorStore.setFloatbarPosition"
      via: "pointer events"
      pattern: "setFloatbarPosition"
    - from: "src/hooks/useKeyboard.ts"
      to: "overwrite toggle"
      via: "O keybinding"
      pattern: "case 'o'"
---

<objective>
Replace the legacy top toolbar's tool/overwrite/undo/redo controls with a centered bottom floatbar that drag-snaps between left/center/right. Add the missing `O` keybinding for overwrite. Delete the legacy Toolbar entirely once the floatbar is wired (the area-level + import/export already moved to the top rail in plan 02).

Purpose: Cover SC-1 (floatbar replaces wide toolbar), SC-6 (V/B/P/X/O/Cmd+Z/Cmd+Shift+Z preserved + tool/overwrite mutual independence), and SC-7 (visual treatment).
Output: A working floatbar pill at the bottom; legacy `Toolbar.tsx` removed; transitional `legacy-tools` slot removed; keyboard shortcut for `O` added.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md
@.planning/phases/07-editor-chrome-redesign/07-01-foundation-PLAN.md
@CLAUDE.md
@src/components/toolbar/Toolbar.tsx
@src/components/toolbar/ToolButton.tsx
@src/components/layout/EditorLayout.tsx
@src/hooks/useKeyboard.ts
@src/stores/editorStore.ts

<interfaces>
From editorStore (existing + plan 01):
- `toolMode: 'select' | 'stamp' | 'brush' | 'remove'`, `setToolMode(mode)`
- `overwriteEnabled: boolean`, `toggleOverwrite()`
- `floatbarPosition: 'left' | 'center' | 'right'`, `setFloatbarPosition(pos)`
- `useEditorStore.temporal.getState().pastStates / futureStates / undo() / redo()`
- Helpers: `undoWithFlash()`, `redoWithFlash()`

From useKeyboard.ts (existing): handles V/B/P/X/Z/Y/R/Delete/Backspace/Arrows/Tab/1-9/Escape. We add `case 'o'` for overwrite.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build FloatbarToolPill + DragHandle + add O keybinding</name>
  <read_first>
    - src/components/toolbar/Toolbar.tsx (mirror its tool/overwrite/undo/redo logic into the floatbar — note the `useTemporalState` hook pattern at lines 28–45)
    - src/components/toolbar/ToolButton.tsx (atom — kept; floatbar uses a NEW pill-segment style component, ToolButton still serves the legacy Toolbar until task 2 deletes it)
    - src/hooks/useKeyboard.ts (add case 'o' for overwrite)
    - .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md §Component Inventory → "FloatbarToolPill", §Interaction Contract → "Tool mode", "Overwrite", "Undo/Redo", "Floatbar drag-snap", §Color reserved-for list (active tool segment, active overwrite are sky), §Animations summary (`left .22s cubic-bezier(.5,1.4,.4,1)`)
  </read_first>
  <files>
    - src/components/chrome/FloatbarDragHandle.tsx
    - src/components/chrome/FloatbarToolPill.tsx
    - src/hooks/useKeyboard.ts
  </files>
  <action>
    Step 1 — Create `src/components/chrome/FloatbarDragHandle.tsx`. The handle sits at the LEFT end of the floatbar pill. Per UI-SPEC §Spacing touch-target exceptions: 22×36 hit area.

      Behavior:
      - On `pointerdown`: capture pointer (`e.currentTarget.setPointerCapture(e.pointerId)`), set `dragging` state true, record `startX = e.clientX` and the pill's current `left` (read from getBoundingClientRect of the floatbar parent).
      - On `pointermove` (only while dragging): set the pill's parent `transform: translateX(...)` directly via a callback prop (avoid React re-renders mid-drag).
      - On `pointerup`: compute pill center vs viewport thirds:
          - If center < `viewportWidth / 3` → snap = 'left'
          - If center > `2 * viewportWidth / 3` → snap = 'right'
          - Else → 'center'
        Call `setFloatbarPosition(snap)` and clear inline transform.
      - First-load discoverability: read `sessionStorage.getItem('floatDragSeen')`. If null, apply `animation: floatHandleHint 1.4s ease-in-out 2`. After the animation, set `sessionStorage.setItem('floatDragSeen', '1')`.
      - Visual: 22×36, lucide `GripVertical` icon size 16, color `var(--color-muted)`, hover bg `rgba(105,200,255,.12)`, cursor `grab` / `grabbing` while dragging.
      - aria-label: `ドラッグで移動` (per UI-SPEC §Icon-only button aria-labels).

      Inject the keyframes (once) via a `<style>` tag in the component or extend index.css:

        @keyframes floatHandleHint {
          0%, 100% { box-shadow: 0 0 0 0 rgba(105,200,255,0); }
          50%      { box-shadow: 0 0 0 6px rgba(105,200,255,.35); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .6; transform: scale(.92); }
        }

      Component signature:
        export function FloatbarDragHandle({
          onDragMove,    // (deltaX: number) => void
          onDragEnd,     // () => void
        }: { onDragMove: (deltaX: number) => void; onDragEnd: () => void })

    Step 2 — Create `src/components/chrome/FloatbarToolPill.tsx`. The complete floatbar pill; renders drag handle, then 4 tool segments, then overwrite, then undo/redo. Use these UI-SPEC tokens:

      - Outer pill: `height: 44`, `background: linear-gradient(180deg, #ffffff, #fbf6ea)`, `borderRadius: var(--radius-panel)` (22px), `boxShadow: var(--shadow-md)`, `border: 1px solid var(--color-panel-edge)`, `padding: 0 8`, `gap: 4`, `display: flex`, `alignItems: center`, `transition: left .22s cubic-bezier(.5,1.4,.4,1)`.
      - Each segment: `width: 36, height: 36`, `borderRadius: var(--radius-pill-inner)` (14px), `padding: 0 16`, font Nunito 700 13px (only for visible labels — most are icon-only). `display: flex; align-items: center; justify-content: center; gap: 4`.
      - Inactive segment: bg transparent, icon `var(--color-ink-2)`, hover `bg: rgba(255,255,255,.4)`, `transition: transform .12s ease, background .12s ease`.
      - Active tool segment (V/B/P): `bg: linear-gradient(180deg, #9bdcff, #69c8ff)`, color `var(--color-ink-on-sky)`, inset bottom shadow `inset 0 -2px 0 rgba(46,168,238,.4)`.
      - Active remove segment (X): `bg: linear-gradient(180deg, #ff8c8c, #ff6f6f)`, color `#ffffff`, inset bottom shadow `inset 0 -2px 0 rgba(0,0,0,.18)`.
      - Active overwrite (O): same sky-gradient as V/B/P (per UI-SPEC §Color reserved-for list item 2).
      - kbd chip on each segment: 16×14 chip, `padding: 0 4`, `borderRadius: var(--radius-chip)` (10px), `bg: rgba(31,53,86,.08)`, font M PLUS Rounded 1c 800 11px, color `var(--color-ink)`. Position: top-right corner of the segment via `position: absolute; top: -4; right: -4`. (When the segment is active with sky bg, switch chip bg to `rgba(255,255,255,.32)` for contrast.)

      Segments and tooltips (Chinese — matches existing Toolbar copy per UI-SPEC §Copywriting):

        | mode/role     | lucide icon     | kbd  | tooltip |
        | select        | MousePointer2   | V    | 选择    |
        | stamp         | Stamp           | B    | 放置    |
        | brush         | Paintbrush      | P    | 画刷    |
        | remove        | Eraser          | X    | 删除    |
        | (separator)   |                 |      |         |
        | overwrite     | Replace         | O    | 覆盖    |
        | (separator)   |                 |      |         |
        | undo          | Undo2           | ⌘Z   | 撤销    |
        | redo          | Redo2           | ⌘⇧Z  | 重做    |

      Use Radix Tooltip for tooltips (matching existing ToolButton.tsx pattern).
      Separator: 1px width × 24px height, `bg: rgba(60,80,140,.14)`, margin `0 4`.

      Position logic: position is set by parent (EditorLayout slot D in task 2). The floatbar reads `floatbarPosition` from the store and computes its `left` value:
        - `'left'`   → left: 24
        - `'center'` → left: 50%, transform: translateX(-50%)
        - `'right'`  → left: calc(100% - <pill width> - 24)
      Wait — simpler: compute via percentages and translate:
        - `'left'`   → left: '0%',  transform: 'translateX(24px)'
        - `'center'` → left: '50%', transform: 'translateX(-50%)'
        - `'right'`  → left: '100%', transform: 'translateX(calc(-100% - 24px))'

      Reuse the temporal subscription pattern from `Toolbar.tsx` lines 28–45 (`useTemporalState` hook) to get `canUndo` / `canRedo`. For undo/redo handlers, call `undoWithFlash()` / `redoWithFlash()` from `editorStore.ts`.

      Drag wiring: Render `<FloatbarDragHandle onDragMove={...} onDragEnd={...} />` as the FIRST child. The handlers update an inline `style.transform` on the pill's outer div via a ref while dragging, and on end compute snap position and call `setFloatbarPosition(snap)`.

      Sketch:

        // ======== 浮动工具栏（Slot D） ========
        // INPUT: useEditorStore（toolMode, overwriteEnabled, floatbarPosition）+ temporal pastStates/futureStates
        // OUTPUT: 底部居中工具药丸；可拖拽快照到 left/center/right
        // POS: src/components/chrome/FloatbarToolPill.tsx — Phase 7 浮动工具栏

      Use `*` instead of `as const` to keep it simple. Wrap in `Tooltip.Provider delayDuration={300}` like the existing Toolbar.

    Step 3 — Edit `src/hooks/useKeyboard.ts` to add the `O` shortcut. Inside the switch on `e.key.toLowerCase()`, add a new case BEFORE the `escape` case:

        case 'o':
          // SC-6: 覆盖切换独立于工具模式
          state.toggleOverwrite()
          return

      Important: `O` must remain LOWER-CASE check (the existing switch uses `e.key.toLowerCase()`), and must not have any modifier key gating (so plain `O` toggles overwrite). It must NOT call `setToolMode` — overwrite is an independent toggle (UI-SPEC §Interaction Contract).

      Also add a comment header for SC-6 traceability above the switch:
        // ======== Phase 7 SC-6: V/B/P/X/O/⌘Z/⌘⇧Z ========
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -10 && grep -E "case 'o':" src/hooks/useKeyboard.ts && grep -E "case 'v':" src/hooks/useKeyboard.ts && grep -E "case 'b':" src/hooks/useKeyboard.ts && grep -E "case 'p':" src/hooks/useKeyboard.ts && grep -E "case 'x':" src/hooks/useKeyboard.ts && grep -E "case 'z':|metaKey.*z|ctrlKey.*z" src/hooks/useKeyboard.ts && grep -l "FloatbarDragHandle" src/components/chrome/FloatbarToolPill.tsx && grep -l "setFloatbarPosition" src/components/chrome/FloatbarToolPill.tsx</automated>
  </verify>
  <done>
    - `FloatbarToolPill.tsx` and `FloatbarDragHandle.tsx` exist with full UI-SPEC styling.
    - `useKeyboard.ts` has the `O` case calling `toggleOverwrite`.
    - Drag handle wires `setFloatbarPosition` via pointer events; snap math uses viewport thirds.
    - `pnpm build` succeeds.
  </done>
  <acceptance_criteria>
    - `grep -E "case 'o':" src/hooks/useKeyboard.ts` matches.
    - `grep "toggleOverwrite" src/hooks/useKeyboard.ts` matches.
    - `src/components/chrome/FloatbarToolPill.tsx` contains all 7 lucide imports: `MousePointer2`, `Stamp`, `Paintbrush`, `Eraser`, `Replace`, `Undo2`, `Redo2`.
    - File contains `setToolMode`, `toggleOverwrite`, `undoWithFlash`, `redoWithFlash`.
    - File contains `floatbarPosition` and uses it to compute the transform.
    - File contains `cubic-bezier(.5,1.4,.4,1)` (the snap easing per UI-SPEC §Animations).
    - File contains `linear-gradient(180deg, #9bdcff, #69c8ff)` (active sky gradient).
    - File contains `linear-gradient(180deg, #ff8c8c, #ff6f6f)` (active remove gradient).
    - `src/components/chrome/FloatbarDragHandle.tsx` contains `setPointerCapture`, `floatDragSeen`, `aria-label="ドラッグで移動"`, `GripVertical`.
    - `pnpm build` exit code 0.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Mount floatbar + delete legacy Toolbar + remove transitional slot</name>
  <read_first>
    - src/components/layout/EditorLayout.tsx (slot D currently empty; legacy-tools slot still mounting `<Toolbar compact />`)
    - src/components/toolbar/Toolbar.tsx (file to delete)
    - src/components/toolbar/ToolButton.tsx (KEEP — may still be useful as a generic atom; do not delete unless verified unused)
  </read_first>
  <files>
    - src/components/layout/EditorLayout.tsx
    - src/components/toolbar/Toolbar.tsx
    - src/components/toolbar/ToolButton.tsx
  </files>
  <action>
    Step 1 — Edit `src/components/layout/EditorLayout.tsx`:

      a) Add import: `import { FloatbarToolPill } from '../chrome/FloatbarToolPill'`.
      b) Inside slot D (`data-chrome-slot="floatbar"`), render `<FloatbarToolPill />`.
         IMPORTANT: Slot D's outer container should now drop the `transform: translateX(-50%)` and let `FloatbarToolPill` own its positioning (since the pill needs to slide between left/center/right snap points). Change slot D's style to:
            style={{ bottom: 120, left: 0, right: 0 }}
         and add `pointerEvents: 'none'` so the empty area passes clicks through; the pill itself sets `pointerEvents: 'auto'`.
      c) DELETE the entire `data-chrome-slot="legacy-tools"` block including its `<Toolbar compact />` child.
      d) Remove `import { Toolbar } from '../toolbar/Toolbar'`.

    Step 2 — DELETE `src/components/toolbar/Toolbar.tsx` (file removal).

    Step 3 — Verify `src/components/toolbar/ToolButton.tsx` is still used somewhere (it might be used by `ImportButton.tsx`/`ExportButton.tsx` via the kebab in plan 02). Run:
        grep -rn "from.*toolbar/ToolButton\\|from '../toolbar/ToolButton'" src/
      If zero matches, ALSO delete `ToolButton.tsx`. Otherwise keep it.

    Step 4 — Update `src/components/toolbar/CLAUDE.md` (if exists) to remove `Toolbar.tsx` reference. If no L2 doc exists, skip.

    Step 5 — Verify ImportButton + ExportButton still work (they don't depend on Toolbar.tsx — they're self-contained dialog launchers consumed by TopRailKebab).
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -10 && test ! -f src/components/toolbar/Toolbar.tsx && grep -c "<FloatbarToolPill" src/components/layout/EditorLayout.tsx && ! grep "legacy-tools" src/components/layout/EditorLayout.tsx</automated>
  </verify>
  <done>
    - Slot D renders `<FloatbarToolPill />`.
    - `Toolbar.tsx` deleted; `legacy-tools` slot removed.
    - `pnpm build` succeeds.
    - All keyboard shortcuts (V/B/P/X/O/Cmd+Z/Cmd+Shift+Z/Ctrl+Z/Ctrl+Y) still work.
  </done>
  <acceptance_criteria>
    - `test ! -f src/components/toolbar/Toolbar.tsx` returns 0.
    - `grep -r "from.*toolbar/Toolbar'" src/ 2>/dev/null | wc -l` returns 0 (no remaining imports).
    - `grep "<FloatbarToolPill" src/components/layout/EditorLayout.tsx` matches.
    - `grep "legacy-tools" src/components/layout/EditorLayout.tsx` returns NO matches.
    - `grep "<Toolbar" src/components/layout/EditorLayout.tsx` returns NO matches.
    - `pnpm build` exit code 0.
  </acceptance_criteria>
</task>

</tasks>

<verification>
- App boots; floatbar visible at bottom-center.
- Click each tool segment → toolMode changes; only one is active at a time (mutual exclusion).
- Click overwrite → toggles independently of toolMode (e.g., select+overwrite both highlighted).
- Press V/B/P/X → tool segments respond. Press O → overwrite toggles. Press Cmd+Z / Cmd+Shift+Z → undo/redo with flash. Confirm tool buttons match keyboard.
- Drag the floatbar handle → pill follows cursor. Release near left third → snaps to left with `.22s cubic-bezier(.5,1.4,.4,1)` ease. Reload page → position persists.
- First load shows pulse halo on the drag handle for ~2 cycles, then sessionStorage gates it.
</verification>

<success_criteria>
SC-1 (floatbar replaces wide toolbar) and SC-6 (V/B/P/X/O/⌘Z/⌘⇧Z preserved + tool/overwrite mutual independence) fully satisfied. SC-7 progresses (visual treatment).
</success_criteria>

<output>
After completion, create `.planning/phases/07-editor-chrome-redesign/07-04-SUMMARY.md`.
</output>
