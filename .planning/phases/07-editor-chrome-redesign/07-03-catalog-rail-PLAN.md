---
phase: 07-editor-chrome-redesign
plan: 03
type: execute
wave: 3
depends_on: [07-01, 07-02]
files_modified:
  - src/components/chrome/CatalogRail.tsx
  - src/components/catalog/CatalogSidebar.tsx
  - src/components/catalog/CategoryFilter.tsx
  - src/components/catalog/CatalogSearch.tsx
  - src/components/layout/EditorLayout.tsx
autonomous: true
requirements: [SC-2, SC-7]
must_haves:
  truths:
    - "Catalog has a 72px-wide cat-rail that is always visible (8 category buttons)"
    - "Catalog body collapses to 0 width and expands to 248px (72 cat-rail + 248 body = 320 total) controlled by catalogCollapsed"
    - "Clicking a category in the cat-rail sets activeCategory; clicking when collapsed also un-collapses"
    - "Catalog state (catalogCollapsed, activeCategory) persists across reloads via the persist middleware (added in plan 01)"
    - "Active category gets a 4×28px sky left-edge bar and sky-tinted icon background"
  artifacts:
    - path: "src/components/chrome/CatalogRail.tsx"
      provides: "outer catalog rail with collapse mechanic + 8 category buttons"
      min_lines: 40
    - path: "src/components/catalog/CatalogSidebar.tsx"
      provides: "re-skinned catalog body, no longer owns rail width"
  key_links:
    - from: "src/components/chrome/CatalogRail.tsx"
      to: "useEditorStore.activeCategory / setActiveCategory / catalogCollapsed / toggleCatalogCollapsed"
      via: "store hooks"
      pattern: "useEditorStore"
    - from: "src/components/layout/EditorLayout.tsx"
      to: "src/components/chrome/CatalogRail.tsx"
      via: "Slot B mount replaces CatalogSidebar"
      pattern: "<CatalogRail"
---

<objective>
Restructure the catalog so it is always at least 72px wide (the cat-rail with 8 category icons) and expands to 320px when not collapsed. Move category state from local React state into the global store (so it persists). Re-skin the catalog body per UI-SPEC §Color and §Border Radii. Mount the new `CatalogRail` in `data-chrome-slot="catalog"`.

Purpose: Cover SC-2 (rail-only collapsed 72px / full 320px, category-rail always visible) and contribute to SC-7 (visual treatment).
Output: Catalog with always-visible 72px rail, fold-out 248px body, persisted collapse + active category, sky-accent active state on the cat-rail.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md
@.planning/phases/07-editor-chrome-redesign/07-01-foundation-PLAN.md
@CLAUDE.md
@src/components/catalog/CatalogSidebar.tsx
@src/components/catalog/CategoryFilter.tsx
@src/components/catalog/CatalogSearch.tsx
@src/components/catalog/CatalogGrid.tsx
@src/components/layout/EditorLayout.tsx
@src/data/genres.ts

<interfaces>
From editorStore (after plan 01):
- `catalogCollapsed: boolean`, `activeCategory: string`, setters `toggleCatalogCollapsed`, `setActiveCategory`, `setCatalogCollapsed`

CatalogSidebar currently owns `collapsed` (local state) and `activeGenreId` (local state). We migrate these to the store. The 8 category keys in UI-SPEC are NOT the same as `mainGenres` (those come from sekai-master-db-diff). Per UI-SPEC §Component Inventory the 8 categories are fixed: all / display / canvas / rug / road / shelf / plant / block. Map these to filter logic via fixture.layoutType + getGroundSubtype.

