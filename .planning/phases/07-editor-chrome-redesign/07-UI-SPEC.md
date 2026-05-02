---
phase: 7
slug: editor-chrome-redesign
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-02
canonical_source: scripts/sprite-pipeline/.planning/handoffs/editor-chrome/
---

# Phase 7 — UI Design Contract

> Visual and interaction contract for the Editor Chrome Redesign. Pre-populated almost entirely from the canonical hifi handoff at `scripts/sprite-pipeline/.planning/handoffs/editor-chrome/`. The handoff is the source of truth; this document re-expresses it in the GSD UI-SPEC schema and resolves the few decisions the handoff explicitly deferred.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (shadcn NOT initialized) |
| Preset | not applicable |
| Component library | Radix UI primitives (already in repo: `@radix-ui/react-tooltip`, `@radix-ui/react-dropdown-menu`) |
| Styling engine | Tailwind CSS 4 with CSS-based `@theme` block in `src/index.css` |
| Icon library | Lucide React (already in repo via `lucide-react`) |
| Font (UI) | `'Nunito', 'M PLUS Rounded 1c', system-ui, sans-serif` |
| Font (Japanese headers, numerics, kbd) | `'M PLUS Rounded 1c'` (weight 800–900) |
| Font loading strategy | **Decision: self-host via `@fontsource/nunito` + `@fontsource/m-plus-rounded-1c`** (avoids GH-Pages → Google Fonts CORS/perf hop, matches static-hosting constraint). Imported once in `src/main.tsx`. |

### Theme migration note (load-bearing)

The existing app uses a **dark theme** (`--color-surface: #1a1a2e`, `--color-accent: #39c5bb`) declared in `src/index.css` `@theme` block. The handoff specifies a **light cream + sky-blue palette**. Phase 7 rewrites the `@theme` block wholesale; legacy dark-theme tokens (`bg-surface`, `bg-surface-raised`, `bg-accent`, `text-primary`, etc.) are remapped to the new values. All existing component classnames (`bg-surface-raised`, `text-muted`, etc.) keep their semantic meaning but render with the new palette. No component file should be edited just to rename a token — the rename happens at the theme layer.

---

## Layout Regions (canvas-centric chrome)

Six discrete chrome regions sit around the Konva stage. All positions are relative to the viewport with `position: absolute` over the canvas.

| Region | Position | Size | Component(s) |
|--------|----------|------|--------------|
| Top rail | `top: 18px; left: 18px; right: 18px` | height 44px, transparent (children = pills) | `TopRail.tsx` (new) |
| Catalog | `top: 78px; left: 18px` | height 740px, width 320 (default) ↔ 72 (collapsed) | `CatalogRail.tsx` + existing `CatalogSidebar.tsx` body |
| Cost panel | `top: 78px; right: 18px` | width 320px, height 580px | `CostPanelPopover.tsx` (new, wraps existing `CostPanel.tsx`) |
| Floatbar | `bottom: 122px`, centered (drag-snap left/center/right) | h44 white pill | `FloatbarToolPill.tsx` (new) |
| Hotbar | `bottom: 18px; left: 50%; translateX(-50%)` | content-width, h≈92px | existing `Hotbar.tsx` (drop meta block, content-width) |
| Zoom dock | `bottom: 18px; right: 18px` | h44 pill, 3 buttons | `ZoomDock.tsx` (new) |

Top rail children, left → right: project title pill, spacer, cost pill (`#costPill`), autosave indicator, area-level dropdown. The status bar (`StatusBar.tsx`) is removed from the layout in favor of the autosave pill + zoom dock; `itemCount`, `gridSize`, `stageScale` are surfaced through chrome pills instead.

---

## Spacing Scale

Declared values (multiples of 2 — handoff explicitly uses 8/10/12/14/18/22 scale, deviates from strict 4-multiples for radii/outer padding to match game-feel reference):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps inside pills, kbd-chip padding |
| sm | 8px | Compact element spacing, intra-pill gaps, tile padding |
| (handoff) | 10px | Material-row vertical padding, cat-rail vertical padding |
| md | 12px | Catalog body padding, cost panel body padding |
| (handoff) | 14px | Pill internal padding, button h-radius reference |
| lg | 18px | **Outer canvas padding** (frames every chrome region from viewport edge) |
| (handoff) | 22px | Card / panel border-radius |
| xl | 32px | (reserved — not used by chrome) |

