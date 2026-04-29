# ======== 全管线驱动器 ========
# INPUT:  --dry-run / --limit
# OUTPUT: 顺序执行 extract-2d → render-3d → assemble-manifest
# POS:    scripts/sprite-pipeline/pipeline/run_all.py

from __future__ import annotations

import argparse


def add_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--limit", type=int, default=None,
                   help="cap each stage's fixture list for smoke testing")
    p.add_argument("--check-size", action="store_true",
                   help="run check_size.py after manifest write")


def run(args: argparse.Namespace) -> int:
    from pipeline import assemble_manifest, extract_2d, render_3d

    for stage in (extract_2d.run, render_3d.run, assemble_manifest.run):
        rc = stage(args)
        if rc != 0:
            return rc
    return 0
