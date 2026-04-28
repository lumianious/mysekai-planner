# Phase 5: Sprite Pipeline - Research

**Researched:** 2026-04-28
**Domain:** Offline asset extraction (Python + Unity bundles) + headless 3D rendering (Blender bpy) + frontend canvas integration (react-konva)
**Confidence:** MEDIUM-HIGH (Blender + react-konva pieces are HIGH; sssekai/UnityPy → glTF roundtrip with materials is MEDIUM and requires a prototype task)

## Summary

Phase 5 ships an **offline, locally-run** Python pipeline that produces ~1,126 transparent top-down PNGs (one per outdoor fixture) plus a `manifest.json`, then wires those sprites into `PlacedItem.tsx` with graceful colored-rectangle fallback. The pipeline has three stages — **download** (sssekai `abcache`), **route** (`getGroundSubtype` → 2D-texture-extract or 3D-render branch), and **render/export** (UnityPy texture dump for 2D items; Blender headless orthographic render for 3D items). All sprite assets commit directly to `public/sprites/` and ship via GitHub Pages.

The single highest-uncertainty step is the **3D branch's Unity → Blender material handoff**. UnityPy's built-in extractor outputs OBJ only (no materials, no GameObject hierarchy preservation), so the prototype must validate one of two paths: (a) headless invocation of the `sssekai_blender_io` addon (which handles Project Sekai's specific shader+material conventions but is "interactive-first"), or (b) a custom UnityPy → glTF (GLB) writer that bundles mesh + diffuse texture per fixture. Path (a) is preferred if the addon's import operator can be called from `bpy.ops.sssekai.*` in headless mode; path (b) is the documented fallback.

The 2D branch is straightforward: UnityPy reads the asset bundle, locates the main `Texture2D` referenced by the fixture's `Material`, and writes it as PNG. Roads/fences/floor-surfaces in MySekai are already authored as top-down tile textures in-engine, so the diffuse texture *is* the sprite.

Frontend integration is a small, contained edit to `PlacedItem.tsx`: replace the `<Rect fill={fillColor}>` block with a manifest-driven branch that renders `<Image image={useImage(spriteUrl)[0]}>` when a manifest entry exists and falls back to the existing rectangle when it doesn't. Konva's `<Group rotation>` already handles rotation; sprite scaling is `width = gridSize.width × TILE_SIZE` (32 px/tile), and the source PNG is rendered at 4× oversampling (128 px/tile) so zoom-in stays crisp.

**Primary recommendation:** Build the pipeline as three small Python scripts (`download.py`, `extract_2d.py`, `render_3d.py`) plus an `assemble_manifest.py` orchestrator, with Blender 4.x LTS invoked via `subprocess` from `render_3d.py` using `blender --background --python render_one.py -- --glb <path> --out <png> --tiles W,H`. Validate the Unity-asset-to-Blender path on a 3-fixture pilot (one cube-ish item, one tall item, one wide item) before scaling to all 1,126.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pipeline location & deliverable shape**
- D-01: Python toolchain lives in `scripts/sprite-pipeline/` in this repo
- D-02: Generated PNGs commit to `public/sprites/`; revisit GitHub Releases if total > ~150MB
- D-03: Pipeline runs local-only — no CI execution

**Output format & resolution**
- D-04: Per-fixture PNG, no atlas — Konva `<Image>` loads each directly
- D-05: 128 px per grid tile (4× oversampling at TILE_SIZE=32). Cap total bundle ~150MB; fall back to 96 px/tile if exceeded
- D-06: Filename = `{assetbundleName}.png`
- D-07: Transparent PNG, no baked shadow

**3D-render vs 2D-texture split**
- D-08: Use existing `getGroundSubtype` (in `src/data/fixtures.ts`) as the routing rule. Truthy → 2D texture extraction. Falsy → 3D Blender render.
- D-09: `scripts/sprite-pipeline/overrides.yaml` for edge-case classification overrides; empty by default

**Asset bundle sourcing & versioning**
- D-10: Manual one-off extraction with documented recipe. Bundles cache to `scripts/sprite-pipeline/assets-cache/` (gitignored)
- D-11: Re-extraction trigger is data-driven — when upstream `mysekaiFixtures.json` shows new fixture IDs not in local manifest. ~1–2× per year
- D-12: Sourcing recipe documented in `scripts/sprite-pipeline/README.md` using `sssekai abcache` with `--app-region jp --app-version <CURRENT> --app-appHash <CURRENT_UUID> --download-filter ".*mysekai.*" --download-ensure-deps`
- D-13: Pin `sssekai==0.8.0`, Blender 4.x LTS, Python 3.11; `UnityPy` (sssekai's pinned dep)
- D-14: Stamp extraction context in `assets-cache/.extracted-with` (app-version, app-hash, sssekai version, date)
- D-15: Twintail noted as fallback for download+decrypt only — sssekai/UnityPy still needed for asset extraction

**Rotation & coverage fallback**
- D-16: Render once, rotate in Konva. Pipeline produces 1 PNG per fixture (not 4)
- D-17: Graceful fallback when sprite is missing — `PlacedItem.tsx` keeps colored-rectangle render path
- D-18: `public/sprites/manifest.json` schema: `{ version, extracted_at, fixtures: { [assetbundleName]: { mode: "2d"|"3d", sprite, size_px: [W,H] } } }`. Web app fetches once on app boot

### Claude's Discretion

- Pipeline internal architecture (single script vs split into extract/render/assemble)
- Blender camera setup specifics (frustum padding, lighting rig, AA samples)
- glTF vs FBX as Blender intermediate format — researcher recommends glTF (GLB)
- Web-side preloading strategy (eager all on catalog open vs lazy per-render)
- Color-variant handling — render base variant only; ignore `colorCode` for sprite selection (already deferred)

### Deferred Ideas (OUT OF SCOPE)

- Color variants per fixture (Phase 1 D-12)
- Animated sprites (some fixtures animate in-game; static frame only)
- Indoor fixtures (113 indoor-only items excluded)
- Atlas / sprite-sheet packing (revisit only if HTTP request count becomes measurable problem)
- Shadow rendering (Konva can add shadow filter later if needed)
- Automated CI re-extraction (Phase 5 PIPE-01 in v2)
- Visual QA viewer (in-game vs render side-by-side)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPRT-01 | Asset extraction pipeline downloads MySekai fixture 3D models from game bundles via sssekai | §"sssekai abcache" — confirmed CLI signature, `mos9527/sekai-apphash` provides daily-refreshed hashes, recipe in D-12 |
| SPRT-02 | Pipeline extracts 2D textures directly for flat items (roads, fences, floor surfaces) | §"2D-Texture Branch" — UnityPy walks bundle, finds `Material` → `m_SavedProperties._TexEnvs._MainTex` → `Texture2D.image.save()` |
| SPRT-03 | Pipeline renders orthographic top-down view via Blender headless scripting | §"3D-Render Branch (Blender)" — `blender --background --python` with `bpy.ops.import_scene.gltf` + ortho camera at +Z |
| SPRT-04 | Outputs transparent PNG sprites at consistent resolution per grid unit | §"Sprite-Size Math" — render canvas = `gridSize.width × 128 px` by `gridSize.depth × 128 px`; `film_transparent=True`, `color_mode='RGBA'` |
| SPRT-05 | Batch-automated for ~1,126 outdoor fixtures with no manual intervention | §"Pipeline Architecture" — `assemble.py` iterates fixture list filtered by `mysekaiSettableSiteType !== 'room'` and applies routing per D-08 |
| SPRT-06 | Sprites served as static assets on GitHub Pages | §"GitHub Pages Deployment" — Vite copies `public/` verbatim; ~50–100 MB bundle within Pages 1 GB repo limit |
| SPRT-07 | Grid editor renders top-down sprites for placed items | §"Frontend Integration" — `useImage` hook + manifest fetch in `PlacedItem.tsx`; fallback to existing colored rect when `manifest[assetbundleName]` missing |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

**From `./CLAUDE.md` and `~/Personal/CLAUDE.md`:**

- **DocOps three-layer protocol:** L1 (`/CLAUDE.md`) updated only on architecture changes; L2 (`/{module}/CLAUDE.md`) updated when module file list/interfaces change — adding `scripts/sprite-pipeline/` is a new top-level module and **MUST** add `scripts/sprite-pipeline/CLAUDE.md`. Updating `PlacedItem.tsx` touches `src/components/canvas/` — verify L2 there if it exists.
- **L3 file headers:** Every new Python file needs a top-of-file comment block stating `INPUT / OUTPUT / POS`. Match the project's existing TypeScript header style.
- **Chinese code comments with ASCII separators** (`// ======== 段落标题 ========`). Apply the same convention to Python (`# ======== 段落标题 ========`).
- **File ≤ 800 lines, function ≤ 50 lines, ≤ 3 nesting levels, directory ≤ 8 files per level** — split scripts if any individual file approaches 800 lines.
- **Three-Question Filter:** before each task ask (1) Real need or speculation? (2) Simpler approach? (3) What breaks?
- **Scope discipline:** discoveries outside the task → log, don't fix. The pipeline must NOT modify Phase 2's `getGroundSubtype` or any other unrelated code; it consumes them.
- **Backward compatibility:** sprites are additive — colored-rectangle render path stays for fallback (D-17). Existing tests must keep passing.
- **GSD workflow:** all file edits go through this phase's PLAN tasks.

## Standard Stack

### Pipeline (Python — runs locally)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `sssekai` | `==0.8.0` (pinned, archived 2026-02-25) | Project Sekai asset-bundle download + index DB | Only mature, purpose-built tool. `abcache` subcommand handles app-hash auth headers + dependency resolution + filter-by-regex. Wrapped UnityPy. |
| `UnityPy` | `>=1.20` (sssekai 0.8.0 pin satisfies) | Read Unity AssetBundles in pure Python — extract `Texture2D`, `Mesh`, `Material`, `MonoBehaviour` | Industry-standard Python equivalent of AssetStudio. Active. Used by sssekai internally. |
| `Pillow` | `>=10.4` | PNG read/write/resize/composite | Universal Python imaging. Used to save `Texture2D` outputs and post-process Blender PNGs. |
| `pyyaml` | `>=6.0` | Read `overrides.yaml` (D-09) | Standard. |
| `tqdm` | `>=4.66` | Progress bars over 1,126 fixtures | Quality-of-life for a 1k-iteration batch. |

### 3D Render Engine (separate runtime)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Blender | **4.5 LTS** (or latest 4.x LTS) | Headless renderer for 3D items (D-13) | LTS = 2-year support, stable bpy API. `--background --python` is the canonical headless invocation pattern. Eevee Next renders fast enough; Cycles for nicer materials if Eevee output disappoints. |

### Frontend (already in `package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `use-image` | `^1.1` (NEW — to add) | React hook that loads URL → DOM `Image` element + status | Official Konva-team hook. Returns `[image, status]` where status is `"loading" | "loaded" | "failed"`. Trivial fallback gating. |
| `react-konva` | `^19.2.3` (already installed) | `<Image image={...}>` accepts the DOM image from `use-image` | Already in stack. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sssekai for download | **twintail** (Rust, active 2025) | Faster + actively maintained — but only handles download+decrypt, doesn't replace UnityPy for extraction. Keep as fallback per D-15. |
| UnityPy → custom GLB writer for 3D items | sssekai_blender_io addon invoked headlessly | Addon understands Project Sekai's specific shaders + materials, would produce visually nicer renders. But "interactive-first" — bpy headless invocation of addon operators is technically possible but unvalidated. **Prototype task should validate this before committing.** |
| Per-fixture PNG | Sprite atlas + manifest UV coords | Atlas saves HTTP requests but breaks per-fixture-iteration workflow. With HTTP/2 multiplexing the request count cost is negligible. Already rejected (D-04). |
| Blender Eevee Next | Cycles | Cycles produces nicer materials but is 5–10× slower. For top-down planning sprites, Eevee Next is sufficient. |

### Installation

```bash
# scripts/sprite-pipeline/requirements.txt
sssekai==0.8.0
Pillow>=10.4
pyyaml>=6.0
tqdm>=4.66

# scripts/sprite-pipeline/README.md prerequisites:
# - Python 3.11
# - Blender 4.5 LTS on PATH (or document BLENDER_BIN env var)
# - macOS / Linux / WSL — Blender Python on Windows-native works but file-paths quoting differs

cd scripts/sprite-pipeline
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend addition
pnpm add use-image
```

### Version Verification

Before locking versions, verify against PyPI / npm / Blender:

```bash
pip index versions sssekai            # Should report 0.8.0 latest
pip index versions UnityPy            # Use whatever sssekai 0.8.0 pulls
npm view use-image version            # Should report 1.1.x
# Blender: download 4.x LTS from blender.org/download/lts/
```

If `sssekai 0.8.0` no longer installs from PyPI (the repo is archived, but the package on PyPI should remain), the fallback is `pip install git+https://github.com/mos9527/sssekai.git@v0.8.0` against a forked/mirrored archive.

## Architecture Patterns

### Recommended Project Structure

```
scripts/sprite-pipeline/
├── README.md                    # Manual run recipe + prerequisites
├── CLAUDE.md                    # L2 module map (DocOps L2)
├── requirements.txt             # Python deps pinned
├── overrides.yaml               # D-09 — empty by default
├── pipeline/
│   ├── __init__.py
│   ├── config.py                # TILE_PX=128, paths, fixture-data URL
│   ├── routing.py               # Mirrors getGroundSubtype logic in Python (D-08)
│   ├── download.py              # subcommand 1: sssekai abcache wrapper
│   ├── extract_2d.py            # subcommand 2: UnityPy → diffuse PNG
│   ├── render_3d.py             # subcommand 3: spawn Blender headless per fixture
│   ├── assemble_manifest.py     # subcommand 4: write public/sprites/manifest.json
│   └── blender_render.py        # standalone bpy script invoked via `blender -b -P`
├── assets-cache/                # gitignored — bundle cache + .extracted-with
└── tests/
    ├── test_routing.py          # parity check vs JS getGroundSubtype output
    ├── test_extract_2d.py       # snapshot one known fixture's diffuse extraction
    └── test_manifest.py         # validates manifest schema

public/sprites/
├── manifest.json                # generated, committed
└── <assetbundleName>.png        # generated, committed (~1,126 files)

src/components/canvas/PlacedItem.tsx   # MODIFIED — sprite-or-rect branch
src/data/spriteManifest.ts             # NEW — fetch + cache manifest.json on app boot
src/types/spriteManifest.ts            # NEW — TS types for manifest
```

CLI entrypoint via a single `pipeline.py` shim with subcommands:

```bash
python -m pipeline download             # → assets-cache/bundles/
python -m pipeline extract-2d           # → public/sprites/<bundle>.png (flat items)
python -m pipeline render-3d            # → public/sprites/<bundle>.png (3D items)
python -m pipeline assemble-manifest    # → public/sprites/manifest.json
python -m pipeline run-all              # all of the above in order
```

### Pattern 1: sssekai abcache download (verified)

**Source:** `mos9527/sssekai` wiki via WebFetch + `mos9527/sekai-apphash` README.

```bash
# Step 1 — fetch current production app-hash for jp
APPHASH=$(curl -s https://raw.githubusercontent.com/mos9527/sekai-apphash/refs/heads/master/jp/apphash.json | python -c "import json,sys; d=json.load(sys.stdin); print([x for x in d if 'production' in x.get('environment','')][0]['appHash'])")

# Step 2 — fetch current app-version (manual; from sekai.best or Apkpure — currently 6.4.1 as of 2026-04-10)
APPVERSION=6.4.1

# Step 3 — download MySekai bundles only
sssekai abcache \
  --db scripts/sprite-pipeline/assets-cache/abcache.db \
  --app-region jp \
  --app-version "$APPVERSION" \
  --app-appHash "$APPHASH" \
  --download-filter ".*mysekai.*" \
  --download-ensure-deps \
  --download-dir scripts/sprite-pipeline/assets-cache/bundles/
```

Filter `.*mysekai.*` narrows the ~50 GB total bundle index to ~2 GB of MySekai-related bundles. `--download-ensure-deps` resolves shared material/shader bundle deps automatically.

**Stamp the context** to `.extracted-with` per D-14:

```bash
cat > scripts/sprite-pipeline/assets-cache/.extracted-with <<EOF
sssekai_version: 0.8.0
app_version: $APPVERSION
app_hash: $APPHASH
extracted_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
```

### Pattern 2: 2D-Texture Branch (UnityPy)

For each fixture where `getGroundSubtype` is truthy, the pipeline opens the asset bundle (named after `fixture.assetbundleName`), walks objects, locates the main diffuse texture, and writes it as PNG.

```python
# pipeline/extract_2d.py — abridged
import UnityPy
from PIL import Image

def extract_diffuse(bundle_path: str, out_path: str) -> tuple[int, int]:
    env = UnityPy.load(bundle_path)
    # 1) find Material objects
    material = next(
        (obj.read() for obj in env.objects if obj.type.name == "Material"),
        None,
    )
    if material is None:
        raise ValueError(f"no Material in {bundle_path}")
    # 2) follow _MainTex PPtr to Texture2D
    main_tex_pptr = material.m_SavedProperties.m_TexEnvs.get("_MainTex")
    if main_tex_pptr is None:
        # fallback: any Texture2D in bundle
        tex = next(o.read() for o in env.objects if o.type.name == "Texture2D")
    else:
        tex = main_tex_pptr.m_Texture.read()
    # 3) save as PNG (UnityPy gives us a PIL.Image via .image)
    img: Image.Image = tex.image
    img.save(out_path, format="PNG")
    return img.size
```

### Pattern 3: 3D-Render Branch (Blender headless)

`render_3d.py` spawns Blender once per fixture (or batches in groups via a list-driven script for speed). The Blender script imports the GLB, sets up an orthographic camera looking down -Z, sets render canvas to `(W × 128, D × 128)` px, enables transparent film, and renders.

**Step 1 — convert Unity bundle to GLB.** UnityPy's built-in extractor writes only `.obj` and discards GameObject hierarchy — confirmed by reading `UnityPy/tools/extractor.py`. Two options:

- **Option A (preferred): headless `sssekai_blender_io` addon.** The addon registers Blender operators under `bpy.ops.sssekai.*` for importing Unity bundles directly. If those operators run in `--background` mode (validate in pilot), we skip the GLB middle step and Blender ingests the bundle natively. **Validation task in plan.**
- **Option B (fallback): UnityPy → glTF writer.** Read Mesh + Material + Texture2D from bundle, build a minimal glTF JSON with one mesh + one PBR material referencing the diffuse texture, save as `.glb`. About 80 lines of Python using `pygltflib` (NEW dep if path B is taken).

**Step 2 — Blender render script** (`pipeline/blender_render.py`):

```python
# ======== 顶视图正交渲染（Blender 4.x headless） ========
# INPUT:  --asset <path to .glb or Unity bundle>, --out <png>, --tile-w N, --tile-d N
# OUTPUT: 透明 PNG 写到 --out
# POS:    scripts/sprite-pipeline/pipeline/blender_render.py
# 通过 `blender --background --python blender_render.py -- ...` 调用

import bpy, sys, argparse, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
ap = argparse.ArgumentParser()
ap.add_argument("--asset", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--tile-w", type=int, required=True)  # gridSize.width
ap.add_argument("--tile-d", type=int, required=True)  # gridSize.depth
ap.add_argument("--px-per-tile", type=int, default=128)
args = ap.parse_args(argv)

# 1) 清空默认场景
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2) 导入资产 — GLB 或 sssekai_blender_io 算子
if args.asset.endswith(".glb"):
    bpy.ops.import_scene.gltf(filepath=args.asset)
else:
    # 走 sssekai_blender_io（待验证）
    bpy.ops.sssekai.import_unity(filepath=args.asset)

# 3) 计算所有几何体的 AABB
bpy.context.view_layer.update()
mins = Vector((+1e9,)*3); maxs = Vector((-1e9,)*3)
for obj in bpy.data.objects:
    if obj.type != "MESH": continue
    for v in obj.bound_box:
        wv = obj.matrix_world @ Vector(v)
        mins = Vector(map(min, mins, wv))
        maxs = Vector(map(max, maxs, wv))
center = (mins + maxs) * 0.5
size = maxs - mins

# 4) 添加正交相机，俯视 (-Z)
cam_data = bpy.data.cameras.new("TopDown")
cam_data.type = "ORTHO"
cam_data.ortho_scale = max(size.x, size.y) * 1.02   # 2% padding
cam = bpy.data.objects.new("TopDown", cam_data)
cam.location = (center.x, center.y, maxs.z + 10)
cam.rotation_euler = (0, 0, 0)                       # 俯视 -Z
bpy.context.scene.collection.objects.link(cam)
bpy.context.scene.camera = cam

# 5) 灯光 — 方向光从相机方向打下来（避免顶视零着色）
light_data = bpy.data.lights.new("Sun", type="SUN")
light_data.energy = 3.0
light = bpy.data.objects.new("Sun", light_data)
light.rotation_euler = (math.radians(15), 0, math.radians(45))
bpy.context.scene.collection.objects.link(light)

# 6) 渲染设置
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"           # Blender 4.2+ 默认
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.resolution_x = args.tile_w * args.px_per_tile
scene.render.resolution_y = args.tile_d * args.px_per_tile
scene.render.resolution_percentage = 100
scene.render.filepath = args.out

# 7) 渲染
bpy.ops.render.render(write_still=True)
```

**Step 3 — invoke from Python:**

```python
# pipeline/render_3d.py — abridged
import subprocess
def render_one(glb_path: str, png_path: str, tile_w: int, tile_d: int) -> None:
    subprocess.run([
        "blender", "--background",
        "--python", "pipeline/blender_render.py",
        "--",
        "--asset", glb_path,
        "--out", png_path,
        "--tile-w", str(tile_w),
        "--tile-d", str(tile_d),
    ], check=True, capture_output=True)
```

### Pattern 4: Sprite-Size Math

The pipeline produces a PNG sized `(gridSize.width × 128) × (gridSize.depth × 128)` pixels per fixture. `TILE_SIZE = 32` in the editor, so the source PNG is 4× the on-screen size — sharp on zoom-in to ~4× without upscale blur.

In `PlacedItem.tsx`:

```tsx
const [w, d] = getEffectiveSize(fixture.gridSize, item.rotation)
const pixelWidth = w * TILE_SIZE     // 32 px/tile
const pixelHeight = d * TILE_SIZE
// Konva scales the 4× source PNG down to TILE_SIZE — no math needed:
<Image image={img} width={pixelWidth} height={pixelHeight} />
```

Rotation already lives on the wrapping `<Group rotation={item.rotation * 90}>`, so the same single PNG covers all 4 orientations (D-16).

### Pattern 5: Frontend Integration — Manifest + use-image

**Manifest fetcher** (NEW: `src/data/spriteManifest.ts`):

```ts
// ======== 精灵清单加载器 ========
// INPUT:  无（fetch /sprites/manifest.json）
// OUTPUT: Map<assetbundleName, SpriteManifestEntry>
// POS:    src/data/spriteManifest.ts

import type { SpriteManifest, SpriteManifestEntry } from '../types/spriteManifest'

let cache: Map<string, SpriteManifestEntry> | null = null
let inflight: Promise<Map<string, SpriteManifestEntry>> | null = null

export async function loadSpriteManifest(): Promise<Map<string, SpriteManifestEntry>> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}sprites/manifest.json`)
    if (!res.ok) {
      // 404 在开发期是常态 — 返回空 map，PlacedItem 全部走矩形回退
      cache = new Map()
      return cache
    }
    const json = (await res.json()) as SpriteManifest
    cache = new Map(Object.entries(json.fixtures))
    return cache
  })()
  return inflight
}

