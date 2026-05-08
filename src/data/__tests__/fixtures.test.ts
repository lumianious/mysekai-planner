// ======== fixtures.test — Phase 9 CATL-05 negative ========
// INPUT: src/data/fixtures.ts 模块导出表
// OUTPUT: 断言 Phase7Category / filterByPhase7Category 已被删除（D-03）
// POS: src/data/__tests__/fixtures.test.ts — RED until plan 09-05 lands the deletion
//
// NOTE: 该文件在 Wave 0（09-01）阶段是 RED — 它会失败直到 09-05 删除遗留符号。
//       turn GREEN by: plan 09-05 删除 Phase7Category union + filterByPhase7Category fn

import { describe, it, expect } from 'vitest'
import * as mod from '../fixtures'

describe('fixtures.ts — Phase 7 legacy removal (CATL-05)', () => {
  it('does not export filterByPhase7Category (removed in plan 09-05)', () => {
    // CATL-05: filterByPhase7Category must be removed in plan 09-05
    expect('filterByPhase7Category' in mod).toBe(false)
  })

  it('does not export Phase7Category type-shaped runtime symbol', () => {
    // CATL-05: Phase7Category type only — runtime presence indicates leftover code
    expect('Phase7Category' in mod).toBe(false)
  })
})
