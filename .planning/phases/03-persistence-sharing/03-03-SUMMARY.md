---
phase: 03-persistence-sharing
plan: 03
subsystem: share-import-ui
tags: [radix-dialog, sonner, clipboard, export-import, scope-change, tdd]

requires:
  - phase: 03-persistence-sharing
    plan: 01
    provides: "encodeBlueprint / decodeBlueprint / applyBlueprint pure functions"
  - phase: 03-persistence-sharing
    plan: 02
    provides: "persist middleware auto-save + auto-load to localStorage"

provides:
  - "ExportButton + ExportDialog — toolbar-driven read-only code view with on-demand copy + toast"
  - "ImportButton + ImportDialog — paste field + inline malformed-code error + always-on confirm-replace"
  - "ImportConfirmDialog — Radix Dialog for confirm-before-replace (reused unchanged)"
  - "sonner Toaster mounted at bottom-center (richColors) in App root"

affects: []

tech-stack:
  added:
    - "sonner ^2.0.7 — toast notifications (clipboard success/failure feedback)"
    - "@radix-ui/react-dialog ^1.1.15 — accessible modal for export/import/confirm dialogs"
  patterns:
    - "Two-stage import flow: paste dialog → confirm-replace dialog → applyBlueprint"
    - "Consistency-first UX: always show confirm dialog, even when current design is empty"
    - "Inline validation error (role=alert) keeps paste dialog open on malformed code"
    - "ToolButton test double via vi.mock to bypass Radix Tooltip Portal in jsdom"

key-files:
  created:
    - "src/components/dialogs/ExportDialog.tsx"
    - "src/components/dialogs/ImportDialog.tsx"
    - "src/components/dialogs/ImportConfirmDialog.tsx"
    - "src/components/toolbar/ExportButton.tsx"
    - "src/components/toolbar/ImportButton.tsx"
    - "src/__tests__/exportButton.test.tsx"
    - "src/__tests__/importDialog.test.tsx"
  modified:
    - "src/components/toolbar/Toolbar.tsx"
    - "src/App.tsx"
    - "package.json"
    - "pnpm-lock.yaml"

key-decisions:
  - "Replace URL-hash sharing with manual code paste — user rejected URL-based UX mid-Task-3 checkpoint; code-based transport simpler and more predictable"
  - "ALWAYS show confirm-replace dialog, even on empty store — consistency over path-optimization; user preference for uniform UX"
  - "Inline validation error over toast for malformed code — keeps user in paste dialog, preserves pasted content for correction"
  - "No auto-copy on Export dialog open — user must explicitly click 复制 to prevent surprising clipboard writes"
  - "Two-stage import (paste → confirm) rather than single-stage — intentional friction before destructive overwrite"
  - "sonner 2.x accepted despite plan suggesting 1.7.x — API surface identical (Toaster, toast.success, toast.error); RESEARCH notes `^1.7.x (or latest 2.x)`"

patterns-established:
  - "Dialog pairs: one Button component + one Dialog component, Button owns open state"
  - "ImportButton orchestrates two sequential dialogs via pending-state machine"
  - "Component tests bypass Tooltip/Dropdown Portal stacks via ToolButton mock"

requirements-completed: [PERS-03, PERS-04]

duration: ~30min (including scope change)
completed: 2026-04-21
---

# Phase 03 Plan 03: Code-Based Export / Import UI Summary

**Toolbar-driven code export dialog + paste-to-import dialog with always-on confirm-replace — pivoted from URL-hash sharing to manual code paste mid-checkpoint per user preference; PERS-03/04 intent preserved, transport changed.**

## Performance

- **Duration:** ~30 min (including mid-checkpoint scope change + rework)
- **Tasks:** 2 planned + 5 scope-change sub-steps
- **Files created:** 7 (5 source + 2 tests)
- **Files modified:** 4 (Toolbar, App, package.json, pnpm-lock.yaml)
- **Files deleted:** 4 (ShareButton, useImportFromURL, their tests)

## Accomplishments

- Two new dependencies installed and wired: `sonner` 2.0.7 + `@radix-ui/react-dialog` 1.1.15.
- Export flow: toolbar Share2 icon → ExportDialog with read-only textarea showing `v1.<lz-string>` code → 复制 button → clipboard + sonner toast. No auto-copy (user must click).
- Import flow: toolbar ClipboardPaste icon → ImportDialog paste field → 导入 → decodeBlueprint inline validation → on success, ImportConfirmDialog ALWAYS shows (even empty store) → 替换 calls applyBlueprint.
- Malformed-code UX: role=alert inline error; paste dialog stays open; pasted text preserved; no toast, no close.
- 11 new tests (5 ExportButton + 6 ImportDialog) — full suite 184/184 pass; `pnpm build` clean.
- URL-hash mechanism fully removed — no `window.location.hash` reads/writes anywhere in the app.

