# Phase 2 Research: Roads, Fences & Ground Layer

**Researched:** 2026-04-10
**Domain:** Grid-editor ground-layer tools (drag paint, axis-aligned line tool) on top of Konva/Zustand/zundo
**Confidence:** HIGH (library APIs verified against installed source; game data verified against live JSON)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Brush Tool Mode**
- D-29: Add `'brush'` to `ToolMode`; toolbar button after Stamp; shortcut `P`; crosshair cursor.
- D-30: Clicking a ground-paintable fixture in the catalog auto-switches to Brush mode (mirrors stamp auto-switch). Rugs/furniture still route to Stamp mode.

**Road & Color Tile Painting (hold-drag)**
- D-31: Hold-drag paint: mousedown → drag → each tile under cursor receives placement; mouseup ends stroke; single click = single tile.
- D-32: Brush size is **1×1** only for v1. (See §1 note — in-game tile unit is 2×2 editor cells; planner must decide whether "1×1" means 1 fixture per cursor sample or redefine grid.)
- D-33: Interpolate between cursor samples with line rasterization — no gaps at high drag velocity.

**Fence Placement (line tool)**
- D-34: Click-start → click-end → ghost preview → confirm/cancel overlay.
- D-35: Axis-aligned only (horizontal OR vertical). Diagonal input snaps to the axis with the larger delta.
- D-36: Inline overlay with 「キャンセル」 / 「決定」 buttons near end tile. Enter confirms, Escape cancels. Clicking elsewhere on canvas cancels and starts a new line.

**Shared Brush Infrastructure**
- D-37: ONE brush ToolMode; the fixture's subtype picks drag-paint vs line-tool, not the user.
- D-38: Data-driven classifier `getGroundSubtype(fixture) → 'road' | 'color-tile' | 'fence' | 'rug' | null` in `src/data/fixtures.ts`. (See §1 — `mysekaiFixtureHandleType` is the canonical field.)

**Rug Handling**
- D-39: Rugs stay in existing Stamp workflow (multi-tile sizes, no drag paint). Rugs do NOT trigger brush mode.

**Interaction Rules**
- D-40: Overwrite toggle (Phase 1 D-20) applies to brush. Off → paint blocked on occupied ground tiles (red feedback). On → paint replaces. Shift/Alt = one-off override per click/stroke.
- D-41: Ground and furniture layers remain independent (per Phase 1 D-28). Roads can coexist with chairs on the same tile.
- D-42: Remove mode gains drag-erase **for ground items only**. Furniture still single-click per Phase 1 D-21.

**Undo / History**
- D-43: ONE drag-stroke = ONE undo step. ONE confirmed fence line = ONE undo step. Must integrate with zundo temporal middleware.
- D-44: Undo of a paint stroke flashes all restored tiles (Phase 1 D-27). `findChangedItemIds()` already handles multiple IDs — just needs D-43 batching to preserve atomicity.

**Grid Fidelity (new principle)**
- D-45: 1:1 coordinate fidelity with the in-game grid. Editor tile `(x,y)` must map to game tile `(x,y)`.
- D-46: Visual grid uses a subtle **dashed** stroke matching the in-game overlay (refines Phase 1 D-14).
- D-47: Paint snaps to exact tile centers; placed item `x`, `y` are integer grid coordinates only.

### Claude's Discretion
- Exact shortcut key if `P` conflicts with future needs (D-29)
- Ghost line preview colors for fence line tool (D-34) — suggest reusing stamp green/red
- Cursor icon for Brush mode — Lucide or custom
- Confirm/cancel overlay styling (D-36)
- Dashed grid line stroke specifics (D-46) — dash length, gap length, opacity
- Line rasterization algorithm for drag interpolation (D-33) — Bresenham or simpler

### Deferred Ideas (OUT OF SCOPE)
- Auto-tiling for roads (corner/T-junction pieces) — Phase 5 at earliest
- Diagonal fence lines / L-shapes — v2 pass
- Multi-tile brush (3×3, radius 5) — rejected for v1
- Rectangle / flood-fill tools
- Fence sprite orientation based on line direction — relevant in Phase 5
- Brush hotbar slots — catalog click is sufficient for v1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROAD-01 | User can place road tiles on the ground layer using a paint/brush tool | §1 classifier identifies roads via `handleType='road'`; §2 batches strokes into single undo; §3 Bresenham interpolates between cursor samples; §4 resolves Stage-drag conflict |
| ROAD-02 | User can place rug/mat items on the ground layer | Rugs stay in existing Stamp flow (D-39). §1 confirms rugs are `layoutType='rug'`, already routed by `getItemLayer()`. No change to rug placement code path; verification only |
| ROAD-03 | User can place fence segments on the grid | §1 classifier identifies fences via `handleType='fence'`; §2 batches line confirmation into single undo; §3 interpolate function reused for axis-aligned lines; new FenceLineTool overlay component |
| ROAD-04 | Ground layer items render beneath furniture layer items | **Already implemented** in Phase 1 (`EditorCanvas.tsx` renders `GroundLayer` before `FurnitureLayer`). §1 warns: Phase 1's `getItemLayer()` does NOT handle `layoutType='road'`, so roads currently would render on the wrong layer. Fix required. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Max file length 800 lines, max function length 50 lines, max 3 nesting levels
- Directory: max 8 files per level
- Code comments: Chinese with ASCII block separators (`// ======== ... ========`)
- L3 file headers MUST declare INPUT/OUTPUT/POS on any new file
- L2 `CLAUDE.md` (if any) must be updated when files are added/removed per DocOps protocol
- Doc-Code Isomorphism: any code change MUST verify/update docs in the same task
- React 19 / Konva 10 / Zustand 5 / TypeScript 5.7 / Vite 8 / Tailwind 4 / pnpm / ESLint 9
- Backward compatibility: changes must not break Phase 1 features
- GSD workflow is mandatory for file-changing work

## Summary

