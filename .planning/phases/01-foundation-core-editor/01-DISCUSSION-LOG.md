# Phase 1: Foundation & Core Editor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 01-foundation-core-editor
**Areas discussed:** Editor Layout, Catalog UX, Grid Appearance, Item Interaction

---

## Editor Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Left catalog, center canvas | Catalog sidebar left, canvas center, toolbar top. Classic editor pattern. | ✓ |
| Right catalog, center canvas | Canvas left/center, catalog right. | |
| Bottom catalog, full-width canvas | Full-width canvas, collapsible bottom drawer for catalog. | |

**User's choice:** Left catalog, center canvas
**Notes:** None

### Sidebar Style

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed width | Fixed ~280px sidebar. Simple, predictable. | |
| Resizable | Draggable divider to resize. | |
| Collapsible | Fixed width, collapsible to icon strip. | ✓ |

**User's choice:** Collapsible
**Notes:** Collapsed state shows icon strip (VS Code activity bar style)

### Toolbar Style

| Option | Description | Selected |
|--------|-------------|----------|
| Top bar | Fixed horizontal bar across the top. | ✓ |
| Floating on canvas | Repositionable floating toolbar. | |
| You decide | Claude picks. | |

**User's choice:** Top bar
**Notes:** None

---

## Catalog UX

### Item Display

| Option | Description | Selected |
|--------|-------------|----------|
| Thumbnail grid | Grid of CDN thumbnails, 2-3 columns, name below. | ✓ |
| Compact list | List with small thumbnails + name + dimensions. | |
| Switchable view | Toggle between grid and list. | |

**User's choice:** Thumbnail grid
**Notes:** None

### Category Filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Tab/chip bar | Horizontal scrollable category chips. | ✓ |
| Nested tree menu | Collapsible tree hierarchy. | |
| Dropdown selectors | Two dropdowns: Category + Sub-genre. | |

**User's choice:** Tab/chip bar
**Notes:** None

### Placement Method

| Option | Description | Selected |
|--------|-------------|----------|
| Click to select, click grid to place | Pick from catalog, click grid. Ghost preview follows cursor. | ✓ |
| Drag from catalog to grid | Direct drag thumbnail to grid. | |
| You decide | Claude picks. | |

**User's choice:** Click to select, click grid to place
**Notes:** User also requested stamp mode (keep placing until mode switch)

### Stamp Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Stamp mode | Keep placing until ESC or mode switch. | ✓ |
| Single place | Each click places one and deselects. | |
| You decide | Claude picks. | |

**User's choice:** Stamp mode
**Notes:** User raised need for hotbar/palette system for pixel art workflow — players draw pixel art using colored 1x1 furniture blocks and need fast switching.

### Hotbar

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom hotbar with number keys | Minecraft-style bar, 1-9 keys. | ✓ |
| Sidebar favorites section | Pinnable favorites at top of catalog. | |
| Both hotbar + favorites | Hotbar for session, favorites for persistence. | |

**User's choice:** Bottom hotbar with number keys
**Notes:** Assignment method: hover over catalog item and press 1-9 to assign to that slot (game-style skill bar UX).

### Dimension Badge

| Option | Description | Selected |
|--------|-------------|----------|
| Show as badge | Small WxD badge on thumbnail corner. | ✓ |
| Show on hover only | Tooltip on hover. | |
| Don't show in catalog | Only visible in ghost preview. | |

**User's choice:** Show as badge
**Notes:** None

### Virtualization

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, virtualize | Only render visible items. | ✓ |
| Lazy load only | Render all DOM, lazy-load images. | |
| You decide | Claude picks. | |

**User's choice:** Yes, virtualize
**Notes:** None

### Color Variants

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to v2 | VIS-02 is v2. Show each fixture once. | ✓ |
| Basic variant indicator | Show dot/badge but no selection. | |
| You decide | Claude picks. | |

**User's choice:** Defer to v2
**Notes:** None

### Item Detail

| Option | Description | Selected |
|--------|-------------|----------|
| Hover tooltip | Tooltip showing name, dimensions, category. | ✓ |
| Click popover | Popover card with details + Place button. | |
| No detail view | Minimal, thumbnail + name only. | |

**User's choice:** Hover tooltip
**Notes:** None

---

## Grid Appearance

### Background Style

| Option | Description | Selected |
|--------|-------------|----------|
| Light grid on neutral bg | Light gray/white background, subtle grid lines. | |
| Green grass texture | In-game grass-like background. | ✓ |
| Dark theme | Dark background, lighter grid lines. | |

**User's choice:** Green grass texture
**Notes:** User specified: use actual in-game asset, not a generic green. Extract the real grass texture from game assets early as a static image.

### Grid Lines

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle semi-transparent lines | Thin white/light lines at low opacity over grass. | ✓ |
| Toggle on/off | Visible by default, user can toggle. | |
| Dots at intersections only | Small dots at grid corners. | |

