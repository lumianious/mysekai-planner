# Handoff: MySekai Planner — Editor Chrome Redesign

## Overview

This handoff covers the **chrome / shell of the editor view** in MySekai Planner — the toolbar, catalog, hotbar, cost panel, and zoom dock that sit around the placement canvas. It does **not** redesign the canvas itself or the placement engine; only the surrounding UI.

The goal of this redesign was ergonomic: the previous chrome had a wide top toolbar plus a left tool-rail plus a separate category bar plus a full-time cost panel, all permanently visible. During heavy placement loops the user's mouse traveled too far, and panels that were "summary" in nature (cost breakdown) blocked the canvas the whole time. The new layout consolidates the high-frequency controls into a centered "command center" at the bottom, and demotes summary data to expandable popovers.

## About the Design Files

The HTML files in this bundle are **design references**, not production code to copy verbatim. They are static prototypes built in plain HTML/CSS/JS to show intended layout, behavior, and visual treatment.

The implementation task is to **recreate these designs in the existing MySekai Planner codebase** (React + TypeScript + Tailwind, with `useEditorStore` Zustand state — see `mysekai-planner/src/components/`). Use existing patterns, components, and the project's icon set (Lucide). The HTML prototypes use emoji and CSS-art placeholders for furniture sprites — in the real implementation, use the actual sprite assets the project already has.

## Fidelity

**High-fidelity (hifi)** — colors, spacing, typography, shadows, transitions, and interactions are all final. Reproduce pixel-perfect using the existing component patterns (see `mysekai-planner/src/components/toolbar/`, `mysekai-planner/src/components/hotbar/`, etc.) but **swap to Tailwind classes / existing tokens**, not the inline CSS in the prototype. The HTML uses CSS custom properties as design tokens — those are listed under "Design Tokens" below.

`hifi.html` is the canonical reference. `hifi states.html` shows multiple states side-by-side using a DesignCanvas component (catalog expanded vs collapsed, cost panel closed vs open). `hifi v2 (previous iteration).html` is the prior layout, included only for diff context.

## Screens / Views

There is one screen in this handoff: the **editor canvas**. The chrome around it has six discrete regions:

### 1. Top rail (`.topbar`)
Slim horizontal row at `top: 18px; left: 18px; right: 18px`, height 44px, fully transparent — its children float as individual pills.

**Children, left to right:**
- **Project title** — text "めだかな上面" (or live project name), 14px, weight 900, font M PLUS Rounded 1c, color `--ink`. Wrapped in a 44px-tall white pill with `box-shadow: var(--shadow-md)` and `border: 1px solid rgba(0,0,0,.06)`.
- **Spacer** (`flex: 1`)
- **Cost pill** (`#costPill`) — 44px tall, contains:
  - `cp-num`: "1,655 / 18,000" (current cost / area max). Bold 13px ink, with the "/ 18,000" portion at muted color and weight 700.
  - `cp-meter`: 70×8px progress bar, fills proportionally. Background `#ece7d6`, fill is a `linear-gradient(90deg, #69c8ff, #8fdf6c)`.
  - `cp-chev`: chevron-down, 14×14, opacity .55. Rotates 180° when panel is open.
  - **Behavior**: click toggles the right-side cost panel `.right.open`. The pill itself gets `.cost-pill.open` class while the panel is open (rotates the chevron).
- **Autosave indicator** (`.autosave`) — 44px pill with green dot (`#8fdf6c`, 8px circle, pulsing 2s ease-in-out via the `pulse` keyframe) + text "自動保存 · 2s". Show ago-time relative to last save.
- **Area level dropdown** (`.arealv`) — 44px pill with a layers icon, "Lv.3" badge (sky-blue gradient `#9bdcff → #69c8ff`, white-ink `#0e3955` text), dim "70×70" text, and a chevron. Opens an area-level picker (matches `mysekai-planner/src/data/areaLevels.ts`).

