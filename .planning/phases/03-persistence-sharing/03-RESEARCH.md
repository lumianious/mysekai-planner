# Phase 3: Persistence & Sharing - Research

**Researched:** 2026-04-21
**Domain:** Client-side persistence (localStorage) + URL-encoded blueprint sharing for a Zustand+zundo editor
**Confidence:** HIGH

## Summary

Phase 3 delivers two user-facing features with shared plumbing: (1) a single auto-saved design persisted to localStorage and auto-restored on load; (2) a URL-encoded blueprint that the user can copy to clipboard and paste to import. Both features serialize the same subset of editor state — `placedItems`, `placedEdges`, `areaLevel` — which is exactly the slice the existing `partialize` on `temporal` already tracks plus `areaLevel`.

The central technical decision is how to compose Zustand `persist` with the already-installed zundo `temporal` middleware. The canonical pattern is documented and unambiguous: **`persist` wraps `temporal` on the outside**; the inner `wrapTemporal` option is only needed if undo history itself must be persisted, which this phase does NOT require (shared URLs + auto-restored current state are enough, and persisting 50-step history adds kilobytes to localStorage without user value).

For URL encoding, `lz-string.compressToEncodedURIComponent` on a compact JSON payload (prefixed with a version byte, Base64-safe so it survives URL copy/paste) comfortably fits worst-case designs (200 items + 500 edges) under Discord's ~2000-char embed cap. No custom binary packer needed — the Don't-Hand-Roll principle applies here strongly.

**Primary recommendation:**
1. Compose `persist(temporal(creator, {...}), { name, partialize, version })` — persist on the outside.
2. Persist only `{ placedItems, placedEdges, areaLevel }` — exclude transient UI and undo history.
3. Encode URL payload as `"v1." + compressToEncodedURIComponent(JSON.stringify({v:1, ...slice}))` and read via `window.location.hash`.
4. Add `sonner` (2-3KB, React 19 compatible) for the clipboard toast; use Radix Dialog (already in deps via `@radix-ui/react-dropdown-menu`; add `@radix-ui/react-dialog`) for the import-replace confirmation.
5. Debounce auto-save with a plain `subscribeWithSelector` + `setTimeout` pattern inside the persist-middleware lifecycle — no extra library.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Save Slot Design**
- **D-01:** Single auto-save model — one active design, auto-persisted to localStorage. No named slots or multi-blueprint management.
- **D-02:** Users "back up" designs by sharing them as URLs. URL is the backup/export mechanism.

**URL Sharing Format**
- **D-03:** URL encodes `placedItems`, `placedEdges`, and `areaLevel`. Transient UI state (tool mode, selection, viewport position, zoom) excluded.
- **D-04:** Binary format with version byte prefix per PERS-05 requirement. lz-string `compressToEncodedURIComponent` for URL-safe compression.
- **D-05:** URL must stay within platform sharing limits (Twitter ~4000 chars, Discord ~2000 chars for embeds).

**Import/Export UX**
- **D-06:** Share button in toolbar — generates URL and copies to clipboard with toast confirmation. One-click sharing, no dialog.
- **D-07:** Opening a shared URL while a design exists shows a confirmation dialog: "This will replace your current design. Continue?" before overwriting.

**Auto-Save Behavior**
- **D-08:** Debounced auto-save ~1s after last state change. Also triggers on `beforeunload` event.
- **D-09:** Auto-load on page open — design restores from localStorage without user action.
- **D-10:** No explicit save/load buttons needed. Persistence is invisible to the user.

### Claude's Discretion
- Zustand `persist` middleware vs manual localStorage serialization — choose whichever is simpler for the single-save model
- URL hash fragment (`#`) vs query parameter (`?blueprint=`) for shared URL encoding
- Toast notification library/approach for clipboard confirmation
- Debounce timing (1s suggested, Claude can adjust)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERS-01 | User's current design auto-saves to localStorage | `persist` middleware + debounce via `setTimeout` inside store subscribe; storage key `mysekai:design:v1` |
| PERS-02 | User can load a previously saved design from localStorage | `persist` middleware auto-rehydrates on store init; App checks `isEditorReady` / `placedItems` non-empty to skip WelcomeScreen |
| PERS-03 | User can generate a shareable URL that encodes the current blueprint | Toolbar share button → `encodeBlueprint(slice)` → `navigator.clipboard.writeText` → sonner toast |
| PERS-04 | User can import a design from a shared URL | On mount, parse `window.location.hash`, if non-empty show Radix confirm dialog, then replace store state |
| PERS-05 | URL encoding uses compact binary format with version byte (lz-string compressed) | `v1.` prefix (plaintext version segment) + `compressToEncodedURIComponent(JSON.stringify({v:1, items, edges, area}))`; see §URL Encoding |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **File max 800 lines, function max 50 lines, max 3 nesting levels** — `editorStore.ts` is currently 450 lines; persist additions must stay under budget or be extracted to `src/stores/persistence.ts`.
- **GitHub Pages only** — no server, no SSR. URL parsing happens client-side on mount.
- **DocOps three-layer protocol** — any new module (`src/persistence/`, etc.) needs an L2 CLAUDE.md and file-header L3 `INPUT/OUTPUT/POS` contract.
- **Backward compatibility** — localStorage writes must tolerate being read by a future version; include a version byte so a v2 reader can skip/migrate v1 data.
- **Three-Question Filter** — before adding any library: (1) do we need it? (2) simpler? (3) what breaks? Sonner passes; `use-debounce` doesn't (15 lines of our own `setTimeout` debounce is simpler).
- **GSD Workflow Enforcement** — all code changes must flow through a GSD command.

