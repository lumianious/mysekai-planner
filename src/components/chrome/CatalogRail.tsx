// ======== 目录外壳（Slot B）— Phase 9 改：游戏数据驱动 + lucide 图标 + 竖向滚动 ========
// INPUT: useEditorStore（catalogCollapsed, catalogTop, activeCategory）, fixtures（已 outdoor 过滤）,
//          mainGenres（来自 fetchMainGenres，Phase 9 起被消费）, fixtureMap
// OUTPUT: 72px 分类轨 + 可折叠 248px 主体；分类列表派生自
//          [ALL_ENTRY, ...deriveOutdoorMainGenres(fixtures, mainGenres)]；
//          每个按钮经 getGenreIcon(assetbundleName) 解析 lucide 图标；按钮列竖向溢出可滚动
// POS: src/components/chrome/CatalogRail.tsx — Phase 9 catalog overhaul（CATL-05/06/09 + D-09）

import { useCallback, useMemo, useRef } from 'react'
import { Menu, GripHorizontal } from 'lucide-react'
import type React from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { CatalogSidebar } from '../catalog/CatalogSidebar'
import { deriveOutdoorMainGenres } from '../../data/genres'
import { getGenreIcon } from './genreIcons'
import type { Fixture, FixtureMainGenre, FixtureSubGenre } from '../../types/editor'

// ======== 'all' 哨兵：固定置顶，不参与游戏数据派生 ========
const ALL_ENTRY: { id: 'all'; name: string; assetbundleName: string } = {
  id: 'all',
  name: '全部',
  assetbundleName: 'icon_all',
}

interface CatalogRailProps {
  fixtures: Fixture[]
  mainGenres: FixtureMainGenre[]
  fixtureMap: Map<number, Fixture>
}

// 视口顶安全区：允许轨贴到屏幕顶（与 top-rail 同高），由 EditorLayout 的 z-index
// 确保 grip 始终可点击（catalog z 高于 top-rail）。
const TOP_MARGIN = 16
const MIN_VISIBLE_HEIGHT = 300

type RailEntry =
  | { id: 'all'; name: string; assetbundleName: string }
  | FixtureMainGenre

export function CatalogRail({
  fixtures,
  mainGenres,
  fixtureMap,
}: CatalogRailProps) {
  const collapsed = useEditorStore((s) => s.catalogCollapsed)
  const toggleCollapsed = useEditorStore((s) => s.toggleCatalogCollapsed)
  const activeCategory = useEditorStore((s) => s.activeCategory)
  const setActiveCategory = useEditorStore((s) => s.setActiveCategory)
  const setCollapsed = useEditorStore((s) => s.setCatalogCollapsed)
  const setCatalogTop = useEditorStore((s) => s.setCatalogTop)

  // ======== 派生：[ALL_ENTRY, ...curated outdoor mainGenres] ========
  // fixtures prop 已由 EditorLayout 上游 outdoor 过滤；deriveOutdoorMainGenres
  // 经验式仅保留至少有一个 outdoor fixture 引用的 mainGenre，并保持原顺序。
  // 这天然 prune 掉 Leo/need/MJ/event/tool 等室内/装饰类分类（CATL-06 / D-02 / D-16）。
  const visibleEntries = useMemo<RailEntry[]>(() => {
    const curated = deriveOutdoorMainGenres(fixtures, mainGenres)
    return [ALL_ENTRY, ...curated]
  }, [fixtures, mainGenres])

  // ======== 竖直拖拽：grip 按下后跟随光标 Y 移动 ========
  const dragStartYRef = useRef(0)
  const dragStartTopRef = useRef(0)

  const handleGripPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragStartYRef.current = e.clientY
      dragStartTopRef.current = useEditorStore.getState().catalogTop
    },
    [],
  )

  const handleGripPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
      const deltaY = e.clientY - dragStartYRef.current
      const maxTop = Math.max(
        TOP_MARGIN,
        window.innerHeight - MIN_VISIBLE_HEIGHT,
      )
      const next = Math.max(
        TOP_MARGIN,
        Math.min(maxTop, dragStartTopRef.current + deltaY),
      )
      setCatalogTop(next)
    },
    [setCatalogTop],
  )

  const handleGripPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    },
    [],
  )

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
      {/* Cat-rail（始终 72px）— 两段布局：顶部固定 grip+hamburger，底部可滚动按钮列 */}
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
          minHeight: 0,
        }}
      >
        {/* —— 顶部固定区 —— */}
        {/* 竖直拖拽柄（仅 Y 轴） */}
        <button
          type="button"
          aria-label="ドラッグで上下に移動"
          onPointerDown={handleGripPointerDown}
          onPointerMove={handleGripPointerMove}
          onPointerUp={handleGripPointerUp}
          onPointerCancel={handleGripPointerUp}
          style={{
            width: 36,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 8,
            cursor: 'ns-resize',
            color: 'rgba(60,80,140,.5)',
            padding: 0,
            marginBottom: 2,
            flexShrink: 0,
          }}
        >
          <GripHorizontal size={16} />
        </button>

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
            flexShrink: 0,
          }}
          aria-label={collapsed ? '家具目録を展開' : '家具目録を折りたたむ'}
        >
          <Menu size={18} color="#1f3556" />
        </button>

        {/* —— 滚动区：分类按钮列（D-09 native overflow-y）—— */}
        <div
          className="flex flex-col items-center"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            width: '100%',
            overflowY: 'auto',
            // 隐藏滚动条以匹配 Phase 7 chip-strip 视觉一致性（仍可滚动）
            scrollbarWidth: 'none',
            paddingTop: 4,
            paddingBottom: 4,
            gap: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {visibleEntries.map((entry) => {
            const Icon = getGenreIcon(entry.assetbundleName)
            const active = activeCategory === entry.id
            return (
              <button
                type="button"
                key={String(entry.id)}
                onClick={() => {
                  setActiveCategory(entry.id)
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
                  flexShrink: 0,
                }}
                aria-pressed={active}
                aria-label={entry.id === 'all' ? '全てのカテゴリ' : entry.name}
                title={entry.name}
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
                      background:
                        'linear-gradient(180deg, #9bdcff, #69c8ff)',
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
                    aria-hidden
                  />
                </span>
                <span
                  style={{
                    fontFamily:
                      '"M PLUS Rounded 1c", system-ui, sans-serif',
                    fontWeight: 800,
                    fontSize: 10,
                    lineHeight: 1.1,
                    color: active ? '#0e3955' : '#1f3556',
                    marginTop: 2,
                  }}
                >
                  {entry.name}
                </span>
              </button>
            )
          })}
        </div>
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
