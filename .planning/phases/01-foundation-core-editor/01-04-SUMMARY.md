---
phase: 01-foundation-core-editor
plan: 04
subsystem: ui
tags: [react, tanstack-virtual, radix-tooltip, zustand, catalog, virtualization, cdn]

# Dependency graph
requires:
  - phase: 01-02
    provides: fixture data layer (fetchFixtures, filterOutdoorFixtures, searchFixtures, filterByGenre, getThumbnailUrl), editor store (setActiveFixture, assignHotbar), type definitions
  - phase: 01-03
    provides: EditorLayout shell (Toolbar, Hotbar, StatusBar), color utility (getFixtureColor)
provides:
  - Catalog sidebar with search, genre filter, and virtualized thumbnail grid
  - useFixtureData hook for fetching and caching fixture + genre data
  - CatalogItem with CDN thumbnails, dimension badges, Radix tooltips, hotbar assignment
  - CatalogGrid with TanStack Virtual row virtualization for ~1,126 items
  - Catalog filter pipeline unit tests (7 test cases)
affects: [01-05, 01-06, material-cost, blueprint-sharing]

# Tech tracking
tech-stack:
  added: [@tanstack/react-virtual (useVirtualizer), @radix-ui/react-tooltip (catalog tooltips)]
  patterns: [virtualized list with row-based 2-col grid, module-level fixture data caching via hook, composable search+filter pipeline]

key-files:
  created:
    - src/components/catalog/CatalogSidebar.tsx
    - src/components/catalog/CatalogSearch.tsx
    - src/components/catalog/CategoryFilter.tsx
    - src/components/catalog/CatalogGrid.tsx
    - src/components/catalog/CatalogItem.tsx
    - src/hooks/useFixtureData.ts
    - src/__tests__/catalogFilter.test.ts
  modified:
    - src/components/layout/EditorLayout.tsx

key-decisions:
  - "Tooltip.Provider placed inside CatalogGrid (not global) to scope delay settings"
  - "Hotbar assignment uses onKeyDown on focused CatalogItem with hover state tracking"
  - "CatalogGrid count badge placed inside scrollable area rather than fixed footer"

patterns-established:
  - "Virtualized catalog pattern: useVirtualizer with 2-col grid, estimateSize 152, overscan 5"
  - "Composable filter pipeline: searchFixtures then filterByGenre, order-independent"
  - "Fixture data hook pattern: parallel fetch with AbortController cleanup"

requirements-completed: [CATL-01, CATL-02, CATL-03, CATL-04]

# Metrics
duration: 6min
completed: 2026-04-09
---

# Phase 01 Plan 04: Catalog Sidebar Summary

**Virtualized catalog sidebar with CDN thumbnails, search by Japanese name, genre chip filter, dimension badges, Radix tooltips, and hotbar assignment via hover+number key**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-09T09:58:32Z
- **Completed:** 2026-04-09T10:04:58Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Catalog sidebar with search input, genre category chip bar, and virtualized thumbnail grid handling ~1,126 items
- CDN thumbnails from storage.sekai.best with fallback colored rectangles on error
- Dimension badge (WxD) on each thumbnail corner and Radix tooltip showing full name + dimensions on hover
- Hotbar assignment by hovering catalog item and pressing 1-9
- Sidebar collapses to w-12 icon strip and expands to w-72 full catalog
- 7 unit tests verifying search+filter pipeline composability and CDN URL construction

## Task Commits

Each task was committed atomically:

1. **Task 1: Fixture data hook, catalog infrastructure, and catalog filter unit test** - `d3763f0` (feat)
2. **Task 2: Virtualized thumbnail grid with CDN images, badges, tooltips, and hotbar assignment** - `48254ce` (feat)

## Files Created/Modified
- `src/hooks/useFixtureData.ts` - Hook fetching fixtures + genres in parallel, returns fixtureMap
- `src/components/catalog/CatalogSidebar.tsx` - Collapsible sidebar container with search/filter state
- `src/components/catalog/CatalogSearch.tsx` - Search input with lucide Search/X icons
- `src/components/catalog/CategoryFilter.tsx` - Horizontal scrollable genre chip bar
- `src/components/catalog/CatalogGrid.tsx` - TanStack Virtual 2-col grid with row virtualization
- `src/components/catalog/CatalogItem.tsx` - Thumbnail card with CDN image, badge, tooltip, hotbar binding
- `src/components/layout/EditorLayout.tsx` - Integrated CatalogSidebar with loading/error states
- `src/__tests__/catalogFilter.test.ts` - 7 test cases for search+filter pipeline

## Decisions Made
- Tooltip.Provider scoped to CatalogGrid rather than a global provider, keeping delay settings local to the catalog
- Hotbar assignment implemented via onKeyDown on focused CatalogItem with isHovered state tracking (prevents number keys from activating hotbar slots while hovering catalog items)
- Item count badge placed inside the scrollable container rather than as a fixed footer to avoid layout complexity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in `src/data/fixtures.ts` (unused FixtureMainGenre/FixtureSubGenre imports) cause `tsc -b` to fail. These are out of scope for this plan. Vite build succeeds since it skips strict type checking.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Catalog sidebar fully integrated into EditorLayout, ready for canvas interaction (Plan 05)
- useFixtureData hook provides fixtureMap for collision detection and item placement
- Hotbar assignment wired, ready for full keyboard workflow testing

## Self-Check: PASSED

All 8 files verified present. Both task commits (d3763f0, 48254ce) verified in git log.

---
*Phase: 01-foundation-core-editor*
*Completed: 2026-04-09*
