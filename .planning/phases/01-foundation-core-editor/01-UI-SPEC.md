---
phase: 1
slug: foundation-core-editor
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-09
---

# Phase 1 — UI Design Contract

> Visual and interaction contract for the Foundation & Core Editor phase. Locks spacing, typography, color, copywriting, and component decisions before planning.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (no shadcn) |
| Preset | not applicable |
| Component library | Radix UI (tooltip, dropdown-menu) |
| Icon library | lucide-react ^1.7.0 |
| Font | System font stack (Tailwind `font-sans`) |

**Rationale:** Canvas-centric editor with minimal UI chrome. Radix primitives + Tailwind utilities keep the bundle light. shadcn adds value for form-heavy UIs, which this phase does not have.

---

## Spacing Scale

Declared values (multiples of 4, mapped to Tailwind classes):

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| xs | 4px | `gap-1` / `p-1` | Icon gaps, inline padding, badge padding |
| sm | 8px | `gap-2` / `p-2` | Toolbar button padding, catalog grid gap, hotbar slot gap |
| md | 16px | `gap-4` / `p-4` | Sidebar section padding, panel internal padding |
| lg | 24px | `gap-6` / `p-6` | Welcome screen section gaps |
| xl | 32px | `gap-8` / `p-8` | Layout gaps between major areas (sidebar ↔ canvas) |

Exceptions: none

---

## Typography

System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji"`

CJK coverage: system-native on macOS (PingFang SC/JP), Windows (Microsoft YaHei/Yu Gothic), Linux (Noto Sans CJK). Zero web font download.

| Role | Size | Weight | Line Height | Tailwind | Usage |
|------|------|--------|-------------|----------|-------|
| Body | 14px | 400 | 1.5 | `text-sm font-normal` | Catalog item names, status bar text, tooltip body |
| Label | 12px | 400 | 1.4 | `text-xs font-normal` | Dimension badges, category chips, hotbar slot numbers |
| Heading | 18px | 600 | 1.3 | `text-lg font-semibold` | Sidebar section titles, welcome screen section headings |
| Display | 24px | 600 | 1.2 | `text-2xl font-semibold` | Welcome screen title only |

**Font weights:** 2 only — 400 (normal) and 600 (semibold). No exceptions.

---

## Color

Dark editor theme inspired by creative tools (VS Code, Figma). Accent from Project Sekai brand palette.

| Role | Value | Tailwind Custom | Usage |
|------|-------|-----------------|-------|
| Dominant (60%) | `#1e1e2e` | `bg-surface` | App background, canvas container background |
| Secondary (30%) | `#2a2a3e` | `bg-surface-raised` | Sidebar background, toolbar background, hotbar background, status bar background |
| Tertiary | `#363650` | `bg-surface-hover` | Hover state for toolbar buttons, catalog items, hotbar slots |
| Accent (10%) | `#39c5bb` | `text-accent` / `bg-accent` | See accent reservation list below |
| Destructive | `#ef4444` | `text-destructive` | Remove mode active indicator, ghost preview blocked tint, delete confirmation |
| Valid | `#22c55e` | `text-valid` | Ghost preview valid placement tint |
| Selection | `#3b82f6` | `border-selection` | Selected item border highlight, resize handles |
| Text primary | `#e4e4ef` | `text-primary` | All readable text on dark surfaces |
| Text muted | `#8888a0` | `text-muted` | Secondary info, disabled states, grid coordinates |
| Border | `#3a3a52` | `border-default` | Panel separators, sidebar border, toolbar dividers |

### Accent Reservation (explicit list — never "all interactive elements")

`#39c5bb` accent is reserved ONLY for:
- Active toolbar mode button (Select/Move, Stamp, Remove — the currently active one)
- Active category filter chip in catalog
- Active hotbar slot border (the slot that will be placed on next click)
- Welcome screen area level card active/hover border
- Area level selector active state

All other interactive elements use `bg-surface-hover` on hover, not accent.

---

## Visual Hierarchy

**Primary focal point:** The canvas is the primary visual anchor of the editor. The dark dominant surface (`#1e1e2e`) surrounding it and the sidebar's subordinate width (`w-72` vs `flex-1`) establish the canvas as the workspace center. The toolbar, hotbar, and status bar are peripheral chrome.

---

## Layout Contract