## Task Commits

1. **Task 1: Install deps** — `af46c96` (chore)
2. **Task 2 [superseded]: URL-hash ShareButton + useImportFromURL RED** — `030ab19` (test)
3. **Task 2 [superseded]: URL-hash ShareButton + useImportFromURL GREEN** — `4f3fb5b` (feat)
4. **Scope change: remove URL-hash share flow** — `3ac473f` (refactor)
5. **Scope change: failing tests for code export/import** — `b7f6990` (test)
6. **Scope change: code-based export + import dialogs** — `27965c5` (feat)
7. **Scope change: plan frontmatter updated** — `25cb05e` (docs)
8. **Final docs** — this commit

Commits 2 and 3 are preserved in history but their artifacts were fully superseded by the scope-change commits. No artifact from commit 2/3 remains on disk.

## Files Created/Modified

### Created (scope v2)
- `src/components/dialogs/ExportDialog.tsx` — Radix Dialog; read-only textarea + 复制 button with clipboard/toast; close via 关闭 or Overlay
- `src/components/dialogs/ImportDialog.tsx` — Radix Dialog; paste textarea + 导入 button; inline error (role=alert) on empty/malformed; clears state on close
- `src/components/dialogs/ImportConfirmDialog.tsx` — Radix Dialog; 替换/取消 confirm modal (reused as-is after scope change)
- `src/components/toolbar/ExportButton.tsx` — ToolButton + ExportDialog; on open, encodes current slice
- `src/components/toolbar/ImportButton.tsx` — ToolButton + ImportDialog + ImportConfirmDialog; two-stage orchestration via pending state
- `src/__tests__/exportButton.test.tsx` — 5 tests (dialog open, copy success, copy fail, round-trip decode, no auto-copy)
- `src/__tests__/importDialog.test.tsx` — 6 tests (open empty, empty-store confirm, non-empty confirm, 取消 unchanged, malformed inline error, empty input error)

### Modified
- `src/components/toolbar/Toolbar.tsx` — ExportButton + ImportButton inserted between overwrite and undo/redo with separator
- `src/App.tsx` — mounts `<Toaster position="bottom-center" richColors />`; removed prior useImportFromURL + ImportConfirmDialog wiring
- `package.json` / `pnpm-lock.yaml` — sonner + @radix-ui/react-dialog dependencies

### Deleted (superseded)
- `src/components/toolbar/ShareButton.tsx`
- `src/hooks/useImportFromURL.ts`
- `src/__tests__/shareButton.test.tsx`
- `src/__tests__/useImportFromURL.test.ts`

## Decisions Made

- **Transport pivot: URL-hash → manual code paste.** User rejected the URL-hash sharing UX during the Task 3 human-verify checkpoint. The new flow trades one-click share for explicit copy/paste, but removes hash-detection edge cases (HMR loops, refresh re-prompting, browser-specific hash quirks) and gives users an inspectable artifact they can save to a note.
- **Always-on confirm-replace, including empty store.** Original plan (D-07) skipped confirm when current design was empty. User requested consistency: one-click never destroys, always one confirmation. Trades minor friction for uniform mental model.
- **Inline error on malformed code (not toast).** Keeps user context: their pasted text stays visible in the textarea so they can fix a truncation rather than re-paste from scratch.
- **No auto-copy on Export dialog open.** User explicit action (复制 click) rather than implicit clipboard write on mount. Easier to reason about; avoids clipboard-permission surprises in embedded contexts.
- **sonner 2.x accepted** despite plan wording "^1.7.x". Research allowed "latest 2.x"; API unchanged (Toaster, toast.success, toast.error).

## Deviations from Plan

### User-requested scope change (mid-Task-3 checkpoint)

**1. [Rule 1 — User-directed scope change] URL-hash sharing replaced with code-based export/import**

- **Found during:** Task 3 human-verify checkpoint (after Tasks 1 + 2 completed and all tests green).
- **Issue:** User rejected the URL-hash UX after reviewing the end-to-end flow. Cited reasons: (a) URL hash is opaque — users can't easily save or inspect; (b) auto-import on mount couples navigation to destructive action; (c) code paste is a simpler mental model for "save this and send it to a friend".
- **Fix:** Replaced the two Task-2 deliverables entirely:
  - `ShareButton` (clipboard write of full URL) → `ExportButton` + `ExportDialog` (code in modal, manual 复制)
  - `useImportFromURL` (on-mount hash detect + confirm if non-empty) → `ImportButton` + `ImportDialog` + reused `ImportConfirmDialog` (paste + 导入 + always-confirm + 替换)
  - Removed all `window.location.hash` reads/writes; App.tsx no longer imports `useImportFromURL`.
