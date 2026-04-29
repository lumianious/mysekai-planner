# ======== 3-fixture 试运行（Wave 2 PILOT）========
# INPUT:  src/data/mysekaiFixtures.json
#         + assets-cache/bundles/mysekai/fixture/<name>
#         + assets-cache/bundles/mysekai/thumbnail/fixture/<name>_<variant>
# OUTPUT: public/sprites/<name>.png（顶视图）
#         + public/sprites/thumbnails/<name>_<variant>.png（45° 目录缩略）
#         + public/sprites/manifest.json（3 条目）
# POS:    scripts/sprite-pipeline/pipeline/pilot.py
# 用法：python -m pipeline.pilot [--fixtures id1,id2,id3]

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from pipeline.config import (
    BUNDLES_DIR,
    FIXTURES_JSON_PATH,
    MANIFEST_PATH,
    PIPELINE_DIR,
    SPRITES_OUT_DIR,
    TILE_PX,
)
from pipeline.extract_2d import extract_to_png
from pipeline.routing import is_2d_branch

BLENDER = os.environ.get("BLENDER_BIN", "blender")
THUMBNAILS_OUT_DIR = SPRITES_OUT_DIR / "thumbnails"


# ======== sssekai 路径解析 ========
def _sssekai_bin() -> str:
    return shutil.which("sssekai") or str(Path(sys.executable).parent / "sssekai")


def _load_credentials() -> tuple[str, str, str]:
    apphash = json.loads((PIPELINE_DIR / "data" / "apphash.json").read_text())
    return apphash["appVersion"], apphash["appHash"], apphash["abVersion"]


# ======== 默认 fixture 选择（FLAT / SMALL_3D / LARGE_3D）========
def _pick_default_fixtures(all_fixtures: list[dict]) -> list[dict]:
    outdoor = [f for f in all_fixtures if f.get("mysekaiSettableSiteType") != "room"]
    flat = next((f for f in outdoor if is_2d_branch(f)), None)
    small_3d = next(
        (f for f in outdoor
         if not is_2d_branch(f)
         and f["gridSize"]["width"] == 1
         and f["gridSize"]["depth"] == 1),
        None,
    )
    large_3d = next(
        (f for f in outdoor
         if not is_2d_branch(f)
         and (f["gridSize"]["width"] >= 3 or f["gridSize"]["depth"] >= 3)),
        None,
    )
    picks = [x for x in (flat, small_3d, large_3d) if x is not None]
    if len(picks) < 3:
        raise RuntimeError(f"could not pick 3 distinct pilot fixtures (got {len(picks)})")
    return picks


# ======== 变体计数（颜色变体 + 基础色 = 1 + len(otherColors)）========
def _variant_count(fx: dict) -> int:
    colors = fx.get("mysekaiFixtureAnotherColors") or []
    return 1 + len(colors)


