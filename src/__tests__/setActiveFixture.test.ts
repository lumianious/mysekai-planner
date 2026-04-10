// ======== setActiveFixture 工具模式路由测试 (D-30 / D-39) ========
// INPUT: 模拟 road / color-tile / fence / rug / table fixture
// OUTPUT: 验证 setActiveFixture 将 brush-eligible 家具路由到 'brush'，其余到 'stamp'
// POS: src/__tests__/setActiveFixture.test.ts — Phase 2 工具模式自动切换

import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore, pickToolModeForFixture } from '../stores/editorStore'
import type { Fixture } from '../types/editor'

const road: Fixture = {
  id: 111,
  name: '土の道',
  pronunciation: '',
  assetbundleName: '',
  gridSize: { width: 2, depth: 2 },
  colorCode: '',
  mysekaiFixtureType: 'normal',
  mysekaiFixtureMainGenreId: 12,
  mysekaiFixtureSubGenreId: 22,
  mysekaiFixtureHandleType: 'road',
  mysekaiSettableSiteType: 'home',
  mysekaiSettableLayoutType: 'road',
  mysekaiFixturePutType: 'none',
}

const fence: Fixture = {
  ...road,
  id: 114,
  mysekaiFixtureHandleType: 'fence',
  mysekaiFixtureMainGenreId: 13,
  mysekaiSettableLayoutType: 'floor',
}

const colorTile: Fixture = {
  ...road,
  id: 544,
  mysekaiFixtureMainGenreId: 31,
}

const rug: Fixture = {
  ...road,
  id: 200,
  mysekaiFixtureHandleType: 'none',
  mysekaiSettableLayoutType: 'rug',
  mysekaiFixtureMainGenreId: 5,
}

const table: Fixture = {
  ...road,
  id: 300,
  mysekaiFixtureHandleType: 'none',
  mysekaiSettableLayoutType: 'floor',
  mysekaiFixtureMainGenreId: 1,
}

describe('pickToolModeForFixture (D-30/D-39)', () => {
  it('road → brush', () => {
    expect(pickToolModeForFixture(road)).toBe('brush')
  })
  it('color-tile → brush', () => {
    expect(pickToolModeForFixture(colorTile)).toBe('brush')
  })
  it('fence → brush', () => {
    expect(pickToolModeForFixture(fence)).toBe('brush')
  })
  it('rug → stamp (D-39)', () => {
    expect(pickToolModeForFixture(rug)).toBe('stamp')
  })
  it('table → stamp', () => {
    expect(pickToolModeForFixture(table)).toBe('stamp')
  })
  it('null → select', () => {
    expect(pickToolModeForFixture(null)).toBe('select')
  })
})

describe('setActiveFixture routing', () => {
  beforeEach(() => {
    useEditorStore.setState({ toolMode: 'select', activeFixtureId: null })
  })

  it('clicking a road fixture activates brush mode', () => {
    useEditorStore.getState().setActiveFixture(road.id, road)
    expect(useEditorStore.getState().toolMode).toBe('brush')
    expect(useEditorStore.getState().activeFixtureId).toBe(road.id)
  })

  it('clicking a rug fixture activates stamp mode (ROAD-02 regression)', () => {
    useEditorStore.getState().setActiveFixture(rug.id, rug)
    expect(useEditorStore.getState().toolMode).toBe('stamp')
  })

  it('clicking a fence fixture activates brush mode', () => {
    useEditorStore.getState().setActiveFixture(fence.id, fence)
    expect(useEditorStore.getState().toolMode).toBe('brush')
  })

  it('setActiveFixture(null) returns to select mode', () => {
    useEditorStore.getState().setActiveFixture(road.id, road)
    useEditorStore.getState().setActiveFixture(null)
    expect(useEditorStore.getState().toolMode).toBe('select')
  })

  it('backward compat: setActiveFixture without fixture arg falls back to stamp', () => {
    useEditorStore.getState().setActiveFixture(999)
    expect(useEditorStore.getState().toolMode).toBe('stamp')
  })
})
