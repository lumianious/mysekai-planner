# 05-04 Summary

Plan: `.planning/phases/05-sprite-pipeline/05-04-PLAN.md` (Wave 4 — frontend wiring)
Status: **complete**, with significant scope evolution mid-execution.

## What was built (vs. original plan)

**Originally:** edit `PlacedItem.tsx` to render `<Image>` from `entry.sprite` for manifest hits; flip 3 todo tests; ~30-line patch.

**Actually delivered:** the original plan's "render the top-down sprite directly" approach broke down on first visual verify — Wave 3's top-down ortho renders looked like cardboard boxes for furniture, seam-puzzle pieces for roads, and were broken for fences. Phase 5 had picked the wrong projection (top-down) for the wrong assets (3D iso models authored for an iso game). Switched mid-flight to a HID-style hybrid:

| Surface | What renders | Source |
|---|---|---|
| Ground items (rugs, roads, color-tiles, floor_appearance) | Solid `Rect` filled with `manifest.dominantColor`, `<Image>` of cyan-stripped iso thumbnail overlaid for texture | `entry.dominantColor` + `entry.thumbnails[0]` |
| 3D furniture | Iso thumbnail (HID-style "sticker" on the flat grid) | `entry.thumbnails[0]` |
| Fences | Wave-4 re-rendered Blender top-down sprite, cropped to visible bbox, stretched into a thin strip across the edge; vertical edges Konva-rotated 90° | `entry.sprite` (regenerated for fences only) |
| Manifest miss | Existing colored rect with name label (D-17 fallback) | `getFixtureColor` |

## Mid-execution scope additions

### Pipeline (`scripts/sprite-pipeline/`)

1. **Cyan card chroma-key** in `extract_2d.py::_strip_cyan_card`: thumbnails ship with a baked `RGB(143, 233, 233)` solid background ("catalog card"). Step 1 keys it out by RGB tolerance. Step 2 erodes the dark-teal frame outline by 4-connected near-edge "blue-dominant" pixel removal (up to 4 passes). Result: clean transparent thumbnails ready for canvas use.
2. **`pipeline/sample_colors.py`**: walks every manifest entry's first thumbnail, computes mean opaque RGB, writes `dominantColor:[r,g,b]` to manifest. Used by ground items and fence fallback so color matches the actual fixture material.
3. **Fence-only top-down re-render** (7 fixtures): the Wave 3 routing put fences through `extract_2d` (texture extraction), producing wood-grain card images instead of overhead views. Re-routed through `glb_writer → blender_render` and tightly cropped to visible bbox so adjacent edges butt up cleanly.

### Frontend

1. **`SpriteManifestEntry.dominantColor?: [number, number, number]`** added to types.
2. **`resolveSpriteUrl(fixture, baseUrl, preference?)`**: shared resolver returning `{ url, kind }`; supports `'thumbnail'` (default) and `'topdown'` (FenceLayer use case).
3. **`useFixtureData`**: `loadSpriteManifest()` joined the boot `Promise.all` so manifest is hot before any item mounts.
4. **Grass texture replaced**: extracted authentic in-game `tex_site_base_grasslands_grass01` from `mysekai/site/field/grasslands` bundle (low-poly facets matching the game's art style); replaces the prior 29 KB stock placeholder.

## Iteration log (visual verify → fix)

| Iteration | Issue surfaced | Fix |
|---|---|---|
| 1 | Top-down sprites looked like "cardboard boxes" — house was just a roof, bed was just a top | Switched 3D furniture to iso thumbnails |
| 2 | Roads tiled the seam-blending texture as standalone units → puzzle pieces | Switched ground to thumbnails too |
| 3 | Lamps had cyan card around them; roads had teal frame outline; rugs had rounded corners | Two-step chroma-key (cyan + edge erosion) |
| 4 | Roads still didn't connect cleanly even after stripping (rounded corner asset edges) | Solid `Rect` with `dominantColor` + thumbnail texture overlay |
| 5 | Fence iso thumbnails were nonsense at thin sizes; top-down Wave 3 fence sprites were just wood-grain (came from `extract_2d`, not Blender) | Re-rendered 7 fences via Blender top-down + tight bbox crop |
| 6 | Fence segments still had small gaps between adjacent edges | Cropped with zero padding instead of 2 px |

## Known gaps

1. **Rotation isn't visualized for sprites.** `getEffectiveSize` swaps w/d for footprint; sprite is stretched into the swapped bbox, so rectangular fixtures rotated 90° show stretched. The plan's D-16 ideal (Group rotation + offset) wasn't implemented because it would change positioning across the canvas. Logged for a future polish phase.
2. **Z-ordering by y not done.** Tall iso furniture sprites can overlap the wrong way when placed close together. Acceptable for this milestone; Phase 6+ if visible regressions show up.
3. **Fence render quality varies.** `wood1` Blender top-down only captured 56×16 of content (Blender camera framed the AABB tightly which clipped some of the fence). After tight crop it works visually but isn't geometry-perfect. Re-render with widened ortho margin would fix it; logged.
4. **Top-down sprites for non-fence 3D fixtures (`entry.sprite`) are kept on disk but unused on the canvas.** ~135 MB of useful-elsewhere sprites — could be cleaned up next milestone, or kept as a fallback / debug aid.

## Tests

- `pnpm test --run`: **194 passed (23 files)**, including 4 new sprite-resolution contract tests (replaced 3 todos)
- `pnpm build`: **green**, 1,116 sprites + 1,929 thumbnails + manifest in `dist/sprites/`

## Commits

```
4ea7bab docs(05-02): pilot findings + summary; close Wave 2 with partial sign-off
8d7c0d0 feat(05-03): add download subcommand + main router with dry-run tests
9302583 feat(05-03): implement glb_writer + extract_to_tiled_png + run-all orchestrator
e9d3af2 fix(05-03): camera ortho_scale uses AABB only; add thumbnail batch + manifest test
cad6f1d feat(05-03): regenerate full sprite set (1116 fixtures + 1929 thumbnails)
d46470c docs(05-03): complete sprite pipeline plan
c3d050c feat(05-04): visual polish — HID-style canvas wired through
```

## Phase 5 closure

SPRT-07 satisfied: editor renders sprites for placed items. The exact rendering chosen (HID-style hybrid) deviates from the original plan's "top-down sprites everywhere" but is what actually works for an iso-art game like Project Sekai. The plan's lesson: when projection of source content (iso) doesn't match the editor's projection (2D top-down), don't try to fight the source — accept the visual mismatch and use the assets as authored ("standing furniture sticker on flat ground" model).
