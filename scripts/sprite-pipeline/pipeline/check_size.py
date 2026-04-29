# ======== public/sprites 体积闸（D-02 150MB 上限）========
# INPUT:  无（读 SPRITES_OUT_DIR / SIZE_BUDGET_MB）
# OUTPUT: 退出码 0 (≤ cap) 或 1 (over)；详尽 stderr 列出最大占用项
# POS:    scripts/sprite-pipeline/pipeline/check_size.py

from __future__ import annotations

import sys
from pathlib import Path

from pipeline.config import SIZE_BUDGET_MB, SPRITES_OUT_DIR


def _file_sizes() -> list[tuple[Path, int]]:
    out = []
    for p in SPRITES_OUT_DIR.rglob("*"):
        if p.is_file():
            out.append((p, p.stat().st_size))
    return out


def check_size() -> int:
    files = _file_sizes()
    total = sum(s for _, s in files)
    mb = total / (1024 * 1024)
    if mb > SIZE_BUDGET_MB:
        print(
            f"[FAIL] public/sprites/ = {mb:.1f} MB > {SIZE_BUDGET_MB} MB cap (D-02)",
            file=sys.stderr,
        )
        # 列出最大 10 个文件，方便定位是哪批 fixture 推爆 cap
        files.sort(key=lambda x: x[1], reverse=True)
        for p, s in files[:10]:
            try:
                rel = p.relative_to(SPRITES_OUT_DIR)
            except ValueError:
                rel = p
            print(f"  {s / 1024:8.1f} KB  {rel}", file=sys.stderr)
        return 1
    print(f"[OK] public/sprites/ = {mb:.1f} MB (cap {SIZE_BUDGET_MB} MB, {len(files)} files)")
    return 0


if __name__ == "__main__":
    sys.exit(check_size())
