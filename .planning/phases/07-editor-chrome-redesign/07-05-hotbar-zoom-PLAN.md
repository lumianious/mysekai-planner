---
phase: 07-editor-chrome-redesign
plan: 05
type: execute
wave: 2
depends_on: [07-01]
files_modified:
  - src/components/hotbar/Hotbar.tsx
  - src/components/chrome/ZoomDock.tsx
  - src/components/layout/EditorLayout.tsx
autonomous: true
requirements: [SC-5, SC-6, SC-7]
must_haves:
  truths:
    - "Hotbar is content-width centered, no meta block, slots upsized to 72×72 with sky-accent active state"
    - "Zoom dock at bottom-right has minus / 100% reset / plus buttons that wire to setStageScale"
    - "Pressing 1-9 still activates hotbar slots; drag-from-catalog still fills empty slots"
  artifacts:
    - path: "src/components/hotbar/Hotbar.tsx"
      provides: "re-skinned content-width hotbar"
    - path: "src/components/chrome/ZoomDock.tsx"
      provides: "zoom dock pill with three buttons"
      min_lines: 30
  key_links:
    - from: "src/components/chrome/ZoomDock.tsx"
      to: "useEditorStore.setStageScale + stageScale"
      via: "click handlers"
      pattern: "setStageScale"
    - from: "src/components/layout/EditorLayout.tsx"
      to: "src/components/chrome/ZoomDock.tsx"
      via: "Slot F mount"
      pattern: "<ZoomDock"
---

<objective>
Re-skin the hotbar (slots from 40×40 to 72×72, content-width white pill, drop the meta block — already absent in code) and build a new zoom dock at the bottom-right that wires to `stageScale` via `setStageScale`.

Purpose: Cover SC-5 (hotbar drops meta block, content-width centered; new bottom-right zoom dock wires to stage scale). Preserve SC-6 (1-9 hotbar activation untouched). Progress SC-7 (visual treatment).
Output: Re-skinned hotbar pill at slot E; new ZoomDock at slot F.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md
@.planning/phases/07-editor-chrome-redesign/07-01-foundation-PLAN.md
@CLAUDE.md
@src/components/hotbar/Hotbar.tsx
@src/components/layout/EditorLayout.tsx
@src/stores/editorStore.ts
@src/components/canvas/EditorCanvas.tsx

<interfaces>
From editorStore:
- `stageScale: number` (initial 1)
- `setStageScale(scale: number)`
- `hotbar: Array<{ fixtureId: number | null }>`, `activateHotbar(slot, fixture)`, `assignHotbar(slot, fixtureId)`
- `activeFixtureId: number | null`

