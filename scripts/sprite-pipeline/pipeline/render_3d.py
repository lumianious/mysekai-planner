# ======== 3D 批渲染调度（PILOT-FINDINGS Path B：UnityPy → GLB → Blender）========
# INPUT:  outdoor 3D-branch 装备列表 + assets-cache/bundles/mysekai/fixture/<name>
# OUTPUT: public/sprites/<assetbundleName>.png（透明背景，width*128 × depth*128）
# POS:    scripts/sprite-pipeline/pipeline/render_3d.py
# 备注：sssekai_blender_io 在 Blender 5.x headless 不可用，必走 glb_writer 回退。

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from tqdm import tqdm

from pipeline.config import (
    BUNDLES_DIR,
    FIXTURES_JSON_PATH,
    PIPELINE_DIR,
    SPRITES_OUT_DIR,
)
from pipeline.glb_writer import unity_bundle_to_glb
from pipeline.routing import is_2d_branch, is_outdoor

BLENDER = os.environ.get("BLENDER_BIN", "blender")
# PILOT-FINDINGS Q1：Blender 5.x headless 下 sssekai_blender_io addon 不可用，强制 GLB 回退。
USE_GLB_FALLBACK = True


# ======== 单 fixture 渲染 ========
def _render_one(fx: dict, tmp_dir: Path) -> tuple[bool, str]:
    name = fx["assetbundleName"]
    bundle = BUNDLES_DIR / "mysekai" / "fixture" / name
    out = SPRITES_OUT_DIR / f"{name}.png"
    if not bundle.exists():
        return False, "no-bundle"

    # Path B：unity → glb → blender
    asset: Path
    if USE_GLB_FALLBACK:
        glb = tmp_dir / f"{name}.glb"
        try:
            unity_bundle_to_glb(bundle, glb)
        except Exception as e:
            return False, f"glb-convert: {e!r}"
        asset = glb
    else:
        asset = bundle

    cmd = [
        BLENDER, "--background",
        "--python", str(PIPELINE_DIR / "pipeline" / "blender_render.py"),
        "--",
        "--asset", str(asset),
        "--out", str(out),
        "--tile-w", str(fx["gridSize"]["width"]),
        "--tile-d", str(fx["gridSize"]["depth"]),
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    except subprocess.TimeoutExpired:
        return False, "blender-timeout"
    finally:
        if USE_GLB_FALLBACK and asset.exists():
            try:
                asset.unlink()
            except OSError:
                pass

    if r.returncode != 0 or not out.exists():
        return False, f"blender exit {r.returncode}: {r.stderr[-200:]}"
    return True, "ok"


def _outdoor_3d(all_fx: list[dict]) -> list[dict]:
    return [f for f in all_fx if is_outdoor(f) and not is_2d_branch(f)]


# ======== 子命令 ========
def add_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--limit", type=int, default=None,
                   help="render only first N fixtures (debugging)")


def run(args: argparse.Namespace) -> int:
    all_fx = json.loads(FIXTURES_JSON_PATH.read_text())
    targets = _outdoor_3d(all_fx)
    if args.limit:
        targets = targets[: args.limit]
    if args.dry_run:
        print(f"render-3d dry-run: {len(targets)} fixtures")
        return 0

    SPRITES_OUT_DIR.mkdir(parents=True, exist_ok=True)
    failures = 0
    skipped = 0
    with tempfile.TemporaryDirectory(prefix="glb_") as tmp:
        tmp_dir = Path(tmp)
        for fx in tqdm(targets, desc="render 3D"):
            ok, info = _render_one(fx, tmp_dir)
            if not ok:
                if info == "no-bundle":
                    skipped += 1
                else:
                    failures += 1
                    print(f"[ERR] {fx['assetbundleName']}: {info}", file=sys.stderr)
    ok = len(targets) - failures - skipped
    print(f"render-3d done: {ok}/{len(targets)} OK ({skipped} skipped, {failures} errored)")
    return 1 if failures and failures > len(targets) // 2 else 0
