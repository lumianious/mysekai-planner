# ======== 户外装备总数检查（SPRT-05）========
# INPUT:  python -m pipeline {extract-2d|render-3d|run-all} --dry-run
# OUTPUT: pytest report
# POS:    scripts/sprite-pipeline/tests/test_routing_outdoor_count.py

from __future__ import annotations

import re
import subprocess
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parents[1]


def _run(*args: str) -> tuple[int, str, str]:
    r = subprocess.run(
        ["python", "-m", "pipeline", *args],
        cwd=str(PIPELINE_DIR),
        capture_output=True,
        text=True,
        timeout=30,
    )
    return r.returncode, r.stdout, r.stderr


def test_extract_2d_dry_run_announces_count():
    rc, out, err = _run("extract-2d", "--dry-run")
    assert rc == 0, err
    m = re.search(r"extract-2d dry-run: (\d+)", out)
    assert m, f"no count line in: {out}"
    n = int(m.group(1))
    # 2D 分支主要是 rug / road / fence / floor_appearance；几十到几百量级
    assert 20 < n < 500, f"unexpected 2D count: {n}"


def test_render_3d_dry_run_announces_count():
    rc, out, err = _run("render-3d", "--dry-run")
    assert rc == 0, err
    m = re.search(r"render-3d dry-run: (\d+)", out)
    assert m, f"no count line in: {out}"
    n = int(m.group(1))
    # 3D 占大头；600+ 量级
    assert 500 < n < 1300, f"unexpected 3D count: {n}"


def test_run_all_dry_run_enumerates_outdoor():
    rc, out, err = _run("run-all", "--dry-run")
    assert rc == 0, err
    assert "extract-2d dry-run:" in out
    assert "render-3d dry-run:" in out
    e = int(re.search(r"extract-2d dry-run: (\d+)", out).group(1))
    d = int(re.search(r"render-3d dry-run: (\d+)", out).group(1))
    total = e + d
    # PILOT-FINDINGS verified 1138 outdoor fixtures
    assert 1000 < total < 1300, f"unexpected outdoor total: {total} (e={e}, d={d})"
