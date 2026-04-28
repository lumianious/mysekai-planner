# ======== pytest 共享夹具 ========
# INPUT:  scripts/sprite-pipeline/tests/fixtures/*
# OUTPUT: pytest fixtures (sample_2d_bundle_path, sample_3d_glb_path, fixtures_data)
# POS:    scripts/sprite-pipeline/tests/conftest.py

import json
import sys
from pathlib import Path
import pytest

# 让 tests/ 能直接 import pipeline.* 模块（避免依赖外部 PYTHONPATH 设置）
PIPELINE_ROOT = Path(__file__).resolve().parents[1]
if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from pipeline.config import FIXTURES_JSON_PATH  # noqa: E402

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def sample_2d_bundle_path() -> Path:
    p = FIXTURES_DIR / "sample_2d_bundle.unity3d"
    if not p.exists():
        pytest.skip(f"sample bundle not yet committed: {p}")
    return p


@pytest.fixture(scope="session")
def sample_3d_glb_path() -> Path:
    p = FIXTURES_DIR / "sample_3d.glb"
    if not p.exists():
        pytest.skip(f"sample GLB not yet committed: {p}")
    return p


@pytest.fixture(scope="session")
def fixtures_data() -> list[dict]:
    if not FIXTURES_JSON_PATH.exists():
        pytest.skip(f"mysekaiFixtures.json not on disk (fetched at runtime): {FIXTURES_JSON_PATH}")
    with open(FIXTURES_JSON_PATH) as f:
        return json.load(f)