Exceptions (handoff-mandated, recorded explicitly): the floatbar segments are 36×36 hit area inside a 44px-tall pill; drag-handle is 22×36; category buttons are 60×52 (non-square); hotbar slots are 72×72; zoom buttons are 36×36 inside a 44px pill. These are touch-target ergonomic choices, not violations.

---

## Typography

| Role | Size | Weight | Line Height | Font |
|------|------|--------|-------------|------|
| Display (panel headers) | 16px | 800 | 1.2 | M PLUS Rounded 1c |
| Heading (project title) | 14px | 900 | 1.2 | M PLUS Rounded 1c |
| Body / button | 13px | 700 | 1.4 | Nunito |
| Label / numeric / kbd | 11–12px | 800 | 1.3 | M PLUS Rounded 1c |
| Micro (rail labels, slot labels) | 9.5–10px | 800 | 1.1 | M PLUS Rounded 1c |

Sizes used: 9.5 (cat-rail labels), 10 (hotbar slot labels), 11 (badges), 12 / 12.5 (counts, captions), 13 (buttons, material-row name), 14 (project title, area-level "Lv.3"), 16 (panel h3 headers).

Two weights only: **regular UI body = 700**, **display / labels / Japanese headers = 800–900**. (Nunito 700 + M PLUS Rounded 1c 800/900 is the working set.)

---

## Color (60 / 30 / 10 split)

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Dominant (60%) | `--panel` / `--panel-2` | `#ffffff` → `#fbf6ea` (vertical gradient) | Catalog body, floatbar pill, hotbar, zoom dock, all white pills |
| Secondary (30%) | `--cream` + cat-rail tan | `#fff8e7` / `linear-gradient(180deg, #ecdfb8, #e0cf9a)` | Cost panel summary card, cat-rail (tan band), cost-panel header, top-rail autosave/area pill warm fills |
| Accent (10%) | `--sky` / `--sky-deep` | `#69c8ff` / `#2ea8ee` (gradient `#9bdcff → #69c8ff`) | **Reserved-for list below** |
| Destructive | `--danger` | `#ff7a8a` (active gradient `#ff8c8c → #ff6f6f`) | Remove tool active state, cost-panel "差" short-fall numbers (`#d33`) |
| Status / OK | `--green` / `--green-deep` | `#8fdf6c` / `#5db232` | Autosave dot (pulsing), cost-panel "差" surplus (`#2c8a3a`), meter fill end-stop |

**Accent reserved-for list (explicit, no exceptions):**
1. Active tool segment in floatbar (sky-gradient fill on the currently-selected tool)
2. Active overwrite toggle in floatbar
3. Active hotbar slot ring + glow shadow `0 0 0 3px rgba(105,200,255,.4)`
4. Selected catalog tile outline (3px sky border)
5. Selected category in cat-rail (4×28px left-edge bar + sky-tint icon background)
6. Cost-meter progress fill (`linear-gradient(90deg, #69c8ff, #8fdf6c)`)
7. Area-level "Lv.3" badge in top-rail dropdown trigger
8. Catalog header strip background

Accent is **never** used for: hover states (cream `#f1efe5`), inactive tool segments, panel borders, body text, divider lines, scrollbars.

### Text colors
- `--ink` `#1f3556` — primary text
- `--ink-2` `#4f6a8e` — secondary text
- `--muted` `#8aa0bd` — tertiary / dim numeric / "/ 18,000" suffix
- `#0e3955` — text inside sky-gradient pills (active accent context only)

### Borders & shadows
- Panel border: `1px solid rgba(60,80,140,.14)` (`--panel-edge`)
- Cat-rail right-edge: `2px solid rgba(120,90,30,.18)` + inset `-2px 0 0 rgba(255,255,255,.4)`
- `--shadow-lg`: `0 16px 36px -14px rgba(60,90,160,.30), 0 4px 12px -6px rgba(60,90,160,.18)` — main panels (catalog, cost panel)
- `--shadow-md`: `0 6px 16px -8px rgba(60,90,160,.28), 0 2px 4px -2px rgba(60,90,160,.16)` — pills / floatbar / hotbar
- `--shadow-sm`: `0 2px 6px -2px rgba(60,90,160,.18)` — small badges, kbd chips

### Border radii
- Panels (catalog, cost panel): 22px
- Pills (top-rail children, floatbar, hotbar, zoom dock): 22px outer, 14px inner segments
- Tiles (catalog grid): 12px
- Material rows: 12px
- Search bar: 18px
- Mini-pills / kbd / badges: 6–10px

---

## Component Inventory

