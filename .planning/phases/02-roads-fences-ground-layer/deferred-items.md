# Deferred Items — Phase 02

Items discovered during plan execution but out of scope for the current plan.
Tracked here so the verifier and future plans can pick them up.

## Pre-existing ESLint errors (unrelated to Plan 02-04)

Discovered while running `pnpm exec eslint src` during 02-04 verification. None of these touch 02-04's modified files — they all pre-date Wave 4 and are in files scoped to earlier plans. Logged per scope discipline (do not fix out-of-scope issues).

1. **src/components/canvas/GhostPreview.tsx:27** — `'_stageScale' is defined but never used` — unused prop kept for API consistency, should either be removed or referenced. Owner: Phase 01 or 02-03.

2. **src/components/toolbar/Toolbar.tsx:32** — `react-hooks/set-state-in-effect` — `setCanUndo` / `setCanRedo` called synchronously inside `useEffect`. Idiomatic fix is the "store prev props in state" pattern we used in `useFenceLineTool.ts`. Owner: Phase 01.

3. **src/hooks/useFixtureData.ts:50** — `'err' is defined but never used` — `catch (err)` without rethrow; should be `catch` or `catch (_err)`. Owner: Phase 01.

4. **src/stores/editorStore.ts:158** — `'_' is assigned a value but never used` — destructure with `_` discarded variable triggers unused-var rule. Owner: Phase 01.

5. **src/components/catalog/CatalogGrid.tsx:23** — `react-hooks/incompatible-library` warning (not error) — `useVirtualizer()` from TanStack Virtual returns non-memoizable functions; React Compiler skips optimization. Cosmetic, no action needed unless Virtual is replaced.

These do not block 02-04 merge (`pnpm test --run` and `pnpm exec tsc --noEmit` both pass clean). A follow-up plan in Phase 02 or 03 should sweep these.