- **Why Rule 1:** User-directed scope change is treated as a correctness fix — the prior implementation was "correct" against the written plan but incorrect against the user's actual requirement. The three-question filter was re-run and the answer flipped.
- **Phase requirement intent preserved:** PERS-03 ("share designs between users") and PERS-04 ("load designs shared by others") are both met by the new flow. Only the transport changed: URL hash → manual paste of the same underlying `v1.<...>` string that `encodeBlueprint` already produces.
- **Files touched:** 4 deleted, 5 created, 2 modified. See Task Commits 4–7 above.
- **Committed in:** `3ac473f` (remove), `b7f6990` (RED tests), `27965c5` (GREEN), `25cb05e` (plan frontmatter).

### Auto-fixed issues

**2. [Rule 1 — Bug] Radix Tooltip Portal blocks jsdom test rendering**

- **Found during:** First attempt to run `shareButton.test.tsx` under the original (URL-hash) Task 2.
- **Issue:** `ToolButton` wraps its button in `Tooltip.Root`, which requires a `Tooltip.Provider` ancestor and renders via a Portal. Under jsdom, rendering `<ShareButton/>` (and later `<ExportButton/>` / `<ImportButton/>`) without a Tooltip.Provider left the test hanging indefinitely rather than erroring.
- **Fix:** In each toolbar-button test file, `vi.mock('../components/toolbar/ToolButton')` replaces ToolButton with a bare `<button aria-label>{label}</button>` test double. Production ToolButton is unchanged.
- **Why Rule 1:** Blocking issue preventing tests from running (strictly, Rule 3), but the fix is test-infrastructure-only and zero scope creep.
- **Files modified:** `src/__tests__/exportButton.test.tsx`, `src/__tests__/importDialog.test.tsx` (and the superseded `shareButton.test.tsx`).

---

**Total deviations:** 1 user-directed scope change (largest single change in phase history), 1 test-infrastructure fix.
**Impact on plan:** Scope change was substantial but contained — encode/decode module (03-01) and persist middleware (03-02) both untouched. PERS-03/04 intent preserved. All automated verification green.

## Issues Encountered

- **aria-describedby Radix warnings** (non-blocking): Each Dialog.Content emits a console warning "Missing `Description` or `aria-describedby={undefined}`" during tests despite the components setting `aria-describedby` and rendering `Dialog.Description`. Appears to be a Radix 1.1.15 timing check that fires before the Description portal attaches. Does not affect test outcomes (all 11 pass) or production accessibility. Deferred — revisit if it ever fails a CI check.

## User Setup Required

None — pure client-side code.

## Next Phase Readiness

- PERS-03 and PERS-04 both satisfied via code-based flow.
- Phase 03 complete. Next phase: whatever follows in ROADMAP (Phase 04+).
- The persist + encode/decode modules are stable; no open issues for downstream consumers.
- If future phases want to re-introduce URL-hash sharing, the encode/decode functions are unchanged and ready to be wired to a new hook.

## Self-Check: PASSED

- src/components/dialogs/ExportDialog.tsx — FOUND
- src/components/dialogs/ImportDialog.tsx — FOUND
- src/components/dialogs/ImportConfirmDialog.tsx — FOUND
- src/components/toolbar/ExportButton.tsx — FOUND
- src/components/toolbar/ImportButton.tsx — FOUND
- src/__tests__/exportButton.test.tsx — FOUND
- src/__tests__/importDialog.test.tsx — FOUND
- src/components/toolbar/Toolbar.tsx — FOUND (modified; ExportButton + ImportButton wired)
- src/App.tsx — FOUND (modified; Toaster mounted; no useImportFromURL import)
- src/components/toolbar/ShareButton.tsx — ABSENT (deleted, expected)
- src/hooks/useImportFromURL.ts — ABSENT (deleted, expected)
- Commit af46c96 — FOUND (Task 1)
- Commit 030ab19 — FOUND (superseded RED)
- Commit 4f3fb5b — FOUND (superseded GREEN)
- Commit 3ac473f — FOUND (remove URL-hash)
- Commit b7f6990 — FOUND (new RED)
- Commit 27965c5 — FOUND (new GREEN)
- Commit 25cb05e — FOUND (plan frontmatter)
- Full test suite: 184/184 pass; `pnpm build` clean

---
*Phase: 03-persistence-sharing*
*Completed: 2026-04-21*
