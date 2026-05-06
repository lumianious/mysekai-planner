// ======== 成本计算相关类型 ========
// INPUT: 来自 sekai-master-db-diff 的 mysekaiMaterials/Blueprints/Costs JSON
// OUTPUT: Material、Blueprint、MaterialCost、MaterialNeed
// POS: src/types/cost.ts

export type MaterialType =
  | 'wood'
  | 'iron'
  | 'stone'
  | 'wool'
  | 'plant'
  | 'tone'
  | 'jewel'
  | 'unknown'

export interface Material {
  id: number
  seq: number
  mysekaiMaterialType: MaterialType | string
  name: string
  pronunciation: string
  description?: string
  mysekaiMaterialRarityType: string
  iconAssetbundleName: string
}

export interface Blueprint {
  id: number
  mysekaiCraftType: 'mysekai_fixture' | string
  craftTargetId: number
  isEnableSketch?: boolean
  isObtainedByConvert?: boolean
  craftCountLimit?: number
  isAvailableWithoutPossession?: boolean
}

export interface MaterialCost {
  id: number
  mysekaiBlueprintId: number
  mysekaiMaterialId: number
  seq: number
  quantity: number
}

// 一个 fixture 的全部材料需求（同 fixture 多次放置时调用方乘以放置数量）
export interface FixtureMaterialNeed {
  fixtureId: number
  costs: { materialId: number; quantity: number }[]
}

// 渲染用：一种材料 + 总需求 + 已拥有 + 还差多少
export interface MaterialRow {
  material: Material
  needed: number
  owned: number
  remaining: number  // = max(0, needed - owned)
}
