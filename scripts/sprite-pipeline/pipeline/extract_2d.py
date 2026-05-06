# ======== 2D 纹理抽取（D-08 平面项分支）========
# INPUT:  Unity AssetBundle 路径（sssekai 解密后的 .unity3d）
# OUTPUT: 透明 RGBA PIL.Image / PNG 文件
# POS:    scripts/sprite-pipeline/pipeline/extract_2d.py
# 备注：sekai bundle 头部 Unity 版本被剥离，必须显式给 UnityPy 设置 fallback。
#       2022.3.21f1 与 sssekai 默认值一致。

from __future__ import annotations

from pathlib import Path
from typing import Optional, Tuple

import UnityPy
from PIL import Image

# Sekai 资源使用 Unity 2022.3.21f1（自 JP 3.6.0 起）；
# bundle header 没有写版本号，UnityPy 需要显式 fallback。
UnityPy.config.FALLBACK_UNITY_VERSION = "2022.3.21f1"


def _iter_tex_envs(tex_envs):
    """m_TexEnvs 在不同 UnityPy 版本里可能是 dict 或 list[tuple]，统一成 (name, env) 迭代。"""
    if tex_envs is None:
        return
    items = tex_envs.items() if hasattr(tex_envs, "items") else tex_envs
    for entry in items:
        if isinstance(entry, tuple) and len(entry) == 2:
            yield entry[0], entry[1]
        else:
            # list 元素可能是带属性的对象
            name = getattr(entry, "name", None) or getattr(entry, "first", None)
            value = getattr(entry, "value", None) or getattr(entry, "second", None)
            if name is not None and value is not None:
                yield name, value


def _read_main_tex(material) -> Optional[Image.Image]:
    sp = getattr(material, "m_SavedProperties", None)
    if sp is None:
        return None
    for name, env in _iter_tex_envs(getattr(sp, "m_TexEnvs", None)):
        if name != "_MainTex":
            continue
        tex_pptr = getattr(env, "m_Texture", None)
        if tex_pptr is None or tex_pptr.m_PathID == 0:
            return None
        try:
            tex = tex_pptr.read()
        except Exception:
            return None
        img = getattr(tex, "image", None)
        if img is not None:
            return img.convert("RGBA")
    return None


def extract_main_texture(bundle_path: Path) -> Image.Image:
    """从 bundle 中抽取主纹理。优先 Material._MainTex，否则回退第一个 Texture2D。"""
    env = UnityPy.load(str(bundle_path))

    # 1) 优先：任意 Material 的 _MainTex
    for obj in env.objects:
        if obj.type.name != "Material":
            continue
        try:
            mat = obj.read()
        except Exception:
            continue
        img = _read_main_tex(mat)
        if img is not None:
            return img

    # 2) 回退：bundle 中第一个含图像的 Texture2D
    for obj in env.objects:
        if obj.type.name != "Texture2D":
            continue
        try:
            tex = obj.read()
        except Exception:
            continue
        img = getattr(tex, "image", None)
        if img is not None:
            return img.convert("RGBA")

    raise ValueError(f"no texture in bundle: {bundle_path}")


def extract_to_png(
    bundle_path: Path,
    out_path: Path,
    target_size: Optional[Tuple[int, int]] = None,
) -> Tuple[int, int]:
    """抽取主纹理并写 PNG。target_size 给定时按 LANCZOS 重采样。返回最终像素尺寸。
    用于缩略图（缩放）；对地毯/路面等 tileable 纹理请改用 extract_to_tiled_png。"""
    img = extract_main_texture(bundle_path)
    if target_size is not None:
        img = img.resize(target_size, Image.LANCZOS)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, format="PNG", optimize=True)
    return img.size