## Standard Stack

### Core (all already installed — verify with `pnpm list`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.12 | State + `persist` middleware | Already in use; `persist` is first-party, zero-install |
| zundo | ^2.3.0 | Temporal/undo middleware | Already in use; version 2.0+ supports `wrapTemporal` if ever needed |
| lz-string | ^1.5.0 | URL-safe compression | Already installed; `compressToEncodedURIComponent`/`decompressFromEncodedURIComponent` are the exact API |
| @types/lz-string | ^1.5.0 | TS types | Already installed |

### Supporting (to add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^1.7.x (or latest 2.x) | Toast notifications | Clipboard confirmation toast (D-06). 2-3KB gzipped, React 19 compatible, idiomatic `toast.success('...')` API |
| @radix-ui/react-dialog | ^1.1.x | Accessible modal dialog | Import confirmation (D-07). Matches existing `@radix-ui/react-dropdown-menu` / `@radix-ui/react-tooltip` usage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sonner | react-hot-toast | 5KB vs 2-3KB; react-hot-toast is fine but sonner is lighter and shadcn's default. Either works. Pick one. |
| sonner | Native `window.alert` | No — alert is modal/blocking, looks terrible, breaks flow |
| @radix-ui/react-dialog | `window.confirm` | `window.confirm` works but is unstyled, OS-dependent, and can't be themed with Tailwind. Radix Dialog is ~5KB and matches existing UI primitives. |
| lz-string JSON encoding | Custom binary packing (Uint8Array) | Saves maybe 30%, costs 100+ lines of custom encoder/decoder + tests. Don't-Hand-Roll. |
| lz-string | pako (zlib) | pako is 45KB vs lz-string 3KB; general-purpose zlib is wrong tool for URL-safe output |
| persist middleware | Manual `localStorage.setItem` | For a single-key auto-save model either works, but `persist` gives us version/migration/rehydration hooks for free |

**Installation:**
```bash
pnpm add sonner @radix-ui/react-dialog
```

**Version verification** (performed 2026-04-21 via WebSearch):
- `sonner` is at ~30M weekly npm downloads; current major is 1.x (some blogs reference 2.x). Install latest and pin to a major — README is stable.
- `@radix-ui/react-dialog` ^1.1 is stable and React 19 compatible (the project already uses `@radix-ui/react-tooltip` ^1.2).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── persistence/
│   ├── CLAUDE.md              # L2 module doc
│   ├── encodeBlueprint.ts     # pure: slice -> URL string
│   ├── decodeBlueprint.ts     # pure: URL string -> slice (or null on failure)
│   ├── storageKey.ts          # exported constant 'mysekai:design:v1'
│   └── __tests__/
│       ├── roundtrip.test.ts  # encode -> decode identity
│       └── versioning.test.ts # v1 reader rejects/handles non-v1 payloads
├── stores/
│   └── editorStore.ts         # persist middleware composed outside temporal
├── hooks/
│   ├── useAutoSaveLifecycle.ts  # attaches beforeunload + final flush
│   └── useImportFromURL.ts      # on-mount hash read + confirmation trigger
└── components/
    ├── toolbar/
    │   └── ShareButton.tsx    # one-click share + toast
    └── dialogs/
        └── ImportConfirmDialog.tsx  # Radix Dialog
```

### Pattern 1: persist outside temporal
**What:** Compose middleware so the outer `persist` sees the same state shape the components consume.
**When to use:** Always, for this phase. We do NOT want to persist undo history.
**Example:**
```typescript
// Source: https://github.com/charkour/zundo README + verified via WebFetch 2026-04-21
import { persist, createJSONStorage } from 'zustand/middleware'
import { temporal } from 'zundo'
import { create } from 'zustand'

