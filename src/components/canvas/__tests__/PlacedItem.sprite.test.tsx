// ======== PlacedItem sprite 渲染测试（Wave 4 — SPRT-07）========
// POS: src/components/canvas/__tests__/PlacedItem.sprite.test.tsx
//
// Wave 4 将启用此测试。当前 PlacedItem 无 sprite 分支，故占位为 it.todo。

import { describe, it } from 'vitest'

describe('PlacedItem sprite render (Wave 4 — SPRT-07)', () => {
  it.todo(
    'renders <Image> when manifest has entry for this fixture and use-image reports loaded',
  )
  it.todo(
    'keeps <Image> as a child of <Group rotation={item.rotation*90}> so rotation works (D-16)',
  )
  it.todo('falls back to <Rect> while use-image status is "loading" or "failed"')
})