export function getSpriteEntrySync(assetbundleName: string): SpriteManifestEntry | undefined {
  return cache?.get(assetbundleName)
}
```

**Component edit** (`src/components/canvas/PlacedItem.tsx`):

```tsx
import useImage from 'use-image'
import { getSpriteEntrySync } from '../../data/spriteManifest'

// inside PlacedItem:
const spriteEntry = getSpriteEntrySync(fixture.assetbundleName)
const spriteUrl = spriteEntry
  ? `${import.meta.env.BASE_URL}${spriteEntry.sprite}`
  : undefined
const [spriteImg, spriteStatus] = useImage(spriteUrl ?? '', 'anonymous')

// in JSX, replace existing <Rect fill={fillColor}> block with:
{spriteImg && spriteStatus === 'loaded' ? (
  <Image
    image={spriteImg}
    width={pixelWidth}
    height={pixelHeight}
    listening={false}
  />
) : (
  // ======== 回退：彩色矩形（D-17 不破坏）========
  <Rect
    width={pixelWidth}
    height={pixelHeight}
    fill={fillColor}
    stroke="rgba(255, 255, 255, 0.3)"
    strokeWidth={1}
    cornerRadius={2}
  />
)}
```

Keep the `<Text>` label rendered always — useful when sprite is loading or missing, can be hidden behind a future "show labels" toggle.

**Boot loading:** Call `loadSpriteManifest()` in `App.tsx` (or wherever `mysekaiFixtures.json` is fetched) so the manifest cache is populated before any `PlacedItem` mounts. Use `Promise.all([loadFixtures(), loadSpriteManifest()])`.

### Anti-Patterns to Avoid

- **Don't render 4 PNGs per fixture for rotation.** Konva already rotates the `<Group>` cleanly. 4× output size for zero visual gain.
- **Don't bake shadow into the PNG.** D-07 forbids it; shadow would compound with neighbor sprites and look wrong on grid.
- **Don't skip `getGroundSubtype` parity.** The Python routing must produce the same classification as the JS classifier on every fixture, otherwise some flat items get rendered through Blender (slow, may look wrong with top-down on a flat texture).
- **Don't hardcode `assetbundleName` → file mapping.** Always derive from `fixture.assetbundleName`. The fixture-data file is the single source of truth.
- **Don't fetch sprites lazily inside render loops without caching.** `useImage` caches per-URL inside the hook, but rendering 100 placed items each calling `useImage(url)` creates 100 hook instances. Acceptable at this scale, but if perf becomes an issue, prefer a single shared image-cache module that returns DOM `Image` instances by URL.
- **Don't commit the `assets-cache/` directory.** It's the unprocessed Unity bundles (~2 GB) — gitignore at the directory level.
- **Don't run `sssekai abcache` against the network on every pipeline invocation.** D-10 says cache → re-extract is data-driven (D-11). The default `python -m pipeline run-all` MUST consume cached bundles; only `python -m pipeline download` hits the network.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Read Unity AssetBundles | Custom binary parser | UnityPy | Project-Sekai uses LZ4-compressed Unity bundles with versioned typetrees. ~thousands of LOC and ongoing Unity-version chasing if hand-rolled. |
| Download + decrypt Sekai bundles | HTTP client + custom decryptor | sssekai (with twintail as fallback) | Sekai's CDN auth uses rotating app-hash + region-specific decryption key. Reverse-engineered + maintained externally. |
| Render PNG from 3D mesh | OpenGL/three.js renderer | Blender headless | Mesh + material + lighting + ortho projection + AA + transparent compositing — Blender does all of it correctly. |
| Async image loading in React | Manual `useEffect(() => { const img = new Image(); ... })` | `use-image` (`konvajs/use-image`) | Handles loading/loaded/failed states, CORS attribute, referrer policy, cleanup. ~30 LOC vs official 1-line hook. |
| Project-Sekai shader replication | Custom Blender material network | sssekai_blender_io addon (if headless validates) — else accept simpler PBR | "Don't replicate Unity NPR shaders perfectly" is in `REQUIREMENTS.md` Out of Scope. Top-down planning sprites don't need it. |
| Find current app-hash | Reverse-engineer game APK each time | `mos9527/sekai-apphash` raw JSON (auto-refreshed daily at 02:00 UTC) | Already automated. Pull URL is `https://raw.githubusercontent.com/mos9527/sekai-apphash/master/jp/apphash.json`. |