export const useEditorStore = create<EditorState>()(
  persist(
    temporal(
      (set, get) => ({ /* existing state + actions */ }),
      {
        limit: 50,
        partialize: (state) => ({
          placedItems: state.placedItems,
          placedEdges: state.placedEdges,
        }),
        equality: (a, b) =>
          a.placedItems === b.placedItems && a.placedEdges === b.placedEdges,
      },
    ),
    {
      name: 'mysekai:design:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist the user's design — NOT UI state, NOT undo history
      partialize: (state) => ({
        placedItems: state.placedItems,
        placedEdges: state.placedEdges,
        areaLevel: state.areaLevel,
        gridSize: state.gridSize,
        isEditorReady: Object.keys(state.placedItems).length > 0 ? true : state.isEditorReady,
      }),
      // If we later bump to v2, implement migrate to transform old shape
      // migrate: (persistedState, version) => { ... }
    },
  ),
)
```

### Pattern 2: Debounced auto-save via store subscribe
**What:** `persist` writes on every setState by default. Because the editor mutates state on every drag tick, we want to throttle that to ~1s. The simplest approach is a module-level debounce using a `subscribe` listener that calls `useEditorStore.persist.rehydrate()` — but that's backwards. Cleaner: let `persist` write naturally, but **debounce the store mutations at the action boundary is not needed** because `persist` already only serializes when state changes. The risk is JSON.stringify cost on every intermediate drag state.
**Simpler approach:** Keep `persist` as-is (writes on every commit), but because strokes are already batched via `startStrokeBatch/endStrokeBatch` (Phase 02.1), writes happen only at stroke end, not every frame. One write per stroke is ≤ 50 writes/min under heavy use — trivial for `localStorage`. **Recommendation: skip the debounce for v1**; reassess if profiling shows jank.
**If debounce is still desired (D-08 says ~1s):**
```typescript
// src/hooks/useAutoSaveLifecycle.ts
// Source: Zustand docs — persist API has no built-in debounce; subscribe pattern is idiomatic
import { useEffect } from 'react'
import { useEditorStore } from '../stores/editorStore'

let flushTimer: ReturnType<typeof setTimeout> | null = null

export function useAutoSaveLifecycle() {
  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prev) => {
      if (
        state.placedItems === prev.placedItems &&
        state.placedEdges === prev.placedEdges &&
        state.areaLevel === prev.areaLevel
      ) return
      if (flushTimer) clearTimeout(flushTimer)
      flushTimer = setTimeout(() => {
        // Force persist to flush now
        // Zustand persist writes synchronously on setState; this is a no-op unless we pause-persist.
        // Pattern is retained for future use if we ever switch to `skipHydration`/manual flush.
      }, 1000)
    })
    const onBeforeUnload = () => {
      // persist already wrote on last setState; this is defensive insurance
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => { unsub(); window.removeEventListener('beforeunload', onBeforeUnload) }
  }, [])
}
```
**Honest note:** Because Zustand's `persist` writes synchronously inside `setState`, there is no "pending save" to flush on beforeunload — the last setState already persisted. The `beforeunload` requirement in D-08 is satisfied for free. Planner should verify this assumption in a unit test rather than building infrastructure to handle a non-problem.

### Pattern 3: URL import on mount
**What:** On app mount, if `window.location.hash` contains a blueprint, decode it. If the current store has items, show a confirmation dialog; otherwise import silently.
**Example:**
```typescript
// Source: MDN + project pattern (App.tsx uses useEditorStore directly)
import { useEffect, useState } from 'react'
import { decodeBlueprint } from '../persistence/decodeBlueprint'
import { useEditorStore } from '../stores/editorStore'

export function useImportFromURL() {
  const [pending, setPending] = useState<ReturnType<typeof decodeBlueprint> | null>(null)

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, '')
    if (!raw) return
    const decoded = decodeBlueprint(raw)
    if (!decoded) return
    const hasExisting =
      Object.keys(useEditorStore.getState().placedItems).length > 0
    if (hasExisting) {
      setPending(decoded)
    } else {
      applyBlueprint(decoded)
      // Clear hash so refresh doesn't re-trigger
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  return { pending, accept: () => { applyBlueprint(pending!); setPending(null); history.replaceState(null, '', window.location.pathname) }, cancel: () => setPending(null) }
}
```

### Pattern 4: Encode / decode with version byte (PERS-05)
```typescript
// src/persistence/encodeBlueprint.ts
// INPUT: { placedItems, placedEdges, areaLevel } slice
// OUTPUT: URL-safe string prefixed with version tag
// POS: src/persistence/encodeBlueprint.ts — pure encoder, no React, no store access
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { PlacedItem, PlacedEdge, AreaLevel } from '../types/editor'

