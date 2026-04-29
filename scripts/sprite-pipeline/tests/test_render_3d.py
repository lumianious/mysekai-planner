# ======== Blender 顶视图渲染测试（slow）========
# INPUT:  tests/fixtures/sample_3d.glb
# OUTPUT: pytest 报告
# POS:    scripts/sprite-pipeline/tests/test_render_3d.py
# 注：未安装 Blender 时 SKIP（不 FAIL）。

import os
import shutil
import subprocess
from pathlib import Path

import pytest
from PIL import Image

BLENDER = os.environ.get("BLENDER_BIN", "blender")
HAS_BLENDER = shutil.which(BLENDER) is not None
PIPELINE_DIR = Path(__file__).resolve().parents[1]

pytestmark = pytest.mark.slow


@pytest.mark.skipif(not HAS_BLENDER, reason="Blender not on PATH; set BLENDER_BIN")
def test_sample_glb_renders_transparent_rgba(sample_3d_glb_path, tmp_path):
    out = tmp_path / "box.png"
    result = subprocess.run(
        [
            BLENDER, "--background",
            "--python", str(PIPELINE_DIR / "pipeline" / "blender_render.py"),
            "--",
            "--asset", str(sample_3d_glb_path),
            "--out", str(out),
            "--tile-w", "1",
            "--tile-d", "1",
        ],
        capture_output=True,
        text=True,
        timeout=180,
    )
    assert result.returncode == 0, f"blender failed:\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
    assert out.exists() and out.stat().st_size > 0

    img = Image.open(out)
    assert img.mode == "RGBA"
    assert img.size == (128, 128)

    alphas = list(img.split()[-1].getdata())
    nonzero = sum(1 for a in alphas if a > 0)
    zero = sum(1 for a in alphas if a == 0)
    assert nonzero > 0, "rendered fully transparent — camera/light mis-configured"
    assert zero > 0, "no transparent pixels — film_transparent did not take effect"
