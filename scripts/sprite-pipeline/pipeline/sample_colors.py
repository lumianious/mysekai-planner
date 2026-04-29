# ======== 主色采样（Wave 4 frontend 平铺需要）========
# INPUT:  public/sprites/manifest.json + public/sprites/thumbnails/*.png
# OUTPUT: 同一 manifest.json，每个 entry 增加 dominantColor:[r,g,b]
# POS:    scripts/sprite-pipeline/pipeline/sample_colors.py
# 备注：地面/围栏渲染采用纯色矩形以确保相邻可连接；颜色取该家具
#       第一个变体缩略图中所有 alpha>200 像素的均值。

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from pipeline.config import MANIFEST_PATH, SPRITES_OUT_DIR

THUMBNAILS_DIR = SPRITES_OUT_DIR / "thumbnails"


def _dominant_color(png_path: Path) -> list[int] | None:
    """返回 [r, g, b]，找不到不透明像素时返回 None。"""
    arr = np.array(Image.open(png_path).convert("RGBA"))
    opaque = arr[arr[:, :, 3] > 200]
    if len(opaque) == 0:
        return None
    rgb = opaque[:, :3].mean(axis=0).astype(int)
    return [int(rgb[0]), int(rgb[1]), int(rgb[2])]


def main() -> int:
    manifest = json.loads(MANIFEST_PATH.read_text())
    fixtures = manifest["fixtures"]
    updated = 0
    missing = 0
    for name, entry in fixtures.items():
        thumbs = entry.get("thumbnails") or []
        if not thumbs:
            missing += 1
            continue
        # 用第一个变体（默认色）作为代表色
        thumb_path = SPRITES_OUT_DIR.parent.parent / "public" / thumbs[0]
        if not thumb_path.exists():
            missing += 1
            continue
        rgb = _dominant_color(thumb_path)
        if rgb is None:
            missing += 1
            continue
        entry["dominantColor"] = rgb
        updated += 1

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    print(f"sampled {updated} dominantColor entries, {missing} missing thumbnails")
    return 0 if updated > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
