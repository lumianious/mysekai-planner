# Test Fixtures

Sample assets for unit tests under `scripts/sprite-pipeline/tests/`.

## `sample_2d_bundle.unity3d` (~42 KB)

A small 2D-branch MySekai road bundle (`mdl_non2001_road_soil1`, fixture id=111).
Contains a Material with `_MainTex` → 512×512 RGBA `Texture2D`.

**To replace:** pick any 2D-branch `.unity3d` (road / rug / floor_appearance) under
`assets-cache/bundles/mysekai/fixture/` after running the pipeline downloader, then
copy it here. Filename must remain `sample_2d_bundle.unity3d`.

```bash
cp assets-cache/bundles/mysekai/fixture/<basename> tests/fixtures/sample_2d_bundle.unity3d
```

Bundles are sssekai-decrypted but Unity-version-stripped; `extract_2d.py` sets
`UnityPy.config.FALLBACK_UNITY_VERSION = "2022.3.21f1"` to compensate.

## `sample_3d.glb` (Wave 1 Task 3)

A small reference GLB (~3 KB). Source: Khronos `glTF-Sample-Models/2.0/Box/glTF-Binary/Box.glb`.
Used to validate `blender_render.py` independently of MySekai content.

**To replace:**
```bash
curl -sL https://github.com/KhronosGroup/glTF-Sample-Models/raw/main/2.0/Box/glTF-Binary/Box.glb \
  -o tests/fixtures/sample_3d.glb
```