# ======== Tiled 输出（PILOT-FINDINGS Q2）========
def extract_to_tiled_png(
    bundle_path: Path,
    out_path: Path,
    grid_w: int,
    grid_d: int,
    tile_px: int,
) -> Tuple[int, int]:
    """把源纹理当作 1×1 格的 seam-tile，平铺到 (grid_w * tile_px) × (grid_d * tile_px) 画布。
    Pilot 发现 rug/road 纹理是 tileable 单瓦片，整毯/整路需要在 pipeline 端铺好，
    避免给 Konva 引入运行时 fillPattern 复杂度。"""
    src = extract_main_texture(bundle_path)
    # 把单 tile 缩到 tile_px 见方
    tile = src.resize((tile_px, tile_px), Image.LANCZOS)
    canvas_w = grid_w * tile_px
    canvas_d = grid_d * tile_px
    canvas = Image.new("RGBA", (canvas_w, canvas_d), (0, 0, 0, 0))
    for gy in range(grid_d):
        for gx in range(grid_w):
            canvas.paste(tile, (gx * tile_px, gy * tile_px), tile)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, format="PNG", optimize=True)
    return canvas.size


# ======== 子命令：extract-2d（批量 2D 分支抽取 + 全部户外缩略图）========
def add_args(p):  # type: ignore[no-untyped-def]
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--limit", type=int, default=None)
    p.add_argument(
        "--skip-thumbnails", action="store_true",
        help="只跑 2D 主纹理（rug/road/floor），不抓缩略图",
    )
    p.add_argument(
        "--ids", type=str, default=None,
        help="逗号分隔的 fixture id，只处理这些（增量重渲染用）",
    )


def _parse_ids(raw: str | None) -> set[int] | None:
    """逗号分隔字符串 → 整数集合。空/None → 不过滤。"""
    if not raw:
        return None
    out: set[int] = set()
    for piece in raw.split(","):
        s = piece.strip()
        if s:
            out.add(int(s))
    return out or None


def _variant_count(fx: dict) -> int:
    colors = fx.get("mysekaiFixtureAnotherColors") or []
    return 1 + len(colors)


# 缩略图卡片背景色（实际游戏内目录 UI 的 cyan 卡片，烘进缩略图纹理里）
THUMBNAIL_BG_KEY = (143, 233, 233)
THUMBNAIL_BG_TOLERANCE = 8


def _strip_cyan_card(out_path) -> None:
    """缩略图烘焙了 cyan 卡片背景 + 一层深 teal 描边外框；
    两步去除：
      1) 色度键扫掉 cyan 主背景
      2) 从透明边缘 4-连通向内蚕食蓝色主导（B>R）的像素，剥掉描边外框 ~3-4 px。
    走完留下纯净物体内容，方便相邻 tile（如道路）连贴时无缝。"""
    import numpy as np

    img = Image.open(out_path).convert("RGBA")
    arr = np.array(img)

    # 1) cyan 主背景
    key = np.array(THUMBNAIL_BG_KEY, dtype=np.int16)
    diff = np.abs(arr[:, :, :3].astype(np.int16) - key).max(axis=2)
    arr[diff <= THUMBNAIL_BG_TOLERANCE, 3] = 0

    # 2) 边缘蓝主导描边蚕食（最多 4 圈，自然收敛）
    for _ in range(4):
        transparent = arr[:, :, 3] == 0
        rgb = arr[:, :, :3].astype(np.int16)
        blue_dominant = (rgb[:, :, 2] > rgb[:, :, 0] + 20) & (
            rgb[:, :, 2] > rgb[:, :, 1] - 20
        )
        neighbor_transparent = np.zeros_like(transparent)
        neighbor_transparent[1:, :] |= transparent[:-1, :]
        neighbor_transparent[:-1, :] |= transparent[1:, :]
        neighbor_transparent[:, 1:] |= transparent[:, :-1]
        neighbor_transparent[:, :-1] |= transparent[:, 1:]
        strip = blue_dominant & neighbor_transparent & (~transparent)
        if not strip.any():
            break
        arr[strip, 3] = 0

    Image.fromarray(arr, "RGBA").save(out_path, format="PNG", optimize=True)