### Overall Structure

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar (h-10, bg-surface-raised)                       │
│ [Select][Stamp][Remove] | [Overwrite] | [Undo][Redo]   │
│                    | [Area: Lv.3 ▾] | [Zoom: 100%]     │
├────────┬────────────────────────────────────────────────┤
│Sidebar │ Canvas (flex-1, bg-surface)                    │
│(w-72)  │                                                │
│        │  ┌──────────────────────────────────┐          │
│ Search │  │  Grass texture + grid lines      │          │
│ Chips  │  │  + placed items (colored rects)  │          │
│ Grid   │  │  + ghost preview                 │          │
│ (virt) │  └──────────────────────────────────┘          │
│        │                                                │
├────────┴────────────────────────────────────────────────┤
│ Hotbar (h-14, bg-surface-raised)                        │
│ [1: ▪][2: ▪][3: ▪][4: ▪][5: ▪][6: ▪][7: ▪][8: ▪][9: ▪]│
├─────────────────────────────────────────────────────────┤
│ Status Bar (h-8, bg-surface-raised, text-xs)            │
│ 区域等级: Lv.3 (70×70) │ 已配置: 42件 │ ズーム: 100%    │
└─────────────────────────────────────────────────────────┘
```

### Sidebar States

| State | Width | Content |
|-------|-------|---------|
| Expanded | `w-72` (288px) | Full catalog with search, chips, thumbnail grid |
| Collapsed | `w-12` (48px) | Icon strip: catalog icon, settings icon. Click to expand |

Collapse trigger: chevron button at sidebar top-right, or keyboard shortcut (Claude's discretion).

### Toolbar Buttons

| Button | Icon (lucide) | Active State | Tooltip |
|--------|---------------|-------------|---------|
| Select/Move | `MousePointer2` | `bg-accent text-surface` | "选择/移动 (V)" |
| Stamp | `Stamp` | `bg-accent text-surface` | "放置 (B)" |
| Remove | `Eraser` | `bg-destructive text-white` | "删除 (X)" |
| Overwrite | `Replace` | `bg-accent/20 border-accent` | "覆盖模式" |
| Undo | `Undo2` | — (action, not toggle) | "撤销 (Ctrl+Z)" |
| Redo | `Redo2` | — (action, not toggle) | "重做 (Ctrl+Y)" |
| Area Level | `Map` + dropdown | — | Current area level display |

### Hotbar Slots

- 9 slots, numbered 1-9
- Each slot: `w-12 h-12` (48×48px), `rounded-md`, `bg-surface`, `border border-default`
- Assigned slot: shows CDN thumbnail (scaled to fit) + number badge top-left
- Empty slot: shows number only in `text-muted`
- Active slot: `border-accent border-2` + subtle glow (`ring-1 ring-accent/30`)
- Hover: `bg-surface-hover`

---

## Catalog Panel Contract

### Search Input

- Full-width inside sidebar, `h-9`, `bg-surface`, `border border-default`, `rounded-md`
- Placeholder: "家具を検索..." (Search furniture...)
- `Search` icon (lucide) as left adornment
- Clear button (`X` icon) appears when input has text

### Category Chips

- Horizontal scrollable row below search
- Each chip: `px-2 py-1`, `rounded-full`, `text-xs font-normal`
- Default: `bg-surface text-muted border border-default font-normal`
- Active: `bg-accent/15 text-accent border-accent font-normal`
- Data source: `mysekaiFixtureMainGenreId` joined to genre name table

### Thumbnail Grid

- 2-column grid layout (`grid-cols-2 gap-2`)
- Each cell: `aspect-square rounded-md bg-surface-hover overflow-hidden cursor-pointer`
- Image: CDN URL `storage.sekai.best/sekai-jp-assets/mysekai/thumbnail/fixture/{assetbundleName}_1.webp`
- Dimension badge: bottom-right corner, `px-1 py-1 text-xs bg-black/60 text-white rounded-sm` showing "WxD" (e.g., "2x1")
- Hover: `ring-1 ring-accent/50` + Radix tooltip with full name + category
- Selected (active stamp item): `ring-2 ring-accent`
- Virtualized with TanStack Virtual (row virtualization, ~1,126 items)

---

## Canvas Interaction Contract

### Grid Lines

- Color: `rgba(255, 255, 255, 0.08)` — subtle white lines over grass texture
- Width: 1px at all zoom levels (Konva `strokeWidth: 1 / scale` to maintain visual weight)
- No grid labels/coordinates on the grid itself (coordinates shown in status bar on hover)

### Ghost Preview

| State | Fill | Stroke | Opacity |
|-------|------|--------|---------|
| Valid placement | `#22c55e` (green) | `#22c55e` | 0.35 |
| Blocked placement | `#ef4444` (red) | `#ef4444` | 0.35 |

- Follows cursor, snaps to grid
- Shows exact WxD footprint of the active item
- Text label inside: item name in `text-xs`, white, centered

### Placed Items

- Rendered as colored rectangles on the Konva canvas
- Fill: deterministic color from item category (hashed from `mysekaiFixtureMainGenreId`)
- Stroke: `#ffffff` at 0.3 opacity, 1px
- Label: item name centered, `12px`, white, truncated if wider than rectangle
- Mandatory items (gate, house): additional `Lock` icon overlay (8px, top-right corner)

### Selection Indicator