- **`mysekaiFixtureHandleType` is the canonical subtype field** — values `'road'` (26 fixtures: 6 roads + 20 color tiles) and `'fence'` (7 fixtures) cleanly partition the brush targets. No fragile name/ID heuristic needed. This field is NOT yet in Phase 1's `Fixture` TypeScript type — add it.
- **Phase 1 has a latent bug blocking Phase 2.** The `mysekaiSettableLayoutType` union in `src/types/editor.ts` is missing the value `'road'` (and `'floor_appearance'`), and `getItemLayer()` only checks `'floor'` and `'rug'` — so roads and color tiles would currently route to the **furniture layer** and render above chairs, violating ROAD-04. Fix as the first task in Phase 2.
- **In-game tile granularity is 2×2 editor cells.** Every road / color tile / fence fixture in the live data is `gridSize {width:2, depth:2}`. This contradicts D-32 ("brush size is 1×1") at face value. Planner must decide between (a) "1×1 *fixture*" = one 2×2 footprint per cursor sample (recommended — matches game), or (b) "1×1 *editor cell*" = redefine grid so one editor cell = one in-game tile = 2 current cells. Option (a) is the minimum-change path and preserves Phase 1's `TILE_SIZE=32`; option (b) ripples through every Phase 1 utility.
- **zundo 2.3.0 (installed) natively supports batching via `pause()` / `resume()` / `isTracking`**. The recommended pattern is: on drag start → snapshot current `placedItems` → `temporal.pause()` → mutate `placedItems` freely for each painted tile → on drag end → `temporal.resume()` → write a final "commit" state change that zundo sees as a single transition from the snapshot. No throttle/debounce needed, no `handleSet` acrobatics.
- **Konva Stage `draggable` can be toggled reactively.** Change `draggable={toolMode === 'select'}` to `draggable={toolMode === 'select' || toolMode === 'stamp'}` (stamp also shouldn't pan on click-drag — but Phase 1 currently allows that; verify intent). In brush mode, `draggable={false}` + listen to Stage `onMouseDown/onMouseMove/onMouseUp`. Use `dragDistance` (default 3px) if you want to keep click-vs-drag discrimination for pan.

**Primary recommendation:** Organize Phase 2 around four plans — (1) schema fix + classifier (`Fixture` type, `getItemLayer`, `getGroundSubtype`), (2) brush infrastructure (tool mode, toolbar, keyboard, Stage event routing, zundo pause/resume wrapper), (3) drag-paint for roads/color tiles (line rasterization, overwrite integration, drag-erase for remove mode), (4) fence line tool (overlay UI, ghost preview, axis snap, Enter/Escape). Dashed grid refinement is a small standalone task.

---

## 1. Game Data Schema & Ground Subtype Classification

**Source:** Live fetch from `https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main/mysekaiFixtures.json` (retrieved 2026-04-10). Dataset: **1,239 fixtures total.**

### Canonical classifier field: `mysekaiFixtureHandleType`

I dumped a full road record and discovered a previously-unreferenced field `mysekaiFixtureHandleType`. Cross-checked against the full dataset:

| `handleType` | Count | What it maps to |
|---|---:|---|
| `none` | 1084 | regular furniture, rugs, everything else |
| `block` | 46 | block-type items (stairs, ramps) |
| `light` | 39 | lights (incl. 2 lit rugs) |
| **`road`** | **26** | **all 6 roads + all 20 color tiles** |
| `windowpane` | 18 | windows |
| `clock` | 13 | clocks |
| **`fence`** | **7** | **all 7 fences** |
| `idle_timeline` | 4 | animated fixtures |
| `block_transparent` | 2 | glass blocks |

The partitioning is clean:
- Every `handleType='road'` item has `mainGenreId` 12 (`道`) or 31 (`カラータイル`).
- Every `handleType='fence'` item has `mainGenreId` 13 (`柵`).
- Rugs use `handleType='none'` (or `'light'` for 2 lit rugs) → correctly stay outside the classifier.

This field is **NOT present in Phase 1's `Fixture` type** (`src/types/editor.ts` line 15-28). Planner must add it.

### Schema surprises (MUST be fixed before Phase 2 can paint anything)

**Issue A: `mysekaiSettableLayoutType` union is incomplete.**
Live data contains these values:

```
{'floor': 1063, 'wall': 80, 'floor_appearance': 26, 'wall_appearance': 26, 'road': 26, 'rug': 18}
```

Phase 1 declared `'floor' | 'wall' | 'rug' | 'wall_appearance'` (missing `'road'` and `'floor_appearance'`). All 26 roads/color-tiles would fail strict typing if you ever used their raw layoutType.

**Issue B: `getItemLayer()` in `src/data/fixtures.ts:71` misroutes roads.**
Current logic:

```ts
if (layoutType === 'floor' || layoutType === 'rug') return 'ground'
return 'furniture'
```

Fences (`layoutType='floor'`) → correctly routed to `'ground'`. ✓
Rugs (`layoutType='rug'`) → correctly routed to `'ground'`. ✓
**Roads (`layoutType='road'`) → incorrectly routed to `'furniture'`**. ✗

This means ROAD-04 ("ground items render beneath furniture") is **currently broken** — painted roads would render on the furniture layer, above rugs and above roads themselves (which would also cause them to block chair placement via the furniture occupancy grid, violating D-41). This isn't caught today only because no roads exist in Phase 1 state yet.

**Fix in Phase 2 task 1:** Extend the `mysekaiSettableLayoutType` union, extend `Fixture` to include `mysekaiFixtureHandleType`, and update `getItemLayer()` to also return `'ground'` for `layoutType === 'road'`.

### Issue C: Grid size is 2×2, not 1×1 — reconcile with D-32

Every road / color tile / fence fixture has:
```
gridSize: {width: 2, depth: 2, height: 1 or 2}
```

D-32 says "brush size is 1×1 only." These collide. Two interpretations:

| Interpretation | Meaning | Effort | Recommendation |
|---|---|---|---|
| **(a) "1×1 fixture per sample"** | Each cursor sample places ONE fixture, which itself is 2×2 editor cells (per game data). Paint moves in 2-tile increments to align with the fixture footprint. | Minimal — reuses `placeItem` as-is. | **Recommended.** Matches in-game tile unit. |
| **(b) "1×1 editor cell"** | Redefine editor grid so 1 editor cell = 1 in-game tile = current 2×2 cells. Would require re-scaling `TILE_SIZE`, `gridSize`, area levels, and all Phase 1 items. | Massive — breaks Phase 1 fixtures and their positions. | **Rejected.** Scope explosion. |

Under (a), "paint a road at tile `(5,5)`" places a 2×2 fixture whose top-left is `(5,5)` and footprint covers `(5,5),(5,6),(6,5),(6,6)`. The rasterization step (§3) must therefore walk in **2-cell steps**, not 1-cell steps — otherwise dragging from `(5,5)` to `(5,7)` would try to place overlapping fixtures at `(5,5)`, `(5,6)`, `(5,7)`, and `(5,6)` would collide with `(5,5)` (it's inside the first fixture's footprint).

**Planner decision to lock:** paint walks in `{stepX: fixtureWidth, stepY: fixtureDepth}` steps (both = 2 for all current road/fence/tile fixtures), and snaps the cursor position to the nearest multiple of `fixtureWidth` / `fixtureDepth`.

### Canonical record samples

**Road (`id=111 土の道`):**
```js
{
  mysekaiFixtureType: 'normal',
  gridSize: {width: 2, depth: 2, height: 1},
  mysekaiFixtureMainGenreId: 12,        // 道
  mysekaiFixtureSubGenreId: 22,
  mysekaiFixtureHandleType: 'road',     // <-- CANONICAL BRUSH MARKER
  mysekaiSettableSiteType: 'home',
  mysekaiSettableLayoutType: 'road',    // <-- NEW VALUE
  firstPutCost: 25,
  assetbundleName: 'mdl_non2001_road_soil1',
}
```

**Fence (`id=114 シンプルな木の柵`):**
```js
{
  gridSize: {width: 2, depth: 2, height: 2},
  mysekaiFixtureMainGenreId: 13,        // 柵
  mysekaiFixtureHandleType: 'fence',    // <-- CANONICAL LINE-TOOL MARKER
  mysekaiSettableLayoutType: 'floor',   // floor, not road
}
```

**Color tile (`id=544 カラータイル/レッド`):**
```js
{
  gridSize: {width: 2, depth: 2, height: 1},
  mysekaiFixtureMainGenreId: 31,        // カラータイル
  mysekaiFixtureSubGenreId: 34,
  mysekaiFixtureHandleType: 'road',     // <-- shares 'road' handle with 道
  mysekaiSettableLayoutType: 'road',
}
```

### Proposed `getGroundSubtype` implementation

Add to `src/data/fixtures.ts`:

```ts
// ======== 地面物品子类型分类 ========
// INPUT: fixture
// OUTPUT: 'road' | 'color-tile' | 'fence' | 'rug' | null
// POS: src/data/fixtures.ts — 驱动 Brush 工具模式下的交互模式选择

export type GroundSubtype = 'road' | 'color-tile' | 'fence' | 'rug'

export function getGroundSubtype(fixture: Fixture): GroundSubtype | null {
  // 柵 — 使用 handleType 权威标记（7 个固定装置）
  if (fixture.mysekaiFixtureHandleType === 'fence') return 'fence'

  // 道 / カラータイル — 都使用 handleType='road'，通过 mainGenreId 区分
  if (fixture.mysekaiFixtureHandleType === 'road') {
    if (fixture.mysekaiFixtureMainGenreId === 31) return 'color-tile'
    return 'road' // mainGenreId === 12 (`道`)
  }

  // 地毯 — 使用现有 layoutType 分类（与 Phase 1 getItemLayer 一致）
  if (fixture.mysekaiSettableLayoutType === 'rug') return 'rug'

  return null
}

// Brush 工具是否接受此物品为活动家具？
export function isBrushEligible(fixture: Fixture): boolean {
  const s = getGroundSubtype(fixture)
  return s === 'road' || s === 'color-tile' || s === 'fence'
}

// Brush 下的交互模式（drag vs line）
export function getBrushInteraction(
  fixture: Fixture,
): 'drag-paint' | 'line-tool' | null {
  const s = getGroundSubtype(fixture)
  if (s === 'road' || s === 'color-tile') return 'drag-paint'
  if (s === 'fence') return 'line-tool'
  return null
}
```

### Required Phase 1 schema extensions

```ts
// src/types/editor.ts
export interface Fixture {
  // ...existing fields...
  mysekaiFixtureMainGenreId: number
  mysekaiFixtureSubGenreId: number
  mysekaiFixtureHandleType: 'none' | 'windowpane' | 'clock' | 'light'
                          | 'road' | 'fence' | 'block_transparent'
                          | 'block' | 'idle_timeline'          // NEW
  mysekaiSettableSiteType: 'home' | 'room' | 'any'
  mysekaiSettableLayoutType: 'floor' | 'wall' | 'rug'
                          | 'wall_appearance'
                          | 'road'                              // NEW
                          | 'floor_appearance'                  // NEW
  // ...
}
```

And in `src/data/fixtures.ts`:

```ts
export function getItemLayer(fixture: Fixture): ItemLayer {
  const lt = fixture.mysekaiSettableLayoutType
  if (lt === 'floor' || lt === 'rug' || lt === 'road') return 'ground'  // ADD 'road'
  return 'furniture'
}
```

**Approximate counts (for planner sizing):**
- Brush-eligible road targets: 6 (道) + 20 (カラータイル) = **26 drag-paint fixtures**
- Brush-eligible fence targets: **7 line-tool fixtures**
- Rugs (stay in stamp): 18
- Non-brush floor fixtures: ~1030

---

## 2. Undo Batching with zundo (D-43)

### API confirmed — zundo 2.3.0 natively supports pause/resume

Installed version: `zundo@2.3.0` (package.json: `"zundo": "^2.3.0"`). The compiled type declarations at `node_modules/zundo/dist/index.d.ts` explicitly expose:

```ts
interface _TemporalState<TState> {
  pastStates: Partial<TState>[]
  futureStates: Partial<TState>[]
  undo: (steps?: number) => void
  redo: (steps?: number) => void
  clear: () => void
  isTracking: boolean                // <-- NEW IN 2.0
  pause: () => void                  // <-- NEW IN 2.0
  resume: () => void                 // <-- NEW IN 2.0
  // ...
}
```

From the installed README (quoted directly):

> `pause`: call function to pause tracking state changes. This will prevent new states from being stored in history within the temporal store. Sets `isTracking` to `false`.
>
> `resume`: call function to resume tracking state changes. This will allow new states to be stored in history within the temporal store. Sets `isTracking` to `true`.

zustand 5.0.12 is compatible (zundo 2.x requires zustand ≥ 4.3).

### How it interacts with the existing temporal config

Current `editorStore.ts` uses `temporal(...)` with:
```ts
partialize: (state) => ({ placedItems: state.placedItems }),
equality: (past, curr) => past.placedItems === curr.placedItems,
```

The `equality` function already short-circuits history writes when `placedItems` reference equals. This is crucial: during a paused-then-resumed drag, `placedItems` will have changed by reference, so when `resume()` is called the very next `set()` will record a delta against the pre-drag snapshot — exactly what we want.

### Recommended pattern — "pause + commit" wrapper

Add a helper to `editorStore.ts` (or a new `src/stores/temporalBatch.ts`):

```ts
// ======== 时间旅行批量操作 ========
// INPUT: 要在批处理块内执行的一组 store 变更
// OUTPUT: 整个变更块作为单个 undo 步骤记录
// POS: src/stores/editorStore.ts — 封装 zundo pause/resume 供拖拽画刷与围栏线使用

/**
 * 在单个 undo 步骤中执行多个 store 变更。
 *
 * 实现原理：
 *   1. pause() — 期间所有 set() 调用不产生 history 条目
 *   2. 执行提供的回调（回调自由地多次 set）
 *   3. resume() — 启用跟踪
 *   4. 最后执行一次"提交"set() — zundo 看到从暂停前状态到最终状态的单步转换
 *
 * 等效于 Photoshop "开始操作 → ... → 结束操作"。
 */
export function withBatchedUndo(fn: () => void) {
  const temporal = useEditorStore.temporal.getState()
  const wasTracking = temporal.isTracking
  temporal.pause()
  try {
    fn()
  } finally {
    if (wasTracking) temporal.resume()
  }
  // 触发一次"刷新"set() 以便在 resume 后记录合并的 placedItems 快照
  // （equality 函数会短路：如果 fn() 内部没有更改 placedItems，则不产生条目）
  useEditorStore.setState((s) => ({ placedItems: { ...s.placedItems } }))
}
```

**Why the trailing `setState(...)` is needed:** `pause()` prevents history writes during the drag, but `resume()` alone doesn't produce a history entry. We need one final `set()` after resume to let zundo's `handleSet` observe the transition from `pastStateAtPauseStart` → `currentStateAfterResume`. The `{ ...s.placedItems }` creates a new object reference; the `equality` function will see that the reference changed and record exactly one entry in `pastStates`.

**Alternative shape for long-lived streams (mouse drag that spans many frames):**

```ts
export function startStrokeBatch() {
  useEditorStore.temporal.getState().pause()
}

export function endStrokeBatch() {
  const t = useEditorStore.temporal.getState()
  t.resume()
  // 单次刷新提交
  useEditorStore.setState((s) => ({ placedItems: { ...s.placedItems } }))
}
```

Used by:

```ts
function handleBrushMouseDown(gridX, gridY) {
  startStrokeBatch()
  paintTile(gridX, gridY) // many set() calls during drag — all hidden from history
}
function handleBrushMouseUp() {
  endStrokeBatch() // one history entry for the whole stroke
}
```

Same pattern applies to the fence line tool: on "決定" click, call `withBatchedUndo(() => { for (tile of line) placeItem(tile) })`.

### Undo flash integration (D-44)

`findChangedItemIds()` already diffs two `placedItems` snapshots and returns all changed IDs. After `undoWithFlash()` reverts a batched stroke:
- `beforeItems`: placedItems with all 30 painted tiles
- `afterItems`: placedItems with 0 painted tiles
- `findChangedItemIds` returns 0 tiles added but cannot detect the 30 removed tiles (comment in code: "已删除的项在 after 中不存在，无法对其执行闪烁动画")

**Gap:** Phase 1's flash logic can't flash deleted items. For an undone paint stroke where 30 tiles were added, the undo removes all 30 — but the flash animation can only run on items present in `after`, so nothing flashes.

**Fix required in Phase 2:** extend `findChangedItemIds` to also return IDs from `before` that are missing in `after` (deletion diff), and have `triggerFlash` flash them momentarily before they disappear — or alternatively, have the flash animation run on the tiles that are about to be removed on a redo, not on the undo side. The cleanest fix: redo of a paint stroke flashes the 30 re-added tiles (which DO exist in `after`); for undo of a paint stroke, skip the flash (acceptable — the visual disappearance itself is the feedback).

The planner should make this tradeoff explicit in the plan: **"undo of brush stroke does not flash (tiles just disappear); redo flashes."**

---

## 3. Line Rasterization Strategy (D-33)

### Algorithm choice: classic integer Bresenham

Three candidates:

| Algorithm | Pros | Cons |
|---|---|---|
| **Bresenham** | Integer-only, no float drift, textbook, well-tested | ~15 lines |
| DDA (float-step) | Simple 8-line loop | Float drift on long diagonals; needs `Math.round` each step |
| Max-axis tile-walk | Very short | Only works for 4-connected paths; can leave gaps on diagonals |

**Recommendation: Bresenham**, 4-connected variant for a paint brush (we want EVERY tile touched, no diagonal shortcuts).

Since fixture footprints are `stepX = fixtureWidth`, `stepY = fixtureDepth`, run Bresenham over **step-space coordinates** (divide input by step, walk, multiply by step on emit) so stride alignment is automatic.

### TypeScript sketch

```ts
// ======== 网格线栅格化 ========
// INPUT: 起止格子坐标，可选步长（默认 1）
// OUTPUT: 按从 start 到 end 顺序排列的所有中间格子数组
// POS: src/utils/lineRasterize.ts — 纯函数，供拖拽画刷与围栏线工具使用

/**
 * Bresenham 线算法（4 连通，整数）。
 *
 * 对于画刷：step 应为固定装置尺寸（通常 2），保证相邻采样不重叠。
 * 对于围栏线：调用方已将端点轴对齐（dx=0 或 dy=0），Bresenham 退化为直线迭代。
 *
 * 返回的点是左上角坐标，单位与输入相同。
 */
export function rasterizeLine(
  x0: number, y0: number,
  x1: number, y1: number,
  step = 1,
): Array<{ x: number; y: number }> {
  // 化到 step-space 以保证相邻样本对齐，再映射回原空间
  let sx0 = Math.round(x0 / step)
  let sy0 = Math.round(y0 / step)
  const sx1 = Math.round(x1 / step)
  const sy1 = Math.round(y1 / step)

  const tiles: Array<{ x: number; y: number }> = []
  const dx =  Math.abs(sx1 - sx0)
  const dy = -Math.abs(sy1 - sy0)
  const stepX = sx0 < sx1 ? 1 : -1
  const stepY = sy0 < sy1 ? 1 : -1
  let err = dx + dy

  while (true) {
    tiles.push({ x: sx0 * step, y: sy0 * step })
    if (sx0 === sx1 && sy0 === sy1) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; sx0 += stepX }
    if (e2 <= dx) { err += dx; sy0 += stepY }
  }
  return tiles
}

/** 围栏线工具：将端点强制轴对齐（大 delta 方向胜出）。 */
export function snapToAxis(
  startX: number, startY: number,
  endX: number, endY: number,
): { x: number; y: number } {
  const dx = Math.abs(endX - startX)
  const dy = Math.abs(endY - startY)
  return dx >= dy
    ? { x: endX, y: startY } // 水平线
    : { x: startX, y: endY } // 垂直线
}
```

**Usage during drag paint:**

```ts
let lastPaintedTile: { x: number; y: number } | null = null

function onBrushMouseMove(gridX: number, gridY: number, fixture: Fixture) {
  const step = fixture.gridSize.width // 当前所有道/柵/タイル均为 2
  const snapped = {
    x: Math.round(gridX / step) * step,
    y: Math.round(gridY / step) * step,
  }
  if (lastPaintedTile &&
      lastPaintedTile.x === snapped.x && lastPaintedTile.y === snapped.y) return
  const tiles = lastPaintedTile
    ? rasterizeLine(lastPaintedTile.x, lastPaintedTile.y, snapped.x, snapped.y, step)
    : [snapped]
  for (const t of tiles) paintTileIfAllowed(t.x, t.y, fixture)
  lastPaintedTile = snapped
}
```

**Complexity:** `O(max(|dx|, |dy|))` per drag move event. For a 100×100 grid, even a worst-case diagonal is ~100 steps — trivial. The store updates are batched by `withBatchedUndo`, so zundo history cost is O(1) regardless of stroke length.

---

## 4. Konva Stage Drag-Paint vs Pan Conflict Resolution (D-31, D-42)

### The problem

Phase 1 sets `draggable={toolMode === 'select'}` on the Stage (`EditorCanvas.tsx:249`). In brush mode, mousedown-drag must paint, not pan. Two nuances matter:

1. **Konva's `dragDistance` default is 3px.** Per the Konva API docs, "node starts dragging only if pointer moved more than 3 pixels." This means in `select` mode, a single click on an empty tile does NOT start a Stage drag — so Phase 1's stamp-via-click works. But any non-trivial mouse move while the button is held will start a drag.
2. **`draggable={false}` is reactive.** Setting it false at runtime prevents new drag initiation immediately; events `onMouseDown/onMouseMove/onMouseUp` continue to fire normally.

### Recommended pattern

**1. Add brush to the `draggable` exclusion:**

```tsx
// EditorCanvas.tsx
<Stage
  draggable={toolMode === 'select'}   // <-- already correct for brush exclusion
  onMouseDown={handleStageMouseDown}
  onMouseMove={handleStageMouseMove}
  onMouseUp={handleStageMouseUp}
  onPointerDown={handleStageMouseDown}   // pointer-events for touch/pen
  onPointerMove={handleStageMouseMove}
  onPointerUp={handleStageMouseUp}
  // ...
>
```

Brush mode keeps `draggable=false` because `toolMode !== 'select'`. ✓ No conflict — Konva won't start a Stage drag while in brush mode regardless of how far the user moves.

**2. Drag-paint state machine (local component state, not in Zustand):**

```tsx
const isPaintingRef = useRef(false)
const lastPaintedTileRef = useRef<{ x: number; y: number } | null>(null)

const handleStageMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
  const state = useEditorStore.getState()
  if (state.toolMode !== 'brush' || state.activeFixtureId === null) return
  const fixture = fixtureMap.get(state.activeFixtureId)
  if (!fixture) return
  const interaction = getBrushInteraction(fixture)

  if (interaction === 'drag-paint') {
    if (e.target !== e.target.getStage()) return  // 忽略点击到已放置物品上
    const { gridX, gridY } = pointerToGrid(e.target.getStage()!, fixture.gridSize.width)
    startStrokeBatch()
    isPaintingRef.current = true
    lastPaintedTileRef.current = { x: gridX, y: gridY }
    paintTileIfAllowed(gridX, gridY, fixture)
  }
  else if (interaction === 'line-tool') {
    handleFenceClick(gridX, gridY, fixture)  // 独立状态机，不用 isPaintingRef
  }
}, [fixtureMap])

const handleStageMouseMove = useCallback((e) => {
  // ... existing ghost-preview tracking
  if (!isPaintingRef.current) return
  const state = useEditorStore.getState()
  const fixture = fixtureMap.get(state.activeFixtureId!)
  if (!fixture) return
  const step = fixture.gridSize.width
  const { gridX, gridY } = pointerToGrid(e.target.getStage()!, step)
  if (lastPaintedTileRef.current?.x === gridX &&
      lastPaintedTileRef.current?.y === gridY) return
  const tiles = rasterizeLine(
    lastPaintedTileRef.current!.x, lastPaintedTileRef.current!.y,
    gridX, gridY, step,
  )
  for (const t of tiles) paintTileIfAllowed(t.x, t.y, fixture)
  lastPaintedTileRef.current = { x: gridX, y: gridY }
}, [fixtureMap])

const handleStageMouseUp = useCallback(() => {
  if (!isPaintingRef.current) return
  isPaintingRef.current = false
  lastPaintedTileRef.current = null
  endStrokeBatch() // commits single history entry
}, [])
```

**3. Remove-mode drag-erase (D-42):** Exact same state machine, substituting `paintTileIfAllowed` with `removeItemAtIfGround`. Guard with `state.toolMode === 'remove'` and check that the item under cursor has `layer === 'ground'` (furniture still requires single-click per Phase 1 D-21).

### Event model verification

- **Mouse:** `onMouseDown / onMouseMove / onMouseUp` — covered.
- **Touch:** Konva Stage also fires `onTouchStart / onTouchMove / onTouchEnd`. Phase 1 already uses `onTap` for single-tap; adding drag-paint for touch is a "nice to have" but not required. Listing `onPointerDown/Move/Up` alongside mouse handlers gives free touch support on modern browsers.
- **onMouseLeave:** MUST also call `endStrokeBatch()` if `isPaintingRef.current === true`, otherwise a user dragging off the canvas would leave zundo paused forever. Add to existing `handleMouseLeave`.
- **Window blur:** Similarly, the window losing focus during a drag should end the stroke. Add a `useEffect` with `window.addEventListener('blur', endStrokeBatchIfActive)`.

### Stage pan in stamp mode — minor Phase 1 question

Phase 1 currently has `draggable={toolMode === 'select'}`. Brush mode is already excluded — no change needed there. But note: stamp mode is ALSO excluded. Today, stamp mode cannot pan. This may or may not be intentional; not Phase 2's problem, but worth flagging in the plan.

### Known react-konva 19 pointer-event issues

No blocking issues found in the react-konva 19 changelog or open issues. Issue #609 references laggy middle-mouse dragging on Stage — irrelevant to left-button drag-paint.

---

## 5. Reference Implementations

| Source | What to copy | What to avoid |
|---|---|---|
| **Konva official "Drag and drop the Stage" docs** ([konvajs.org](https://konvajs.org/docs/drag_and_drop/Drag_a_Stage.html)) | Stage `draggable` toggle pattern | Doesn't cover conditional disable + custom mousedown |
| **Konva "Complex drag and drop bounds"** ([konvajs.org](https://konvajs.org/docs/drag_and_drop/Complex_Drag_and_Drop.html)) | `dragBoundFunc` technique for snap-to-grid | Overkill for paint tool — we handle snapping in mousemove |
| **Ali Karaki "Canvas editors in Konva" (2025 blog)** ([alikaraki.me](https://www.alikaraki.me/blog/canvas-editors-konva)) | Separating interaction state from document state; pointer events over mouse events | Not specific to paint tools |
| **Happy Island Designer** ([GitHub](https://github.com/eugeneration/HappyIslandDesigner)) | Paint-brush concept (Paper.js `Path` objects), overall editor UX | Paper.js APIs don't translate; uses different drag system |
| **mykolav/typescript-bresenham** ([GitHub](https://github.com/mykolav/typescript-bresenham)) | Direct TypeScript Bresenham reference | Classic 8-connected; we want 4-connected with step parameter |
| **Bresenham's Algorithm in turn-based tile games** (Medium, Thomas Oh) | Tile-walk pedagogical walkthrough | — |

No pre-existing react-konva paint-brush demo was found that exactly fits. The "paint in Konva" pattern we need is small enough (§4) that writing it from scratch is faster than adapting a reference.

---

## 6. In-Game UX Verification

### Roads: hold-drag confirmed

From a Yahoo Japan 知恵袋 thread and game8.jp guide (Japanese): *"庭に柵や道路を配置する場合、フィールド上で置きたい場所をドラッグするだけと簡単です"* (For placing fences and roads in the garden, just drag across the field where you want to put them). Evidence specifically calls out **drag** for both roads and fences — but the user's screenshot shows fences using the click-start → click-end overlay, not drag. This is a contradiction.

**Most likely reconciliation:** the casual Japanese phrasing conflates both "hold-drag" and "tap-drag" motions. The in-game reality appears to be:
- **Roads & color tiles:** hold-drag paint (matching the user's assumption)
- **Fences:** click-start → click-end → overlay confirm (shown in the user's screenshot)

The planner should default to the user's screenshot-backed assumption (D-31 for roads, D-34 for fences). If later testing shows roads also use the line tool, switching a road fixture's interaction is a one-line change in `getBrushInteraction()`.

**Confidence: MEDIUM** on the roads = hold-drag claim. Screenshot evidence exists only for fences; text guides are ambiguous but support drag for both. The chosen implementation is the user's explicit decision per D-31, not a researcher recommendation.

### Color tiles: presumed hold-drag

No direct UX documentation found. Color tiles share `handleType='road'` with actual roads in the game data, strongly suggesting the game treats them identically (same in-game tool → both use drag). The classifier in §1 gives both drag-paint. HIGH confidence in the data; MEDIUM confidence in the resulting UX mapping.

### Fence snap direction

The in-game screenshot described in CONTEXT.md `<specifics>` shows overlay labels 「ここから」 / 「ここまで」 at both endpoints of an axis-aligned fence line. No diagonal support visible. D-35 matches the game. ✓

---

## 7. Grid Origin Convention (D-45)

### What the data tells us

No field in `mysekaiFixtures.json`, `mysekaiFixtureMainGenres.json`, `mysekaiFixtureSubGenres.json`, or `mysekaiFixtureTags.json` encodes tile positions. The JSON files describe fixture *catalog* metadata only. There is no `mysekaiSystemFixtures.json` file in the sekai-master-db-diff repo root (curl would fetch an empty file if it existed; no 404 shown but also no file listed).

### What Phase 1 currently does

`editorStore.ts:186-220` places gate and house at computed positions when `startEditor(level)` is called:

```ts
const gateX  = Math.floor(grid.width / 2) - 1
const gateY  = grid.depth - 3                   // near bottom edge
const houseX = Math.floor(grid.width / 2) - 2
const houseY = Math.floor(grid.depth / 2) - 2   // roughly center
```

These use placeholder fixture IDs (`-1`, `-2`) with a `TODO: 从 mysekaiSystemFixtures.json 获取真实 ID` comment. This placement was a stopgap in Phase 1 — no claim of in-game accuracy.

### Evidence from game data

- **Gate** (`id=900002`): `fixtureType='gate'`, `gridSize={width:8, depth:2, height:6}`. Only ONE gate in the data. The physical shape (8 wide × 2 deep) is consistent with a wide entrance at the edge of the area — typical game layouts put gates at the perimeter edge.
- **Houses** (18 variants): all are ~12×12 to 12×13, `fixtureType='system'`, `siteType='home'`, `layoutType='floor'`. 12×12 is ⅓ of a 36×36 area, consistent with "placed near the middle of the smallest area level, leaving space on all sides."

Sekaipedia confirms: *"When you reach MySEKAI level 9, the outdoor space expands to 90×90"* and *"The gate is a part of the garden that connects MySEKAI to other SEKAI"* — the gate is a fixed feature at the edge of the area.

### Recommended convention

**Origin at top-left, +X right, +Y down** (screen convention, matching Phase 1's current implementation). The in-game camera is typically pitched looking "down and forward," but for a top-down editor, the natural mapping is:

| Editor | In-game (proposed) |
|---|---|
| Tile `(0, 0)` top-left | NW corner of the outdoor area |
| Tile `(W-1, D-1)` bottom-right | SE corner |
| +X direction | East (right on compass) |
| +Y direction | South (down on compass) |
| Gate `(center-col, bottom-row - 2)` | South edge entrance (matches game: gate faces the SEKAI portal) |

This **matches Phase 1's gate placement** (`y = depth - 3`, near bottom = south edge). The house at `(center_x - 2, center_y - 2)` is consistent with a 12×12 house centered in the area.

**Planner action:** Lock this as the editor's canonical coordinate system. Phase 2 does NOT need to re-derive positions for gate/house (Phase 1 already set them at defensible locations). What Phase 2 DOES need is to **document** this convention in `src/data/areaLevels.ts` or a new `src/constants/coordinates.md` so Phase 5 (sprites) and Phase 3 (URL encoding) use the same convention.

Until someone extracts mysekaiSystemFixtures data or measures the game directly, this is the best-available mapping. **Confidence: MEDIUM** — convention is reasonable but not independently verified.

**Deferred:** exact gate Y-offset (2 vs 3 tiles from south edge) requires playtesting. Not a Phase 2 blocker.

---

## 8. Dashed Grid Style Values (D-46)

### Konva Line `dash` prop

Konva `Line` and any strokable `Shape` accept a `dash: number[]` prop. The array is `[dashLength, gapLength, dash2, gap2, ...]` in **local (unscaled) canvas units**. When the Stage is scaled, dashes scale with it unless you compensate.

Phase 1 already uses `strokeWidth = 1 / stageScale` to keep lines visually 1px at any zoom. The same principle applies to dash lengths.

### Recommended values

Based on the user's screenshot description (*"Subtle white dashed grid overlay on the ground surface"*) and a desire for dashes that remain visually consistent across the 0.15×–3× zoom range:

```tsx
<Line
  key={`v-${col}`}
  points={[x, 0, x, totalDepth]}
  stroke="rgba(255, 255, 255, 0.22)"    // up from 0.08 — dashed needs more opacity
  strokeWidth={1 / stageScale}
  dash={[4 / stageScale, 3 / stageScale]}
  dashOffset={0}
  listening={false}
/>
```

| Property | Value | Rationale |
|---|---|---|
| `stroke` | `rgba(255,255,255,0.22)` | Dashed lines need higher opacity than solid to appear as "subtle" (dashes break visual continuity, so 0.08 would be invisible). 0.22 matches the "barely there" look of the screenshot. |
| `strokeWidth` | `1 / stageScale` | Consistent 1px visual width at all zoom levels (matches Phase 1 pattern). |
| `dash` | `[4 / stageScale, 3 / stageScale]` | 4px dash + 3px gap = 7px repeat. At `TILE_SIZE=32`, each tile edge has ~4-5 dashes — dense enough to read as "grid," sparse enough to not clutter. |
| `dashOffset` | `0` | Default; not animated (no marching ants). |

**Why `/stageScale` for dash values:** Konva multiplies path lengths by the Stage scale before drawing. Without division, zooming in 3× makes each dash 12px long (chunky), and zooming out 0.15× makes each dash 0.6px (invisible). Dividing by `stageScale` preserves a constant visual dash length.

**Performance consideration:** Konva warns that dashed strokes force per-stroke path re-evaluation. For a 100×100 grid (200 line segments), this is still negligible on modern hardware. If profiling shows a hit at extreme zoom-out, wrap `GridLines` with `React.memo` keyed on `{gridWidth, gridDepth, stageScale}` — Phase 1 already does this at the outer `GridLayer` level.

**Alternative:** use a single `Rect` with a `fillPatternImage` set to a pre-rendered dashed-grid PNG. More performant for huge grids, but harder to adjust. Defer unless the Line approach actually lags.

### File scope

Change is entirely in `src/components/canvas/GridLayer.tsx`, in the `GridLines` function (lines 36-75). Touch 2 props on 2 `Line` creators. ~6 lines of diff. No new files.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (jsdom environment) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test --run` |
| Full suite command | `pnpm test --run` |
| Existing test location | `src/__tests__/*.test.ts` |

Existing tests in `src/__tests__`: `areaLevels.test.ts`, `catalogFilter.test.ts`, `editorStore.test.ts`, `fixtures.test.ts`, `ghostPreview.test.ts`, `grid.test.ts`. Vitest is already installed and green.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROAD-01 | `getGroundSubtype` classifies 26 roads as `'road'`, 20 color tiles as `'color-tile'` | unit | `pnpm test --run src/__tests__/groundSubtype.test.ts` | ❌ Wave 0 |
| ROAD-01 | `rasterizeLine(0,0, 4,0, 2)` returns `[{0,0},{2,0},{4,0}]` (3 tiles, step=2) | unit | `pnpm test --run src/__tests__/lineRasterize.test.ts` | ❌ Wave 0 |
| ROAD-01 | `rasterizeLine(0,0, 6,4, 2)` returns diagonal chain with no gaps | unit | `pnpm test --run src/__tests__/lineRasterize.test.ts` | ❌ Wave 0 |
| ROAD-01 | Drag-paint stroke across 5 tiles → 5 `placeItem` calls → zundo `pastStates.length === 1` | integration | `pnpm test --run src/__tests__/brushStroke.test.ts` | ❌ Wave 0 |
| ROAD-01 | Undo after 5-tile stroke restores empty `placedItems`; redo restores all 5 | integration | `pnpm test --run src/__tests__/brushStroke.test.ts` | ❌ Wave 0 |
| ROAD-01 | Overwrite=OFF blocks paint on already-painted tile (no new item placed) | integration | `pnpm test --run src/__tests__/brushStroke.test.ts` | ❌ Wave 0 |
| ROAD-01 | Overwrite=ON replaces existing ground item at painted tile | integration | `pnpm test --run src/__tests__/brushStroke.test.ts` | ❌ Wave 0 |
| ROAD-01 | Brush paint at tile where furniture exists does NOT block placement (D-41 layer independence) | integration | `pnpm test --run src/__tests__/brushStroke.test.ts` | ❌ Wave 0 |
| ROAD-02 | Clicking a rug fixture sets `toolMode='stamp'`, not `'brush'` | unit | `pnpm test --run src/__tests__/setActiveFixture.test.ts` | ❌ Wave 0 |
| ROAD-02 | Rug placement flow unchanged from Phase 1 (regression) | regression | `pnpm test --run src/__tests__/editorStore.test.ts` | ✅ (extend) |
| ROAD-03 | `snapToAxis((1,1),(1,5))` → vertical; `snapToAxis((1,1),(5,2))` → horizontal | unit | `pnpm test --run src/__tests__/lineRasterize.test.ts` | ❌ Wave 0 |
| ROAD-03 | Fence line from `(1,1)` to `(1,5)` produces 3 tiles (step=2): `[(1,1),(1,3),(1,5)]` | unit | `pnpm test --run src/__tests__/lineRasterize.test.ts` | ❌ Wave 0 |
| ROAD-03 | Confirmed fence line = 1 zundo history entry | integration | `pnpm test --run src/__tests__/fenceLineTool.test.ts` | ❌ Wave 0 |
| ROAD-03 | Escape during fence line preview cancels; no items placed; no history entry | integration | `pnpm test --run src/__tests__/fenceLineTool.test.ts` | ❌ Wave 0 |
| ROAD-04 | `getItemLayer({layoutType:'road'})` returns `'ground'` | unit | `pnpm test --run src/__tests__/fixtures.test.ts` | ✅ (extend) |
| ROAD-04 | `EditorCanvas` renders `<GroundLayer>` before `<FurnitureLayer>` (already Phase 1) | existing | `pnpm test --run` | ✅ |
| D-42 | Remove-mode drag across 3 ground tiles removes all 3 as single undo step | integration | `pnpm test --run src/__tests__/brushErase.test.ts` | ❌ Wave 0 |
| D-42 | Remove-mode drag ignores furniture items under cursor (single-click only per Phase 1 D-21) | integration | `pnpm test --run src/__tests__/brushErase.test.ts` | ❌ Wave 0 |
| D-43 | `withBatchedUndo(() => { place×3 })` writes exactly 1 entry to `pastStates` | unit | `pnpm test --run src/__tests__/temporalBatch.test.ts` | ❌ Wave 0 |
| D-46 | `GridLines` component renders `<Line>` with `dash` prop defined | snapshot / dom | `pnpm test --run src/__tests__/gridLayer.test.tsx` | ❌ (optional) |

### Sampling Rate
- **Per task commit:** `pnpm test --run <specific file>` (< 5 seconds)
- **Per wave merge:** `pnpm test --run` (full Vitest suite, < 30 seconds given Phase 1 size)
- **Phase gate:** full suite green + manual UX smoke test in dev server (brush paint, fence line, undo stroke, Remove mode drag-erase)

### Manual-only checks (documented, not automated)
- Dashed grid visual matches screenshot at 0.15×, 1×, 3× zoom
- Fence confirm/cancel overlay is discoverable and keyboard-accessible
- Drag-paint feels responsive at 60fps (no jank from store thrash)
- Brush cursor icon is distinguishable from stamp crosshair

### Wave 0 Gaps
- [ ] `src/__tests__/groundSubtype.test.ts` — covers ROAD-01 classifier
- [ ] `src/__tests__/lineRasterize.test.ts` — covers ROAD-01 & ROAD-03 rasterization + axis snap
- [ ] `src/__tests__/brushStroke.test.ts` — covers ROAD-01 drag-paint + overwrite + layer independence
- [ ] `src/__tests__/fenceLineTool.test.ts` — covers ROAD-03 line-tool lifecycle
- [ ] `src/__tests__/brushErase.test.ts` — covers D-42 remove-mode drag
- [ ] `src/__tests__/temporalBatch.test.ts` — covers D-43 zundo pause/resume helper
- [ ] `src/__tests__/setActiveFixture.test.ts` — covers D-30 tool-mode auto-switch
- [ ] Extend `src/__tests__/fixtures.test.ts` — add `getItemLayer` test for `layoutType='road'`
- [ ] Extend `src/__tests__/editorStore.test.ts` — add regression test for rug stamp unchanged
- Framework install: none — Vitest 3.x already installed
- Fixture data: use the real-data sample dump above (road id=111, fence id=114, color tile id=544) as test inputs; avoid hitting the network in tests

---

## Risks and Open Questions

### Risks

**R-01 — HIGH: Schema fix is a hidden precondition.** `getItemLayer()` currently misclassifies `layoutType='road'` fixtures. Without the fix, any brush-placed road will register as a furniture-layer item, breaking ROAD-04 and D-41 (layer independence). **Mitigation:** make the schema fix the first plan (1-1) of Phase 2, with an extension test on `getItemLayer({layoutType:'road'}) === 'ground'`. No brush work can proceed without it.

**R-02 — MEDIUM: 1×1 brush vs 2×2 fixture tension (D-32).** Every brush target in the game data is 2×2. "1×1" must be read as "1 fixture per sample," and rasterization must step by the fixture's grid width (not by 1). **Mitigation:** lock this interpretation in the plan; add a unit test that drag from `(0,0)` to `(4,0)` with a 2×2 fixture produces 3 items at `(0,0),(2,0),(4,0)` (not 5 overlapping items). If in-game roads are ever 1×1 in some future update, the rasterize step parameter automatically adapts.

**R-03 — MEDIUM: Undo flash gap for deletions.** `findChangedItemIds` cannot flash items that were deleted by an undo (they're not in `after`). A brush stroke undo removes many items at once — nothing flashes. **Mitigation:** explicitly document "undo of brush stroke: no flash; redo of brush stroke: flashes all re-added tiles" in the plan. Acceptable UX since the tiles visibly disappear. No code change needed beyond the doc. Fixing properly (two-phase flash before delete) is out of scope.

**R-04 — MEDIUM: Store thrash during drag-paint.** Each painted tile triggers `placeItem` which calls `set()` on Zustand, which re-renders every subscriber of `placedItems`. A fast drag across 30 tiles = 30 re-renders of `GroundLayer`, `GhostPreview`, and any component reading `placedItems` via selector. **Mitigation:** `withBatchedUndo` only batches *history*, not rendering. For rendering, either (a) accept 30 quick re-renders (Phase 1 has `React.memo` on GridLayer; PlacedItem is already keyed by ID so unchanged items won't re-render — likely fine), or (b) use Zustand's `setState` with a function that merges multiple tiles into ONE `set()` per frame (requires a small transient buffer in the drag handler). Option (a) first; profile with React DevTools only if dropped frames.

**R-05 — LOW: zundo `equality` function short-circuits the "commit" set.** The current `equality` fn compares `placedItems` reference. The commit `setState` in `endStrokeBatch()` writes `{ placedItems: { ...s.placedItems } }` — a new reference — so equality returns `false` and the entry is recorded. **Mitigation:** add a regression test `temporalBatch.test.ts::'commit set() writes exactly one entry'`.

**R-06 — LOW: onMouseLeave / window-blur during an active drag leaves zundo paused.** If user drags off-canvas and releases outside, `handleStageMouseUp` never fires. **Mitigation:** call `endStrokeBatch()` from `handleMouseLeave` (if `isPaintingRef.current`) and from a window `'blur'` listener. Add a Wave 0 test: `fireEvent.mouseLeave(stage)` during an active paint → stroke committed + zundo tracking resumed.

**R-07 — LOW: react-konva 19 + pointer events.** No known issues. Falling back to mouse-only is trivial if problems surface (remove `onPointerMove={handleMouseMove}` from `EditorCanvas.tsx`).

**R-08 — LOW: 100×100 grid with 200 dashed lines.** Dashed stroke is more expensive than solid, but not meaningfully so at this count. If a 100×100 grid drops frames at extreme zoom out, memoize `GridLines` by `{gridWidth, gridDepth, stageScale}` rounded to 1 decimal (already memoed at outer level).

### Open Questions

1. **Should the Phase 2 schema-fix task also bring in `mysekaiSystemFixtures.json` for real gate/house IDs?**
   - What we know: Phase 1 uses placeholder IDs `-1`, `-2` with a TODO comment.
   - What's unclear: is this file actually present in sekai-master-db-diff, or is gate/house info in a different source? Initial curl did not show it; further investigation needed.
   - Recommendation: **out of scope for Phase 2.** Defer to a separate phase or a dedicated task in Phase 5 (sprite pipeline) where system fixtures are hydrated from real data. Phase 2 only needs to paint/line-draw; gate/house integration is unchanged.

2. **Does brush mode auto-activate on hotbar key press (1-9) if that hotbar slot holds a ground-paintable fixture?**
   - What we know: Phase 1 hotbar always switches to `'stamp'` mode (`editorStore.ts:181`).
   - What's unclear: per D-30, clicking a ground-paintable in the catalog switches to brush mode. Does the same apply to hotbar?
   - Recommendation: yes, for consistency. Update `activateHotbar` to route through the same logic as `setActiveFixture` — extract the "pick tool mode from fixture" decision into a helper `pickToolModeForFixture(fixture)` and call it from both. Small scope; planner can fold into the brush-infrastructure plan.

3. **How does the Overwrite toggle interact with a brush drag-paint that crosses both empty and occupied tiles?**
   - What we know: D-40 says Overwrite applies the same as stamp. D-31 says mousedown-drag paints every tile.
   - What's unclear: if Overwrite=OFF and the user drags across mixed tiles, should the stroke skip occupied tiles (paint what it can) or abort on first collision?
   - Recommendation: **skip occupied tiles; continue painting the rest.** Matches intuitive paintbrush behavior (can't paint through walls, but the brush itself doesn't stop). Add a unit test: drag across 5 tiles, middle one occupied → 4 new items placed.

4. **Does "one drag-stroke = one undo step" still hold if the user presses Escape mid-stroke?**
   - What we know: Escape cancels fence line (D-36). No explicit rule for brush drag.
   - Recommendation: Escape mid-drag is physically unreachable (Escape is keyboard, mouse button is held). Ignore this case. If a user releases mouse then hits Escape, the stroke is already committed — Escape has no effect on past undo history.

### Not Answered
- Exact in-game grid origin verified against the actual running game (§7). Best-effort convention provided; not independently verified.
- Whether there is a `mysekaiSystemFixtures.json` file or alternative data source for mandatory fixture positions.

---

## Sources

### Primary (HIGH confidence)
- `https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main/mysekaiFixtures.json` — Live fixture data (1,239 records, verified 2026-04-10)
- `https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main/mysekaiFixtureMainGenres.json` — Main genre table; confirmed IDs 12/13/31 = 道/柵/カラータイル
- `https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main/mysekaiFixtureSubGenres.json` — Sub-genre table
- `node_modules/zundo/dist/index.d.ts` (installed 2.3.0) — Type definitions confirming `pause()/resume()/isTracking` API
- `node_modules/zundo/README.md` — Quoted sections on pause/resume semantics and `handleSet` throttle pattern
- `src/types/editor.ts`, `src/stores/editorStore.ts`, `src/data/fixtures.ts`, `src/components/canvas/EditorCanvas.tsx` — Phase 1 source code (direct inspection)

### Secondary (MEDIUM confidence)
- [Konva Stage API](https://konvajs.org/api/Konva.Stage.html) — Stage draggable, `dragDistance`, event semantics
- [Konva Drag Stage docs](https://konvajs.org/docs/drag_and_drop/Drag_a_Stage.html) — Basic stage drag pattern
- [Konva Complex Drag Bounds](https://konvajs.org/docs/drag_and_drop/Complex_Drag_and_Drop.html) — `dragBoundFunc` snap pattern
- [Ali Karaki "Canvas editors in Konva"](https://www.alikaraki.me/blog/canvas-editors-konva) — General editor architecture patterns
- [Sekaipedia: MySEKAI](https://www.sekaipedia.org/wiki/MySEKAI) — 90×90 max outdoor area confirmation
- [Project Sekai Wiki: My SEKAI](https://projectsekai.fandom.com/wiki/My_SEKAI) — Gate lore
- [game8.jp MySekai guide](https://game8.jp/pjsekai/663229) — Road/fence drag placement (Japanese)
- [Yahoo 知恵袋 road drag thread](https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q13309246123) — User confirmation of road/fence drag
- [Bresenham's line algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm) — Canonical reference
- [mykolav/typescript-bresenham](https://github.com/mykolav/typescript-bresenham) — TypeScript reference implementation
- [Thomas Oh — Bresenham in turn-based tile games (Medium)](https://medium.com/swlh/bresenhams-algorithm-in-a-turn-based-tile-game-vanilla-javascript-7eed9bb1aaf0) — Practical tile-walk example

### Tertiary (LOW confidence — for pattern ideas only)
- [charkour/zundo GitHub](https://github.com/charkour/zundo) — Confirmed via installed copy; web search is redundant but cross-checks version
- [Happy Island Designer](https://github.com/eugeneration/HappyIslandDesigner) — Paper.js paint-brush reference; not directly applicable to Konva

---

## Metadata

**Confidence breakdown:**
- Classifier (§1): **HIGH** — verified against live data; `handleType` is unambiguous
- Schema bugs in Phase 1 (§1 Issues A/B): **HIGH** — confirmed by reading live JSON and local source
- zundo batching (§2): **HIGH** — verified in installed type declarations and README
- Line rasterization (§3): **HIGH** — classic, well-tested algorithm
- Konva event conflict (§4): **MEDIUM-HIGH** — pattern is standard; one reactive flag confirmed via Konva docs
- Reference implementations (§5): **MEDIUM** — no exact match found, general patterns apply
- In-game UX verification (§6): **MEDIUM** — road drag is well-supported; color tile drag is inferred
- Grid origin convention (§7): **MEDIUM** — reasoned from gate dimensions and existing Phase 1 placement; not independently verified
- Dashed grid values (§8): **MEDIUM** — values match Konva conventions but are stylistic; iterate in review
- Validation architecture: **HIGH** — Vitest already installed, test patterns match Phase 1

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (live game data, fast-moving; schema could change with a game update)

---

## RESEARCH COMPLETE
