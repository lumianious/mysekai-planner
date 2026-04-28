# ======== CDN 可达性探针（pilot 第 0 步）========
# INPUT:  data/apphash.json (冻结的 sekai-apphash JP production)
#         src/data/mysekaiFixtures.json (master DB snapshot)
# OUTPUT: .planning/phases/05-sprite-pipeline/05-02-CDN-PROBE.md
#         + 3 个临时下载 bundle 用于 SHA256 校验
# POS:    scripts/sprite-pipeline/pipeline/cdn_probe.py
# 备注：sssekai (2026-02-25) 与 sekai-apphash (2026-02-06) 均已归档，
#       本任务先确认冻结哈希仍能对当前 JP CDN 鉴权，再决定是否继续 pilot。

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from pipeline.config import FIXTURES_JSON_PATH, PIPELINE_DIR

APPHASH_JSON = PIPELINE_DIR / "data" / "apphash.json"
REPORT_PATH = (
    PIPELINE_DIR.parent.parent
    / ".planning"
    / "phases"
    / "05-sprite-pipeline"
    / "05-02-CDN-PROBE.md"
)


# ======== 凭据装载 ========
def _load_credentials() -> tuple[str, str, str]:
    """从冻结的 apphash.json 取 (appVersion, appHash, abVersion)。
    顶层已展平，直接读；缺失则回退到 raw.production_android。"""
    d = json.loads(APPHASH_JSON.read_text())
    if {"appVersion", "appHash"}.issubset(d):
        return d["appVersion"], d["appHash"], d.get("abVersion", d["appVersion"])
    raw = d.get("raw", {})
    prod = raw.get("production_android") or raw.get("production_ios")
    if prod:
        return prod["app_version"], prod["app_hash"], prod.get("ab_version", prod["app_version"])
    raise SystemExit("apphash.json missing production credentials")