EditorCanvas owns the actual zoom math (clamp range, wheel handler). ZoomDock just calls `setStageScale(newScale)` with clamped values matching the canvas's existing clamps. Inspect `src/components/canvas/EditorCanvas.tsx` for the clamp constants — typically `MIN_SCALE` and `MAX_SCALE` somewhere (e.g., 0.25 to 4). If not exported, use 0.25 / 4 here.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Re-skin Hotbar to content-width 72×72 pill</name>
  <read_first>
    - src/components/hotbar/Hotbar.tsx (current 40×40 slots; container is full-width with meta block already absent)
    - .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md §Component Inventory → "Hotbar.tsx", §Spacing touch-target exceptions ("hotbar slots are 72×72"), §Color reserved-for list (active hotbar slot ring + glow), §Interaction Contract → "Hotbar"
  </read_first>
  <files>
    - src/components/hotbar/Hotbar.tsx
  </files>
  <action>
    REPLACE the contents of `src/components/hotbar/Hotbar.tsx` with the structure below. Keep the existing component prop signature `{ fixtureMap }` and the existing logic for `activateHotbar` / `assignHotbar` / drag-from-catalog (if present — currently there is no drag handler in this file; preserve the simple click handler).

      // ======== 热栏（Slot E） ========
      // INPUT: useEditorStore（hotbar, activeFixtureId）, fixtureMap（缩略图 URL）
      // OUTPUT: 内容宽度居中白色药丸；9 个 72×72 槽位
      // POS: src/components/hotbar/Hotbar.tsx — Phase 7 重构后的热栏

      import { useEditorStore } from '../../stores/editorStore'
      import { getThumbnailUrl } from '../../data/fixtures'
      import type { Fixture } from '../../types/editor'

      interface HotbarProps {
        fixtureMap: Map<number, Fixture>
      }

      export function Hotbar({ fixtureMap }: HotbarProps) {
        const hotbar = useEditorStore((s) => s.hotbar)
        const activeFixtureId = useEditorStore((s) => s.activeFixtureId)
        const activateHotbar = useEditorStore((s) => s.activateHotbar)

        return (
          <div
            className="flex items-center"
            style={{
              background: 'linear-gradient(180deg, #ffffff, #fbf6ea)',
              borderRadius: 'var(--radius-panel)',     // 22px
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--color-panel-edge)',
              padding: 8,                               // sm
              gap: 8,                                   // sm
            }}
          >
            {hotbar.map((slot, index) => {
              const slotNumber = index + 1
              const isActive = slot.fixtureId !== null && slot.fixtureId === activeFixtureId
              const isEmpty = slot.fixtureId === null
              const fixture = slot.fixtureId !== null ? fixtureMap.get(slot.fixtureId) ?? null : null

              return (
                <button
                  key={slotNumber}
                  type="button"
                  className="relative overflow-hidden"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 'var(--radius-tile)',  // 12px
                    background: isActive
                      ? 'linear-gradient(180deg, #9bdcff, #69c8ff)'
                      : isEmpty
                        ? 'rgba(255,255,255,.6)'
                        : '#ffffff',
                    border: isActive
                      ? '0'
                      : '1px solid var(--color-panel-edge)',
                    boxShadow: isActive
                      ? '0 0 0 3px rgba(105,200,255,.4)'  // sky glow ring per UI-SPEC
                      : 'none',
                    cursor: 'pointer',
                    transition: 'transform .12s ease, box-shadow .12s ease, background .12s ease',
                  }}
                  onClick={() => activateHotbar(slotNumber, fixture)}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                  aria-label={isEmpty ? '空きスロット' : (fixture?.name ?? `スロット ${slotNumber}`)}
                >
                  {!isEmpty && fixture && (
                    <img
                      src={getThumbnailUrl(fixture.assetbundleName)}
                      alt={fixture.name}
                      className="w-full h-full object-cover"
                      style={{ borderRadius: 'var(--radius-tile)' }}
                      loading="lazy"
                    />
                  )}
                  {/* Slot number badge — top-left */}
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      padding: '0 4px',
                      borderRadius: 'var(--radius-badge)',
                      background: isEmpty ? 'transparent' : 'rgba(31,53,86,.6)',
                      color: isEmpty ? 'var(--color-muted)' : '#ffffff',
                      fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                      fontWeight: 800,
                      fontSize: 10,
                      lineHeight: 1.1,
                    }}
                  >
                    {slotNumber}
                  </span>
                  {isEmpty && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-muted)',
                        fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                        fontWeight: 800,
                        fontSize: 16,
                      }}
                    >
                      ＋
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )
      }
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -10 && grep -E "width: 72" src/components/hotbar/Hotbar.tsx && grep "rgba\\(105,200,255,\\.4\\)" src/components/hotbar/Hotbar.tsx && grep "空きスロット" src/components/hotbar/Hotbar.tsx</automated>
  </verify>
  <done>
    - Hotbar slots are 72×72 (UI-SPEC §Spacing touch-target exceptions).
    - Active slot shows the sky glow ring `0 0 0 3px rgba(105,200,255,.4)` (UI-SPEC §Color reserved-for list item 3).
    - Container is content-width with `gap: 8` and white-pill chrome.
    - Hover lift is `translateY(-2px)` per UI-SPEC §Animations.
    - Empty slot has aria-label `空きスロット`.
    - 1-9 keyboard activation still works (no changes to useKeyboard).
    - `pnpm build` succeeds.
  </done>
  <acceptance_criteria>
    - `grep -E "width: 72\\b" src/components/hotbar/Hotbar.tsx` matches.
    - `grep -E "height: 72\\b" src/components/hotbar/Hotbar.tsx` matches.
    - `grep "rgba(105,200,255,.4)" src/components/hotbar/Hotbar.tsx` matches (active glow).
    - `grep "linear-gradient(180deg, #9bdcff, #69c8ff)" src/components/hotbar/Hotbar.tsx` matches (active sky bg).
    - `grep "translateY(-2px)" src/components/hotbar/Hotbar.tsx` matches (hover lift).
    - `grep "var(--radius-panel)" src/components/hotbar/Hotbar.tsx` matches (outer pill).
    - `grep "var(--radius-tile)" src/components/hotbar/Hotbar.tsx` matches (slot tiles).
    - `grep "空きスロット" src/components/hotbar/Hotbar.tsx` matches.
    - File no longer contains `h-12 bg-surface-raised border-t border-default flex items-center justify-center` (the legacy full-width chrome).
    - `pnpm build` exit code 0.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Build ZoomDock + mount in slot F</name>
  <read_first>
    - src/components/canvas/EditorCanvas.tsx (find min/max scale clamps — search for `MIN_SCALE`, `MAX_SCALE`, `clamp`, `scaleBy`)
    - src/stores/editorStore.ts (`stageScale`, `setStageScale`)
    - .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md §Component Inventory → "ZoomDock", §Spacing touch-target exceptions ("zoom buttons are 36×36 inside a 44px pill"), §Interaction Contract → "Zoom dock", §Copywriting Contract → zoom labels, §Icon-only button aria-labels
    - src/components/layout/EditorLayout.tsx (slot F is empty)
  </read_first>
  <files>
    - src/components/chrome/ZoomDock.tsx
    - src/components/layout/EditorLayout.tsx
  </files>
  <action>
    Step 1 — Open `src/components/canvas/EditorCanvas.tsx` and find the existing scale clamps. If `MIN_SCALE` / `MAX_SCALE` are local constants, copy their values. Otherwise default to `MIN = 0.25`, `MAX = 4` and add a TODO comment to align with EditorCanvas if it changes.

    Step 2 — Create `src/components/chrome/ZoomDock.tsx`:

      // ======== 缩放停靠（Slot F） ========
      // INPUT: useEditorStore（stageScale, setStageScale）
      // OUTPUT: 右下角药丸 — 缩小 / 100% / 放大
      // POS: src/components/chrome/ZoomDock.tsx — Phase 7 缩放控件

      import { Minus, Plus } from 'lucide-react'
      import { useEditorStore } from '../../stores/editorStore'

      const MIN_SCALE = 0.25
      const MAX_SCALE = 4
      const STEP = 1.2 // 与 EditorCanvas wheel zoom 步进对齐 — 调整时同步两处

      function clamp(v: number) {
        return Math.max(MIN_SCALE, Math.min(MAX_SCALE, v))
      }

      export function ZoomDock() {
        const stageScale = useEditorStore((s) => s.stageScale)
        const setStageScale = useEditorStore((s) => s.setStageScale)

        const onMinus = () => setStageScale(clamp(stageScale / STEP))
        const onPlus  = () => setStageScale(clamp(stageScale * STEP))
        const onReset = () => setStageScale(1)

        const buttonStyle: React.CSSProperties = {
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-pill-inner)',  // 14px
          background: 'transparent',
          color: 'var(--color-ink-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background .12s ease, transform .12s ease',
        }

        return (
          <div
            className="flex items-center"
            style={{
              height: 44,
              padding: '0 8px',
              background: 'linear-gradient(180deg, #ffffff, #fbf6ea)',
              borderRadius: 'var(--radius-panel)',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--color-panel-edge)',
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={onMinus}
              style={buttonStyle}
              aria-label="縮小"
              disabled={stageScale <= MIN_SCALE}
            >
              <Minus size={18} />
            </button>

            <button
              type="button"
              onClick={onReset}
              style={{
                ...buttonStyle,
                width: 56,
                fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                fontWeight: 800,
                fontSize: 11,
                lineHeight: 1.3,
                color: 'var(--color-ink)',
              }}
              aria-label="表示倍率をリセット"
            >
              {Math.round(stageScale * 100)}%
            </button>

            <button
              type="button"
              onClick={onPlus}
              style={buttonStyle}
              aria-label="拡大"
              disabled={stageScale >= MAX_SCALE}
            >
              <Plus size={18} />
            </button>
          </div>
        )
      }

    Step 3 — Edit `src/components/layout/EditorLayout.tsx`:
      - Add import: `import { ZoomDock } from '../chrome/ZoomDock'`.
      - Inside `data-chrome-slot="zoom-dock"`, render `<ZoomDock />`.
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -10 && grep -c "<ZoomDock" src/components/layout/EditorLayout.tsx && grep "縮小\\|拡大\\|表示倍率をリセット" src/components/chrome/ZoomDock.tsx</automated>
  </verify>
  <done>
    - `ZoomDock.tsx` exists with three buttons (minus/reset/plus), aria-labels match UI-SPEC.
    - `setStageScale` is wired with clamp.
    - Slot F mounts the dock.
    - `pnpm build` succeeds.
  </done>
  <acceptance_criteria>
    - `test -f src/components/chrome/ZoomDock.tsx` returns 0.
    - `grep "setStageScale" src/components/chrome/ZoomDock.tsx` matches at least 3 times (onMinus, onPlus, onReset).
    - `grep 'aria-label="縮小"' src/components/chrome/ZoomDock.tsx` matches.
    - `grep 'aria-label="拡大"' src/components/chrome/ZoomDock.tsx` matches.
    - `grep 'aria-label="表示倍率をリセット"' src/components/chrome/ZoomDock.tsx` matches.
    - `grep "Math.round(stageScale * 100)" src/components/chrome/ZoomDock.tsx` matches.
    - `grep "<ZoomDock" src/components/layout/EditorLayout.tsx` matches.
    - `pnpm build` exit code 0.
  </acceptance_criteria>
</task>

</tasks>

<verification>
- App boots; hotbar visible at bottom-center as a 9-slot 72×72 white pill.
- Click any slot or press 1-9: activates the corresponding fixture (existing behavior preserved).
- Hover a slot: lifts 2px.
- Active slot shows sky-gradient bg + 3px sky glow ring.
- Bottom-right zoom dock visible. Click `−` / `+`: stage zooms in/out within clamp. Click `100%`: resets to 1x. Disabled state shows when at clamp.
- Reload page: hotbar contents persist (existing localStorage), stage scale resets to 1 (intentional — stageScale is not persisted).
</verification>

<success_criteria>
SC-5 (hotbar content-width centered + bottom-right zoom dock wires to stage scale) fully satisfied. SC-6 (1-9 keyboard preserved) verified. SC-7 progresses.
</success_criteria>

<output>
After completion, create `.planning/phases/07-editor-chrome-redesign/07-05-SUMMARY.md`.
</output>