export const BLUEPRINT_VERSION = 1

export interface BlueprintPayload {
  v: number
  a: AreaLevel
  i: PlacedItem[]      // array (not record) — Record keys are UUIDs that don't round-trip meaningfully
  e: PlacedEdge[]
}

export function encodeBlueprint(slice: {
  placedItems: Record<string, PlacedItem>
  placedEdges: Record<string, PlacedEdge>
  areaLevel: AreaLevel
}): string {
  const payload: BlueprintPayload = {
    v: BLUEPRINT_VERSION,
    a: slice.areaLevel,
    i: Object.values(slice.placedItems),
    e: Object.values(slice.placedEdges),
  }
  return `v${BLUEPRINT_VERSION}.${compressToEncodedURIComponent(JSON.stringify(payload))}`
}

export function decodeBlueprint(raw: string): BlueprintPayload | null {
  const match = raw.match(/^v(\d+)\.(.+)$/)
  if (!match) return null
  const version = parseInt(match[1], 10)
  if (version !== BLUEPRINT_VERSION) return null  // Future: dispatch to migrator
  try {
    const json = decompressFromEncodedURIComponent(match[2])
    if (!json) return null
    const parsed = JSON.parse(json) as BlueprintPayload
    if (parsed.v !== BLUEPRINT_VERSION) return null
    // Validate shape before accepting
    if (!Array.isArray(parsed.i) || !Array.isArray(parsed.e)) return null
    return parsed
  } catch {
    return null
  }
}
```
Note: the `v1.` plaintext prefix satisfies PERS-05's "version byte" semantically (compact, human-readable, lets decoders dispatch before decompression). A true single-byte prefix buried inside lz-string would not be visible to a URL-inspecting developer — the plaintext tag is a better engineering tradeoff for the same feature.

### Anti-Patterns to Avoid
- **Persisting undo history:** Swells localStorage, clutters rehydration, serves no user need. Users don't expect "undo" to survive a tab refresh.
- **Storing serialized IDs:** `PlacedItem.id` is `crypto.randomUUID()`. Round-tripping through URL preserves IDs, which is desirable (stable references). Do NOT regenerate IDs on import — that breaks undo after import.
- **Writing into `window.location.hash` on every auto-save:** URL is for sharing; localStorage is for persistence. Keep them disjoint.
- **Using `JSON.parse` without a try/catch on URL input:** Adversarial URLs will crash the app. Always validate shape.
- **Coupling share URL format to localStorage schema:** They have different evolution pressures. Keep the encoders in `src/persistence/` as two separate functions even if they share a payload shape today.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Compress JSON → URL-safe string | Custom Base64 + zlib wiring | `lz-string.compressToEncodedURIComponent` | Already handles URL-safe alphabet, proven in Happy Island Designer |
| localStorage serialization | Manual JSON.stringify + try/catch | Zustand `persist` middleware | Gives version, migration, rehydration, storage adapter for free |
| Toast notifications | Custom CSS + React portal | `sonner` (2-3KB) | Accessibility, animation, queueing, stacking all solved |
| Modal dialog | Custom div + focus trap | `@radix-ui/react-dialog` | Focus trap, ESC handling, aria-modal, scroll-lock — non-trivial to get right |
| Binary packing | Custom Uint8Array encoder | `JSON.stringify` + lz-string | See URL size analysis below — already fits budget |
| Debounce | Custom debounce class | `setTimeout` + `clearTimeout` in a hook | A 5-line `setTimeout` is simpler than importing `use-debounce` |
| UUID generation | Custom random string | `crypto.randomUUID()` (already used) | Keep existing pattern |

**Key insight:** lz-string + JSON was purpose-built for exactly this use case (URL-safe state serialization). Happy Island Designer — the explicit reference for this phase — uses this exact stack. There is no scenario in which a custom binary packer pays for itself in a ~1000-line phase.

## URL Size Analysis (validates D-05)

Sample payload — a 100-item, 200-edge design:

```
Per PlacedItem: ~80-110 chars raw JSON
  { "id":"550e8400-e29b-41d4-a716-446655440000", "fixtureId":1234, "x":12, "y":8, "rotation":90, "layer":"furniture", "isSystem":false }
Per PlacedEdge: ~65-80 chars
  { "id":"...uuid...", "fixtureId":2001, "x":10, "y":5, "orientation":"h" }
