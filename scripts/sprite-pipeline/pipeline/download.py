# ======== sssekai abcache 包装器（D-12 配方 + D-14 stamping）========
# INPUT:  --app-version <X.Y.Z>（必填，从 sekai.best 或 apkpure 查；缺省读取 data/apphash.json）
#         --app-hash <UUID>（可选；缺省从 data/apphash.json 或 mos9527/sekai-apphash 拉）
#         --dry-run（不联网，打印完整命令 + .extracted-with）
# OUTPUT: scripts/sprite-pipeline/assets-cache/bundles/mysekai/* + .extracted-with
# POS:    scripts/sprite-pipeline/pipeline/download.py
# 备注：PILOT-FINDINGS Q5 — apphash 来源是 data/apphash.json（手动从 xapk 刷新），
#       网络回退仅作为兜底。

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from pipeline.config import ASSETS_CACHE_DIR, BUNDLES_DIR, PIPELINE_DIR

APPHASH_URL = "https://raw.githubusercontent.com/mos9527/sekai-apphash/master/jp/apphash.json"
SSSEKAI_VERSION = "0.8.0"
LOCAL_APPHASH_PATH = PIPELINE_DIR / "data" / "apphash.json"


# ======== 凭证加载 ========
def _load_local_apphash() -> dict | None:
    if not LOCAL_APPHASH_PATH.exists():
        return None
    try:
        return json.loads(LOCAL_APPHASH_PATH.read_text())
    except Exception:
        return None


def fetch_current_app_hash() -> str:
    """网络回退：从 mos9527/sekai-apphash 拉 production hash（已 archived，仅兜底）。"""
    with urllib.request.urlopen(APPHASH_URL, timeout=15) as r:
        data = json.loads(r.read().decode("utf-8"))
    if isinstance(data, list):
        prod = next((d for d in data if "production" in str(d.get("environment", ""))), None)
        if not prod:
            raise RuntimeError(f"no production entry in {APPHASH_URL}")
        return prod["appHash"]
    if isinstance(data, dict):
        # mos9527 archive schema is `{appHash: ...}` or nested under `production`
        return data.get("appHash") or data["production"]["appHash"]
    raise RuntimeError(f"unexpected apphash schema: {type(data).__name__}")


def _sssekai_bin() -> str:
    return shutil.which("sssekai") or str(Path(sys.executable).parent / "sssekai")


# ======== 命令构造 ========
def build_command(app_version: str, app_hash: str, ab_version: str | None = None,
                   no_update: bool = False) -> list[str]:
    cmd = [
        _sssekai_bin(), "abcache",
        "--db", str(ASSETS_CACHE_DIR / "abcache.db"),
        "--app-region", "jp",
        "--app-platform", "android",
        "--app-version", app_version,
        "--app-appHash", app_hash,
    ]
    if ab_version:
        cmd += ["--app-abVersion", ab_version]
    if no_update:
        cmd += ["--no-update"]
    cmd += [
        "--download-filter", ".*mysekai.*",
        "--download-ensure-deps",
        "--download-no-overwrite",
        "--download-dir", str(BUNDLES_DIR),
    ]
    return cmd


def write_extracted_with(app_version: str, app_hash: str, ab_version: str | None) -> None:
    ASSETS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "sssekai_version": SSSEKAI_VERSION,
        "app_version": app_version,
        "app_hash": app_hash,
        "ab_version": ab_version,
        "extracted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    (ASSETS_CACHE_DIR / ".extracted-with").write_text(json.dumps(payload, indent=2))


# ======== argparse ========
def add_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--app-version",
                   help="JP app version (e.g. 6.4.1). Defaults to data/apphash.json.")
    p.add_argument("--app-hash",
                   help="Override; default = read data/apphash.json or fetch from network.")
    p.add_argument("--ab-version",
                   help="abVersion (defaults to data/apphash.json).")
    p.add_argument("--no-update", action="store_true",
                   help="Reuse existing abcache index (saves ~60s per invocation).")
    p.add_argument("--dry-run", action="store_true")


# ======== 入口 ========
def _resolve_credentials(args: argparse.Namespace) -> tuple[str, str, str | None]:
    """优先级：CLI 参数 > data/apphash.json > 网络拉取。"""
    local = _load_local_apphash() or {}
    app_version = args.app_version or local.get("appVersion")
    app_hash = args.app_hash or local.get("appHash")
    ab_version = args.ab_version or local.get("abVersion")

    if args.dry_run:
        app_version = app_version or "<APP_VERSION>"
        app_hash = app_hash or "<APP_HASH>"
        return app_version, app_hash, ab_version

    if not app_version:
        raise RuntimeError("--app-version required (or populate data/apphash.json)")
    if not app_hash:
        app_hash = fetch_current_app_hash()
    return app_version, app_hash, ab_version


def run(args: argparse.Namespace) -> int:
    try:
        app_version, app_hash, ab_version = _resolve_credentials(args)
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 2

    cmd = build_command(app_version, app_hash, ab_version=ab_version, no_update=args.no_update)
    if args.dry_run:
        print(" ".join(cmd))
        print()
        print("# .extracted-with would contain:")
        print(f"sssekai_version: {SSSEKAI_VERSION}")
        print(f"app_version: {app_version}")
        print(f"app_hash: {app_hash}")
        if ab_version:
            print(f"ab_version: {ab_version}")
        return 0

    BUNDLES_DIR.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        return result.returncode
    write_extracted_with(app_version, app_hash, ab_version)
    return 0