### New components
| Component | Location | Reads from store | Writes to store |
|-----------|----------|------------------|-----------------|
| `TopRail.tsx` | `src/components/chrome/TopRail.tsx` | `placedItems` (count), `areaLevel`, `gridSize`, lastSaveAt (derived) | — |
| `CostPill.tsx` | `src/components/chrome/CostPill.tsx` | `placedItems`, `costIndex` (current/max) | `costPanelOpen` (chrome store) |
| `AutosavePill.tsx` | `src/components/chrome/AutosavePill.tsx` | persist middleware last-write timestamp | — |
| `AreaLevelDropdown.tsx` | `src/components/chrome/AreaLevelDropdown.tsx` | `areaLevel`, `gridSize` | `setAreaLevel` |
| `CatalogRail.tsx` | `src/components/chrome/CatalogRail.tsx` | `activeCategory` | `setActiveCategory`, `catalogCollapsed` |
| `CostPanelPopover.tsx` | `src/components/chrome/CostPanelPopover.tsx` | `costPanelOpen` + existing `CostPanel.tsx` | `costPanelOpen` |
| `FloatbarToolPill.tsx` | `src/components/chrome/FloatbarToolPill.tsx` | `toolMode`, `overwriteEnabled`, temporal canUndo/canRedo | `setToolMode`, `toggleOverwrite`, undo/redo |
| `FloatbarDragHandle.tsx` | `src/components/chrome/FloatbarDragHandle.tsx` | `floatbarPosition` | `setFloatbarPosition` |
| `ZoomDock.tsx` | `src/components/chrome/ZoomDock.tsx` | `stageScale` | `setStageScale` |

### Existing components touched
| Component | Change |
|-----------|--------|
| `Toolbar.tsx` | **Removed.** Functionality migrates to `FloatbarToolPill` + `TopRail`. |
| `ToolButton.tsx` | **Kept** as the segment atom inside `FloatbarToolPill`. Restyled via prop or wrapper to render the pill-segment look (sky-gradient active, kbd chip, h44 hit area). |
| `Hotbar.tsx` | Drop meta block (already absent in code, was in v2 hifi). Outer container changes to content-width centered with new white-pill chrome (radius 22, shadow-md, padding 10, gap 8). Slots upsize from 40×40 to 72×72. |
| `StatusBar.tsx` | **Removed** from layout. Its data (item count, scale, area) is shown via top-rail pills + zoom dock. File can be deleted. |
| `EditorLayout.tsx` | Rewritten. No more flex column with toolbar/hotbar/status; instead canvas fills viewport and chrome regions are absolutely positioned over it. |
| `ImportButton.tsx`, `ExportButton.tsx` | **Decision: relocate to a kebab "︙" overflow menu pinned to the right end of the top rail (between autosave and area-level pills).** Rationale: the handoff lists "kebab in top rail OR settings drawer" and explicitly notes screen real estate priority; a kebab keeps these one click away without consuming a permanent pill slot, and avoids inventing a settings drawer that has no other contents in v1. |
| `CatalogSidebar.tsx` | Inner body re-skinned (header sky-gradient, search bar light-blue, 3-col tile grid with size + qty badges, 12px radius tiles, white→pale-blue tile gradient). Outer rail is replaced by `CatalogRail.tsx`. |
| `CostPanel.tsx` | Wrapped by `CostPanelPopover.tsx` — keeps internal layout but gets header restyled (cream gradient, "材料コスト" h3, close X button) and is mounted only when `costPanelOpen=true` (with scale/opacity transition). |

### Category icons (cat-rail, 8 buttons)

Category labels are fixed in Japanese (matches game data). Icons mapped from Lucide (no emoji in production):

| Category key | Label | Lucide icon |
|--------------|-------|-------------|
| `all` | 全部 | `Grid3x3` |
| `display` | ディスプレイ | `Image` |
| `canvas` | キャンバス | `Palette` |
| `rug` | ラグ | `Square` |
| `road` | 道 | `Route` |
| `shelf` | 棚 | `LibraryBig` |
| `plant` | 植物 | `TreePine` |
| `block` | ブロック | `Box` |

Active category gets sky-gradient icon background + 4×28px left-edge bar via `::before`.

---

## Interaction Contract

### Tool mode (mutual exclusion)
- Click select / stamp / brush / remove segments → `setToolMode`. Only one `.on` at a time.
- Keyboard: V / B / P / X.
- Active visual: sky-gradient (or red-gradient for `remove`), `#0e3955` ink, inset bottom shadow, kbd chip.

