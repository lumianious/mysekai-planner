# CDN Probe — 2026-04-28T09:33:43Z

Verdict: FAILED

- appVersion: `6.3.0`
- appHash: `d7cb8f7e…` (truncated)
- source: `scripts/sprite-pipeline/data/apphash.json` (frozen Feb-2026)

## Probe Fixtures

### OLDEST — id=1 `mdl_mis0001_house_house1`
- status: **FAILED**
- exit_code: `1`
- bytes: `0`
- sha256: _(not downloaded)_
- resolved_path: `(n/a)`
- stderr_tail:
  ```
  ^^^^^^^^^^^^^^^
    File "/Users/lijunyang/Personal/mysekai-planner/scripts/sprite-pipeline/.venv/lib/python3.12/site-packages/sssekai/entrypoint/abcache.py", line 272, in main_abcache
      for bundleName in _iter_bundles():
                        ^^^^^^^^^^^^^^^
    File "/Users/lijunyang/Personal/mysekai-planner/scripts/sprite-pipeline/.venv/lib/python3.12/site-packages/sssekai/entrypoint/abcache.py", line 262, in _iter_bundles
      for name, entry in cache.abcache_index.bundles.items():
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  AttributeError: 'NoneType' object has no attribute 'bundles'
  ```

### MID-LIFE — id=661 `mdl_env0010_fixture_canvas1`
- status: **FAILED**
- exit_code: `1`
- bytes: `0`
- sha256: _(not downloaded)_
- resolved_path: `(n/a)`
- stderr_tail:
  ```
  ^^^^^^^^^^^^^^^
    File "/Users/lijunyang/Personal/mysekai-planner/scripts/sprite-pipeline/.venv/lib/python3.12/site-packages/sssekai/entrypoint/abcache.py", line 272, in main_abcache
      for bundleName in _iter_bundles():
                        ^^^^^^^^^^^^^^^
    File "/Users/lijunyang/Personal/mysekai-planner/scripts/sprite-pipeline/.venv/lib/python3.12/site-packages/sssekai/entrypoint/abcache.py", line 262, in _iter_bundles
      for name, entry in cache.abcache_index.bundles.items():
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  AttributeError: 'NoneType' object has no attribute 'bundles'
  ```

### NEWEST — id=900002 `mdl_non0006_gate_lon1`
- status: **FAILED**
- exit_code: `1`
- bytes: `0`
- sha256: _(not downloaded)_
- resolved_path: `(n/a)`
- stderr_tail:
  ```
  ^^^^^^^^^^^^^^^
    File "/Users/lijunyang/Personal/mysekai-planner/scripts/sprite-pipeline/.venv/lib/python3.12/site-packages/sssekai/entrypoint/abcache.py", line 272, in main_abcache
      for bundleName in _iter_bundles():
                        ^^^^^^^^^^^^^^^
    File "/Users/lijunyang/Personal/mysekai-planner/scripts/sprite-pipeline/.venv/lib/python3.12/site-packages/sssekai/entrypoint/abcache.py", line 262, in _iter_bundles
      for name, entry in cache.abcache_index.bundles.items():
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  AttributeError: 'NoneType' object has no attribute 'bundles'
  ```

## Escalation

**Diagnosis (from `--log-level DEBUG`):**

```
POST https://production-game-api.sekai.colorfulpalette.org/api/user
HTTP 426 Upgrade Required
response={'httpStatus': 426, 'errorCode': '', 'errorMessage': ''}
Failed to authenticate
Cache update failure: Cannot update client headers without auth info
```

The auth API is alive but **rejects appVersion=6.3.0 (Feb-2026 frozen apphash)**: the live JP
client is on 6.4.x+. The auth scheme itself appears unchanged — credentials are simply stale.
sssekai logs a hint:

> "NOTE: You can fill in the EN/JP override fields (`--app-asset-...`) to bypass auth."

### Mitigation options

User MUST pick one before pilot Task 2+ can run:

- **(a) Extract current apphash from a fresh JP APK.**
  `sssekai apphash -s <path-to-current-jp.xapk>` (need to grab a recent JP build from APKMirror /
  similar). Then re-run the probe with the new `appVersion` + `appHash`. **Most likely to succeed**
  — keeps the standard auth path.

- **(b) Bypass auth via `--app-asset-host/version/hash` overrides.**
  sssekai supports skipping the version-gated `/api/user` call if these three values are supplied
  directly. Source: pull them from a community-maintained mirror (e.g. extract via mitmproxy
  against the live client, or find a current fork of `sekai-apphash` that publishes them).
  Lower-friction than (a) if a current source exists.

- **(c) Accept snapshot-only pipeline.**
  Use whatever bundles are already cached locally; ship Wave 3 with frozen 6.3.0 coverage and
  document the cutoff in PILOT-FINDINGS. Means new fixtures shipped after 6.3.0 stay sprite-less
  until apphash is refreshed.

- **(d) Abandon Phase 5 sprite pipeline.**
  Fall back to the placeholder/colored-rect rendering already shipped in Wave 1. Re-evaluate
  if/when an active community fork of sssekai or apphash emerges.

### Pilot blocked

Tasks 2–5 of plan 05-02 (extract_2d, blender_render, pilot orchestrator, PILOT-FINDINGS visual
review) MUST NOT execute until the user picks a path. The Wave 1 frontend code already handles
the missing-manifest case gracefully (`getSpriteEntrySync` returns undefined → fixture falls back
to placeholder), so the app is shippable even if Phase 5 is paused.
