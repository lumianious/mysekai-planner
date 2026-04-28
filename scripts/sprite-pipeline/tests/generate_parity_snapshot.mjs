// ======== 生成 routing 一致性快照 ========
// INPUT:  src/data/mysekaiFixtures.json（若不在 disk 上则 fetch from sekai-master-db-diff）
// OUTPUT: scripts/sprite-pipeline/tests/test_routing_parity_fixtures.json
// POS:    scripts/sprite-pipeline/tests/generate_parity_snapshot.mjs
// 运行：node scripts/sprite-pipeline/tests/generate_parity_snapshot.mjs

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../../..')

// JS classifier — verbatim from src/data/fixtures.ts
function getGroundSubtype(fx) {
  if (fx.mysekaiFixtureHandleType === 'fence') return 'fence'
  if (fx.mysekaiFixtureHandleType === 'road') {
    return fx.mysekaiFixtureMainGenreId === 31 ? 'color-tile' : 'road'
  }
  if (fx.mysekaiSettableLayoutType === 'rug') return 'rug'
  return null
}

const LOCAL_PATH = resolve(REPO_ROOT, 'src/data/mysekaiFixtures.json')
// URL mirrors src/data/fixtures.ts DATA_BASE_URL
const REMOTE_URL =
  'https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main/mysekaiFixtures.json'

async function loadFixtures() {
  if (existsSync(LOCAL_PATH)) {
    console.log(`reading local: ${LOCAL_PATH}`)
    return JSON.parse(await readFile(LOCAL_PATH, 'utf8'))
  }
  console.log(`fetching: ${REMOTE_URL}`)
  const res = await fetch(REMOTE_URL)
  if (!res.ok) {
    throw new Error(`failed to fetch fixtures: HTTP ${res.status}`)
  }
  return await res.json()
}

const fixtures = await loadFixtures()
const snapshot = fixtures.map((fx) => ({
  id: fx.id,
  assetbundleName: fx.assetbundleName,
  mysekaiFixtureHandleType: fx.mysekaiFixtureHandleType,
  mysekaiFixtureMainGenreId: fx.mysekaiFixtureMainGenreId,
  mysekaiSettableLayoutType: fx.mysekaiSettableLayoutType,
  mysekaiSettableSiteType: fx.mysekaiSettableSiteType,
  expected_ground_subtype: getGroundSubtype(fx),
}))

await writeFile(
  resolve(__dirname, 'test_routing_parity_fixtures.json'),
  JSON.stringify(snapshot, null, 2) + '\n',
)
console.log(`wrote ${snapshot.length} fixtures`)
