# ======== 管线常量配置 ========
# INPUT:  无
# OUTPUT: 模块级常量
# POS:    scripts/sprite-pipeline/pipeline/config.py

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
PIPELINE_DIR = REPO_ROOT / "scripts" / "sprite-pipeline"
ASSETS_CACHE_DIR = PIPELINE_DIR / "assets-cache"
BUNDLES_DIR = ASSETS_CACHE_DIR / "bundles"
SPRITES_OUT_DIR = REPO_ROOT / "public" / "sprites"
MANIFEST_PATH = SPRITES_OUT_DIR / "manifest.json"
FIXTURES_JSON_PATH = REPO_ROOT / "src" / "data" / "mysekaiFixtures.json"
OVERRIDES_PATH = PIPELINE_DIR / "overrides.yaml"

TILE_PX = 128                # D-05 — 4x oversample of TILE_SIZE=32
SIZE_BUDGET_MB = 150         # D-02 cap