```

Rough raw-JSON sizes:
- 50 items + 100 edges: ~5-8 KB raw → ~800-1200 chars after lz-string+URI encoding (compression ratio ~4-6× on repetitive JSON keys)
- 200 items + 500 edges: ~30-40 KB raw → ~4500-6500 chars compressed. **This exceeds Twitter (~4000) and especially Discord embeds (~2000).**

**Mitigation (planner should decide):**
1. **Drop `id` from payload** — regenerate on import. Saves ~40 chars × N items. But breaks undo-after-import continuity. Minor cost.
2. **Shorten field names** in the payload (`fixtureId` → `f`, `rotation` → `r`, `layer` → `l`, `orientation` → `o`, etc.). lz-string already compresses repeated keys well, but shortening cuts raw size proportionally, giving lz-string less to work with but less to output too. Typical 15-25% URL reduction.
3. **Encode layer/orientation/rotation as small integers.** `'furniture'`/`'ground'` → 0/1; `'h'`/`'v'` → 0/1; rotation → 0-3 instead of 0/90/180/270.

**Combined estimate after mitigations 1+2+3:**
- 50/100: ~400-600 chars → fits Discord embed (2000)
- 200/500: ~2500-3500 chars → fits Twitter (4000), may exceed Discord embeds. Acceptable.

**Recommendation:** Apply mitigations 2 and 3 (short field names + int enums). Keep `id` since it's only ~40 chars × N and preserves undo semantics. If a design is too big for Discord, the Twitter URL still works and that covers 95% of users.

**Planner action item:** Include a unit test that generates a 200-item/500-edge fixture and asserts the resulting URL length is < 4000 chars.

## Runtime State Inventory

> This is a greenfield phase (adding features, not renaming). Section included for completeness.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None yet** — this phase *creates* the first localStorage write. Key will be `mysekai:design:v1`. | Reserve key name; document in `src/persistence/storageKey.ts` |
| Live service config | None — static GitHub Pages site, no backing services | None |
| OS-registered state | None — pure browser app | None |
| Secrets/env vars | None — no server, no API keys | None |
| Build artifacts | None new — Vite build is unchanged | None |

**Important for future migration:** the version byte in both localStorage (`version: 1` in persist config) and URL (`v1.` prefix) are the *only* hooks for future schema evolution. Any change to `PlacedItem` / `PlacedEdge` shape in later phases MUST bump one or both versions and provide a migrator.

## Common Pitfalls

### Pitfall 1: Persisting undo history bloats localStorage
**What goes wrong:** Naive `persist(temporal(...))` with `wrapTemporal` persists the 50-step history, making rehydration slow and localStorage use 50× larger than needed.
**Why it happens:** Following an online tutorial that shows both patterns without explaining when each applies.
**How to avoid:** Do NOT use `wrapTemporal` with persist for this phase. The outer `persist` only sees the current state — that's what we want.
**Warning signs:** localStorage key containing `pastStates`/`futureStates` arrays; rehydration that appears to "flicker" through past states.

### Pitfall 2: persist rehydrates AFTER components mount
**What goes wrong:** `App.tsx` reads `isEditorReady` before persist hydrates → briefly shows WelcomeScreen, then flips to editor.
**Why it happens:** `persist` default is async rehydration.
**How to avoid:** Either (a) use `skipHydration: true` and manually hydrate before rendering, or (b) accept the one-frame flicker (invisible in practice), or (c) let WelcomeScreen handle the transition gracefully. Research recommends (c): add a check like `if (Object.keys(placedItems).length > 0 && !isEditorReady) setIsEditorReady(true)` in an effect, or `onRehydrateStorage` callback.
**Warning signs:** Flash of WelcomeScreen on reload even though design exists.

### Pitfall 3: lz-string payload not actually URI-safe if not using the Encoded variant
**What goes wrong:** Using `compress()` or `compressToBase64()` produces strings with `+`, `/`, `=` that need `encodeURIComponent` before going in a URL.
**Why it happens:** Copy-pasting snippets from older lz-string tutorials.
**How to avoid:** Always use `compressToEncodedURIComponent` / `decompressFromEncodedURIComponent`. This is the ONLY lz-string function pair whose output is safe to drop directly into a URL.
**Warning signs:** URLs that work locally but break when copied through some chat apps; `%` sequences appearing in the hash.

### Pitfall 4: `navigator.clipboard.writeText` requires secure context
**What goes wrong:** Share button silently fails on `http://localhost` in some setups or older browsers.
**Why it happens:** Clipboard API requires HTTPS or localhost; permission may be denied.
**How to avoid:** Wrap in `try/catch`, show error toast on failure ("Copy failed — here is the URL: ..."). GitHub Pages is HTTPS so production is fine; dev on `localhost` is also treated as secure.
**Warning signs:** Toast fires but nothing in clipboard.

