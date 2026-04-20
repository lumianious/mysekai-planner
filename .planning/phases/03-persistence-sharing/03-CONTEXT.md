# Phase 3: Persistence & Sharing - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Save the user's current design to localStorage with auto-save, and enable sharing/importing blueprints via URL-encoded links. Single active design model — no multiple save slots.

</domain>

<decisions>
## Implementation Decisions

### Save Slot Design
- **D-01:** Single auto-save model — one active design, auto-persisted to localStorage. No named slots or multi-blueprint management.
- **D-02:** Users "back up" designs by sharing them as URLs. URL is the backup/export mechanism.

### URL Sharing Format
- **D-03:** URL encodes `placedItems`, `placedEdges`, and `areaLevel`. Transient UI state (tool mode, selection, viewport position, zoom) excluded.
- **D-04:** Binary format with version byte prefix per PERS-05 requirement. lz-string `compressToEncodedURIComponent` for URL-safe compression.
- **D-05:** URL must stay within platform sharing limits (Twitter ~4000 chars, Discord ~2000 chars for embeds).

### Import/Export UX
- **D-06:** Share button in toolbar — generates URL and copies to clipboard with toast confirmation. One-click sharing, no dialog.
- **D-07:** Opening a shared URL while a design exists shows a confirmation dialog: "This will replace your current design. Continue?" before overwriting.

### Auto-Save Behavior
- **D-08:** Debounced auto-save ~1s after last state change. Also triggers on `beforeunload` event.
- **D-09:** Auto-load on page open — design restores from localStorage without user action.
- **D-10:** No explicit save/load buttons needed. Persistence is invisible to the user.

### Claude's Discretion
- Zustand `persist` middleware vs manual localStorage serialization — choose whichever is simpler for the single-save model
- URL hash fragment (`#`) vs query parameter (`?blueprint=`) for shared URL encoding
- Toast notification library/approach for clipboard confirmation
- Debounce timing (1s suggested, Claude can adjust)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Schema
- `src/types/editor.ts` — PlacedItem, PlacedEdge, EditorState type definitions
- `src/stores/editorStore.ts` — Zustand store structure, all serializable state fields

### Tech Stack
- `CLAUDE.md` §Technology Stack > URL Sharing & Persistence — lz-string, localStorage, Zustand persist middleware decisions
- `CLAUDE.md` §Technology Stack > State Management — Zustand with zundo temporal middleware (must not break undo/redo)

### Requirements
- `.planning/REQUIREMENTS.md` PERS-01 through PERS-05 — acceptance criteria for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `editorStore.ts` — Zustand store already manages all editor state; `partialize` function already selects which fields to track (used by zundo)
- `lz-string` (`^1.5.0`) — already installed, ready to import
- `@types/lz-string` (`^1.5.0`) — types available

### Established Patterns
- Zustand `temporal` middleware wraps the store for undo/redo — persist middleware must compose with it correctly
- `partialize` function on the temporal middleware selects `placedItems` and `placedEdges` — URL serialization should use a similar selection
- State includes: `areaLevel`, `gridSize`, `placedItems`, `placedEdges`, `toolMode`, `activeFixtureId`, `selectedItemId`, `overwriteEnabled`, `previewRotation`

### Integration Points
- `Toolbar.tsx` — where share/copy-URL button would live
- `App.tsx` or router entry — where URL hash parsing and import dialog would trigger
- `editorStore.ts` — where persist middleware and serialization helpers would be added

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Happy Island Designer's URL sharing pattern is the reference model.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-persistence-sharing*
*Context gathered: 2026-04-20*
