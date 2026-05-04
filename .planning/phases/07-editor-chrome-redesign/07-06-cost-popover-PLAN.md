---
phase: 07-editor-chrome-redesign
plan: 06
type: execute
wave: 2
depends_on: [07-01]
files_modified:
  - src/components/chrome/CostPanelPopover.tsx
  - src/components/costs/CostPanel.tsx
  - src/components/layout/EditorLayout.tsx
autonomous: true
requirements: [SC-3, SC-7]
must_haves:
  truths:
    - "Cost panel is hidden by default; clicking the cost pill in the top rail toggles it"
    - "Cost panel mounts as a popover at top:76 right:16 with scale+opacity entry animation"
    - "Close X inside the panel sets costPanelOpen=false"
    - "costPanelOpen state persists to localStorage (via plan 01's persist whitelist)"
    - "CostPanel inner layout is re-skinned per UI-SPEC tokens (cream gradient header, 材料コスト h3, sky→green progress meter)"
  artifacts:
    - path: "src/components/chrome/CostPanelPopover.tsx"
      provides: "popover wrapper around CostPanel with close button + entry transition"
      min_lines: 30
    - path: "src/components/costs/CostPanel.tsx"
      provides: "re-skinned cost panel body"
  key_links:
    - from: "src/components/chrome/CostPanelPopover.tsx"
      to: "useEditorStore.costPanelOpen / setCostPanelOpen"
      via: "store hooks"
      pattern: "costPanelOpen"
    - from: "src/components/layout/EditorLayout.tsx"
      to: "src/components/chrome/CostPanelPopover.tsx"
      via: "Slot C mount"
      pattern: "<CostPanelPopover"
---

<objective>
Replace the always-mounted CostPanel sidebar with a popover that toggles via the top-rail cost pill (built in plan 02). Re-skin the panel header to a cream gradient with `材料コスト` h3 + close X. Add a sky→green progress meter beneath the header summary. Wire the popover entry/exit to the `transform: scale(.95)→1 + opacity 0→1` animation per UI-SPEC.

Purpose: Cover SC-3 (cost panel hidden by default, opened/closed from top-rail cost pill, persists state to localStorage). Progress SC-7 (visual treatment).
Output: A popover-style cost panel that mounts only when `costPanelOpen=true`, with re-skinned header and progress meter; clicking the cost pill in the top rail toggles it.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md
@.planning/phases/07-editor-chrome-redesign/07-01-foundation-PLAN.md
@.planning/phases/07-editor-chrome-redesign/07-02-top-rail-PLAN.md
@CLAUDE.md
@src/components/costs/CostPanel.tsx
@src/components/layout/EditorLayout.tsx
@src/stores/editorStore.ts
@src/data/cost.ts

<interfaces>
From editorStore (after plan 01):
- `costPanelOpen: boolean`, `setCostPanelOpen(open)`, `toggleCostPanel()`

From CostPanel.tsx (existing):
- Props: `{ fixtureMap: Map<number, Fixture>; costIndex: CostIndex | null }`
- Renders an `<aside>` with header + scrollable list of `MaterialIcon` rows.
- Reads `placedItems`, `inventory`, `setInventoryQuantity`, `clearInventory` from store.
- Uses `computeMaterialTotals(placedItems, fixtureMap, costIndex, inventory)`.

