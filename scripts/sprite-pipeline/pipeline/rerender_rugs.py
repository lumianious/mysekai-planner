# ======== 一次性脚本：把 rug 从 2D 平铺切换到 Blender top-down 渲染 ========
# INPUT:  mysekaiFixtures.json 中所有 mysekaiSettableLayoutType == "rug" 的家具
# OUTPUT: 覆盖 public/sprites/<name>.png 为 Blender top-down 渲染产物
# POS:    scripts/sprite-pipeline/pipeline/rerender_rugs.py
# 备注：用户反馈：地毯走 extract-2d 平铺得到的是源纹理 atlas（6×6 拼图），
#       不是真正的顶视图；改用 GLB → Blender ortho 渲染拿正确 UV 映射结果。

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

from tqdm import tqdm

from pipeline.config import FIXTURES_JSON_PATH, SPRITES_OUT_DIR
from pipeline.render_3d import _render_one
from pipeline.routing import is_outdoor


def main() -> int:
    all_fx = json.loads(FIXTURES_JSON_PATH.read_text())
    rugs = [
        f for f in all_fx
        if is_outdoor(f) and f.get("mysekaiSettableLayoutType") == "rug"
    ]
    print(f"rugs to re-render: {len(rugs)}")
    SPRITES_OUT_DIR.mkdir(parents=True, exist_ok=True)
    failures = 0
    skipped = 0
    with tempfile.TemporaryDirectory(prefix="rugs_glb_") as tmp:
        tmp_dir = Path(tmp)
        for fx in tqdm(rugs, desc="render rugs"):
            ok, info = _render_one(fx, tmp_dir)
            if not ok:
                if info == "no-bundle":
                    skipped += 1
                else:
                    failures += 1
                    print(f"[ERR] {fx['assetbundleName']}: {info}", file=sys.stderr)
    ok = len(rugs) - failures - skipped
    print(f"rerender-rugs done: {ok}/{len(rugs)} OK ({skipped} skipped, {failures} errored)")
    return 1 if failures and failures > len(rugs) // 2 else 0


if __name__ == "__main__":
    sys.exit(main())