Existing search/filter helpers in src/data/fixtures.ts:
- `searchFixtures(fixtures, query)`
- `filterByGenre(fixtures, genreId, subId)` — currently filters by `mainGenreId`
For Phase 7 we add a NEW filter: `filterByPhase7Category(fixtures, category)` — see Step 2 below.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Phase 7 category filter + create CatalogRail outer container</name>
  <read_first>
    - src/data/fixtures.ts (existing search/filter functions; add a new exported function)
    - src/types/editor.ts (Fixture shape — note `layoutType` and how `getGroundSubtype` returns 'road' | 'rug' | 'fence' | 'color-tile')
    - src/components/catalog/CategoryFilter.tsx (current chip-row — will be replaced by cat-rail)
    - .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md §Component Inventory → "Category icons", §Color reserved-for list, §Animations summary
    - src/components/layout/EditorLayout.tsx (slot B currently mounts CatalogSidebar)
  </read_first>
  <files>
    - src/data/fixtures.ts
    - src/components/chrome/CatalogRail.tsx
  </files>
  <action>
    Step 1 — In `src/data/fixtures.ts`, add and export:

      export type Phase7Category = 'all' | 'display' | 'canvas' | 'rug' | 'road' | 'shelf' | 'plant' | 'block'

      export function filterByPhase7Category(fixtures: Fixture[], category: Phase7Category): Fixture[] {
        if (category === 'all') return fixtures
        return fixtures.filter((f) => {
          const sub = getGroundSubtype(f) // 'road' | 'rug' | 'fence' | 'color-tile' | null
          if (category === 'road') return sub === 'road' || sub === 'color-tile'
          if (category === 'rug') return sub === 'rug'
          if (category === 'canvas') return f.layoutType === 'floor_appearance' || f.layoutType === 'wall_appearance'
          // Heuristic mappings — best-effort name match (game data has no shelf/plant/block top-level field)
          const name = (f.name ?? '').toLowerCase()
          if (category === 'plant') return /植|花|tree|plant|flower/.test(name) || /植|花/.test(f.name ?? '')
          if (category === 'shelf') return /棚|shelf|rack|display/.test(name) || /棚/.test(f.name ?? '')
          if (category === 'block') return /ブロック|block|cube/.test(name) || /ブロック/.test(f.name ?? '')
          if (category === 'display') return /ディスプレイ|display|sign|frame/.test(name) || /ディスプレイ/.test(f.name ?? '')
          return false
        })
      }

    (Imperfect heuristics are acceptable here — Phase 7 scope is the chrome layout, not perfect categorization. Note this in the L3 header comment so future devs know.)

    Step 2 — Create `src/components/chrome/CatalogRail.tsx`. Cat-rail is 72px wide, always visible. When `catalogCollapsed=false` it sits left of a 248px body that hosts the existing search + tile grid via the existing `CatalogSidebar` (re-skinned in task 2). Use these UI-SPEC values:

      - Outer container: width = `catalogCollapsed ? 72 : 320`, height 740, `transition: width 0.22s ease`.
      - Cat-rail (left 72px column): `background: linear-gradient(180deg, #ecdfb8, #e0cf9a)` (cat-rail tan band), `border-right: 2px solid var(--color-tan-edge)`, `box-shadow: inset -2px 0 0 rgba(255,255,255,.4)`, `border-radius: var(--radius-panel) 0 0 var(--radius-panel)` (22px on left corners only when body hidden — use 22px on all 4 corners when collapsed; when expanded keep left-rounded only).
      - Body (right 248px): `background: linear-gradient(180deg, #ffffff, #fbf6ea)` (panel gradient), `border-radius: 0 var(--radius-panel) var(--radius-panel) 0`, `box-shadow: var(--shadow-lg)`, `border: 1px solid var(--color-panel-edge)` on the right/top/bottom (left-edge fully covered by cat-rail).
      - Hamburger button at top of cat-rail: 36×36, lucide `Menu` icon size 18, `aria-label={catalogCollapsed ? '家具目録を展開' : '家具目録を折りたたむ'}`, opacity transition `0.18s`, on click → `useEditorStore.getState().toggleCatalogCollapsed()`.
      - 8 category buttons, in this exact order (per UI-SPEC §Component Inventory):

          | key       | label        | lucide       |
          | all       | 全部         | Grid3x3      |
          | display   | ディスプレイ | Image        |
          | canvas    | キャンバス   | Palette      |
          | rug       | ラグ         | Square       |
          | road      | 道           | Route        |
          | shelf     | 棚           | LibraryBig   |
          | plant     | 植物         | TreePine     |
          | block     | ブロック     | Box          |

      Each button: 60×52 (non-square per UI-SPEC §Spacing touch-target exceptions), centered icon (24×24) + label below (Micro tier: M PLUS Rounded 1c 800 10px, line-height 1.1, color `var(--color-ink-2)`).
      Active state: `position: relative` + `::before` pseudo (or absolute child div) `4×28px` sky bar at left edge (use `background: linear-gradient(180deg, #9bdcff, #69c8ff)`), icon background becomes a 36×36 rounded-tile with `background: rgba(105,200,255,.18)`, icon stroke uses `var(--color-sky-deep)`, label color stays ink.
      Hover state: `background: rgba(255,255,255,.4)`, `transform: translateY(-1px)`, `transition: transform .12s ease, background .12s ease`.
      Click handler: `setActiveCategory(key)`; if `catalogCollapsed === true` also call `setCatalogCollapsed(false)`.

      Body is rendered conditionally (only when `!catalogCollapsed`) and contains the existing `<CatalogSidebar fixtures={...} mainGenres={...} fixtureMap={...} />` BUT we no longer use its category chips or its outer w-72 wrapper — task 2 handles that.

    Skeleton:

      // ======== 目录外壳（Slot B） ========
      // INPUT: useEditorStore（catalogCollapsed, activeCategory）, fixtures, mainGenres, fixtureMap
      // OUTPUT: 72px 总是可见的分类轨 + 可折叠 248px 主体（搜索 + 网格）
      // POS: src/components/chrome/CatalogRail.tsx — Phase 7 目录壳

      import { Menu, Grid3x3, Image as ImageIcon, Palette, Square, Route, LibraryBig, TreePine, Box } from 'lucide-react'
      import { useEditorStore } from '../../stores/editorStore'
      import { CatalogSidebar } from '../catalog/CatalogSidebar'
      import type { Phase7Category } from '../../data/fixtures'
      import type { Fixture, FixtureMainGenre } from '../../types/editor'

      const CATEGORIES: Array<{ key: Phase7Category; label: string; Icon: React.ElementType }> = [
        { key: 'all',     label: '全部',         Icon: Grid3x3 },
        { key: 'display', label: 'ディスプレイ', Icon: ImageIcon },
        { key: 'canvas',  label: 'キャンバス',   Icon: Palette },
        { key: 'rug',     label: 'ラグ',         Icon: Square },
        { key: 'road',    label: '道',           Icon: Route },
        { key: 'shelf',   label: '棚',           Icon: LibraryBig },
        { key: 'plant',   label: '植物',         Icon: TreePine },
        { key: 'block',   label: 'ブロック',     Icon: Box },
      ]

      interface CatalogRailProps {
        fixtures: Fixture[]
        mainGenres: FixtureMainGenre[]
        fixtureMap: Map<number, Fixture>
      }

      export function CatalogRail({ fixtures, mainGenres, fixtureMap }: CatalogRailProps) {
        const collapsed = useEditorStore((s) => s.catalogCollapsed)
        const toggleCollapsed = useEditorStore((s) => s.toggleCatalogCollapsed)
        const activeCategory = useEditorStore((s) => s.activeCategory) as Phase7Category
        const setActiveCategory = useEditorStore((s) => s.setActiveCategory)
        const setCollapsed = useEditorStore((s) => s.setCatalogCollapsed)

        return (
          <div
            className="flex h-full overflow-hidden"
            style={{
              width: collapsed ? 72 : 320,
              height: 740,
              borderRadius: 'var(--radius-panel)',
              boxShadow: 'var(--shadow-lg)',
              transition: 'width 0.22s ease',
            }}
          >
            {/* Cat-rail (always 72px) */}
            <div
              className="flex flex-col items-center"
              style={{
                width: 72,
                background: 'linear-gradient(180deg, #ecdfb8, #e0cf9a)',
                borderRight: '2px solid rgba(120,90,30,.18)',
                boxShadow: 'inset -2px 0 0 rgba(255,255,255,.4)',
                paddingTop: 8,
                paddingBottom: 8,
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={toggleCollapsed}
                className="flex items-center justify-center"
                style={{ width: 36, height: 36, borderRadius: 'var(--radius-chip)', background: 'transparent', cursor: 'pointer' }}
                aria-label={collapsed ? '家具目録を展開' : '家具目録を折りたたむ'}
              >
                <Menu size={18} color="#1f3556" />
              </button>

              {CATEGORIES.map(({ key, label, Icon }) => {
                const active = activeCategory === key
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => {
                      setActiveCategory(key)
                      if (collapsed) setCollapsed(false)
                    }}
                    className="relative flex flex-col items-center justify-center"
                    style={{
                      width: 60,
                      height: 52,
                      borderRadius: 'var(--radius-chip)',
                      background: active ? 'transparent' : 'transparent',
                      cursor: 'pointer',
                      transition: 'transform .12s ease, background .12s ease',
                    }}
                    aria-pressed={active}
                  >
                    {active && (
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute',
                          left: -10,
                          top: 12,
                          width: 4,
                          height: 28,
                          background: 'linear-gradient(180deg, #9bdcff, #69c8ff)',
                          borderRadius: 2,
                        }}
                      />
                    )}
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-tile)',
                        background: active ? 'rgba(105,200,255,.18)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={20} color={active ? '#2ea8ee' : '#4f6a8e'} strokeWidth={active ? 2.4 : 2} />
                    </span>
                    <span
                      style={{
                        fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                        fontWeight: 800,
                        fontSize: 10,
                        lineHeight: 1.1,
                        color: '#1f3556',
                        marginTop: 2,
                      }}
                    >
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Body — only when expanded */}
            {!collapsed && (
              <div
                className="flex-1 flex flex-col"
                style={{
                  background: 'linear-gradient(180deg, #ffffff, #fbf6ea)',
                  borderTop: '1px solid rgba(60,80,140,.14)',
                  borderRight: '1px solid rgba(60,80,140,.14)',
                  borderBottom: '1px solid rgba(60,80,140,.14)',
                  borderTopRightRadius: 22,
                  borderBottomRightRadius: 22,
                  transition: 'opacity 0.18s ease',
                }}
              >
                <CatalogSidebar fixtures={fixtures} mainGenres={mainGenres} fixtureMap={fixtureMap} />
              </div>
            )}
          </div>
        )
      }
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -10 && grep -l "filterByPhase7Category" src/data/fixtures.ts && grep -l "全部" src/components/chrome/CatalogRail.tsx && grep -c "TreePine\\|LibraryBig\\|Grid3x3" src/components/chrome/CatalogRail.tsx</automated>
  </verify>
  <done>
    - `filterByPhase7Category` exists and exports `Phase7Category` union.
    - `CatalogRail.tsx` exists with 8 category buttons in correct order, hamburger toggle, sky-accent active state.
    - aria-labels match UI-SPEC contract for collapsed/expanded states.
    - `pnpm build` succeeds.
  </done>
  <acceptance_criteria>
    - `grep -E "export type Phase7Category" src/data/fixtures.ts` matches.
    - `grep -E "export function filterByPhase7Category" src/data/fixtures.ts` matches.
    - `src/components/chrome/CatalogRail.tsx` contains all 8 lucide icon imports: `Grid3x3`, `Image`, `Palette`, `Square`, `Route`, `LibraryBig`, `TreePine`, `Box`.
    - File contains all 8 Japanese labels: `全部`, `ディスプレイ`, `キャンバス`, `ラグ`, `道`, `棚`, `植物`, `ブロック`.
    - File contains `width: collapsed ? 72 : 320`.
    - File contains `aria-label={collapsed ? '家具目録を展開' : '家具目録を折りたたむ'}`.
    - File contains `transition: 'width 0.22s ease'` (matching UI-SPEC §Animations summary).
    - File contains the sky-accent left bar `width: 4` and `height: 28`.
    - `pnpm build` exit code 0.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Re-skin CatalogSidebar body + wire activeCategory + mount CatalogRail</name>
  <read_first>
    - src/components/catalog/CatalogSidebar.tsx (drop local `collapsed` and `activeGenreId` state)
    - src/components/catalog/CategoryFilter.tsx (chip row — REMOVE from sidebar; cat-rail owns categories now)
    - src/components/catalog/CatalogSearch.tsx (re-skin search input)
    - src/components/catalog/CatalogGrid.tsx (NO change to layout, only verify it works inside the new container)
    - .planning/phases/07-editor-chrome-redesign/07-UI-SPEC.md §Existing components touched — `CatalogSidebar.tsx`, §Color, §Border Radii, §Typography, §Copywriting Contract
    - src/components/layout/EditorLayout.tsx
  </read_first>
  <files>
    - src/components/catalog/CatalogSidebar.tsx
    - src/components/catalog/CatalogSearch.tsx
    - src/components/layout/EditorLayout.tsx
  </files>
  <action>
    Step 1 — Edit `src/components/catalog/CatalogSidebar.tsx`:

      a) Remove `useState` for `activeGenreId` and `collapsed` — they live in the store now.
      b) Read `activeCategory` from store (`useEditorStore((s) => s.activeCategory)` typed as `Phase7Category`).
      c) Replace the filtering line:
         OLD: `const filteredFixtures = filterByGenre(searchFixtures(fixtures, searchQuery), activeGenreId, null)`
         NEW: `const filteredFixtures = filterByPhase7Category(searchFixtures(fixtures, searchQuery), activeCategory)`
      d) Remove the entire collapsed-state branch (`if (collapsed) return ( ... ChevronsRight ... )`) — the rail handles collapse.
      e) Remove the title-row collapse button (`ChevronsLeft`) — collapse moves to the cat-rail hamburger.
      f) Remove the `<CategoryFilter>` block — cat-rail owns categories.
      g) Re-skin the visible structure to match UI-SPEC:
          - Header strip `家具目録` + count chip `133 件`:
              container `padding: 12px 16px` (note: 12 is exempt as a one-off in the original spec but per the strict 4-multiple rule use 8 16 — i.e. `padding: 8px 16px`, height 40), `background: linear-gradient(180deg, #9bdcff, #69c8ff)`, color `var(--color-ink-on-sky)`, font M PLUS Rounded 1c 800 16px (Display tier), `border-top-right-radius: var(--radius-panel)` so it rounds the top of the body.
              Count chip `133 件` (replace 133 with `filteredFixtures.length`): `padding: 4px 8px`, `background: rgba(255,255,255,.4)`, font M PLUS Rounded 1c 800 11px (Label tier), `border-radius: var(--radius-badge)` (6px).
          - Search input wrapper: `padding: 16px`, search input itself `height: 36`, `border-radius: var(--radius-search)` (18px), `background: #eaf6ff`, `border: 1px solid rgba(60,80,140,.14)`, font Nunito 700 13px, placeholder `家具を検索…`.
          - Tile grid container: `flex-1 overflow-hidden`, no padding (CatalogGrid already self-pads).
          - Empty state (when `filteredFixtures.length === 0`): show `該当する家具はありません` (M PLUS 800 13px, ink) + `検索語またはカテゴリを変更してみてください` (Nunito 700 11px, muted).

    Step 2 — Edit `src/components/catalog/CatalogSearch.tsx`:

      Update placeholder to `家具を検索…` (matching UI-SPEC §Copywriting). Apply tokens from Step 1 above (radius 18, light-blue bg). Keep the `value` / `onChange` props identical.

    Step 3 — Edit `src/components/layout/EditorLayout.tsx`:

      a) Replace the import: `CatalogSidebar` → `CatalogRail`. (Keep `CatalogSidebar` import inside `CatalogRail.tsx` only.)
      b) In slot B, swap the rendered component:
         OLD: `<CatalogSidebar fixtures={...} mainGenres={...} fixtureMap={...} />`
         NEW: `<CatalogRail fixtures={fixtures} mainGenres={mainGenres} fixtureMap={fixtureMap} />`
      c) Remove the slot's inline `width:` / `transition: 'width 0.22s ease'` style — the CatalogRail now owns its own width animation. Slot B becomes simply `style={{ top: 76, left: 16, height: 740 }}`.

      d) **Do NOT modify or remove the `data-chrome-slot="legacy-tools"` block** (the transitional `<Toolbar compact />` mount added by Plan 02). Plan 04 owns its deletion. Touch only slot B in this plan.

    Step 4 — Update L3 header in `CatalogSidebar.tsx` to reflect new responsibilities:
      - INPUT: fixtures, mainGenres, fixtureMap; activeCategory from store
      - OUTPUT: header + 搜索 + 缩略图网格（不含分类轨）
      - POS: src/components/catalog/CatalogSidebar.tsx — 目录主体（Phase 7 拆分后只负责搜索+网格）
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -10 && grep -c "filterByPhase7Category" src/components/catalog/CatalogSidebar.tsx && grep "<CatalogRail" src/components/layout/EditorLayout.tsx && grep "家具目録" src/components/catalog/CatalogSidebar.tsx && grep "家具を検索" src/components/catalog/CatalogSearch.tsx</automated>
  </verify>
  <done>
    - `CatalogSidebar.tsx` no longer renders CategoryFilter or its own collapse button.
    - `CatalogSidebar.tsx` reads `activeCategory` from the store and uses `filterByPhase7Category`.
    - `CatalogSearch.tsx` placeholder is `家具を検索…` and uses `border-radius: var(--radius-search)`.
    - `EditorLayout.tsx` mounts `<CatalogRail />` in slot B.
    - Search box still works; tiles still render.
    - `pnpm build` succeeds.
  </done>
  <acceptance_criteria>
    - `grep "filterByPhase7Category" src/components/catalog/CatalogSidebar.tsx` matches.
    - `grep "<CategoryFilter" src/components/catalog/CatalogSidebar.tsx` returns NO matches (chips row removed from this file).
    - `grep "ChevronsLeft\\|ChevronsRight" src/components/catalog/CatalogSidebar.tsx` returns NO matches (collapse button removed).
    - `grep "家具を検索" src/components/catalog/CatalogSearch.tsx` matches.
    - `grep "<CatalogRail" src/components/layout/EditorLayout.tsx` matches.
    - `grep "<CatalogSidebar" src/components/layout/EditorLayout.tsx` returns NO matches (sidebar mounted only inside CatalogRail).
    - `grep "該当する家具はありません" src/components/catalog/CatalogSidebar.tsx` matches.
    - `pnpm build` exit code 0.
  </acceptance_criteria>
</task>

</tasks>

<verification>
- App boots; catalog visible at top:76 left:16 with 72px tan rail + 248px white body.
- Click hamburger: body collapses (rail stays visible at 72px). Width transition is `.22s ease`.
- Click a category icon while collapsed: body expands AND that category becomes active.
- Reload page: collapsed state and active category persist (proving plan 01's persist whitelist works).
- Active category shows the 4×28px sky bar at the left edge of the button + sky-tinted icon background.
- Search still filters; clearing search restores the active-category filter.
</verification>

<success_criteria>
SC-2 fully satisfied (rail-only 72px collapsed / 320px expanded, category-rail always visible, persisted). SC-7 progresses (catalog visual treatment matches tokens).
</success_criteria>

<output>
After completion, create `.planning/phases/07-editor-chrome-redesign/07-03-SUMMARY.md`.
</output>
