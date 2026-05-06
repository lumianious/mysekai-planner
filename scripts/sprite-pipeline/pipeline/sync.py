# ======== 增量同步上游 mysekaiFixtures.json + 渲染新增 fixture ========
# INPUT:  --dry-run / --render / --no-fetch / --include-changed
# OUTPUT: 1) src/data/mysekaiFixtures.json 替换为 sekai-master-db-diff/main 最新版
#         2) 与 public/sprites/manifest.json 比对，列出需要重渲染的 fixture id
#         3) 可选 --render：链式调用 extract-2d / render-3d / assemble-manifest
#            仅处理 diff 中的 id（通过 --ids 过滤），其他 fixture 跳过
# POS:    scripts/sprite-pipeline/pipeline/sync.py
# 备注:  游戏每隔几周新增 fixture；assets-cache 通过 sssekai 自动覆盖，但渲染列表
#        来自 src/data/mysekaiFixtures.json，需要手动更新才能让 pipeline 看见新条目。

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path
from typing import Any

from pipeline.config import FIXTURES_JSON_PATH
from pipeline.routing import is_outdoor

UPSTREAM_URL = (
    "https://raw.githubusercontent.com/Sekai-World/"
    "sekai-master-db-diff/main/mysekaiFixtures.json"
)
MANIFEST_PATH = (
    FIXTURES_JSON_PATH.parents[2] / "public" / "sprites" / "manifest.json"
)