**Key insight:** Three of the four pipeline stages (download, parse, render) have a single canonical, purpose-built tool. Hand-rolling any of them would be weeks of work for zero feature gain. The integration layer (Python orchestration + the Blender render script + the React render branch) is the only original code we should be writing.

## Runtime State Inventory

> Phase 5 is largely greenfield (new pipeline directory + a new manifest file + a contained `PlacedItem.tsx` edit). Most categories are "nothing." Documenting explicitly per protocol.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None** — no database is involved. Pipeline reads file inputs (`mysekaiFixtures.json` + Unity bundles) and writes file outputs (`public/sprites/*.png`, `manifest.json`). | None |
| Live service config | **None** — no external service configuration. GitHub Pages serves the static output directly from `public/`. | None |
| OS-registered state | **None** — pipeline is invoked manually via `python -m pipeline run-all`. No cron, no launchd, no systemd. | None |
| Secrets / env vars | **app-version + app-hash** are read from `mos9527/sekai-apphash` raw URL — these are published values, not secrets. They DO change with each game update; the recipe in D-12 documents how to refresh. No `.env` file needed. | None |
| Build artifacts / installed packages | **localStorage in users' browsers** holds Phase 3 persisted state (`placedItems`, `placedEdges`, etc.). Sprites are looked up at render time by `assetbundleName` which is already in the persisted data — **NO migration needed**. Existing saved designs continue to render: items with sprites get sprites; items without get the colored-rectangle fallback (D-17). | None |
| Build artifacts / installed packages | `public/sprites/` is a generated directory committed to git. First commit will be sizeable (~50–100 MB). Subsequent re-renders that update the same fixtures will create big delta commits. **Document this in `scripts/sprite-pipeline/README.md`.** | Document one-line warning |
| Build artifacts / installed packages | `assets-cache/` — gitignored (D-10). Confirm `.gitignore` adds it as part of the first plan. | Add to `.gitignore` |