def _extract_thumbnails_for(fx: dict, bundles_dir, thumbnails_dir) -> tuple[int, int]:
    """返回 (ok, errored)。缺失的 bundle 静默跳过（部分变体未必存在）。
    输出写入后立即去 cyan 背景。"""
    name = fx["assetbundleName"]
    ok = 0
    err = 0
    for v in range(1, _variant_count(fx) + 1):
        bundle = bundles_dir / "mysekai" / "thumbnail" / "fixture" / f"{name}_{v}"
        if not bundle.exists():
            continue
        out = thumbnails_dir / f"{name}_{v}.png"
        if out.exists() and out.stat().st_size > 0:
            ok += 1
            continue
        try:
            extract_to_png(bundle, out)
            _strip_cyan_card(out)
            ok += 1
        except Exception:
            err += 1
    return ok, err


def _restrip_existing_thumbnails(thumbnails_dir) -> int:
    """对已经存在的缩略图重做 cyan 去背。便于现有产物增量修复。"""
    if not thumbnails_dir.exists():
        return 0
    n = 0
    for p in thumbnails_dir.glob("*.png"):
        try:
            _strip_cyan_card(p)
            n += 1
        except Exception:
            pass
    return n


def run(args) -> int:  # type: ignore[no-untyped-def]
    import json
    import sys

    from tqdm import tqdm

    from pipeline.config import (
        BUNDLES_DIR,
        FIXTURES_JSON_PATH,
        SPRITES_OUT_DIR,
        TILE_PX,
    )
    from pipeline.routing import is_2d_branch, is_outdoor

    all_fx = json.loads(FIXTURES_JSON_PATH.read_text())
    targets = [f for f in all_fx if is_outdoor(f) and is_2d_branch(f)]
    id_filter = _parse_ids(getattr(args, "ids", None))
    if id_filter is not None:
        targets = [f for f in targets if f.get("id") in id_filter]
    if args.limit:
        targets = targets[: args.limit]
    if args.dry_run:
        print(f"extract-2d dry-run: {len(targets)} fixtures")
        return 0

    SPRITES_OUT_DIR.mkdir(parents=True, exist_ok=True)
    thumbnails_dir = SPRITES_OUT_DIR / "thumbnails"
    thumbnails_dir.mkdir(parents=True, exist_ok=True)

    # ======== Phase 1：2D 分支主纹理 ========
    failures = 0
    skipped = 0
    for fx in tqdm(targets, desc="extract 2D"):
        name = fx["assetbundleName"]
        bundle = BUNDLES_DIR / "mysekai" / "fixture" / name
        out = SPRITES_OUT_DIR / f"{name}.png"
        if not bundle.exists():
            skipped += 1
            continue
        try:
            extract_to_tiled_png(
                bundle, out,
                grid_w=fx["gridSize"]["width"],
                grid_d=fx["gridSize"]["depth"],
                tile_px=TILE_PX,
            )
        except Exception as e:
            failures += 1
            print(f"[ERR] {name}: {e}", file=sys.stderr)
    ok = len(targets) - failures - skipped
    print(f"extract-2d done: {ok}/{len(targets)} OK ({skipped} skipped, {failures} errored)")

    # ======== Phase 2：所有户外 fixture 的目录缩略图 ========
    # PILOT-FINDINGS 把 thumbnails 加进 schema：每个户外项 1 + len(otherColors) 个变体
    if not getattr(args, "skip_thumbnails", False):
        outdoor = [f for f in all_fx if is_outdoor(f)]
        if id_filter is not None:
            outdoor = [f for f in outdoor if f.get("id") in id_filter]
        if args.limit:
            outdoor = outdoor[: args.limit]
        thumb_ok = 0
        thumb_err = 0
        for fx in tqdm(outdoor, desc="extract thumbs"):
            ok_v, err_v = _extract_thumbnails_for(fx, BUNDLES_DIR, thumbnails_dir)
            thumb_ok += ok_v
            thumb_err += err_v
        print(f"thumbnails done: {thumb_ok} extracted, {thumb_err} errored")

    # 把高失败率视为退出码非 0；纯 skipped（缺 bundle）不算硬错。
    return 1 if failures and failures > len(targets) // 2 else 0
