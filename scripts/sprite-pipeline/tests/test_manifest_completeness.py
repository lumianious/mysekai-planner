# ======== 清单完整性测试（SPRT-05）========
# INPUT:  public/sprites/manifest.json + *.png（只在已存在时校验）
# OUTPUT: pytest report
# POS:    scripts/sprite-pipeline/tests/test_manifest_completeness.py

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from pipeline.config import MANIFEST_PATH, SPRITES_OUT_DIR

PIPELINE_DIR = Path(__file__).resolve().parents[1]


def test_assemble_manifest_runs_clean():
    r = subprocess.run(
        ["python", "-m", "pipeline", "assemble-manifest"],
        cwd=PIPELINE_DIR,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert r.returncode == 0, r.stderr


def test_every_manifest_entry_has_corresponding_png_on_disk():
    if not MANIFEST_PATH.exists():
        pytest.skip("manifest not yet generated")
    m = json.loads(MANIFEST_PATH.read_text())
    for name, entry in m["fixtures"].items():
        png = SPRITES_OUT_DIR / f"{name}.png"
        assert png.exists(), f"manifest references missing PNG: {png}"
        assert png.stat().st_size > 0


def test_manifest_schema_matches_spriteManifest_ts():
    if not MANIFEST_PATH.exists():
        pytest.skip("manifest not yet generated")
    m = json.loads(MANIFEST_PATH.read_text())
    assert m["version"] == "1"
    assert "extracted_at" in m
    for name, e in m["fixtures"].items():
        assert e["mode"] in ("2d", "3d")
        assert e["sprite"].startswith("sprites/")
        assert isinstance(e["size_px"], list) and len(e["size_px"]) == 2
        assert all(isinstance(x, int) and x > 0 for x in e["size_px"])
        assert isinstance(e["thumbnails"], list)
        for t in e["thumbnails"]:
            assert t.startswith("sprites/thumbnails/")
