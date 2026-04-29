# ======== download 子命令 dry-run 合同测试（SPRT-01）========
# INPUT:  python -m pipeline download --dry-run ...
# OUTPUT: pytest report
# POS:    scripts/sprite-pipeline/tests/test_download_dryrun.py

from __future__ import annotations

import subprocess
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parents[1]


def run_module(*args: str) -> tuple[int, str, str]:
    r = subprocess.run(
        ["python", "-m", "pipeline", *args],
        cwd=str(PIPELINE_DIR),
        capture_output=True,
        text=True,
        timeout=30,
    )
    return r.returncode, r.stdout, r.stderr


def test_dry_run_prints_full_sssekai_command():
    rc, out, err = run_module(
        "download", "--dry-run",
        "--app-version", "6.4.1",
        "--app-hash", "deadbeef-uuid",
    )
    assert rc == 0, f"stdout={out}\nstderr={err}"
    assert "sssekai" in out and "abcache" in out
    assert "--db" in out and "abcache.db" in out
    assert "--app-region jp" in out
    assert "--app-version 6.4.1" in out
    assert "--app-appHash deadbeef-uuid" in out
    assert "--download-filter .*mysekai.*" in out
    assert "--download-ensure-deps" in out
    assert "--download-dir" in out and "bundles" in out


def test_dry_run_prints_extracted_with_block():
    rc, out, _ = run_module(
        "download", "--dry-run",
        "--app-version", "6.4.1",
        "--app-hash", "h",
    )
    assert rc == 0
    assert "sssekai_version: 0.8.0" in out
    assert "app_version: 6.4.1" in out
    assert "app_hash: h" in out


def test_help_lists_all_subcommands():
    rc, out, _ = run_module("--help")
    assert rc == 0
    for sub in ("download", "extract-2d", "render-3d", "assemble-manifest", "run-all"):
        assert sub in out, f"missing subcommand in --help: {sub}"