- Selected item: `#3b82f6` border, 2px, with 4 small corner handles (4×4px squares)
- Arrow keys move selected item 1 tile in that direction (with collision check)
- `Delete` key removes selected item (unless mandatory)

### Undo/Redo Flash

- Items affected by undo/redo: brief `ring-2 ring-accent` flash animation, 300ms duration, ease-out
- Konva `Tween` or CSS-like animation on the node

---

## Welcome Screen Contract

Displayed on app load before entering the editor. Full-screen overlay on `bg-surface`.

```
┌─────────────────────────────────────────┐
│                                         │
│         MySekai 区域规划器              │
│    我的世界 户外区域布局设计工具         │
│                                         │
│   ┌───────┐ ┌───────┐ ┌───────┐        │
│   │ Lv.1  │ │ Lv.2  │ │ Lv.3  │        │
│   │ 36×36 │ │ 36×36 │ │ 70×70 │        │
│   └───────┘ └───────┘ └───────┘        │
│   ┌───────┐ ┌───────┐                  │
│   │ Lv.4  │ │ Lv.5  │                  │
│   │ 90×90 │ │100×100│                  │
│   └───────┘ └───────┘                  │
│                                         │
│         选择区域等级开始编辑             │
│                                         │
└─────────────────────────────────────────┘
```

- Title: "MySekai 区域规划器" (`text-2xl font-semibold text-primary`)
- Subtitle: "我的世界 户外区域布局设计工具" (`text-sm text-muted`)
- Level cards: `w-32 h-24 rounded-lg bg-surface-raised border border-default hover:border-accent cursor-pointer`
- Level label: "Lv.{N}" (`text-lg font-semibold text-primary`)
- Grid size: "{W}×{H}" (`text-sm text-muted`)
- Prompt: "选择区域等级开始编辑" (`text-sm text-muted`)

---

## Copywriting Contract

All UI copy in Chinese (zh). Japanese available via i18next translation files.

| Element | Key | Chinese (zh) | Japanese (ja) |
|---------|-----|-------------|---------------|
| App title | `app.title` | MySekai 区域规划器 | MySekai エリアプランナー |
| App subtitle | `app.subtitle` | 我的世界 户外区域布局设计工具 | ワールド アウトドアエリア レイアウトツール |
| Welcome prompt | `welcome.prompt` | 选择区域等级开始编辑 | エリアレベルを選択して編集開始 |
| Empty grid | `editor.emptyGrid` | 从左侧目录选择家具开始布局 | 左のカタログから家具を選んで配置開始 |
| Search placeholder | `catalog.searchPlaceholder` | 搜索家具... | 家具を検索... |
| Remove blocked (mandatory) | `editor.removeMandatory` | 该物件为必要建筑，无法删除 | この建物は必須のため削除できません |

**Destructive action recovery:** Remove mode deletes items on single click without a confirmation dialog. The explicit recovery path is undo (`Ctrl+Z`), which supports at least 20 steps (GRID-09). This is intentional — confirmation dialogs would break the flow of rapid editing. Implementers must ensure the undo stack captures every delete action.
| Placement blocked | `editor.placementBlocked` | 此位置已被占用 | この場所は使用中です |
| Data load error | `error.dataLoad` | 家具数据加载失败，请刷新页面重试 | 家具データの読み込みに失敗しました。ページを更新してください |
| Undo tooltip | `toolbar.undo` | 撤销 (Ctrl+Z) | 元に戻す (Ctrl+Z) |
| Redo tooltip | `toolbar.redo` | 重做 (Ctrl+Y) | やり直す (Ctrl+Y) |
| Area level label | `status.areaLevel` | 区域等级 | エリアレベル |
| Item count label | `status.itemCount` | 已配置 | 配置済み |
| Zoom label | `status.zoom` | 缩放 | ズーム |

---

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `V` | Switch to Select/Move mode | Global |
| `B` | Switch to Stamp mode | Global |
| `X` | Switch to Remove mode | Global |
| `R` | Rotate 90° clockwise | Stamp mode / item selected |
| `Shift+R` | Rotate 90° counter-clockwise | Stamp mode / item selected |
| `1`-`9` | Activate hotbar slot | Global |
| `Delete` / `Backspace` | Remove selected item | Item selected (not mandatory) |
| `Tab` | Cycle selection on overlapping items | Item selected |
| `Arrow keys` | Nudge selected item 1 tile | Item selected |
| `Ctrl+Z` | Undo | Global |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo | Global |
| `Escape` | Deselect / cancel stamp | Any mode |

Hover catalog item + press `1`-`9` = assign to hotbar slot.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| npm (Radix UI) | @radix-ui/react-tooltip, @radix-ui/react-dropdown-menu | not required (official packages) |
| npm (TanStack) | @tanstack/react-virtual | not required (official package) |

No third-party shadcn registries. No safety gate reviews needed.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
