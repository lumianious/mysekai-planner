# Phase 3: Persistence & Sharing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 03-persistence-sharing
**Areas discussed:** Save slot design, URL sharing format, Import/export UX, Auto-save behavior

---

## Save Slot Design

| Option | Description | Selected |
|--------|-------------|----------|
| Single auto-save | One active design, auto-persisted. Matches Happy Island Designer. | ✓ |
| Multiple named blueprints | Save/name multiple designs and switch between them. | |
| Single + export/import files | One active design with file-based export/import backup. | |

**User's choice:** Single auto-save
**Notes:** None

---

## URL Sharing Format

| Option | Description | Selected |
|--------|-------------|----------|
| Placements + area level | placedItems, placedEdges, areaLevel. Excludes transient UI state. | ✓ |
| Placements only | Just items and edges, no area level. | |
| Full editor state | Everything including viewport, zoom, tool mode. | |

**User's choice:** Placements + area level
**Notes:** None

---

## Import/Export UX

| Option | Description | Selected |
|--------|-------------|----------|
| Replace with confirmation | Dialog: "This will replace your current design. Continue?" | ✓ |
| Replace silently | Just load the shared design. | |
| Open as preview first | Show shared design read-only, user clicks to adopt. | |

**User's choice:** Replace with confirmation
**Notes:** None

### Share Button

| Option | Description | Selected |
|--------|-------------|----------|
| Copy URL to clipboard | Button in toolbar, one-click, toast confirmation. | ✓ |
| Share dialog with URL | Opens dialog showing URL with copy button. | |
| You decide | Claude picks approach. | |

**User's choice:** Copy URL to clipboard
**Notes:** None

---

## Auto-Save Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Debounced on change | Save ~1s after last change + beforeunload. Auto-load on page open. | ✓ |
| On page unload only | Save when user leaves tab. Loses work on crash. | |
| Explicit save button | User clicks Save to persist. | |

**User's choice:** Debounced on change
**Notes:** None

---

## Claude's Discretion

- Zustand persist middleware vs manual localStorage
- URL hash vs query parameter
- Toast notification approach
- Debounce timing

## Deferred Ideas

None
