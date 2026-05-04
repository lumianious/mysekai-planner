// ======== 成本面板（重构 — Phase 7） ========
// INPUT:  placedItems (store), fixtureMap (props), costIndex (props), inventory (store)
// OUTPUT: 无外壳的面板内容（外壳由 CostPanelPopover 提供）
// POS:    src/components/costs/CostPanel.tsx — 成本明细 body（含进度计）

import { useMemo } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { computeMaterialTotals, type CostIndex } from '../../data/cost'
import type { Fixture } from '../../types/editor'

interface CostPanelProps {
  fixtureMap: Map<number, Fixture>
  costIndex: CostIndex | null
}

// 材料カテゴリの日本語ラベル（in-game 表記に合わせる）
const MATERIAL_TYPE_LABEL: Record<string, string> = {
  wood: '木材',
  iron: '金属',
  stone: '石材',
  wool: '毛糸',
  plant: '植物',
  tone: '音色',
  jewel: '宝石',
}

function MaterialIcon({ assetbundleName }: { assetbundleName: string }) {
  // sekai-master-db-diff CDN icon convention
  const url = `https://storage.sekai.best/sekai-jp-assets/thumbnail/material_rip/${assetbundleName}.webp`
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      className="w-8 h-8 object-contain shrink-0"
      style={{ borderRadius: 'var(--radius-chip)', background: '#ffffff' }}
      onError={(e) => {
        ;(e.target as HTMLImageElement).style.visibility = 'hidden'
      }}
    />
  )
}

export function CostPanel({ fixtureMap, costIndex }: CostPanelProps) {
  const placedItems = useEditorStore((s) => s.placedItems)
  const inventory = useEditorStore((s) => s.inventory)
  const setInventoryQuantity = useEditorStore((s) => s.setInventoryQuantity)
  const clearInventory = useEditorStore((s) => s.clearInventory)

  const rows = useMemo(() => {
    if (!costIndex) return []
    return computeMaterialTotals(
      Object.values(placedItems),
      fixtureMap,
      costIndex,
      inventory,
    )
  }, [costIndex, placedItems, fixtureMap, inventory])

  const totalNeeded = rows.reduce((s, r) => s + r.needed, 0)
  const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0)
  const owned = totalNeeded - totalRemaining
  const meterPct = totalNeeded > 0 ? Math.min(100, (owned / totalNeeded) * 100) : 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ======== Summary card — レイアウトコスト + 进度计 ======== */}
      <div
        style={{
          margin: 16,
          padding: 16,
          borderRadius: 'var(--radius-tile)',
          background: 'linear-gradient(180deg, #fff8e7, #ecdfb8)',
          border: '1px solid var(--color-tan-edge)',
        }}
      >
        <div
          style={{
            fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 11,
            lineHeight: 1.3,
            color: 'var(--color-ink-2)',
            marginBottom: 8,
          }}
        >
          レイアウトコスト
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
            fontWeight: 800,
            color: 'var(--color-ink)',
          }}
        >
          <span style={{ fontSize: 16 }}>{owned.toLocaleString()}</span>
          <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
            / {totalNeeded.toLocaleString()}
          </span>
        </div>
        {/* sky → green progress meter */}
        <div
          style={{
            marginTop: 8,
            height: 8,
            borderRadius: 'var(--radius-chip)',
            background: 'rgba(60,80,140,.10)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${meterPct}%`,
              background: 'linear-gradient(90deg, #69c8ff, #8fdf6c)',
              borderRadius: 'var(--radius-chip)',
              transition: 'width .22s ease',
            }}
          />
        </div>
      </div>

      {/* ======== Inventory clear (Label-tier link) ======== */}
      <div style={{ paddingLeft: 16, paddingRight: 16, marginBottom: 8 }}>
        <button
          onClick={clearInventory}
          style={{
            fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 11,
            color: 'var(--color-ink-2)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          在庫をクリア
        </button>
      </div>

      {/* ======== Material rows ======== */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 8px 16px' }}>
        {rows.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              padding: '32px 16px',
              fontFamily: 'Nunito, system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--color-muted)',
            }}
          >
            家具がありません
          </p>
        ) : (
          <ul>
            {rows.map((row) => {
              const ok = row.remaining === 0
              return (
                <li
                  key={row.material.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-tile)',
                    borderBottom: '1px solid var(--color-panel-edge)',
                  }}
                >
                  <MaterialIcon assetbundleName={row.material.iconAssetbundleName} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'Nunito, system-ui, sans-serif',
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'var(--color-ink)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={row.material.name}
                    >
                      {row.material.name}
                    </div>
                    <div
                      style={{
                        fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                        fontWeight: 800,
                        fontSize: 10,
                        lineHeight: 1.1,
                        color: 'var(--color-muted)',
                      }}
                    >
                      {MATERIAL_TYPE_LABEL[row.material.mysekaiMaterialType as string] ??
                        row.material.mysekaiMaterialType}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 2,
                      width: 112,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                        fontWeight: 800,
                        fontSize: 10,
                        color: 'var(--color-muted)',
                      }}
                    >
                      必要 <span style={{ color: 'var(--color-ink)' }}>{row.needed}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span
                        style={{
                          fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                          fontWeight: 800,
                          fontSize: 10,
                          color: 'var(--color-muted)',
                        }}
                      >
                        持
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={row.owned || ''}
                        placeholder="0"
                        onChange={(e) =>
                          setInventoryQuantity(row.material.id, Number(e.target.value))
                        }
                        style={{
                          width: 56,
                          padding: '2px 4px',
                          fontFamily: 'Nunito, system-ui, sans-serif',
                          fontWeight: 700,
                          fontSize: 11,
                          background: '#ffffff',
                          border: '1px solid var(--color-panel-edge)',
                          borderRadius: 'var(--radius-chip)',
                          color: 'var(--color-ink)',
                          textAlign: 'right',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontFamily: '"M PLUS Rounded 1c", system-ui, sans-serif',
                        fontWeight: 800,
                        fontSize: 10,
                        color: ok ? 'var(--color-surplus)' : 'var(--color-shortfall)',
                      }}
                    >
                      {ok ? '✓ 足' : `差 ${row.remaining}`}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