**Canonical question — *"After every file is updated, what runtime systems still have the old string cached?"*** Nothing. There is no rename in this phase, only addition.

## Common Pitfalls

### Pitfall 1: Blender bpy API differs between 4.0 and 4.5

**What goes wrong:** Code written against Blender 4.5 uses `BLENDER_EEVEE_NEXT` engine; on 4.0–4.1 the engine ID is `BLENDER_EEVEE` and the Next engine doesn't exist.
**Why it happens:** Eevee Next was introduced in Blender 4.2 as preview, default in 4.5.
**How to avoid:** Pin Blender 4.5+ in README; on script start, `engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in bpy.types.RenderEngine.bl_idname.__class__.__members__ else "BLENDER_EEVEE"`. Or just use Cycles (`"CYCLES"`) for compatibility — slower but uniform across 4.x.
**Warning signs:** Blender stderr `Engine 'BLENDER_EEVEE_NEXT' not registered`.

### Pitfall 2: sssekai_blender_io operators may not work in `--background` mode

**What goes wrong:** Headless invocation `bpy.ops.sssekai.import_unity(filepath=...)` errors with `INVOKE_DEFAULT context required` or silently no-ops.
**Why it happens:** Many Blender operators are written for interactive UI context. The CONTEXT.md flagged this concern (D-15 area, addon "designed interactive-first").
**How to avoid:** **Build a 1-fixture pilot task as the first task in the plan.** If the addon import fails headlessly, fall back to UnityPy → custom GLB writer (Pattern 3 Option B). Don't scale to 1,126 fixtures before validating the route on 3.
**Warning signs:** `RuntimeError: Operator bpy.ops.sssekai.* requires UI context`.

