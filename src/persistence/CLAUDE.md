# src/persistence — L2 Module Doc

**Purpose:** URL-safe blueprint encoding + localStorage key constants for Phase 03 persistence & sharing.

## Files

| File | Role |
|------|------|
| `encodeBlueprint.ts` | Pure: slice -> `"v1.<compressed>"` string |
| `decodeBlueprint.ts` | Pure: string -> `DecodedBlueprint \| null`, never throws |
| `applyBlueprint.ts` | Side effect: `setState` on editorStore + clear temporal history |
| `storageKey.ts` | Constant `DESIGN_STORAGE_KEY = 'mysekai:design:v1'` |

## Contract

- Version prefix `v1.` is the PERS-05 "version byte" — plaintext, human-inspectable, lets decoder dispatch before decompression.
- **Tuple encoding (no field names):**
  - Item tuple `[fixtureId, x, y, packed]` where `packed = (rotation << 2) | (layer << 1) | isSystem` (4 bits).
  - Edge tuple `[fixtureId, x, y, orientation]` (`orientation`: 0=h, 1=v).
- **ID policy:** UUIDs are NOT serialized. They are regenerated on decode. High-entropy UUIDs are incompressible and consumed ~25KB in the 700-record worst-case. `applyBlueprint` clears `temporal` history, so id continuity is broken at the import boundary by design — nothing depends on ids surviving.
- `decodeBlueprint` returns `null` on any malformed input; never throws.
- `applyBlueprint` clears undo history (`temporal.clear()`) — users cannot undo across an import boundary.

## Invariants

- Encoded string matches `/^v\d+\.[A-Za-z0-9$\-+*]+$/` (lz-string URL-safe alphabet).
- Roundtrip preserves all `PlacedItem` and `PlacedEdge` fields except `id` (regenerated as fresh UUID).
- 200-item + 500-edge worst case stays **under 4000 chars** (Twitter budget; D-05). Measured: 3579 chars on 2026-04-21.

## Future migration

Bump `BLUEPRINT_VERSION` and keep the v1 decode path; add a dispatch branch in `decodeBlueprint` for older versions. Do not remove v1 — old shared URLs must remain readable.

## Consumers (Phase 03 roadmap)

- `editorStore` persist middleware — imports `DESIGN_STORAGE_KEY` (plan 03-02).
- `ShareButton` — imports `encodeBlueprint` (plan 03-03).
- `useImportFromURL` — imports `decodeBlueprint` + `applyBlueprint` (plan 03-03).