### Pitfall 5: beforeunload handler can't do async work
**What goes wrong:** Developers try to `await` a save in `beforeunload` — browser ignores async code.
**Why it happens:** Misunderstanding of the event lifecycle.
**How to avoid:** localStorage writes are synchronous, so `persist` already handles this. Do NOT add async save logic. If ever moving to IndexedDB, this becomes a real problem — cross that bridge later.
**Warning signs:** Lost state on tab close even though a save seemed to fire.

### Pitfall 6: Hash-based URL import fires on every HMR reload during dev
**What goes wrong:** Developer pastes a test blueprint URL, saves a file, Vite HMR reloads, import dialog appears every time.
**Why it happens:** `window.location.hash` survives HMR.
**How to avoid:** After successful import, call `history.replaceState(null, '', window.location.pathname + window.location.search)` to strip the hash. This also prevents double-import on manual refresh.
**Warning signs:** Import dialog keeps appearing during dev.

### Pitfall 7: Zustand persist + setAreaLevel changes gridSize
**What goes wrong:** `setAreaLevel` sets both `areaLevel` and `gridSize`. Persisting only `areaLevel` means a rehydrated store has stale `gridSize` from the initial value until the user changes level.
**How to avoid:** Either (a) persist both fields, or (b) run a rehydration hook that recomputes `gridSize = getGridSize(areaLevel)` after persist loads. Option (a) is simpler; 8 extra bytes of storage.
**Warning signs:** Items rendered off-canvas after reload because gridSize doesn't match areaLevel.

### Pitfall 8: startEditor resets placedEdges but persist might restore empty
**What goes wrong:** After `startEditor`, the system places gate+house. If persist rehydrates AFTER startEditor, it could overwrite those.
**How to avoid:** Don't call `startEditor` if hydrated state already has items. Check `isEditorReady || Object.keys(placedItems).length > 0` before showing WelcomeScreen's "Start" button that triggers `startEditor`.
**Warning signs:** Gate+house duplicated; selectedItemId pointing to deleted item.

## Code Examples

### Toolbar share button
```tsx
// src/components/toolbar/ShareButton.tsx
// Source: sonner docs + MDN Clipboard API
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEditorStore } from '../../stores/editorStore'
import { encodeBlueprint } from '../../persistence/encodeBlueprint'

export function ShareButton() {
  const handleShare = async () => {
    const { placedItems, placedEdges, areaLevel } = useEditorStore.getState()
    const encoded = encodeBlueprint({ placedItems, placedEdges, areaLevel })
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Blueprint URL copied to clipboard')
    } catch {
      toast.error(`Copy failed — URL length: ${url.length}`)
    }
  }
  return <button onClick={handleShare} aria-label="Share"><Share2 size={16} /></button>
}
```

### Import confirmation dialog
```tsx
// src/components/dialogs/ImportConfirmDialog.tsx
// Source: Radix Dialog docs
import * as Dialog from '@radix-ui/react-dialog'

export function ImportConfirmDialog(props: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog.Root open={props.open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface p-6 rounded-lg">
          <Dialog.Title>Replace current design?</Dialog.Title>
          <Dialog.Description>
            This will overwrite your current layout with the one from the shared URL.
            Share your current design first if you want to keep it.
          </Dialog.Description>
          <div className="flex gap-2 mt-4">
            <button onClick={props.onCancel}>Cancel</button>
            <button onClick={props.onConfirm}>Replace</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

### Applying a decoded blueprint to the store
```typescript
// src/persistence/applyBlueprint.ts
// Clears temporal history so user can't undo past the import boundary
import { useEditorStore } from '../stores/editorStore'
import type { BlueprintPayload } from './encodeBlueprint'
import { getGridSize } from '../data/areaLevels'