### Overwrite (independent toggle, NOT in mutual-exclusion group)
- Click overwrite segment → `toggleOverwrite`.
- Keyboard: O.
- Active visual: sky-gradient. Independent of tool mode.

### Undo / Redo
- Wired to `undoWithFlash()` / `redoWithFlash()` (existing helpers).
- Disabled when `temporal.pastStates.length === 0` / `futureStates.length === 0`.
- Keyboard: ⌘Z / ⌘⇧Z (and Ctrl-equivalents on Win/Linux).

### Catalog collapse
- Hamburger toggle: flips `catalogCollapsed`. Width transition `0.22s ease` (320 ↔ 72).
- Category click: sets `activeCategory`; if currently collapsed, also un-collapses.
- Cat-rail (72px) is always visible — no fully-hidden state.
- Cat-main fade: opacity `0.18s ease`.

### Cost panel show / hide
- Click cost-pill in top rail → toggles `costPanelOpen`. Pill chevron rotates 180° while open.
- Close X inside panel → sets `costPanelOpen = false`.
- Animation: `transform scale(.95)→1 + opacity 0→1, transition .18s ease, transform-origin top-right`.

### Floatbar drag-snap
- Mousedown on `.drag` handle: capture pointer, add `.dragging` class (suspends CSS transition on `left`), inline-set `left` to follow cursor.
- Mouseup: compute floatbar's center vs canvas thirds → snap to `left` / `center` / `right`. Clear inline styles, apply class.
- Persist `floatbarPosition` to `localStorage` (production behavior, not the prototype's sessionStorage).
- Snap transition: `left .22s cubic-bezier(.5,1.4,.4,1)` (slight overshoot for game-feel).
- First-load discoverability: `floatDragSeen` sessionStorage key gates a 2-cycle pulse halo (`1.4s ease-in-out × 2`) on the drag handle.

### Hotbar
- Click slot → `activateHotbar`. Drag-from-catalog to fill empty slot (existing `Hotbar.tsx` behavior preserved).
- Hover lift: `translateY(-2px)`, transition `.12s ease`.
- Active slot: sky-gradient bg + glow ring `0 0 0 3px rgba(105,200,255,.4)`.

### Zoom dock
- `−` / `100%` / `＋` buttons wire to `setStageScale` (clamped per existing canvas pan/zoom logic).
- Middle button (`100%`) resets to scale 1.

### Animations summary
| Element | Transition |
|---------|------------|
| Catalog width | `0.22s ease` |
| Cat-main opacity | `0.18s ease` |
| Cost panel | `transform .18s ease, opacity .18s ease` (origin top-right) |
| Floatbar position | `left .22s cubic-bezier(.5,1.4,.4,1)` |
| Pill / button hover | `transform .12s ease, box-shadow .12s ease, background .12s ease` |
| Autosave dot | `pulse 2s ease-in-out infinite` |
| Drag-handle hint | `1.4s ease-in-out × 2` (one-time, sessionStorage-gated) |

---

## State Management

**Decision: extend existing `useEditorStore` (Zustand) with chrome state under `partialize` whitelist for `persist` middleware.** Rationale:

1. The chrome state interacts with editor state (e.g. cost pill reads `placedItems`, area-level dropdown writes `setAreaLevel`) — splitting into a second store would force prop-drilling or `useStore.getState()` cross-calls.
2. The existing `editorStore.ts` already composes `persist` outside `temporal` (Phase 03 D-decision). Adding 4 fields to its `partialize` list is the simpler change.
3. zundo `partialize` already excludes non-`placedItems`/`placedEdges` from undo history, so the new chrome state is automatically excluded from undo/redo (correct: collapsing the catalog should not appear in undo history).

Reads from `useEditorStore` (existing):
- `toolMode`, `overwriteEnabled`, `areaLevel`, `gridSize`, `placedItems`, `stageScale`, `hotbar`, `activeFixtureId`
- `temporal.getState().pastStates / futureStates` (canUndo / canRedo)

New chrome-state fields added to `useEditorStore` (UI-only, in `persist` partialize but excluded from `temporal` partialize):
| Field | Type | Default |
|-------|------|---------|
| `catalogCollapsed` | `boolean` | `false` |
| `costPanelOpen` | `boolean` | `false` |
| `floatbarPosition` | `'left' \| 'center' \| 'right'` | `'center'` |
| `activeCategory` | `string` | `'all'` |

The `floatDragSeen` flag stays in `sessionStorage` (one-time hint, intentionally non-persistent across browser sessions).

---

## Copywriting Contract

| Element | Copy (Japanese-primary, matches handoff) |
|---------|------|
| Project title pill (placeholder) | `めだかな上面` (live project name once available) |
| Cost pill — current/max | `1,655 / 18,000` (numeric, "/ 18,000" muted) |
| Autosave pill — active | `自動保存 · 2s` (relative time since last save) |
| Autosave pill — saving | `保存中…` |
| Autosave pill — error | `保存エラー — 再試行` |
| Area-level pill | `Lv.3` + `70×70` (size in muted) |
| Catalog header h3 | `家具目録` |
| Catalog count chip | `133 件` |
| Catalog search placeholder | `家具を検索…` |
| Catalog empty state heading | `該当する家具はありません` |
| Catalog empty state body | `検索語またはカテゴリを変更してみてください` |
| Cost panel header h3 | `材料コスト` |
| Cost panel subhead | `133 件 / 18,000` |
| Cost panel summary caption | `レイアウトコスト` |
| Cost row labels | `必要 N` / `持 N` / `差 N` |
| Hotbar empty slot glyph | `＋` |
| Floatbar tool labels (tooltips, kept Chinese to match existing app) | 选择 / 放置 / 画刷 / 删除 / 覆盖 / 撤销 / 重做 |
| Floatbar kbd chips | `V` / `B` / `P` / `X` / `O` / `⌘Z` / `⌘⇧Z` |
| Zoom dock middle button | `100%` (live percentage) |
| Drag-handle tooltip (first-time) | `ドラッグで移動` |

### Destructive actions in this phase
The redesign itself introduces **no new destructive actions**. The existing `remove` tool (X) keeps its current behavior — single-click delete with no confirmation, recoverable via undo. The `ImportConfirmDialog` (existing, from Phase 3) handles destructive blueprint replacement and is unchanged.

### Error states
- Autosave error: inline pill state (red dot, `保存エラー — 再試行` text), click retries.
- Cost data unavailable: cost-pill renders `— / —` with chevron disabled; clicking is a no-op (no toast).
- Catalog data load error: existing `EditorLayout` error path (red text in 320×viewport rail) is reused inside `CatalogRail`.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| (none — shadcn not initialized) | n/a | not applicable |

No third-party shadcn registry blocks are declared for this phase. All new components are hand-built with Tailwind 4 + Radix primitives already in the dependency graph. Registry vetting gate is therefore not run.

---

## Open Decisions Resolved (handoff explicitly deferred)

| # | Question | Resolution | Rationale |
|---|---------|------------|-----------|
| 1 | Where do `ImportButton` / `ExportButton` go? | Kebab "︙" overflow menu in top rail (between autosave and area-level pills). | Handoff offered "kebab OR settings drawer" — a settings drawer has no other v1 contents, so kebab is simpler. Keeps actions one click away without permanent screen real estate. |
| 2 | Tailwind 4 token integration: new theme file vs extend `index.css` `@theme`? | Rewrite the existing `@theme` block in `src/index.css` wholesale. No new file. | Tailwind 4's `@theme` is the canonical config surface (no `tailwind.config.*` exists). Single source of truth aligns with the simplicity rule. |
| 3 | Font loading strategy (Google Fonts vs self-host)? | Self-host via `@fontsource/nunito` and `@fontsource/m-plus-rounded-1c`, imported in `src/main.tsx`. | GitHub Pages static-hosting constraint favors zero-CDN-hop; pinned npm deps survive CDN churn; FOIT avoided via fontsource's preload optimization. |
| 4 | `catalogCollapsed` / `costPanelOpen` / `floatbarPosition` / `activeCategory` — extend `useEditorStore` or new `useChromeStore`? | Extend `useEditorStore`. Add to persist `partialize`, exclude from temporal `partialize`. | Chrome state and editor state are interdependent (cost pill reads `placedItems`, area dropdown writes `areaLevel`). Splitting forces cross-store reads. Phase 03's persist-outside-temporal pattern accommodates new fields directly. |
| 5 | Lucide icon mapping for the 8 cat-rail categories? | See Component Inventory → "Category icons" table above (`Grid3x3`, `Image`, `Palette`, `Square`, `Route`, `LibraryBig`, `TreePine`, `Box`). | Production-style icons replace the prototype's emoji per the "use Lucide" directive in handoff §Assets. Mapping was chosen for semantic clarity within Lucide's vocabulary. |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
