<!-- GSD:project-start source:PROJECT.md -->
## Project

**MySekai Planner**

A top-down 2D grid editor for Project Sekai's MySekai outdoor area — similar to Happy Island Designer for Animal Crossing. Players place furniture, roads, fences, and decorations on an accurate in-game grid to plan their sekai layout. Includes material cost calculation, inventory tracking, and URL-based blueprint sharing. Built for personal use first, shareable with the broader Project Sekai community. Hosted on GitHub Pages.

**Core Value:** Users can visually plan their MySekai outdoor layout and know exactly what materials they need to build it.

### Constraints

- **Hosting:** GitHub Pages (static files only) — no server-side logic, no database
- **Data pipeline:** Fixture metadata from Sekai-World GitHub data; sprites generated via sssekai + Blender offline pipeline
- **Grid accuracy:** Must match actual in-game MySekai outdoor area grid dimensions and tile sizes
- **Language:** UI in Chinese + Japanese; game item names in Japanese only (matching in-game data)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | ^19.2.4 | UI framework | Declarative component model, massive ecosystem, react-konva integration for canvas. React 19 stable since Dec 2024, well-proven. | HIGH |
| TypeScript | ^5.7 | Type safety | Grid coordinates, furniture data schemas, material cost calculations all benefit heavily from strong typing. Non-negotiable for editor complexity. | HIGH |
| Vite | ^8.0 | Build tool | Vite 8 uses Rolldown (faster than esbuild+Rollup). Native TypeScript support, instant HMR, trivial GitHub Pages deployment via `vite build`. | HIGH |
### Canvas Rendering
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Konva | ^10.2.3 | 2D canvas engine | Built-in drag-and-drop, hit detection, layering, groups, transformations. Exactly the primitives a grid editor needs. Higher-level than PixiJS (less boilerplate for interactive editing). | HIGH |
| react-konva | ^19.2.3 | React bindings for Konva | Declarative canvas rendering that integrates with React's component model. Furniture items become `<Rect>`, `<Image>`, `<Group>` components. Matches React 19. | HIGH |
- **vs PixiJS:** PixiJS is WebGL-first, optimized for high-FPS game rendering with thousands of sprites. MySekai Planner is a design tool with ~100-300 objects max, where user interaction (drag, snap, rotate, select) matters more than raw render throughput. Konva's built-in drag-and-drop, event system, and snapping are exactly what we need without building them from scratch.
- **vs raw Canvas 2D API:** Too low-level. We'd reimplement hit testing, object management, layering, and event bubbling. Happy Island Designer used Paper.js (a canvas abstraction) for the same reason.
- **vs SVG:** SVG DOM nodes become performance bottlenecks at 200+ furniture items. Canvas avoids DOM overhead entirely.
- **vs Paper.js:** Paper.js (used by Happy Island Designer) has no React integration and a smaller ecosystem. Konva + react-konva is the modern equivalent with better DX.
### State Management
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | ^5.0.12 | Global state | Single store for editor state (placed items, selected tool, grid settings, inventory). Simple API, tiny bundle (~1KB), built-in middleware for persistence and undo. Centralized store fits an editor where actions affect multiple UI areas simultaneously. | HIGH |
- **vs Jotai:** Jotai's atomic model is better for apps with many independent state pieces. An editor has deeply interconnected state (placing furniture updates grid, material costs, inventory simultaneously). Zustand's single store with selectors is cleaner for this pattern.
- **vs Redux Toolkit:** Heavier, more boilerplate. Zustand provides the same centralized store pattern with 1/10th the ceremony.
- **vs React Context:** Performance issues with frequent updates (every drag event). Zustand's selector-based subscriptions avoid cascading re-renders.
### Data Handling
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| fetch (native) | — | API calls | sekai-master-db-diff JSON files are static GitHub raw URLs. No need for axios or SWR — simple fetch + cache. | HIGH |
| lz-string | ^1.5.0 | URL compression | Proven library for compressing JSON into URL-safe strings. Happy Island Designer uses it for the same purpose. `compressToEncodedURIComponent` produces URL-safe output directly. | HIGH |
- `mysekaiFixtures.json` — Furniture catalog (id, name, gridSize {width, depth, height}, type, placement rules)
- `mysekaiBlueprints.json` — Crafting recipes (links fixtures to craftable items)
- `mysekaiBlueprintMysekaiMaterialCosts.json` — Junction table: blueprint -> material + quantity
- `mysekaiMaterials.json` — Material catalog (id, name, type, rarity)
- `mysekaiFixtureLabels.json`, `mysekaiFixtureTags.json` — Search/filter metadata
### URL Sharing & Persistence
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| lz-string | ^1.5.0 | Blueprint encoding | Compress layout JSON -> URL hash. `compressToEncodedURIComponent` / `decompressFromEncodedURIComponent`. Proven pattern from Happy Island Designer. | HIGH |
| localStorage (native) | — | Inventory persistence | Store user's material inventory and saved layouts. Only viable persistence for static hosting. | HIGH |
| Zustand persist middleware | — | State persistence | Zustand's built-in `persist` middleware handles localStorage serialization/deserialization automatically. | HIGH |
### Internationalization
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| i18next | ^26.0.3 | i18n core | Industry standard, supports CJK languages natively, namespace-based translation files, interpolation, pluralization. | HIGH |
| react-i18next | ^17.0.2 | React bindings | `useTranslation` hook for components. Lazy-loaded language bundles to minimize initial payload. | HIGH |
- UI strings: Chinese (`zh`) + Japanese (`ja`) translation files
- Furniture/material names: Japanese only (from game data, `name` field in mysekaiFixtures.json)
- No English needed (per project scope)
### UI Components & Styling
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | ^4.2.2 | Utility-first styling | Fast prototyping, consistent design tokens, zero-runtime CSS. v4 auto-detects content, no config needed. Vite 8 has native PostCSS integration. | HIGH |
| Headless UI or Radix UI | latest | Accessible primitives | Dropdowns, dialogs, tooltips for furniture catalog and settings panels. Unstyled = full Tailwind compatibility. | MEDIUM |
- The app is canvas-centric. UI chrome is secondary (toolbar, sidebar catalog, cost panel)
- Full component libraries add 100KB+ bundle weight for features we won't use
- Tailwind + headless primitives give us exactly what we need with minimal overhead
### Development Tools
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | ^9 | Linting | Flat config format (ESLint 9+). Catch type errors, unused imports. | HIGH |
| pnpm | ^9 | Package manager | Faster installs, strict dependency resolution, disk-efficient. | MEDIUM |
| GitHub Actions | — | CI/CD | Build + deploy to GitHub Pages on push to main. Standard Vite static deploy workflow. | HIGH |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Canvas lib | Konva + react-konva | PixiJS | Overkill WebGL for <300 objects; no built-in drag/snap; requires pixi-react wrapper |
| Canvas lib | Konva + react-konva | Paper.js | No React integration; used by Happy Island Designer but ecosystem has stagnated |
| Canvas lib | Konva + react-konva | Fabric.js | More design-editor oriented (text editing, filters); heavier; no React bindings |
| State mgmt | Zustand | Jotai | Atomic model less natural for interconnected editor state |
| State mgmt | Zustand | Redux Toolkit | More boilerplate for no added benefit at this scale |
| Build tool | Vite 8 | Next.js | SSR/SSG unnecessary for a client-only canvas editor on GitHub Pages |
| Build tool | Vite 8 | Webpack | Slower DX, more config. Happy Island Designer used Webpack but that was 2020. |
| Compression | lz-string | pako | pako is zlib (more general), lz-string is purpose-built for URL-safe string compression |
| i18n | i18next | FormatJS/react-intl | i18next has better CJK support, more flexible, larger ecosystem |
| CSS | Tailwind CSS v4 | CSS Modules | Slower iteration; Tailwind's utility classes match rapid prototyping needs |
## Installation
# Initialize project
# Core rendering
# State management
# URL sharing
# Internationalization
# Styling
# UI primitives (choose one)
# Dev dependencies
## Key Version Constraints
| Package | Constraint | Reason |
|---------|-----------|--------|
| react-konva | ^19.x | Must match React 19 major version |
| konva | ^10.x | Required by react-konva 19.x |
| i18next | ^26.x | Breaking changes from v25; use latest |
| Vite | ^8.x | Uses Rolldown; breaking change from v7 |
| Tailwind | ^4.x | New engine; incompatible with v3 config files |
## Sources
- [Konva.js](https://konvajs.org/) — Official site, docs, react integration guide
- [react-konva npm](https://www.npmjs.com/package/react-konva) — v19.2.3, React 19 compatible
- [zustand npm](https://www.npmjs.com/package/zustand) — v5.0.12
- [lz-string](https://pieroxy.net/blog/pages/lz-string/index.html) — v1.5.0, URL-safe compression
- [Happy Island Designer source](https://github.com/eugeneration/HappyIslandDesigner) — Reference: uses Paper.js, lz-string, i18next, TypeScript, Webpack
- [sekai-master-db-diff](https://github.com/Sekai-World/sekai-master-db-diff) — Furniture, blueprints, materials JSON data
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8) — Rolldown-based, released 2026-03-12
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4) — Auto-detection, faster builds
- [i18next npm](https://www.npmjs.com/package/i18next) — v26.0.3
- [PixiJS vs Konva comparison](https://aircada.com/blog/pixijs-vs-konva) — Use case analysis
- [Zustand vs Jotai 2025](https://www.reactlibraries.com/blog/zustand-vs-jotai-vs-valtio-performance-guide-2025) — Performance comparison
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