### Pitfall 3: app-hash rotation invalidates cached bundles silently

**What goes wrong:** User runs the pipeline 3 months later, the cached `abcache.db` references bundle URLs that now 403 because Sekai rotated app-hash; sssekai re-downloads broken.
**Why it happens:** D-13 + D-14 document this. The `.extracted-with` stamp is the early-warning signal.
**How to avoid:** `download.py` reads `.extracted-with`; if `app_version` differs from current `mos9527/sekai-apphash` JSON, prompt user to clear cache + re-download.
**Warning signs:** sssekai HTTP 403 errors on re-run; bundle hashes don't match index.

### Pitfall 4: Top-down render of a flat textured plane has no geometry to light → renders black

**What goes wrong:** Some "3D" fixtures are actually a flat plane with a top-down texture (e.g., a manhole cover). With ortho camera at +Z and a single sun light angled the same direction, the plane's normals are perpendicular to the light → black.
**Why it happens:** Lambertian shading + `dot(N, L) ≈ 0`.
**How to avoid:** Either (a) tilt the sun light to ~30° off vertical so flat planes get partial lighting, or (b) set Blender material `Emission` strength so the diffuse texture shows through unlit, or (c) reclassify these via `overrides.yaml` to the 2D-texture branch.
**Warning signs:** Some sprites in spot-checks are entirely black despite expected appearance.