The existing component currently does its own outer chrome (`w-72 bg-surface-raised border-l ...`). We strip the outer aside chrome — the popover wrapper provides chrome instead. CostPanel becomes a "bare body" that the popover hosts.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Re-skin CostPanel body + add progress meter</name>
  <read_first>
    - src/components/costs/CostPanel.tsx (entire file — strip outer aside chrome, re-skin header, add meter)
    - .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md §Component Inventory → "CostPanel.tsx", §Color reserved-for list (cost-meter progress fill is item 6, sky→green gradient), §Copywriting Contract (`材料コスト`, `133 件 / 18,000`, `レイアウトコスト`, `必要 N` / `持 N` / `差 N`), §Typography
    - src/data/cost.ts (computeMaterialTotals shape)
  </read_first>
  <files>
    - src/components/costs/CostPanel.tsx
  </files>
  <action>
    REPLACE `src/components/costs/CostPanel.tsx` with the structure below. Key changes:

    1. Drop the outer `<aside className="w-72 bg-surface-raised border-l border-default ...">`. The component now renders a fragment-style body that fills its parent (the popover wrapper provides chrome).
    2. Header switches to cream gradient + Display-tier h3 `材料コスト` + subhead `{N} 件 / {totalNeeded.toLocaleString()}`.
    3. Add a `summary card` block below the header showing `レイアウトコスト` caption + the meter:
        - Meter track: `height: 8`, `border-radius: var(--radius-chip)`, `background: rgba(60,80,140,.10)`.
        - Meter fill: width = `${Math.min(100, (current / max) * 100)}%`, `background: linear-gradient(90deg, #69c8ff, #8fdf6c)`, `border-radius: var(--radius-chip)`.
    4. Material rows re-skinned: `padding: 8 16`, `border-radius: var(--radius-tile)` on each row container, separator becomes `border-bottom: 1px solid var(--color-panel-edge)`.
    5. Row labels use UI-SPEC copy: `必要 {needed}`, `持 {input}`, `差 {remaining}`. Color rules:
        - `差 0` → `var(--color-surplus)` `#2c8a3a` with prefix `✓ 足`
        - `差 N>0` → `var(--color-shortfall)` `#d33` with prefix `差 {N}`
    6. Numeric values use Label tier (M PLUS Rounded 1c 800 11px) where they appear as count chips; row inputs stay Nunito 700 13px.
    7. KEEP the existing `MaterialIcon` component unchanged.
    8. KEEP the `clearInventory` button but restyle as a small Label-tier link in the header (no chrome).

    Skeleton:

      // ======== 成本面板（重构 — Phase 7） ========
      // INPUT:  placedItems (store), fixtureMap (props), costIndex (props), inventory (store)
      // OUTPUT: 无外壳的面板内容（外壳由 CostPanelPopover 提供）
      // POS:    src/components/costs/CostPanel.tsx — 成本明细 body（含进度计）

      import { useMemo } from 'react'
      import { useEditorStore } from '../../stores/editorStore'
      import { computeMaterialTotals, type CostIndex } from '../../data/cost'
      import type { Fixture } from '../../types/editor'

      interface CostPanelProps {
        fixtureMap: Map<number, Fixture>
        costIndex: CostIndex | null
      }

      const MATERIAL_TYPE_LABEL: Record<string, string> = {
        wood: '木材', iron: '金属', stone: '石材',
        wool: '毛糸', plant: '植物', tone: '音色', jewel: '宝石',
      }

      function MaterialIcon({ assetbundleName }: { assetbundleName: string }) {
        const url = `https://storage.sekai.best/sekai-jp-assets/thumbnail/material_rip/${assetbundleName}.webp`
        return (
          <img src={url} alt="" loading="lazy"
               className="w-8 h-8 object-contain shrink-0"
               style={{ borderRadius: 'var(--radius-chip)', background: '#ffffff' }}
               onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
        )
      }

      export function CostPanel({ fixtureMap, costIndex }: CostPanelProps) {
        const placedItems = useEditorStore((s) => s.placedItems)
        const inventory = useEditorStore((s) => s.inventory)
        const setInventoryQuantity = useEditorStore((s) => s.setInventoryQuantity)
        const clearInventory = useEditorStore((s) => s.clearInventory)

        const rows = useMemo(() => {
          if (!costIndex) return []
          return computeMaterialTotals(Object.values(placedItems), fixtureMap, costIndex, inventory)
        }, [costIndex, placedItems, fixtureMap, inventory])

        const totalNeeded    = rows.reduce((s, r) => s + r.needed,    0)
        const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0)
        const owned          = totalNeeded - totalRemaining
        const meterPct       = totalNeeded > 0 ? Math.min(100, (owned / totalNeeded) * 100) : 0

        return (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Summary card */}
            <div
              style={{
                margin: 16,
                padding: 16,
                borderRadius: 'var(--radius-tile)',
                background: 'linear-gradient(180deg, #fff8e7, #ecdfb8)',
                border: '1px solid var(--color-tan-edge)',
              }}
            >
              <div style={{
                fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                fontWeight: 800, fontSize: 11, lineHeight: 1.3,
                color: 'var(--color-ink-2)',
                marginBottom: 8,
              }}>
                レイアウトコスト
              </div>
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 8,
                fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                fontWeight: 800,
                color: 'var(--color-ink)',
              }}>
                <span style={{ fontSize: 16 }}>{owned.toLocaleString()}</span>
                <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>/ {totalNeeded.toLocaleString()}</span>
              </div>
              <div
                style={{
                  marginTop: 8, height: 8,
                  borderRadius: 'var(--radius-chip)',
                  background: 'rgba(60,80,140,.10)', overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${meterPct}%`,
                    background: 'linear-gradient(90deg, #69c8ff, #8fdf6c)',
                    borderRadius: 'var(--radius-chip)',
                    transition: 'width .22s ease',
                  }}
                />
              </div>
            </div>

            {/* Inventory clear */}
            <div style={{ paddingLeft: 16, paddingRight: 16, marginBottom: 8 }}>
              <button
                onClick={clearInventory}
                style={{
                  fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                  fontWeight: 800, fontSize: 11,
                  color: 'var(--color-ink-2)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '4px 0',
                }}
              >
                库存清零
              </button>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '0 8px 16px' }}>
              {rows.length === 0 ? (
                <p style={{
                  textAlign: 'center', padding: '32px 16px',
                  fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 700, fontSize: 13,
                  color: 'var(--color-muted)',
                }}>
                  画布上无家具
                </p>
              ) : (
                <ul>
                  {rows.map((row) => {
                    const ok = row.remaining === 0
                    return (
                      <li
                        key={row.material.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-tile)',
                          borderBottom: '1px solid var(--color-panel-edge)',
                        }}
                      >
                        <MaterialIcon assetbundleName={row.material.iconAssetbundleName} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 700, fontSize: 13,
                            color: 'var(--color-ink)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }} title={row.material.name}>
                            {row.material.name}
                          </div>
                          <div style={{
                            fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                            fontWeight: 800, fontSize: 10, lineHeight: 1.1,
                            color: 'var(--color-muted)',
                          }}>
                            {MATERIAL_TYPE_LABEL[row.material.mysekaiMaterialType as string] ?? row.material.mysekaiMaterialType}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, width: 112, flexShrink: 0 }}>
                          <div style={{
                            fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                            fontWeight: 800, fontSize: 10,
                            color: 'var(--color-muted)',
                          }}>
                            必要 <span style={{ color: 'var(--color-ink)' }}>{row.needed}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif', fontWeight: 800, fontSize: 10, color: 'var(--color-muted)' }}>持</span>
                            <input
                              type="number" min={0}
                              value={row.owned || ''} placeholder="0"
                              onChange={(e) => setInventoryQuantity(row.material.id, Number(e.target.value))}
                              style={{
                                width: 56, padding: '2px 4px',
                                fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: 700, fontSize: 11,
                                background: '#ffffff',
                                border: '1px solid var(--color-panel-edge)',
                                borderRadius: 'var(--radius-chip)',
                                color: 'var(--color-ink)',
                                textAlign: 'right',
                              }}
                            />
                          </div>
                          <div style={{
                            fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                            fontWeight: 800, fontSize: 10,
                            color: ok ? 'var(--color-surplus)' : 'var(--color-shortfall)',
                          }}>
                            {ok ? '✓ 足' : `差 ${row.remaining}`}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )
      }
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -10 && grep "linear-gradient(90deg, #69c8ff, #8fdf6c)" src/components/costs/CostPanel.tsx && grep "レイアウトコスト" src/components/costs/CostPanel.tsx && grep "必要" src/components/costs/CostPanel.tsx</automated>
  </verify>
  <done>
    - CostPanel no longer renders an outer `<aside>` with full chrome — the popover wrapper provides chrome.
    - Summary card with cream gradient + sky→green progress meter is present.
    - Row labels use `必要 N` / `持 N` / `差 N` per UI-SPEC.
    - `pnpm build` succeeds.
  </done>
  <acceptance_criteria>
    - `grep "linear-gradient(90deg, #69c8ff, #8fdf6c)" src/components/costs/CostPanel.tsx` matches (sky→green meter).
    - `grep "レイアウトコスト" src/components/costs/CostPanel.tsx` matches.
    - `grep "必要" src/components/costs/CostPanel.tsx` matches.
    - `grep -E "差\\s\\$\\{row\\.remaining\\}" src/components/costs/CostPanel.tsx` matches.
    - `grep "✓ 足" src/components/costs/CostPanel.tsx` matches.
    - File no longer contains `<aside className="w-72 bg-surface-raised border-l border-default` (the legacy outer chrome).
    - `pnpm build` exit code 0.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Build CostPanelPopover wrapper + mount in slot C</name>
  <read_first>
    - src/components/layout/EditorLayout.tsx (slot C currently mounts CostPanel directly when costPanelOpen — replace with CostPanelPopover)
    - .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md §Component Inventory → "CostPanelPopover", §Interaction Contract → "Cost panel show / hide" (transform-origin top-right, scale .95→1 + opacity 0→1, .18s ease), §Icon-only button aria-labels (`閉じる`)
    - src/components/costs/CostPanel.tsx (now bare body)
  </read_first>
  <files>
    - src/components/chrome/CostPanelPopover.tsx
    - src/components/layout/EditorLayout.tsx
  </files>
  <action>
    Step 1 — Create `src/components/chrome/CostPanelPopover.tsx`:

      // ======== 成本面板浮层（Slot C） ========
      // INPUT: useEditorStore（costPanelOpen, setCostPanelOpen）, fixtureMap, costIndex
      // OUTPUT: 仅在 costPanelOpen=true 时挂载的浮层；包裹 CostPanel body
      // POS: src/components/chrome/CostPanelPopover.tsx — Phase 7 成本面板外壳

      import { useEffect, useState } from 'react'
      import { X } from 'lucide-react'
      import { CostPanel } from '../costs/CostPanel'
      import { useEditorStore } from '../../stores/editorStore'
      import type { Fixture } from '../../types/editor'
      import type { CostIndex } from '../../data/cost'

      interface CostPanelPopoverProps {
        fixtureMap: Map<number, Fixture>
        costIndex: CostIndex | null
      }

      export function CostPanelPopover({ fixtureMap, costIndex }: CostPanelPopoverProps) {
        const open = useEditorStore((s) => s.costPanelOpen)
        const setOpen = useEditorStore((s) => s.setCostPanelOpen)
        const placedItems = useEditorStore((s) => s.placedItems)
        const itemCount = Object.keys(placedItems).length
        const totalCap = 18000 // UI-SPEC subhead constant — game grid cap reference

        // Drive entry transition: render in DOM only when open, then animate in via state.
        const [mounted, setMounted] = useState(false)
        useEffect(() => {
          if (open) {
            setMounted(true)
          } else {
            // Defer unmount briefly to allow exit transition (visual nicety; not strictly required).
            const t = setTimeout(() => setMounted(false), 200)
            return () => clearTimeout(t)
          }
        }, [open])

        if (!mounted) return null

        return (
          <div
            id="cost-panel"
            role="dialog"
            aria-label="材料コスト"
            style={{
              width: 320,
              height: 580,
              background: 'linear-gradient(180deg, #ffffff, #fbf6ea)',
              border: '1px solid var(--color-panel-edge)',
              borderRadius: 'var(--radius-panel)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transformOrigin: 'top right',
              transform: open ? 'scale(1)' : 'scale(0.95)',
              opacity: open ? 1 : 0,
              transition: 'transform .18s ease, opacity .18s ease',
            }}
          >
            {/* Header — cream gradient */}
            <div
              style={{
                padding: '16px',
                background: 'linear-gradient(180deg, #fff8e7, #ecdfb8)',
                borderBottom: '1px solid var(--color-tan-edge)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div>
                <h3 style={{
                  margin: 0,
                  fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                  fontWeight: 800, fontSize: 16, lineHeight: 1.2,
                  color: 'var(--color-ink)',
                }}>
                  材料コスト
                </h3>
                <p style={{
                  margin: '4px 0 0',
                  fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                  fontWeight: 800, fontSize: 11, lineHeight: 1.3,
                  color: 'var(--color-ink-2)',
                }}>
                  {itemCount} 件 / {totalCap.toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                style={{
                  width: 28, height: 28,
                  borderRadius: 'var(--radius-chip)',
                  background: 'rgba(255,255,255,.5)',
                  border: '1px solid var(--color-panel-edge)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-ink-2)',
                  transition: 'background .12s ease',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <CostPanel fixtureMap={fixtureMap} costIndex={costIndex} />
            </div>
          </div>
        )
      }

    Step 2 — Edit `src/components/layout/EditorLayout.tsx`:
      a) Add import: `import { CostPanelPopover } from '../chrome/CostPanelPopover'`.
      b) In slot C, REPLACE the conditional `<CostPanel ... />` with `<CostPanelPopover fixtureMap={fixtureMap} costIndex={costIndex} />`.
      c) Remove the outer `costPanelOpen &&` gate around slot C — the popover handles its own mount/unmount lifecycle. Slot C's container becomes:
           {!loading && !error && (
             <div data-chrome-slot="cost-panel" className="absolute z-10" style={{ top: 76, right: 16 }}>
               <CostPanelPopover fixtureMap={fixtureMap} costIndex={costIndex} />
             </div>
           )}
      d) Remove the now-unused `CostPanel` import from EditorLayout (the popover imports it instead).
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -10 && grep -c "<CostPanelPopover" src/components/layout/EditorLayout.tsx && grep "閉じる" src/components/chrome/CostPanelPopover.tsx && grep "transform-origin\\|transformOrigin" src/components/chrome/CostPanelPopover.tsx</automated>
  </verify>
  <done>
    - `CostPanelPopover.tsx` renders a 320×580 popover with header (cream gradient, h3 `材料コスト`, close X) + body (CostPanel).
    - Entry/exit animation uses `transform: scale(.95)→1 + opacity 0→1, transition .18s ease, transform-origin: top right`.
    - Slot C mounts the popover; `<CostPanel>` no longer mounted directly from EditorLayout.
    - Click X → `costPanelOpen=false`. Click cost pill in top rail → toggles. Reload → state persists.
    - `pnpm build` succeeds.
  </done>
  <acceptance_criteria>
    - `test -f src/components/chrome/CostPanelPopover.tsx` returns 0.
    - `grep "transformOrigin: 'top right'" src/components/chrome/CostPanelPopover.tsx` matches.
    - `grep "transition: 'transform .18s ease, opacity .18s ease'" src/components/chrome/CostPanelPopover.tsx` matches.
    - `grep 'aria-label="閉じる"' src/components/chrome/CostPanelPopover.tsx` matches.
    - `grep "材料コスト" src/components/chrome/CostPanelPopover.tsx` matches.
    - `grep "<CostPanelPopover" src/components/layout/EditorLayout.tsx` matches.
    - `grep "<CostPanel " src/components/layout/EditorLayout.tsx` returns NO matches (CostPanel mounted only via the popover wrapper).
    - `grep "import.*CostPanel" src/components/layout/EditorLayout.tsx` returns NO matches (popover handles import).
    - `grep "id=\"cost-panel\"" src/components/chrome/CostPanelPopover.tsx` matches (so CostPill's aria-controls="cost-panel" resolves correctly).
    - `pnpm build` exit code 0.
  </acceptance_criteria>
</task>

</tasks>

<verification>
- App boots; cost panel is hidden by default (no rectangle on the right).
- Click cost pill in top rail → panel slides in with scale + opacity transition; chevron in pill rotates 180°.
- Click X → panel exits with reverse transition.
- Reload while open → panel reopens after rehydration (proves persist whitelist works).
- Inventory inputs still update `setInventoryQuantity`; `差 N` numbers update live.
- Progress meter fills with sky→green gradient; reaches 100% when owned == needed.
</verification>

<success_criteria>
SC-3 (cost panel hidden by default, opened/closed from cost pill, persists state to localStorage) fully satisfied. SC-7 progresses (panel visual treatment matches tokens, sky→green meter, cream header).
</success_criteria>

<output>
After completion, create `.planning/phases/07-editor-chrome-redesign/07-06-SUMMARY.md`.
</output>
