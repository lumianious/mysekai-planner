// ======== 材料 / 蓝图 / 成本数据层 ========
// INPUT:  fetch sekai-master-db-diff JSONs
// OUTPUT: fetchMaterials, fetchBlueprints, fetchMaterialCosts,
//         buildCostIndex, computeMaterialTotals
// POS:    src/data/cost.ts

import type {
  Blueprint,
  Material,
  MaterialCost,
  MaterialRow,
} from '../types/cost'
import type { Fixture, PlacedItem } from '../types/editor'

const DATA_BASE_URL =
  'https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/main'

let cachedMaterials: Material[] | null = null
let cachedBlueprints: Blueprint[] | null = null
let cachedCosts: MaterialCost[] | null = null

// ======== 三份 JSON 拉取 + 模块级缓存 ========
export async function fetchMaterials(): Promise<Material[]> {
  if (cachedMaterials) return cachedMaterials
  const res = await fetch(`${DATA_BASE_URL}/mysekaiMaterials.json`)
  cachedMaterials = (await res.json()) as Material[]
  return cachedMaterials
}

export async function fetchBlueprints(): Promise<Blueprint[]> {
  if (cachedBlueprints) return cachedBlueprints
  const res = await fetch(`${DATA_BASE_URL}/mysekaiBlueprints.json`)
  cachedBlueprints = (await res.json()) as Blueprint[]
  return cachedBlueprints
}

export async function fetchMaterialCosts(): Promise<MaterialCost[]> {
  if (cachedCosts) return cachedCosts
  const res = await fetch(
    `${DATA_BASE_URL}/mysekaiBlueprintMysekaiMaterialCosts.json`,
  )
  cachedCosts = (await res.json()) as MaterialCost[]
  return cachedCosts
}

// ======== 索引：fixtureId -> 该 fixture 蓝图的材料成本数组 ========
// 为 Phase 1 计算热路径 O(1) 查询而预构建
export interface CostIndex {
  byFixtureId: Map<number, { materialId: number; quantity: number }[]>
  materialMap: Map<number, Material>
}

export function buildCostIndex(
  materials: Material[],
  blueprints: Blueprint[],
  costs: MaterialCost[],
): CostIndex {
  const blueprintIdToFixtureId = new Map<number, number>()
  for (const b of blueprints) {
    if (b.mysekaiCraftType === 'mysekai_fixture') {
      blueprintIdToFixtureId.set(b.id, b.craftTargetId)
    }
  }

  const byFixtureId = new Map<number, { materialId: number; quantity: number }[]>()
  for (const c of costs) {
    const fixtureId = blueprintIdToFixtureId.get(c.mysekaiBlueprintId)
    if (fixtureId === undefined) continue
    const arr = byFixtureId.get(fixtureId) ?? []
    arr.push({ materialId: c.mysekaiMaterialId, quantity: c.quantity })
    byFixtureId.set(fixtureId, arr)
  }

  const materialMap = new Map(materials.map((m) => [m.id, m]))
  return { byFixtureId, materialMap }
}

// ======== 放置上限累计（layout cost / 配置コスト） ========
// INPUT: placedItems, fixtureMap
// OUTPUT: 所有非 system 物品 firstPutCost 之和；system（gate/house）按游戏惯例计 0
// POS: src/data/cost.ts — 顶栏 CostPill 与设置面板共用
export function computeLayoutCost(
  placedItems: PlacedItem[],
  fixtureMap: Map<number, Fixture>,
): number {
  let total = 0
  for (const item of placedItems) {
    if (item.isSystem) continue
    const fx = fixtureMap.get(item.fixtureId)
    if (!fx) continue
    total += fx.firstPutCost ?? 0
  }
  return total
}

// ======== 聚合：对所有 placedItems 求每种材料的总需求 ========
// system 项（item.isSystem）不计入成本（玩家未消耗资源）
export function computeMaterialTotals(
  placedItems: PlacedItem[],
  fixtureMap: Map<number, Fixture>,
  index: CostIndex,
  inventory: Record<number, number>,
): MaterialRow[] {
  const totals = new Map<number, number>()
  for (const item of placedItems) {
    if (item.isSystem) continue
    const fx = fixtureMap.get(item.fixtureId)
    if (!fx) continue
    const costs = index.byFixtureId.get(fx.id)
    if (!costs) continue
    for (const c of costs) {
      totals.set(c.materialId, (totals.get(c.materialId) ?? 0) + c.quantity)
    }
  }

  const rows: MaterialRow[] = []
  for (const [materialId, needed] of totals) {
    const material = index.materialMap.get(materialId)
    if (!material) continue
    const owned = inventory[materialId] ?? 0
    rows.push({
      material,
      needed,
      owned,
      remaining: Math.max(0, needed - owned),
    })
  }

  // 排序：先按 type 字母，再按 rarity，最后按 seq；保持稳定可读
  rows.sort((a, b) => {
    const t = (a.material.mysekaiMaterialType as string).localeCompare(
      b.material.mysekaiMaterialType as string,
    )
    if (t !== 0) return t
    const r = a.material.mysekaiMaterialRarityType.localeCompare(
      b.material.mysekaiMaterialRarityType,
    )
    if (r !== 0) return r
    return a.material.seq - b.material.seq
  })

  return rows
}
