# CDN Probe — 2026-04-28T09:59:01Z

Verdict: LIVE_OK

- appVersion: `6.4.1`
- appHash: `d67a688b…` (truncated)
- source: `scripts/sprite-pipeline/data/apphash.json` (extracted from JP 6.4.1 xapk via `sssekai apphash --apk-src`, 2026-04-28)
- bundle path prefix: `mysekai/fixture/<assetbundleName>` (discovered via `--dump`; required for regex match)
- coverage: OLDEST + MID-LIFE + NEWEST all reachable; 89,036 bundles indexed in live abcache

## Probe Fixtures

### OLDEST — id=1 `mdl_mis0001_house_house1`
- status: **OK**
- exit_code: `0`
- bytes: `364793`
- sha256: `f2587fca6ab50c4578cf4efe14332c80b7fb367eae2c8156e5825cddd84eb203`
- resolved_path: `mysekai/fixture/mdl_mis0001_house_house1`
- stderr_tail:
  ```
  00:01, 1.47MB/s]
   47%|████▋     | 2.16M/4.64M [00:03<00:01, 1.61MB/s]
   52%|█████▏    | 2.41M/4.64M [00:03<00:01, 1.76MB/s]
   57%|█████▋    | 2.66M/4.64M [00:03<00:01, 1.82MB/s]
   63%|██████▎   | 2.91M/4.64M [00:03<00:01, 1.77MB/s]
   68%|██████▊   | 3.16M/4.64M [00:04<00:00, 1.83MB/s]
   74%|███████▎  | 3.41M/4.64M [00:04<00:00, 1.93MB/s]
   79%|███████▉  | 3.66M/4.64M [00:04<00:00, 1.94MB/s]
   84%|████████▍ | 3.91M/4.64M [00:04<00:00, 1.97MB/s]
   90%|████████▉ | 4.16M/4.64M [00:04<00:00, 1.95MB/s]
   95%|█████████▌| 4.41M/4.64M [00:04<00:00, 1.96MB/s]
  100%|█████████▉| 4.64M/4.64M [00:04<00:00, 1.00MB/s]
  ```

### MID-LIFE — id=661 `mdl_env0010_fixture_canvas1`
- status: **OK**
- exit_code: `0`
- bytes: `78789`
- sha256: `7266652d8de061352049771168b5afe18d0e68ace8283e3d3a3d27bcc595c44a`
- resolved_path: `mysekai/fixture/mdl_env0010_fixture_canvas1`
- stderr_tail:
  ```
  00:01, 1.53MB/s]
   43%|████▎     | 1.89M/4.36M [00:02<00:01, 1.64MB/s]
   49%|████▉     | 2.14M/4.36M [00:03<00:01, 1.81MB/s]
   55%|█████▍    | 2.39M/4.36M [00:03<00:01, 1.94MB/s]
   60%|██████    | 2.64M/4.36M [00:03<00:00, 1.85MB/s]
   65%|██████▍   | 2.83M/4.36M [00:03<00:00, 1.87MB/s]
   70%|███████   | 3.08M/4.36M [00:03<00:00, 1.95MB/s]
   76%|███████▌  | 3.33M/4.36M [00:03<00:00, 1.97MB/s]
   82%|████████▏ | 3.58M/4.36M [00:03<00:00, 2.09MB/s]
   89%|████████▉ | 3.89M/4.36M [00:03<00:00, 2.27MB/s]
   96%|█████████▋| 4.20M/4.36M [00:04<00:00, 2.49MB/s]
  100%|█████████▉| 4.36M/4.36M [00:04<00:00, 1.12MB/s]
  ```

### NEWEST — id=900002 `mdl_non0006_gate_lon1`
- status: **OK**
- exit_code: `0`
- bytes: `148884`
- sha256: `1e88fd9b7cea866969e23b914c9e81f602ce9755a4892e9ff9bffe794401e8cd`
- resolved_path: `mysekai/fixture/mdl_non0006_gate_lon1`
- stderr_tail:
  ```
  00:02, 1.75MB/s]
   47%|████▋     | 2.84M/6.00M [00:02<00:01, 2.06MB/s]
   52%|█████▏    | 3.15M/6.00M [00:03<00:01, 2.27MB/s]
   59%|█████▊    | 3.52M/6.00M [00:03<00:01, 2.55MB/s]
   64%|██████▍   | 3.84M/6.00M [00:03<00:00, 2.60MB/s]
   69%|██████▉   | 4.15M/6.00M [00:03<00:00, 2.72MB/s]
   74%|███████▍  | 4.46M/6.00M [00:03<00:00, 2.87MB/s]
   80%|███████▉  | 4.77M/6.00M [00:03<00:00, 2.82MB/s]
   85%|████████▍ | 5.09M/6.00M [00:03<00:00, 2.93MB/s]
   90%|████████▉ | 5.40M/6.00M [00:03<00:00, 2.92MB/s]
   95%|█████████▌| 5.71M/6.00M [00:04<00:00, 2.94MB/s]
  6.00MB [00:04, 1.54MB/s]
  ```