### Pitfall 5: Bounding-box camera framing breaks on items with stray off-grid geometry

**What goes wrong:** A fixture has a tiny "decoration" mesh far from origin (animation-rig artifact, particle emitter, or invisible collider mesh). The AABB-driven `ortho_scale` zooms way out; the actual visible mesh is a 5-pixel speck in the corner.
**Why it happens:** Unity GameObject hierarchies often include hidden helper objects.
**How to avoid:** Filter meshes by visibility flag, vertex count > N, or material presence before computing AABB. Or hardcode the camera to frame `gridSize.width × gridSize.depth` world-units centered at origin and trust that the fixture mesh is already authored at the correct scale (Sekai's MySekai fixtures appear to be — verify in pilot).
**Warning signs:** Sprite shows tiny object floating in a sea of transparency.

### Pitfall 6: PNG file size blowout

**What goes wrong:** Hardware-rendered Blender PNG is 32-bit RGBA with no compression tuning → a 4×4-tile fixture at 128 px/tile is `512×512×4 = 1 MB`. Times 1,126 = ~1 GB. Bundle exceeds D-02 cap.
**Why it happens:** Default PNG settings are lossless + uncompressed.
**How to avoid:** Post-process every output through `Pillow` with `optimize=True` and pngquant-equivalent palette quantization. Or set Blender `scene.render.image_settings.compression = 100`. Most fixtures will compress 5–10× because they're mostly transparent.
**Warning signs:** `du -sh public/sprites/` exceeds ~150 MB.

### Pitfall 7: GitHub Pages 1 GB repo / 100 MB single-file limit

**What goes wrong:** Total `public/sprites/` exceeds GitHub Pages serving limits.
**Why it happens:** GitHub Pages: soft 1 GB repo limit, hard 100 MB per file. 1,126 PNGs are individually small (well under 100 MB each), so per-file is fine. Aggregate at ~50–100 MB is well under 1 GB.
**How to avoid:** Verify aggregate after first full run. If > 150 MB, drop to 96 px/tile per D-05 fallback.
**Warning signs:** GitHub blocks push citing repo size.

### Pitfall 8: Vite `BASE_URL` mishandling on GitHub Pages

**What goes wrong:** `<Image src="/sprites/foo.png">` works on `localhost` but 404s on `https://user.github.io/mysekai-planner/sprites/foo.png` because the base path is `/mysekai-planner/`, not `/`.
**Why it happens:** GitHub Pages user/project sites serve at a sub-path.
**How to avoid:** Always prefix with `import.meta.env.BASE_URL` (handles both dev and Pages). Set `base: '/mysekai-planner/'` in `vite.config.ts` for the production build.
**Warning signs:** Sprites work in dev, all show fallback rectangles in production.

## Code Examples

(Verified patterns from Blender docs, UnityPy docs, use-image README.)

### Boot — load fixtures + sprite manifest in parallel

```ts
// src/main.tsx (or wherever editor boot runs)
import { loadFixtures } from './data/fixtures'
import { loadSpriteManifest } from './data/spriteManifest'

await Promise.all([loadFixtures(), loadSpriteManifest()])
// after this point, getSpriteEntrySync() is hydrated
```

### Iterate fixtures and route per `getGroundSubtype` (Python parity)

```python
# pipeline/routing.py
from typing import Literal

GroundSubtype = Literal["road", "color-tile", "fence", "rug"] | None

def get_ground_subtype(fixture: dict) -> GroundSubtype:
    """Mirror of src/data/fixtures.ts:getGroundSubtype — keep in sync."""
    if fixture["mysekaiFixtureHandleType"] == "fence":
        return "fence"
    if fixture["mysekaiFixtureHandleType"] == "road":
        return "color-tile" if fixture["mysekaiFixtureMainGenreId"] == 31 else "road"
    if fixture["mysekaiSettableLayoutType"] == "rug":
        return "rug"
    return None

def is_2d_branch(fixture: dict) -> bool:
    """D-08: getGroundSubtype truthy → 2D extraction. Plus floor_appearance."""
    if get_ground_subtype(fixture) is not None:
        return True
    if fixture["mysekaiSettableLayoutType"] == "floor_appearance":
        return True
    return False
```

**Note:** `floor_appearance` was added by Phase 2 as a route-to-ground-layer rule. CONTEXT.md D-08 only mentions `getGroundSubtype` — confirm with planner whether `floor_appearance` items also flat-extract or 3D-render. Current code keeps them on the furniture layer but they're top-down floor textures by name, so flat-extract is likely correct. **Open question.**

### Manifest schema

```ts
// src/types/spriteManifest.ts
export interface SpriteManifestEntry {
  mode: '2d' | '3d'
  sprite: string         // e.g. "sprites/mysekai_fixture_001.png" — relative to BASE_URL
  size_px: [number, number]
}

export interface SpriteManifest {
  version: '1'
  extracted_at: string   // ISO 8601 UTC
  fixtures: Record<string, SpriteManifestEntry>  // key = assetbundleName
}
```

### Outdoor-only fixture filter

```python
# pipeline/assemble_manifest.py — filter to ~1,126 outdoor fixtures
import json

with open("src/data/mysekaiFixtures.json") as f:
    all_fixtures = json.load(f)

outdoor = [
    fx for fx in all_fixtures
    if fx["mysekaiSettableSiteType"] != "room"          # excludes 113 indoor-only
]
assert 1100 < len(outdoor) < 1200, f"unexpected outdoor count: {len(outdoor)}"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Paper.js + manual sprite editing (Happy Island Designer 2020) | react-konva + offline pipeline | 2023+ | We benefit from Konva's mature event/transform system; offline pipeline is more reproducible than human pixel art |
| AssetStudio (Windows GUI) for Unity bundle extraction | UnityPy (cross-platform Python) | ~2020+ | Scriptable batch extraction, runs on macOS/Linux/CI |
| Blender Eevee | Blender Eevee Next | 4.2 (2024) preview, 4.5 (2025) default | Better PBR, faster shadows; behaves enough like Cycles for non-art use cases |
| Manual app-hash discovery | `mos9527/sekai-apphash` daily auto-refresh | 2023+ | Removes manual reverse-engineering step from the pipeline |
| sssekai active development | sssekai 0.8.0 archived (2026-02-25) | 2026-02 | Pin version explicitly. Tool still works on existing Unity bundle format. If Sekai changes bundle format in future, twintail (Rust, active Sep 2025) is the fallback for download/decrypt; UnityPy stays for extraction. |

**Deprecated/outdated:**
- `bpy.ops.import_scene.gltf2` → use `bpy.ops.import_scene.gltf` (the `2` variant was removed in Blender 4.0)
- `BLENDER_WORKBENCH` engine for sprite rendering — now `BLENDER_EEVEE_NEXT` is fast enough and gives better materials

## Open Questions

1. **`floor_appearance` routing**
   - What we know: D-08 says route by `getGroundSubtype` (which doesn't return for `floor_appearance`). Phase 2 routes `floor_appearance` to the **furniture layer** (per `src/types/editor.ts` comment), not the ground layer. But name implies it's a floor texture, suggesting 2D extraction is correct.
   - What's unclear: Should `floor_appearance` items go through 2D extraction or 3D render?
   - Recommendation: Spot-check 3 `floor_appearance` fixtures in the pilot. If the Unity bundle's main texture is a top-down tileable, send them through 2D. Otherwise leave 3D. Add explicit override entries to `overrides.yaml` rather than expanding the Python routing function.

2. **Headless `sssekai_blender_io` viability**
   - What we know: Addon designed for interactive Blender; bpy operators *can* sometimes be invoked headlessly but many require UI context.
   - What's unclear: Will `bpy.ops.sssekai.import_unity` work in `blender --background`?
   - Recommendation: First task in plan = "1-fixture pilot — validate addon headless OR commit to UnityPy → GLB writer fallback." Decision drives downstream task structure.

3. **Bounding-box vs grid-based camera framing**
   - What we know: Pattern 3 uses AABB framing with 2% padding; this is robust but vulnerable to Pitfall 5 (stray geometry).
   - What's unclear: Are MySekai fixtures already authored at world-unit-per-grid-cell scale? If yes, grid-based framing (`ortho_scale = max(W, D)`) is simpler and more uniform.
   - Recommendation: In pilot, render 3 fixtures with both methods, compare. Pick the simpler one if outputs look the same.

4. **Sprite manifest cardinality vs `assetbundleName` uniqueness**
   - What we know: D-06 uses `{assetbundleName}.png` as filename. CONTEXT.md assumes assetbundleName is unique per fixture.
   - What's unclear: Are there fixtures sharing `assetbundleName` (e.g., color variants of the same model)?
   - Recommendation: In `assemble_manifest.py`, assert uniqueness. If duplicates exist, pick the first occurrence and log; v2 will revisit per Phase 1 D-12.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.11 | Pipeline | Verify in plan | TBD | python 3.12 acceptable |
| Blender 4.x LTS on PATH | 3D render branch | Verify in plan | TBD | Document `BLENDER_BIN` env var override |
| `pip` package: sssekai 0.8.0 | Download stage | Verify on PyPI in plan | 0.8.0 (archived but should still install) | `pip install git+https://github.com/mos9527/sssekai.git@v0.8.0` from a fork mirror |
| `pip` package: UnityPy | 2D extract + GLB writer | Auto-pulled by sssekai | (sssekai's pin) | None — required |
| `pip` package: Pillow ≥ 10.4 | PNG IO + post-compress | Standard | latest | None |
| `pip` package: pygltflib | Optional, for UnityPy → GLB fallback path | Only needed if Option B chosen | 1.16+ | If unavailable, use raw glTF JSON + bin assembly |
| Network access to `mos9527/sekai-apphash` | App-hash discovery | Yes | n/a | Fallback: extract from latest XAPK via `sssekai apphash -s` |
| Network access to Sekai CDN | Bundle download | Yes (from user's machine) | n/a | None — required |
| `npm` package: `use-image` | Frontend integration | Not yet installed | 1.1.x latest | Hand-rolled async loader (~30 LOC) |
| Frontend: `react-konva` 19, `konva` 10 | Sprite render | Already installed | 19.2.3 / 10.2.3 | None |
| Disk: ~3 GB free | Asset cache + intermediate GLBs | Verify in plan | n/a | Reduce filter scope; render in batches |

**Missing dependencies with no fallback:**
- Network access to Sekai CDN at extraction time. (User-controlled; only required during one-off recipe runs per D-11.)

**Missing dependencies with fallback:**
- `sssekai 0.8.0` install — if PyPI ever yanks the archived package, install from the archived GitHub repo by tag.
- `sssekai_blender_io` headless mode — if it doesn't work, drop to UnityPy → GLB writer.
- `mos9527/sekai-apphash` — archived 2026-02-06; if its automated refresh stops, switch to `sssekai apphash -s <latest_xapk>`.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (frontend) | Vitest 3 (already configured per `package.json`) |
| Framework (pipeline) | pytest (NEW — add to `scripts/sprite-pipeline/requirements.txt`) |
| Config files | `vitest.config.ts` (existing); `scripts/sprite-pipeline/pytest.ini` (NEW — Wave 0) |
| Quick run command (frontend) | `pnpm test` |
| Quick run command (pipeline) | `cd scripts/sprite-pipeline && pytest -x` |
| Full suite command | `pnpm test && cd scripts/sprite-pipeline && pytest` |
| Phase gate | Frontend full suite green + pipeline pytest green + manual visual spot-check of 5 sample sprites in the editor |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPRT-01 | `download.py` invokes `sssekai abcache` with correct args; cache populates | integration (manual smoke; sssekai network call) | `python -m pipeline download --dry-run` (prints command, no network) — assert command-string equality | ❌ Wave 0 — `tests/test_download_dryrun.py` |
| SPRT-02 | 2D-branch UnityPy extraction produces a non-empty PNG with expected dimensions for a known sample bundle | unit (uses fixture bundle) | `pytest tests/test_extract_2d.py::test_known_bundle -x` | ❌ Wave 0 — `tests/test_extract_2d.py` + check in 1–2 sample bundles to `tests/fixtures/` |
| SPRT-03 | Blender headless render produces a transparent PNG of correct dimensions for a sample GLB | integration (slow; requires Blender on PATH) | `pytest tests/test_render_3d.py::test_sample_glb -x --slow` | ❌ Wave 0 — `tests/test_render_3d.py` + sample GLB in `tests/fixtures/` |
| SPRT-04 | Output PNG dimensions = `gridSize.width × 128` × `gridSize.depth × 128`, RGBA with non-zero alpha pixels | unit | `pytest tests/test_output_dimensions.py -x` | ❌ Wave 0 |
| SPRT-04 | Output PNG aggregate size ≤ 150 MB | manual (post-batch shell command) | `du -sm public/sprites/ \| awk '{ if ($1 > 150) exit 1 }'` | ❌ Wave 0 — add a `pipeline/check_size.py` script |
| SPRT-05 | Pipeline iterates all outdoor fixtures (count ≈ 1,126) without manual prompting | integration | `python -m pipeline run-all --dry-run` — assert iteration count = `len(outdoor_fixtures)` | ❌ Wave 0 |
| SPRT-05 | All produced manifest entries have a corresponding PNG on disk | unit | `pytest tests/test_manifest_completeness.py -x` | ❌ Wave 0 |
| SPRT-06 | Vite `pnpm build` includes `public/sprites/manifest.json` and PNGs in `dist/` | integration | `pnpm build && test -f dist/sprites/manifest.json` | ✅ existing build pipeline; add an assertion script |
| SPRT-07 | Placed item with sprite renders `<Image>` (snapshot or DOM query) | unit (Vitest + react-testing-library) | `pnpm test src/components/canvas/__tests__/PlacedItem.sprite.test.tsx` | ❌ Wave 0 — `PlacedItem.sprite.test.tsx` mocks manifest, asserts `<Image>` present |
| SPRT-07 | Placed item with NO manifest entry falls back to `<Rect fill={fillColor}>` (D-17) | unit | `pnpm test src/components/canvas/__tests__/PlacedItem.fallback.test.tsx` | ❌ Wave 0 |
| SPRT-07 (visual) | Sprite renders correctly at correct grid size, with rotation 0/90/180/270 | manual (visual) | Open editor, place sample fixture in each rotation, screenshot diff | n/a — manual checklist in plan |

### Sampling Rate

- **Per task commit (frontend changes):** `pnpm test` (existing fast suite, < 30 s)
- **Per task commit (pipeline changes):** `cd scripts/sprite-pipeline && pytest -x -m "not slow"` (skips Blender invocation)
- **Per wave merge:** Full suite — `pnpm test && cd scripts/sprite-pipeline && pytest` (Blender tests included; ~1–2 min)
- **Phase gate:** Full suite green + run `python -m pipeline run-all` end-to-end on a 10-fixture subset + manual editor spot-check of 5 sprites (one each: 1×1 furniture, large furniture, road, fence, rug) before invoking `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `scripts/sprite-pipeline/pytest.ini` — pytest config + slow marker
- [ ] `scripts/sprite-pipeline/tests/conftest.py` — shared fixture-bundle loader, sample bundle path
- [ ] `scripts/sprite-pipeline/tests/fixtures/sample_2d_bundle.unity3d` — small known Unity bundle for 2D extraction test
- [ ] `scripts/sprite-pipeline/tests/fixtures/sample_3d.glb` — small known GLB for Blender render test
- [ ] `scripts/sprite-pipeline/tests/test_routing.py` — parity test (Python `get_ground_subtype` vs JS `getGroundSubtype` — generate the JS results once via `node` script, snapshot to JSON, Python test reads + asserts)
- [ ] `scripts/sprite-pipeline/tests/test_extract_2d.py` — sample bundle → expected PNG hash
- [ ] `scripts/sprite-pipeline/tests/test_render_3d.py` (marked `@pytest.mark.slow`) — sample GLB → PNG dimensions + transparency assertions
- [ ] `scripts/sprite-pipeline/tests/test_manifest.py` — schema + completeness checks
- [ ] `src/components/canvas/__tests__/PlacedItem.sprite.test.tsx` — manifest hit → `<Image>` rendered
- [ ] `src/components/canvas/__tests__/PlacedItem.fallback.test.tsx` — manifest miss → `<Rect>` fallback (existing rect render path preserved)
- [ ] `src/data/__tests__/spriteManifest.test.ts` — fetch + cache + 404 fallback to empty Map
- [ ] Pipeline `requirements.txt` to add: `pytest>=8.0`

## Sources

### Primary (HIGH confidence)
- `mos9527/sekai-apphash` README — confirms daily auto-refreshed hashes, `jp/apphash.json` raw URL, archived 2026-02-06 (read-only but data still updates from cached Action runs at the time of last refresh — verify before relying)
- `konvajs/use-image` README — confirms `[image, status]` API, `'loading' | 'loaded' | 'failed'` states, `crossOrigin` arg
- Blender 4.5 docs — confirms `bpy.ops.import_scene.gltf`, `scene.render.film_transparent`, ortho camera, `--background --python` invocation
- `K0lb3/UnityPy` repo + `tools/extractor.py` — confirms OBJ-only built-in mesh export (drives our need for either sssekai_blender_io headless or custom GLB writer)
- `mos9527/sssekai` wiki (via WebFetch) — confirms `abcache` CLI signature, `--app-region`, `--app-version`, `--app-appHash`, `--download-filter`, `--download-ensure-deps`, `--download-dir`
- Existing repo: `src/data/fixtures.ts` (getGroundSubtype), `src/components/canvas/PlacedItem.tsx` (current render), `src/utils/grid.ts` (TILE_SIZE=32)
- `package.json` — confirms `react-konva ^19.2.3`, `konva ^10.2.3`, no `use-image` yet

### Secondary (MEDIUM confidence)
- WebSearch: Blender headless rendering patterns (multiple tutorials confirm `bpy.context.scene.render.film_transparent = True`, `color_mode = 'RGBA'`)
- WebSearch: Project Sekai JP version 6.4.1 (sekai.best, apkpure) — current as of 2026-04-10
- `duosii/twintail` repo — exists, Rust, supports JP+EN. Detailed CLI not extracted from README scrape; if pipeline ever switches, read full docs at that point.

### Tertiary (LOW confidence — flag for validation)
- **Headless `sssekai_blender_io` viability** — no documentation found confirming headless invocation works. **MUST validate in pilot task.**
- **Whether MySekai fixtures are authored at world-unit-per-grid-tile scale** — assumed for camera-framing simplicity; verify in pilot.
- **`floor_appearance` routing decision** — open question above; verify in pilot.
- **Aggregate sprite size estimate (~50–100 MB)** — back-of-envelope from `1,126 × ~50 KB`; actual depends heavily on transparent-pixel ratio. Measure after first full run.

## Metadata

**Confidence breakdown:**
- Standard stack (Python + Blender + use-image): **HIGH** — all tools are mature, official, documented
- sssekai download recipe: **HIGH** — confirmed from wiki + apphash repo
- 2D-texture branch (UnityPy): **HIGH** — straightforward; many code references
- 3D-render branch (Blender pattern): **HIGH** for the bpy script; **MEDIUM** for the Unity-bundle-to-GLB intermediate (Option A vs B unresolved until pilot)
- Frontend integration: **HIGH** — small contained edit, well-understood APIs
- Common pitfalls: **MEDIUM** — Blender 4.x version drift and headless addon viability are concrete unknowns
- Sprite-size math + GitHub Pages limits: **HIGH** — public docs

**Research date:** 2026-04-28
**Valid until:** 2026-07-28 (90 days; revisit if Sekai pushes a major game update or a Blender LTS rev)