# ======== 下载所需 bundle ========
def _download_bundles(app_version: str, app_hash: str, ab_version: str, patterns: list[str]) -> int:
    if not patterns:
        return 0
    BUNDLES_DIR.parent.mkdir(parents=True, exist_ok=True)
    db = PIPELINE_DIR / "assets-cache" / "abcache.db"
    regex = "^(?:" + "|".join(p.replace(".", r"\.") for p in patterns) + ")$"
    cmd = [
        _sssekai_bin(), "abcache",
        "--db", str(db),
        "--app-region", "jp",
        "--app-platform", "android",
        "--app-version", app_version,
        "--app-appHash", app_hash,
        "--app-abVersion", ab_version,
        "--no-update",  # 重用已建好的 index（CDN probe 已 update 过）
        "--download-filter", regex,
        "--download-no-overwrite",
        "--download-dir", str(BUNDLES_DIR),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        print(result.stderr[-800:], file=sys.stderr)
    return result.returncode


# ======== 3D 渲染：spawn blender ========
def _render_3d(fx: dict, bundle: Path, out: Path) -> tuple[bool, str]:
    result = subprocess.run(
        [
            BLENDER, "--background",
            "--python", str(PIPELINE_DIR / "pipeline" / "blender_render.py"),
            "--",
            "--asset", str(bundle),
            "--out", str(out),
            "--tile-w", str(fx["gridSize"]["width"]),
            "--tile-d", str(fx["gridSize"]["depth"]),
        ],
        capture_output=True,
        text=True,
        timeout=240,
    )
    if result.returncode == 0 and out.exists():
        return True, "ok"
    if result.returncode == 2 and "sssekai_blender_io unavailable" in result.stderr:
        return False, "addon-headless-failed"
    return False, f"blender exit {result.returncode}: {result.stderr[-300:]}"


# ======== 缩略图抽取 ========
def _extract_thumbnails(fx: dict) -> list[str]:
    """从 mysekai/thumbnail/fixture/<name>_<v> 抽取 152×152 PNG，
    返回 BASE_URL-relative 路径列表（manifest 用）。"""
    THUMBNAILS_OUT_DIR.mkdir(parents=True, exist_ok=True)
    paths: list[str] = []
    name = fx["assetbundleName"]
    for variant in range(1, _variant_count(fx) + 1):
        bundle = BUNDLES_DIR / "mysekai" / "thumbnail" / "fixture" / f"{name}_{variant}"
        if not bundle.exists():
            print(f"[WARN] thumbnail missing: {bundle}", file=sys.stderr)
            continue
        out = THUMBNAILS_OUT_DIR / f"{name}_{variant}.png"
        try:
            extract_to_png(bundle, out)
            paths.append(f"sprites/thumbnails/{name}_{variant}.png")
        except Exception as e:
            print(f"[ERR] thumbnail {bundle}: {e}", file=sys.stderr)
    return paths


# ======== 主入口 ========
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fixtures", help="comma-sep fixture ids; default = auto-pick")
    args = ap.parse_args()

    app_version, app_hash, ab_version = _load_credentials()
    all_fx = json.loads(FIXTURES_JSON_PATH.read_text())
    picks = (
        [f for f in all_fx if f["id"] in {int(x) for x in args.fixtures.split(",")}]
        if args.fixtures else _pick_default_fixtures(all_fx)
    )

    # 1) 收集所有需要下载的 bundle 路径（model + thumbnails per variant）
    patterns: list[str] = []
    for fx in picks:
        patterns.append(f"mysekai/fixture/{fx['assetbundleName']}")
        for v in range(1, _variant_count(fx) + 1):
            patterns.append(f"mysekai/thumbnail/fixture/{fx['assetbundleName']}_{v}")
    print(f"[download] {len(patterns)} bundles")
    rc = _download_bundles(app_version, app_hash, ab_version, patterns)
    if rc != 0:
        print(f"[WARN] sssekai abcache exited {rc}; continuing if bundles exist on disk", file=sys.stderr)

    # 2) 抽 / 渲 + 缩略
    SPRITES_OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest_entries: dict[str, dict] = {}
    failures = 0
    for fx in picks:
        name = fx["assetbundleName"]
        bundle = BUNDLES_DIR / "mysekai" / "fixture" / name
        png = SPRITES_OUT_DIR / f"{name}.png"

        if not bundle.exists():
            print(f"[ERR] {name}: bundle not on disk ({bundle})", file=sys.stderr)
            failures += 1
            continue

        if is_2d_branch(fx):
            print(f"[ROUTE] {name} -> 2D")
            try:
                w_px = fx["gridSize"]["width"] * TILE_PX
                d_px = fx["gridSize"]["depth"] * TILE_PX
                size = extract_to_png(bundle, png, target_size=(w_px, d_px))
                mode = "2d"
                print(f"[OK] {name} 2D {size}")
            except Exception as e:
                print(f"[ERR] {name} 2D: {e}", file=sys.stderr)
                failures += 1
                continue
        else:
            print(f"[ROUTE] {name} -> 3D")
            ok, info = _render_3d(fx, bundle, png)
            if not ok:
                print(f"[ERR] {name} 3D: {info}", file=sys.stderr)
                failures += 1
                continue
            mode = "3d"
            size = (fx["gridSize"]["width"] * TILE_PX, fx["gridSize"]["depth"] * TILE_PX)
            print(f"[OK] {name} 3D {size}")

        thumbs = _extract_thumbnails(fx)
        manifest_entries[name] = {
            "mode": mode,
            "sprite": f"sprites/{name}.png",
            "size_px": list(size),
            "thumbnails": thumbs,
        }

    # 3) 写 manifest
    manifest = {
        "version": "1",
        "extracted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "fixtures": manifest_entries,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    print(
        f"\nPilot done: {len(manifest_entries)}/{len(picks)} OK; "
        f"manifest -> {MANIFEST_PATH.relative_to(PIPELINE_DIR.parent.parent)}"
    )
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
