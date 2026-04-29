# ======== 子命令路由 ========
# INPUT:  CLI argv
# OUTPUT: 派发到对应 subcommand
# POS:    scripts/sprite-pipeline/pipeline/__main__.py
# 用法：python -m pipeline {download|extract-2d|render-3d|assemble-manifest|run-all}

from __future__ import annotations

import argparse
import sys


def _stub(name: str):
    def run(_args):
        print(f"{name} not yet implemented", file=sys.stderr)
        return 3
    return run


def main() -> int:
    ap = argparse.ArgumentParser(prog="pipeline")
    sub = ap.add_subparsers(dest="cmd", required=True)

    # ======== download：始终可用 ========
    from pipeline import download as dl
    p_dl = sub.add_parser("download", help="Fetch MySekai bundles via sssekai abcache")
    dl.add_args(p_dl)
    p_dl.set_defaults(func=dl.run)

    # ======== 占位：先创建子解析器，后续按需替换 ========
    placeholders = ("extract-2d", "render-3d", "assemble-manifest", "run-all")
    for name in placeholders:
        p = sub.add_parser(name)
        p.add_argument("--dry-run", action="store_true")
        p.set_defaults(func=_stub(name))

    # ======== 动态注入真实 handler（缺失即保留 stub）========
    try:
        from pipeline import extract_2d as e2
        if hasattr(e2, "add_args"):
            p_e = sub.choices["extract-2d"]
            # argparse 不支持二次 add_argument 同名，重建 parser
            sub._name_parser_map.pop("extract-2d", None)
            p_e = sub.add_parser("extract-2d")
            e2.add_args(p_e)
            p_e.set_defaults(func=e2.run)
    except ImportError:
        pass

    try:
        from pipeline import render_3d as r3
        sub._name_parser_map.pop("render-3d", None)
        p_r = sub.add_parser("render-3d")
        r3.add_args(p_r)
        p_r.set_defaults(func=r3.run)
    except ImportError:
        pass

    try:
        from pipeline import assemble_manifest as am
        sub._name_parser_map.pop("assemble-manifest", None)
        p_a = sub.add_parser("assemble-manifest")
        am.add_args(p_a)
        p_a.set_defaults(func=am.run)
    except ImportError:
        pass

    try:
        from pipeline import run_all as ra
        sub._name_parser_map.pop("run-all", None)
        p_all = sub.add_parser("run-all")
        ra.add_args(p_all)
        p_all.set_defaults(func=ra.run)
    except ImportError:
        pass

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