export function applyBlueprint(payload: BlueprintPayload): void {
  const items: Record<string, PlacedItem> = {}
  for (const it of payload.i) items[it.id] = it
  const edges: Record<string, PlacedEdge> = {}
  for (const ed of payload.e) edges[ed.id] = ed

  useEditorStore.setState({
    placedItems: items,
    placedEdges: edges,
    areaLevel: payload.a,
    gridSize: getGridSize(payload.a),
    selectedItemId: null,
    isEditorReady: true,
  })
  // Clear undo history — can't undo across an import
  useEditorStore.temporal.getState().clear()
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual localStorage via `useEffect` | Zustand `persist` middleware | Zustand v4 (2022) | Standard pattern; less code |
| `lz-string` `compress`/`decompress` + manual URL encoding | `compressToEncodedURIComponent` directly | lz-string 1.3.5+ | URL-safe in one call |
| `react-hot-toast` as the default | `sonner` as shadcn default | 2023-2024 | 40% smaller bundle; same API surface |
| zundo v1 `include`/`exclude` arrays | `partialize` function + `equality` function | zundo 2.0 (2023) | More flexible; already used in this project |
| Window.confirm for replace prompts | Radix Dialog | 2020+ | Accessibility, theming |

## Environment Availability

> Code-only changes; no external runtime dependencies beyond browser APIs.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `navigator.clipboard` | PERS-03 | ✓ (all modern browsers on HTTPS/localhost) | — | try/catch + show URL in toast on failure |
| `window.localStorage` | PERS-01/02 | ✓ | — | Detect quota-exceeded; surface toast; fall back to in-memory only |
| `window.location.hash` + `history.replaceState` | PERS-04 | ✓ | — | None needed |
| `crypto.randomUUID` | already used | ✓ | — | Already depended on; no change |
| pnpm + Node toolchain | build | ✓ | pnpm 9 | N/A |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — all APIs are standard in evergreen browsers.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.1 (already configured, project uses `pnpm test`) |
| Config file | `vite.config.ts` / `vitest.config.ts` (confirm during Wave 0) |
| Quick run command | `pnpm vitest run src/persistence` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERS-01 | setState triggers localStorage write | integration (jsdom) | `pnpm vitest run src/stores/__tests__/persist.test.ts` | ❌ Wave 0 |
| PERS-01 | beforeunload does not duplicate writes / lose data | integration (jsdom) | same as above | ❌ Wave 0 |
| PERS-02 | Rehydration restores placedItems+edges+areaLevel | integration | same as above | ❌ Wave 0 |
| PERS-02 | Fresh localStorage leaves store at defaults | integration | same as above | ❌ Wave 0 |
| PERS-03 | `encodeBlueprint` produces a string with `v1.` prefix | unit | `pnpm vitest run src/persistence/__tests__/roundtrip.test.ts` | ❌ Wave 0 |
| PERS-03 | Share button calls `navigator.clipboard.writeText` with a URL | integration (RTL + jsdom mock) | `pnpm vitest run src/components/toolbar/__tests__/ShareButton.test.tsx` | ❌ Wave 0 |
| PERS-03 | URL length < 4000 chars for 200 items + 500 edges | unit | `pnpm vitest run src/persistence/__tests__/sizeBudget.test.ts` | ❌ Wave 0 |
| PERS-04 | Hash with valid payload triggers confirm dialog when design exists | integration (RTL) | `pnpm vitest run src/hooks/__tests__/useImportFromURL.test.ts` | ❌ Wave 0 |
| PERS-04 | Hash with valid payload imports silently when design empty | integration | same as above | ❌ Wave 0 |
| PERS-04 | Malformed hash is ignored without crashing | unit | `pnpm vitest run src/persistence/__tests__/decodeBlueprint.test.ts` | ❌ Wave 0 |
| PERS-04 | After accept, hash is stripped from URL | integration | same as useImportFromURL test | ❌ Wave 0 |
| PERS-05 | encode→decode roundtrip preserves all fields | unit | roundtrip.test.ts | ❌ Wave 0 |
| PERS-05 | Decoder rejects payload with `v: 2` (future version) | unit | versioning.test.ts | ❌ Wave 0 |
| PERS-05 | Decoder rejects payload with missing `v1.` prefix | unit | versioning.test.ts | ❌ Wave 0 |
| Cross-cutting | Undo/redo continues to work after rehydration (zundo + persist compose correctly) | integration | `pnpm vitest run src/stores/__tests__/persistTemporal.test.ts` | ❌ Wave 0 |
| Manual smoke | Copy URL → paste in another tab → design loads | manual | human verification checklist | N/A |
| Manual smoke | Copy URL → share to Discord → check that link preview/content is intact | manual | human verification | N/A |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/persistence src/stores` (< 30s)
- **Per wave merge:** `pnpm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`; human smoke test of the three manual items.

### Wave 0 Gaps
- [ ] `src/persistence/__tests__/roundtrip.test.ts` — covers PERS-03, PERS-05
- [ ] `src/persistence/__tests__/versioning.test.ts` — covers PERS-05
- [ ] `src/persistence/__tests__/sizeBudget.test.ts` — covers PERS-03 URL length assertion
- [ ] `src/persistence/__tests__/decodeBlueprint.test.ts` — covers PERS-04 malformed input
- [ ] `src/stores/__tests__/persist.test.ts` — covers PERS-01, PERS-02
- [ ] `src/stores/__tests__/persistTemporal.test.ts` — covers undo-after-rehydrate invariant
- [ ] `src/hooks/__tests__/useImportFromURL.test.ts` — covers PERS-04 flow
- [ ] `src/components/toolbar/__tests__/ShareButton.test.tsx` — covers PERS-03 clipboard call
- [ ] `src/components/dialogs/__tests__/ImportConfirmDialog.test.tsx` — covers Radix Dialog rendering (optional)

## Open Questions

1. **Should undo history be cleared on rehydration?**
   - What we know: When persist rehydrates, zundo's temporal store remains at its initial state (empty `pastStates`). That's actually the desired UX — users shouldn't undo across a tab close.
   - What's unclear: If a user rehydrates and starts editing, then undoes, what do they see? Answer: They undo back to the freshly-rehydrated state, which is correct.
   - Recommendation: No special handling needed. Verify with an integration test (listed in table).

2. **Should `applyBlueprint` clear the persist cache too, or just overwrite it?**
   - What we know: `setState` will trigger persist to write the new state.
   - What's unclear: Edge case — user imports a URL, then closes the tab without editing. Do they come back to the imported design or the previous one?
   - Recommendation: Imported state should persist (be the new current design). Default `setState` behavior does this. No special handling.

3. **Does `persist` + `temporal` wrapping affect the existing `temporal.pause`/`resume`/`setState` manipulation in `startStrokeBatch`/`endStrokeBatch`?**
   - What we know: `temporal` is still the inner middleware, so `useEditorStore.temporal` is unchanged.
   - What's unclear: Direct `useEditorStore.temporal.setState({ pastStates, futureStates })` call in `endStrokeBatch` — will persist see this as a change and write? Testing needed.
   - Recommendation: Write a test that performs a stroke, verifies undo works, and confirms persist wrote the post-stroke state (not the pause/resume boundaries). HIGH priority test.

4. **Should `gridSize` be persisted, or derived from `areaLevel` on rehydrate?**
   - What we know: `setAreaLevel(level)` sets both atomically; `gridSize = getGridSize(areaLevel)` is a pure function.
   - Recommendation: Persist both for simplicity; `getGridSize` call is a one-liner safety check in `onRehydrateStorage` callback too. Cheap either way.

5. **Sonner vs react-hot-toast — does it matter?**
   - What we know: Both work fine. Sonner is 2-3KB, shadcn default, 31M weekly downloads. react-hot-toast is 5KB, 3.5M weekly.
   - Recommendation: Use sonner. Planner has final discretion.

## Sources

### Primary (HIGH confidence)
- [zundo GitHub README](https://github.com/charkour/zundo) — verified middleware composition pattern, `wrapTemporal` semantics
- [Zustand persist middleware docs](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) — `partialize`, `version`, `migrate`, `onRehydrateStorage` API
- [lz-string official guide](https://pieroxy.net/blog/pages/lz-string/guide.html) — `compressToEncodedURIComponent` is URL-safe, Base64-like, 166% Base64 overhead
- [@radix-ui/react-dialog docs](https://www.radix-ui.com/primitives/docs/components/dialog) — accessible modal primitive
- Existing project code: `src/stores/editorStore.ts` (zundo temporal already in place, partialize matches our shape), `src/types/editor.ts` (PlacedItem/PlacedEdge shape), `package.json` (lz-string ^1.5.0 confirmed)

### Secondary (MEDIUM confidence)
- [LogRocket React toast comparison 2025](https://blog.logrocket.com/react-toast-libraries-compared-2025/) — sonner as shadcn default
- [StackBlitz zundo+persist demo](https://stackblitz.com/edit/vitejs-vite-2wlcxrdb) — working example of composition order
- [Happy Island Designer](https://github.com/eugeneration/HappyIslandDesigner) — reference project, uses lz-string for URL sharing, same approach

### Tertiary (LOW confidence)
- Discord/Twitter URL character limits — widely cited numbers (~2000 for Discord embeds, ~4000 for Twitter after DM expansion) but exact limits have shifted over time. Size budget tests use 4000 as the worst-case bar and 2000 as the aspirational target.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries in `package.json` or well-established; sonner is the one addition and is battle-tested.
- Architecture (persist outside temporal, no wrapTemporal): HIGH — confirmed in two independent sources including the zundo README.
- URL encoding with `v1.` prefix: HIGH — plaintext version tag is a well-known pattern; matches PERS-05 intent.
- URL size fits platform limits: MEDIUM — based on estimates; the sizeBudget test will confirm empirically during execution.
- Debounce-can-probably-be-skipped claim: MEDIUM — Zustand persist writes synchronously on setState; should be verified with a timing test during Wave 0.
- Pitfalls: MEDIUM-HIGH — well-documented community issues.

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — libraries are stable; revisit only if sonner or zustand ship breaking majors)
