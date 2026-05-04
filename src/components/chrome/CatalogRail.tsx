// ======== 目录外壳（Slot B） ========
// INPUT: useEditorStore（catalogCollapsed, activeCategory）, fixtures, mainGenres, fixtureMap
// OUTPUT: 72px 总是可见的分类轨 + 可折叠 248px 主体（搜索 + 网格）
// POS: src/components/chrome/CatalogRail.tsx — Phase 7 目录壳

import {
  Menu,
  Grid3x3,
  Image as ImageIcon,
  Palette,
  Square,
  Route,
  LibraryBig,
  TreePine,
  Box,
} from 'lucide-react'
import type React from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { CatalogSidebar } from '../catalog/CatalogSidebar'
import type { Phase7Category } from '../../data/fixtures'
import type { Fixture, FixtureMainGenre } from '../../types/editor'

const CATEGORIES: Array<{
  key: Phase7Category
  label: string
  Icon: React.ElementType
}> = [
  { key: 'all', label: '全部', Icon: Grid3x3 },
  { key: 'display', label: 'ディスプレイ', Icon: ImageIcon },
  { key: 'canvas', label: 'キャンバス', Icon: Palette },
  { key: 'rug', label: 'ラグ', Icon: Square },
  { key: 'road', label: '道', Icon: Route },
  { key: 'shelf', label: '棚', Icon: LibraryBig },
  { key: 'plant', label: '植物', Icon: TreePine },
  { key: 'block', label: 'ブロック', Icon: Box },
]

interface CatalogRailProps {
  fixtures: Fixture[]
  mainGenres: FixtureMainGenre[]
  fixtureMap: Map<number, Fixture>
}

export function CatalogRail({
  fixtures,
  mainGenres,
  fixtureMap,
}: CatalogRailProps) {
  const collapsed = useEditorStore((s) => s.catalogCollapsed)
  const toggleCollapsed = useEditorStore((s) => s.toggleCatalogCollapsed)
  const activeCategory = useEditorStore(
    (s) => s.activeCategory,
  ) as Phase7Category
  const setActiveCategory = useEditorStore((s) => s.setActiveCategory)
  const setCollapsed = useEditorStore((s) => s.setCatalogCollapsed)

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{
        width: collapsed ? 72 : 320,
        height: 740,
        borderRadius: 'var(--radius-panel)',
        boxShadow: 'var(--shadow-lg)',
        transition: 'width 0.22s ease',
      }}
    >
      {/* Cat-rail（始终 72px） */}
      <div
        className="flex flex-col items-center"
        style={{
          width: 72,
          flexShrink: 0,
          background: 'linear-gradient(180deg, #ecdfb8, #e0cf9a)',
          borderRight: '2px solid rgba(120,90,30,.18)',
          boxShadow: 'inset -2px 0 0 rgba(255,255,255,.4)',
          borderTopLeftRadius: 'var(--radius-panel)',
          borderBottomLeftRadius: 'var(--radius-panel)',
          borderTopRightRadius: collapsed ? 'var(--radius-panel)' : 0,
          borderBottomRightRadius: collapsed ? 'var(--radius-panel)' : 0,
          paddingTop: 8,
          paddingBottom: 8,
          gap: 4,
        }}
      >
        {/* 汉堡菜单按钮 */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-chip)',
            background: 'transparent',
            cursor: 'pointer',
            border: 'none',
            transition: 'opacity 0.18s ease, background 0.12s ease',
          }}
          aria-label={collapsed ? '家具目録を展開' : '家具目録を折りたたむ'}
        >
          <Menu size={18} color="#1f3556" />
        </button>

        {CATEGORIES.map(({ key, label, Icon }) => {
          const active = activeCategory === key
          return (
            <button
              type="button"
              key={key}
              onClick={() => {
                setActiveCategory(key)
                if (collapsed) setCollapsed(false)
              }}
              className="relative flex flex-col items-center justify-center"
              style={{
                width: 60,
                height: 52,
                borderRadius: 'var(--radius-chip)',
                background: 'transparent',
                cursor: 'pointer',
                border: 'none',
                padding: 0,
                transition: 'transform .12s ease, background .12s ease',
              }}
              aria-pressed={active}
            >
              {active && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: -10,
                    top: 12,
                    width: 4,
                    height: 28,
                    background: 'linear-gradient(180deg, #9bdcff, #69c8ff)',
                    borderRadius: 2,
                  }}
                />
              )}
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-tile)',
                  background: active
                    ? 'rgba(105,200,255,.18)'
                    : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  size={20}
                  color={active ? '#2ea8ee' : '#4f6a8e'}
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              <span
                style={{
                  fontFamily:
                    '"M PLUS Rounded 1c", system-ui, sans-serif',
                  fontWeight: 800,
                  fontSize: 10,
                  lineHeight: 1.1,
                  color: '#1f3556',
                  marginTop: 2,
                }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {/* 主体 — 仅展开时渲染 */}
      {!collapsed && (
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #ffffff, #fbf6ea)',
            borderTop: '1px solid rgba(60,80,140,.14)',
            borderRight: '1px solid rgba(60,80,140,.14)',
            borderBottom: '1px solid rgba(60,80,140,.14)',
            borderTopRightRadius: 'var(--radius-panel)',
            borderBottomRightRadius: 'var(--radius-panel)',
            transition: 'opacity 0.18s ease',
          }}
        >
          <CatalogSidebar
            fixtures={fixtures}
            mainGenres={mainGenres}
            fixtureMap={fixtureMap}
          />
        </div>
      )}
    </div>
  )
}