# ======== 探针 fixture 选择 ========
def _pick_probe_fixtures() -> list[dict]:
    """按 id 顺序选 OLDEST / MID-LIFE / NEWEST 三个 outdoor fixture。"""
    all_fx = json.loads(FIXTURES_JSON_PATH.read_text())
    outdoor = sorted(
        [fx for fx in all_fx if fx.get("mysekaiSettableSiteType") != "room"],
        key=lambda f: f["id"],
    )
    if len(outdoor) < 3:
        raise SystemExit(f"only {len(outdoor)} outdoor fixtures; need >= 3")
    return [outdoor[0], outdoor[len(outdoor) // 2], outdoor[-1]]


# ======== 单 bundle 下载尝试 ========
def _try_download(
    app_version: str,
    app_hash: str,
    ab_version: str,
    bundle_name: str,
    dest: Path,
) -> dict:
    """运行 sssekai abcache，仅下载与 bundle_name 完全匹配的资源。
    --download-filter 接收正则；点号转义。"""
    pattern = "^" + bundle_name.replace(".", r"\.") + "$"
    sssekai_bin = (
        shutil.which("sssekai")
        or str(Path(sys.executable).parent / "sssekai")
    )
    cmd = [
        sssekai_bin,
        "abcache",
        "--db", str(dest / "abcache.db"),
        "--app-region", "jp",
        "--app-platform", "android",
        "--app-version", app_version,
        "--app-appHash", app_hash,
        "--app-abVersion", ab_version,
        "--download-filter", pattern,
        "--download-ensure-deps",
        "--download-dir", str(dest / "bundles"),
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=240)
    except subprocess.TimeoutExpired as e:
        return {
            "bundle": bundle_name,
            "exit_code": -1,
            "stderr_tail": f"timeout after {e.timeout}s",
            "bytes": 0,
            "sha256": None,
            "status": "TIMEOUT",
        }

    info: dict = {
        "bundle": bundle_name,
        "exit_code": result.returncode,
        "stderr_tail": (result.stderr or "")[-600:].strip(),
        "stdout_tail": (result.stdout or "")[-300:].strip(),
    }
    # bundle 可能存在子目录里；递归找一下
    bundles_root = dest / "bundles"
    bundle_path = None
    if bundles_root.exists():
        for p in bundles_root.rglob("*"):
            if p.is_file() and p.stat().st_size > 0:
                # 精确匹配文件名（含或不含扩展名）
                if p.name == bundle_name or p.stem == bundle_name:
                    bundle_path = p
                    break
        if bundle_path is None:
            # 退回任何非空文件（sssekai 可能不加扩展名）
            files = [p for p in bundles_root.rglob("*") if p.is_file() and p.stat().st_size > 0]
            if files:
                bundle_path = max(files, key=lambda p: p.stat().st_size)

    if bundle_path is not None and bundle_path.stat().st_size > 0:
        data = bundle_path.read_bytes()
        info["bytes"] = len(data)
        info["sha256"] = hashlib.sha256(data).hexdigest()
        info["resolved_path"] = str(bundle_path.relative_to(bundles_root))
        info["status"] = "OK" if result.returncode == 0 else "PARTIAL"
    else:
        info["bytes"] = 0
        info["sha256"] = None
        info["status"] = "FAILED"
    return info


# ======== 整体裁决 ========
def _verdict(results: list[dict]) -> str:
    oldest, _mid, _newest = results
    if all(r["status"] == "OK" for r in results):
        return "LIVE_OK"
    if oldest["status"] == "OK":
        return "PARTIAL"
    return "FAILED"


# ======== 报告渲染 ========
def _render_report(
    verdict: str,
    app_version: str,
    app_hash: str,
    probes: list[dict],
    results: list[dict],
) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = [
        f"# CDN Probe — {ts}",
        "",
        f"Verdict: {verdict}",
        "",
        f"- appVersion: `{app_version}`",
        f"- appHash: `{app_hash[:8]}…` (truncated)",
        "- source: `scripts/sprite-pipeline/data/apphash.json` (frozen Feb-2026)",
        "",
        "## Probe Fixtures",
        "",
    ]
    for label, fx, r in zip(("OLDEST", "MID-LIFE", "NEWEST"), probes, results):
        sha = r["sha256"]
        sha_line = f"- sha256: `{sha}`" if sha else "- sha256: _(not downloaded)_"
        stderr_block = (r.get("stderr_tail") or "(empty)").replace("\n", "\n  ")
        lines += [
            f"### {label} — id={fx['id']} `{fx['assetbundleName']}`",
            f"- status: **{r['status']}**",
            f"- exit_code: `{r['exit_code']}`",
            f"- bytes: `{r['bytes']}`",
            sha_line,
            f"- resolved_path: `{r.get('resolved_path', '(n/a)')}`",
            "- stderr_tail:",
            "  ```",
            "  " + stderr_block,
            "  ```",
            "",
        ]
    if verdict == "FAILED":
        lines += [
            "## Escalation",
            "",
            "Even the oldest probe fixture failed — frozen apphash no longer authenticates against the live JP CDN.",
            "User MUST pick a mitigation before pilot can continue:",
            "- (a) Extract current apphash from a fresh APK via `sssekai apphash -s <xapk>`",
            "- (b) Accept snapshot-only pipeline (use whatever bundles are already cached locally)",
            "- (c) Find an active community fork of sekai-apphash or twintail",
            "",
        ]
    elif verdict == "PARTIAL":
        lines += [
            "## Note",
            "",
            "The OLDEST fixture authenticated, but at least one newer probe failed. ",
            "Document the cutoff and decide whether Wave 3 ships partial coverage or pursues a fresher apphash.",
            "",
        ]
    return "\n".join(lines)


# ======== 入口 ========
def main() -> int:
    app_version, app_hash, ab_version = _load_credentials()
    probes = _pick_probe_fixtures()
    print(
        "Probing JP CDN with frozen apphash:",
        f"appVersion={app_version} hash={app_hash[:8]}… abVersion={ab_version}",
    )
    print("Fixtures:", [(f["id"], f["assetbundleName"]) for f in probes])

    results: list[dict] = []
    with tempfile.TemporaryDirectory(prefix="cdn-probe-") as td:
        dest = Path(td)
        for fx in probes:
            print(f"\n[probe] id={fx['id']} bundle={fx['assetbundleName']}")
            info = _try_download(app_version, app_hash, ab_version, fx["assetbundleName"], dest)
            print(
                f"  -> status={info['status']} bytes={info['bytes']} "
                f"exit={info['exit_code']}"
            )
            results.append(info)

    verdict = _verdict(results)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(_render_report(verdict, app_version, app_hash, probes, results))
    print(f"\nVerdict: {verdict}; report -> {REPORT_PATH}")
    return 0 if verdict == "LIVE_OK" else 1


if __name__ == "__main__":
    sys.exit(main())