# ======== HTTP fetch ========
def _fetch_upstream(timeout: int = 30) -> list[dict[str, Any]]:
    """从 GitHub raw 拉最新 mysekaiFixtures.json。失败抛 RuntimeError。"""
    req = urllib.request.Request(UPSTREAM_URL, headers={"User-Agent": "mysekai-planner-sync/1"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        if r.status != 200:
            raise RuntimeError(f"upstream returned {r.status}")
        data = json.loads(r.read().decode("utf-8"))
    if not isinstance(data, list):
        raise RuntimeError(f"unexpected schema: {type(data).__name__}")
    return data


# ======== 本地状态 ========
def _load_local_fixtures() -> list[dict[str, Any]]:
    if not FIXTURES_JSON_PATH.exists():
        return []
    return json.loads(FIXTURES_JSON_PATH.read_text())


def _load_manifest_names() -> set[str]:
    """读取 public/sprites/manifest.json 中已渲染的 fixture assetbundleNames。"""
    if not MANIFEST_PATH.exists():
        return set()
    try:
        data = json.loads(MANIFEST_PATH.read_text())
    except json.JSONDecodeError:
        return set()
    fixtures = data.get("fixtures") or {}
    return set(fixtures.keys())


# ======== Diff 计算 ========
def _diff(
    upstream: list[dict[str, Any]],
    local: list[dict[str, Any]],
    manifest_names: set[str],
    include_changed: bool,
) -> dict[str, Any]:
    """对比 upstream vs local + manifest，返回需要渲染的 id 集合 + 摘要。"""
    local_by_id = {f["id"]: f for f in local if "id" in f}
    upstream_by_id = {f["id"]: f for f in upstream if "id" in f}

    new_ids: list[int] = []
    changed_ids: list[int] = []  # 同 id 但 assetbundleName 变了
    removed_ids: list[int] = []

    for fid, fx in upstream_by_id.items():
        if fid not in local_by_id:
            new_ids.append(fid)
            continue
        old_name = local_by_id[fid].get("assetbundleName")
        new_name = fx.get("assetbundleName")
        if old_name != new_name:
            changed_ids.append(fid)
    for fid in local_by_id:
        if fid not in upstream_by_id:
            removed_ids.append(fid)

    # ======== "需渲染" 集合 ========
    # 必渲染：上游户外 fixture 且 assetbundleName 不在 manifest（无论是否新条目）
    # 可选：include_changed 把 assetbundleName 变更的也加入
    needs_render: set[int] = set()
    for fid, fx in upstream_by_id.items():
        if not is_outdoor(fx):
            continue
        name = fx.get("assetbundleName")
        if name and name not in manifest_names:
            needs_render.add(fid)
    if include_changed:
        needs_render.update(changed_ids)

    return {
        "new_ids": sorted(new_ids),
        "changed_ids": sorted(changed_ids),
        "removed_ids": sorted(removed_ids),
        "needs_render": sorted(needs_render),
        "upstream_count": len(upstream_by_id),
        "local_count": len(local_by_id),
        "manifest_count": len(manifest_names),
    }


# ======== 报告 ========
def _print_report(diff: dict[str, Any], wrote_data: bool) -> None:
    print(f"upstream fixtures: {diff['upstream_count']}")
    print(f"local fixtures:    {diff['local_count']}")
    print(f"sprites in manifest: {diff['manifest_count']}")
    print()
    print(f"new ids:      {len(diff['new_ids'])}")
    print(f"changed ids:  {len(diff['changed_ids'])}  (same id, different assetbundleName)")
    print(f"removed ids:  {len(diff['removed_ids'])}  (no longer upstream)")
    print(f"needs render: {len(diff['needs_render'])}  (outdoor + missing from manifest)")

    if diff["new_ids"][:8]:
        sample = ", ".join(str(i) for i in diff["new_ids"][:8])
        more = "" if len(diff["new_ids"]) <= 8 else f", … (+{len(diff['new_ids']) - 8})"
        print(f"  new sample:  {sample}{more}")
    if wrote_data:
        print()
        print(f"✓ wrote {FIXTURES_JSON_PATH}")


# ======== 链式调用 extract-2d / render-3d / assemble-manifest ========
def _run_render_chain(ids: list[int]) -> int:
    """以 --ids 过滤跑完整管线。复用各 stage 的 run() 函数避免子进程开销。"""
    if not ids:
        print("(needs_render is empty — nothing to render)")
        return 0
    ids_csv = ",".join(str(i) for i in ids)
    print(f"\n=== rendering {len(ids)} fixture(s) ===\n")

    from pipeline import assemble_manifest, extract_2d, render_3d

    ns = argparse.Namespace(
        dry_run=False, limit=None, ids=ids_csv, skip_thumbnails=False, check_size=False,
    )
    for stage_name, stage in (
        ("extract-2d", extract_2d.run),
        ("render-3d", render_3d.run),
        ("assemble-manifest", assemble_manifest.run),
    ):
        print(f"--- {stage_name} ---")
        rc = stage(ns)
        if rc != 0:
            print(f"[{stage_name}] non-zero exit: {rc}", file=sys.stderr)
            return rc
    return 0


# ======== argparse ========
def add_args(p: argparse.ArgumentParser) -> None:
    p.add_argument(
        "--dry-run", action="store_true",
        help="只比对、不写 src/data/mysekaiFixtures.json，也不渲染",
    )
    p.add_argument(
        "--no-fetch", action="store_true",
        help="跳过 HTTP 拉取，按当前本地 mysekaiFixtures.json 与 manifest 比对（用于 manifest 修复）",
    )
    p.add_argument(
        "--render", action="store_true",
        help="比对完成后链式调用 extract-2d / render-3d / assemble-manifest，仅处理 diff 中的 ids",
    )
    p.add_argument(
        "--include-changed", action="store_true",
        help="把 assetbundleName 变更的 id 也加入渲染集（默认仅新条目）",
    )


def run(args: argparse.Namespace) -> int:
    """主流程：先读 local，再 fetch upstream，diff，最后写入 + 可选渲染。
    顺序敏感：必须在 write 之前算 diff，否则基准就被覆盖了。"""
    local = _load_local_fixtures()

    if args.no_fetch:
        upstream = local
    else:
        try:
            upstream = _fetch_upstream()
        except Exception as e:
            print(f"fetch failed: {e}", file=sys.stderr)
            return 1

    manifest_names = _load_manifest_names()
    diff = _diff(upstream, local, manifest_names, args.include_changed)

    # 写入（除非 --dry-run / --no-fetch）
    wrote = False
    if not args.dry_run and not args.no_fetch:
        FIXTURES_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
        FIXTURES_JSON_PATH.write_text(
            json.dumps(upstream, ensure_ascii=False, indent=2) + "\n"
        )
        wrote = True

    _print_report(diff, wrote)

    # 渲染（仅 --render 且 diff 非空）
    if args.render and not args.dry_run:
        return _run_render_chain(diff["needs_render"])
    return 0