### 2. Catalog (`.catalog`)
Left side, position absolute, `top: 78px; left: 18px`, height 740px, width 320px (default) or 72px (collapsed). Single rounded card at radius 22, with two columns side-by-side internally:

**Column A — Category rail (`.cat-rail`), always visible**
- Width 72px, full height
- Background `linear-gradient(180deg, #ecdfb8 0%, #e0cf9a 100%)` (deeper cream/tan — visually distinct from the white main column)
- Right border `2px solid rgba(120,90,30,.18)` and inset shadow `inset -2px 0 0 rgba(255,255,255,.4)` for a paper-ish edge
- Padding 8px vertical, gap 4px between buttons
- Top item: **Toggle button** (`.cr-toggle`) — 40×40 sky-gradient pill with hamburger icon. Click toggles `.catalog.collapsed`.
- Then 8 category buttons (`.cr-cat`):
  - 60×52px, centered icon + label
  - Icon is a 28×28 white-ish rounded square with the category emoji (placeholder — replace with the project's category icons)
  - Label: 9.5px, weight 800, line-height 1.1, M PLUS Rounded 1c font. Categories: 全部, ディスプレイ, キャンバス, ラグ, 道, 棚, 植物, ブロック
  - Active state: text `--sky-deep` color, icon background sky-gradient, plus a 4×28px sky-blue "left edge bar" via `::before` (with a soft glow shadow)

**Column B — Catalog body (`.cat-main`)**
- Flex 1 (fills remaining width)
- Background `linear-gradient(180deg, #ffffff 0%, #fbf6ea 100%)`
- When `.catalog.collapsed` is active: opacity 0, pointer-events none, transition 0.18s
- Contains:
  - **Header** (`.head`): 48px tall, sky-gradient background, h3 "家具目録" + "133 件" chip (white pill, weight 800)
  - **Body** (`.body`): padding 12px, gap 10px, flex column
    - Search bar (`.search`): 36px height, light blue background `#f4f8fc`, border `rgba(60,90,140,.12)`, radius 18px. Magnifying-glass icon + placeholder text
    - **Grid** (`.grid`): 3-column grid, 8px gap, scrollable. Each tile (`.tile`) is square aspect, white-to-pale-blue gradient, radius 12, shows:
      - Furniture sprite centered (CSS-art placeholders in the prototype — use real sprites)
      - Size badge bottom-left ("3×2", white pill, weight 800)
      - Quantity badge top-right ("×1", dark pill, weight 800)
      - Selected tile gets 3px sky outline

**Behavior**: clicking a category button while collapsed re-expands the catalog. Clicking the toggle hamburger explicitly collapses/expands.

### 3. Cost panel (`.right`)
Right side, position absolute, `top: 78px; right: 18px`, width 320px, height 580px.

**Hidden by default** (transform: scale(.95), opacity 0, pointer-events none). When `.open` class is applied: scale(1), opacity 1, transition 0.18s ease.

Contents:
- **Header**: cream gradient background, h3 "材料コスト", small text "133 件 / 18,000", and a close X button (28×28, soft gray `rgba(0,0,0,.06)` background)
- **Body** (`.body`): padding 12px, gap 10px, scroll-y
  - **Cost summary card**: cream background, contains stacked "1,655 / 18,000" + "レイアウトコスト" caption + horizontal meter (matches the top-pill meter styling)
  - **Material rows** (`.mat`): grid `36px 1fr auto`, 10px gap, 8×10 padding, radius 12. Each shows:
    - 36×36 cream-gradient icon tile with emoji
    - Name (weight 800, 13px) + small category caption (muted, 11px, lowercase letter-spacing)
    - Three-line numeric column: `必要 N` (ink), `持 N` (muted), `差 N` (red `#d33` if short, green `#2c8a3a` if `.mat.ok`). nowrap.

### 4. Floating toolbar (`.floatbar`)
Above the hotbar, `bottom: 122px`, centered horizontally by default.

**Drag-snap behavior**: drag the left handle to reposition. Snap zones: left third / center / right third of the canvas. CSS classes: `.snap-left { left: calc(50% - 320px); }`, `.snap-right { left: calc(50% + 320px); }`, default = centered. Transition `left .22s cubic-bezier(.5,1.4,.4,1)` (slight overshoot for game-feel).

**Drag handle** (`.drag`, 22×36): rounded-pill on the left edge, dotted-grid icon, cursor grab. On first page load (gated by `sessionStorage.getItem('floatDragSeen')`) it pulses with a sky-blue shadow halo for 2 cycles to surface its discoverability.

**Tool pill** (`.toolpill`): single 44px-tall white pill containing 4 segments + divider + overwrite + divider + undo/redo:

| Segment | Icon | Shortcut | State source |
|---|---|---|---|
| Select | MousePointer2 | V | `useEditorStore.toolMode === 'select'` |
| Stamp (default) | Stamp | B | `toolMode === 'stamp'` |
| Brush | Paintbrush | P | `toolMode === 'brush'` |
| Remove (`.danger`) | Eraser | X | `toolMode === 'remove'` |
| (divider) |  |  |  |
| Overwrite | Replace | O | `useEditorStore.overwriteEnabled` (independent toggle) |
| (divider) |  |  |  |
| Undo | Undo arrow | ⌘Z | `useEditorStore.canUndo()` |
| Redo | Redo arrow | ⌘⇧Z | `useEditorStore.canRedo()` |

Active segment: sky-gradient background, ink color `#0e3955`, inset bottom shadow. Remove uses a red gradient `#ff8c8c → #ff6f6f` when active. Each segment shows a small `.kbd` chip with the shortcut letter. Hover: light cream `#f1efe5` background.

### 5. Hotbar (`.hotbar`)
Bottom-center, content-width, `bottom: 18px`, `left: 50%; transform: translateX(-50%)`. White rounded panel, padding 10px, gap 8px, flex row.

9 slots (`.hslot`, 72×72px each, radius 14). Slots can be:
- Filled: shows furniture sprite centered, label below (10px weight 800), number badge top-left
- Empty (`.hslot.empty`): dashed border, `＋` glyph
- Active: sky-gradient background, glow ring shadow `0 0 0 3px rgba(105,200,255,.4)`

Hover on any slot lifts it `translateY(-2px)`.

**Note**: the previous design had a `.meta` block on the right showing "13 件配置 / 選択: ソファ" — it was removed because that information is duplicated in the StatusBar (`mysekai-planner/src/components/status/StatusBar.tsx`).

### 6. Zoom dock (`.zoom-float`)
Bottom-right floating, `right: 18px; bottom: 18px`. 44px-tall white pill with `−` / `100%` / `＋` buttons (each 36×36, transparent → light cream on hover). Wires to the canvas's stage scale.

## Interactions & Behavior

### Tool mode (mutual exclusion)
Clicking any of select/stamp/brush/remove segments updates `useEditorStore.toolMode` and visually toggles `.on` between segments. Only one is on at a time. Keyboard: V/B/P/X.

### Overwrite toggle (independent)
Click toggles `useEditorStore.overwriteEnabled`. Visual: `.on` class on the segment, sky-gradient when active. Keyboard: O.

### Undo / Redo
Wired to `useEditorStore.undo()` / `.redo()`. Disabled state via `disabled` attribute when no history. Keyboard: ⌘Z / ⌘⇧Z.

### Catalog collapse
- Hamburger toggle: flips `.collapsed` class on `.catalog`. Width transition 0.22s ease (320 ↔ 72).
- Category click: sets active category in store; if currently collapsed, also removes `.collapsed`.
- The 64px-wide rail is always visible — no fully-hidden state.

### Cost panel show/hide
- Click `.cost-pill` in top rail: toggles `.open` on `.right` (and on the pill itself, to rotate the chevron).
- Click close X inside panel: removes `.open` from both.
- Animation: scale .95 → 1 + opacity 0 → 1, transition 0.18s ease, transform-origin top-right.

### Floatbar drag
- Mousedown on drag handle: capture pointer, switch class `.dragging` (kills CSS transition on `left`), inline-set `left` to follow cursor.
- Mouseup: compute floatbar's center vs canvas thirds, snap to `.snap-left` / `.snap-center` (no class) / `.snap-right`. Clear inline styles to let CSS class take over. Persist position to `localStorage` (recommended, prototype uses `sessionStorage` for the hint suppression only).

### Hotbar slot select
Click slot to mark active. Drag-from-catalog to fill an empty slot (existing behavior in `Hotbar.tsx`).

### Animations / transitions
- Catalog width: `0.22s ease`
- Cat-main opacity: `0.18s ease`
- Cost panel: `transform .18s ease, opacity .18s ease`
- Floatbar position: `left .22s cubic-bezier(.5, 1.4, .4, 1)` (slight overshoot)
- Pill / button hover: `transform .12s ease, box-shadow .12s ease, background .12s ease`
- Autosave dot: `pulse 2s ease-in-out infinite`
- Drag-handle hint pulse: `1.4s ease-in-out` × 2 on first load

## State Management

All state lives in the existing `useEditorStore` (Zustand). The chrome reads:
- `toolMode`: `'select' | 'stamp' | 'brush' | 'remove'`
- `overwriteEnabled`: boolean
- `areaLevel`: number (1–4 per `mysekai-planner/src/data/areaLevels.ts`)
- `gridSize`: derived from area level
- `placedItems`: array, length used in autosave caption / status
- `stageScale`: number, displayed in zoom dock
- `hotbar`: array of 9 slot entries
- `activeFixtureId`: id of currently selected fixture
- `canUndo() / canRedo()`: history flags

New chrome-local state (UI only, not persisted to backend — store in `localStorage` so it survives reload):
- `catalogCollapsed`: boolean (default false)
- `costPanelOpen`: boolean (default false)
- `floatbarPosition`: `'left' | 'center' | 'right'` (default 'center')
- `activeCategory`: category key (default 'all')

## Design Tokens

Colors (CSS custom properties in `hifi.html`):

| Token | Value | Use |
|---|---|---|
| `--panel` | `#ffffff` | Primary panel background top |
| `--panel-2` | `#fbf6ea` | Primary panel background bottom |
| `--panel-edge` | `rgba(60,80,140,.14)` | Panel borders |
| `--sky` / `--mint` | `#69c8ff` | Primary accent |
| `--sky-deep` | `#2ea8ee` | Active accent / icon stroke |
| `--sky-soft` | `#cfeeff` | Subtle bg tint |
| `--blush` | `#ffb6c8` | Secondary accent (unused in current chrome) |
| `--sun` | `#ffe27a` | Warm highlight (unused in current chrome) |
| `--cream` | `#fff8e7` | Warm panel tint |
| `--ink` | `#1f3556` | Primary text |
| `--ink-2` | `#4f6a8e` | Secondary text |
| `--muted` | `#8aa0bd` | Tertiary text / dim numbers |
| `--green` | `#8fdf6c` | Autosave dot, OK state, meter end |
| `--green-deep` | `#5db232` | Pressed state |
| `--warn` | `#ffb84d` | (reserved) |
| `--danger` | `#ff7a8a` | Remove tool, error state |

Cat-rail tan-gradient: `linear-gradient(180deg, #ecdfb8 0%, #e0cf9a 100%)`. Border: `rgba(120,90,30,.18)`.

Sky-gradient (active accent on buttons / pills / hotbar): `linear-gradient(180deg, #9bdcff 0%, #69c8ff 100%)` with text `#0e3955` and inset shadows `inset 0 -2px 0 rgba(0,0,0,.10), inset 0 1px 0 rgba(255,255,255,.55)`.

Red-gradient (remove tool active): `linear-gradient(180deg, #ff8c8c 0%, #ff6f6f 100%)`.

Cost meter fill: `linear-gradient(90deg, #69c8ff, #8fdf6c)`.

### Spacing scale
8px / 10px / 12px / 14px / 18px / 22px (radius), and 18px outer canvas padding.

### Typography
- **UI font**: `'Nunito', 'M PLUS Rounded 1c', system-ui, sans-serif`
- **Headers / labels with Japanese text**: use `'M PLUS Rounded 1c'` explicitly, weight 800–900
- **Numeric / kbd**: `'M PLUS Rounded 1c'` mono-feel, weight 800
- Sizes used: 9.5 (rail labels), 10 (slot labels), 11 (badges), 12 / 12.5 / 13 (UI), 14 (buttons), 16 (panel headers)

### Border radii
- Cards / panels: 22
- Buttons / pills: 14 (small) / 22 (full pill)
- Tiles: 12
- Material rows: 12
- Search: 18
- Mini-pills / kbd chips: 6–10

### Shadows
- `--shadow-lg`: `0 16px 36px -14px rgba(60,90,160,.30), 0 4px 12px -6px rgba(60,90,160,.18)` — main panels
- `--shadow-md`: `0 6px 16px -8px rgba(60,90,160,.28), 0 2px 4px -2px rgba(60,90,160,.16)` — pills / buttons
- `--shadow-sm`: `0 2px 6px -2px rgba(60,90,160,.18)` — small elements

## Assets

The HTML prototypes use:
- **Lucide icons** (inlined as SVG in the prototype) — match exactly to existing imports in `mysekai-planner/src/components/toolbar/Toolbar.tsx`. Specifically: `MousePointer2`, `Stamp`, `Paintbrush`, `Eraser`, `Replace`, `Undo`, `Redo`, `Download`, `Upload`, `Layers`, `ChevronDown`, `Menu`, `X`, `Plus`, `Minus`. Use the existing project's Lucide imports rather than inlining new SVGs.
- **Emoji** as category icons (✨ 🖼 🎨 🧶 🛣️ 📚 🌿 🧱) — replace with project's actual category icons
- **CSS-art furniture sprites** — placeholder. Replace with the project's existing fixture thumbnail URLs (resolved via `fixtureMap` per `Hotbar.tsx`)
- **Google Fonts**: Nunito + M PLUS Rounded 1c (already imported in the prototype). Confirm these are loaded in the host app or substitute using the project's existing font stack.

## Files in this bundle

- `hifi.html` — **canonical hifi reference**. Open this to see the design at full fidelity. URL params `?cat=collapsed&cost=open` toggle states for screenshotting.
- `hifi states.html` — DesignCanvas gallery showing 6 state combinations side-by-side
- `hifi v2 (previous iteration).html` — previous layout (pre-redesign), included for diff context
- `wireframes.html` — early lo-fi wireframes from the exploratory phase. D2 panel was the closest to the final direction
- `design-canvas.jsx` — required by `hifi states.html` (presentation only, not part of the implementation)

## Codebase context (where to put the implementation)

The existing chrome lives at:
- `mysekai-planner/src/components/toolbar/Toolbar.tsx` — top toolbar (will be **largely replaced** — most of its tools move to the new floatbar)
- `mysekai-planner/src/components/toolbar/ToolButton.tsx` — reusable button (still useful for the toolpill segments)
- `mysekai-planner/src/components/toolbar/ImportButton.tsx`, `ExportButton.tsx` — these get **removed from the top rail**. Decide where they go: either a kebab menu in the top rail, or fold into a settings drawer. The redesign prioritizes screen real estate over their visibility.
- `mysekai-planner/src/components/hotbar/Hotbar.tsx` — hotbar (mostly unchanged, but **drop the meta block** and make container content-width centered)
- `mysekai-planner/src/components/status/StatusBar.tsx` — status bar (the corner-info that previously duplicated this is now removed)
- `mysekai-planner/src/components/layout/EditorLayout.tsx` — the layout shell. **This is where most of the new chrome wiring goes** (floatbar, cost panel popover, catalog collapse state).
- New components to add: `FloatbarToolPill.tsx`, `CatalogRail.tsx`, `CostPanelPopover.tsx`, `ZoomDock.tsx`.
