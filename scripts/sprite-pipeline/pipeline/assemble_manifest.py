# ======== 清单组装（SPRT-05/06）========
# INPUT:  public/sprites/*.png + public/sprites/thumbnails/*.png + mysekaiFixtures.json
# OUTPUT: public/sprites/manifest.json
# POS:    scripts/sprite-pipeline/pipeline/assemble_manifest.py
# 备注：PILOT-FINDINGS 把 thumbnails: string[] 加进 schema，每个户外 fixture 都要填。

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone

from pipeline.config import (
    FIXTURES_JSON_PATH,
    MANIFEST_PATH,
    SPRITES_OUT_DIR,
    TILE_PX,
)
from pipeline.routing import is_2d_branch, is_outdoor


def _variant_count(fx: dict) -> int:
    """1（基础色）+ len(mysekaiFixtureAnotherColors) 个变体。"""
    colors = fx.get("mysekaiFixtureAnotherColors") or []
    return 1 + len(colors)


def _collect_thumbnails(fx: dict) -> list[str]:
    """扫描 public/sprites/thumbnails/<name>_<v>.png；返回 BASE_URL-relative 路径。"""
    name = fx["assetbundleName"]
    out: list[str] = []
    for v in range(1, _variant_count(fx) + 1):
        p = SPRITES_OUT_DIR / "thumbnails" / f"{name}_{v}.png"
        if p.exists() and p.stat().st_size > 0:
            out.append(f"sprites/thumbnails/{name}_{v}.png")
    return out


def _dedupe_outdoor(all_fx: list[dict]) -> list[dict]:
    """RESEARCH Open Q4：assetbundleName 必须唯一；重复时保留首个并日志。"""
    seen: dict[str, int] = {}
    kept: list[dict] = []
    for fx in all_fx:
        if not is_outdoor(fx):
            continue
        ab = fx["assetbundleName"]
        if ab in seen:
            print(
                f"[DUP] {ab} (id {fx['id']} duplicates id {seen[ab]}); keeping first",
                file=sys.stderr,
            )
            continue
        seen[ab] = fx["id"]
        kept.append(fx)
    return kept


def add_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--limit", type=int, default=None,
                   help="cap fixture list (parity with run-all)")
    p.add_argument("--check-size", action="store_true",
                   help="post-write 150MB cap check; exits 1 if exceeded (D-02)")


def run(args: argparse.Namespace) -> int:
    all_fx = json.loads(FIXTURES_JSON_PATH.read_text())
    kept = _dedupe_outdoor(all_fx)
    if getattr(args, "limit", None):
        kept = kept[: args.limit]

    entries: dict[str, dict] = {}
    for fx in kept:
        name = fx["assetbundleName"]
        png = SPRITES_OUT_DIR / f"{name}.png"
        if not png.exists() or png.stat().st_size == 0:
            continue  # extraction/render failed or bundle missing — gracefully skip
        mode = "2d" if is_2d_branch(fx) else "3d"
        entries[name] = {
            "mode": mode,
            "sprite": f"sprites/{name}.png",
            "size_px": [
                fx["gridSize"]["width"] * TILE_PX,
                fx["gridSize"]["depth"] * TILE_PX,
            ],
            "thumbnails": _collect_thumbnails(fx),
        }

    manifest = {
        "version": "1",
        "extracted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "fixtures": entries,
    }

    if args.dry_run:
        print(f"assemble-manifest dry-run: {len(entries)} entries (of {len(kept)} outdoor)")
        return 0

    SPRITES_OUT_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    print(f"manifest written: {len(entries)} entries -> {MANIFEST_PATH}")

    if getattr(args, "check_size", False):
        from pipeline.check_size import check_size
        return check_size()
    return 0