**User's choice:** Subtle semi-transparent lines
**Notes:** None

### Area Level Selector

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown in toolbar | Simple dropdown in toolbar. | |
| Welcome/start screen | Choose on start screen, changeable later. | ✓ |
| You decide | Claude picks. | |

**User's choice:** Welcome/start screen
**Notes:** None

### Zoom Range

**User's choice:** You decide
**Notes:** Claude's discretion, must accommodate 36x36 to 100x100 grids.

---

## Interaction Model (emerged from cross-area discussion)

### Layer Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Click selects top layer, Tab cycles | Click gets furniture first, Tab cycles to ground. | ✓ |
| Layer panel like Photoshop | Side panel with layer visibility/selection. | |
| Right-click context menu | Right-click shows list of items at position. | |

**User's choice:** Click selects top layer, Tab cycles
**Notes:** None

### Collision Rules

**User's choice:** Simple — no stacking, floor exempt. GRID-12 deferred.
**Notes:** User said "let's keep it simple, no stuff on top of fence, players can figure it out themselves."

### Tool Modes

**User's choice:** Select/Move + Stamp + Remove (three modes with toolbar toggle buttons)
**Notes:** User asked "isn't replace mode the same as stamp mode if we treat stamp as override?" — led to the overwrite toggle discussion.

### Stamp Override Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Replace existing item | Stamping removes whatever's there. | |
| Block if occupied | Ghost turns red, must remove first. | ✓ (default) |

**User's choice:** Block by default, with overwrite toggle
**Notes:** User wanted optional overwrite — "if 2x2 sofa is in place, we remove it and replace with 1x1 chair." Decided on toolbar toggle button + modifier key for one-off.

### Overwrite Toggle Activation

| Option | Description | Selected |
|--------|-------------|----------|
| Hold modifier key | Shift/Alt per-click override. | |
| Toolbar toggle button | Stays on until toggled off. | |
| Both | Modifier for one-off + toolbar for sustained. | ✓ |

**User's choice:** Both
**Notes:** Initially selected toolbar only, then corrected to "actually both."

### Drag Style (Select Mode)

| Option | Description | Selected |
|--------|-------------|----------|
| Direct drag | Click and drag item, snaps to grid. | ✓ |
| Pick up, then click to place | Two-step deliberate movement. | |
| Arrow keys only, no drag | Most precise but slowest. | |

**User's choice:** Direct drag
**Notes:** None

### Remove Mode Style

| Option | Description | Selected |
|--------|-------------|----------|
| Click to remove one | Each click removes one item. | ✓ |
| Paint-erase (drag to remove) | Hold and drag to erase sweep. | |
| Both (click or drag) | Click removes one, drag removes along path. | |

**User's choice:** Click to remove one
**Notes:** None

### Mandatory Fixtures

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-placed, movable, not removable | Gate + house always present, delete disabled. | ✓ |
| Auto-placed, removable with warning | Can remove with confirmation warning. | |
| You decide | Claude picks. | |

**User's choice:** Auto-placed, movable, not removable
**Notes:** Gate and house must appear in a valid MySekai — these are game constraints.

---

## Item Interaction

### Rotation

| Option | Description | Selected |
|--------|-------------|----------|
| R key to rotate 90° | R = CW, Shift+R = CCW. Both modes. | ✓ |
| Mouse scroll to rotate | Scroll wheel rotates. | |
| Corner handles | Drag rotation handle, snap to 90°. | |

**User's choice:** R key to rotate 90°
**Notes:** None

### Ghost Preview

| Option | Description | Selected |
|--------|-------------|----------|
| Semi-transparent with color coding | 50% opacity, green valid / red blocked. | ✓ |
| Outline only | Border/outline only. | |
| You decide | Claude picks. | |

**User's choice:** Semi-transparent with color coding
**Notes:** None

### Selection Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Blue border + handles | Blue highlight with corner/edge handles. | ✓ |
| Dashed outline | Marching ants animation. | |
| You decide | Claude picks. | |

**User's choice:** Blue border + handles
**Notes:** None

### Undo Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle flash on affected item | Brief highlight flash. | ✓ |
| No special feedback | Silent undo, user sees change. | |
| You decide | Claude picks. | |

**User's choice:** Subtle flash on affected item
**Notes:** None

---

## Claude's Discretion

- Zoom range (must work for 36x36 to 100x100 grids)
- Toolbar mode icon choices
- Collapsed sidebar icon choices
- Hotbar visual styling
- Undo/redo stack implementation (minimum 20 steps)

## Deferred Ideas

- GRID-12 put-target stacking (lamp on table) — players figure it out
- Color variants (VIS-02) — v2 requirement
- Paint-erase in remove mode — revisit if clearing large areas is painful
