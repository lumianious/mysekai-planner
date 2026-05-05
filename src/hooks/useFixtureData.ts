// ======== 家具数据 Hook ========
// INPUT: fetchFixtures, filterOutdoorFixtures, fetchMainGenres,
//        loadSpriteManifest, fetchMaterials/Blueprints/MaterialCosts
// OUTPUT: fixtures, mainGenres, fixtureMap, costIndex, loading, error
// POS: src/hooks/useFixtureData.ts — 获取并缓存家具 + 分类 + 精灵清单 + 成本索引

import { useState, useEffect, useMemo, useRef } from 'react'
import type { Fixture, FixtureMainGenre } from '../types/editor'
import { fetchFixtures, filterOutdoorFixtures } from '../data/fixtures'
import { fetchMainGenres } from '../data/genres'
import { loadSpriteManifest } from '../data/spriteManifest'
import {
  fetchMaterials,
  fetchBlueprints,
  fetchMaterialCosts,
  buildCostIndex,
  type CostIndex,
} from '../data/cost'

export function useFixtureData() {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  // 比 fixtures 多包含 system 类型（house 等）—— 不进入目录但参与画布渲染查找
  const [allOutdoorFixtures, setAllOutdoorFixtures] = useState<Fixture[]>([])
  const [mainGenres, setMainGenres] = useState<FixtureMainGenre[]>([])
  const [costIndex, setCostIndex] = useState<CostIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // 按 ID 快速查找 —— 包含 system 物品（startEditor 自动放置的 house/gate
  // 必须能从 fixtureMap 中找到）
  const fixtureMap = useMemo(
    () => new Map(allOutdoorFixtures.map((f) => [f.id, f])),
    [allOutdoorFixtures],
  )

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller

    async function loadData() {
      try {
        // 并行加载家具数据 + 主分类 + 精灵清单 + 成本三件套（Phase 4）
        // 精灵清单失败不阻塞主流程（loadSpriteManifest 内部 D-17 回退到空 Map）
        const [allFixtures, genres, , materials, blueprints, materialCosts] =
          await Promise.all([
            fetchFixtures(),
            fetchMainGenres(),
            loadSpriteManifest(),
            fetchMaterials(),
            fetchBlueprints(),
            fetchMaterialCosts(),
          ])

        if (controller.signal.aborted) return

        const outdoorFixtures = filterOutdoorFixtures(allFixtures)
        // 户外但保留 system（用于自动放置的 house/gate 查找）；唯一仍排除的是 room
        const allOutdoor = allFixtures.filter(
          (f) => f.mysekaiSettableSiteType !== 'room',
        )

        // 只保留有户外家具的分类，排除 id=1 的 "すべて" 元分类（由 "全部" 按钮代替）
        const genreIdsWithItems = new Set(
          outdoorFixtures.map((f) => f.mysekaiFixtureMainGenreId),
        )
        const relevantGenres = genres.filter(
          (g) => g.id !== 1 && genreIdsWithItems.has(g.id),
        )

        setFixtures(outdoorFixtures)
        setAllOutdoorFixtures(allOutdoor)
        setMainGenres(relevantGenres)
        setCostIndex(buildCostIndex(materials, blueprints, materialCosts))
      } catch (err) {
        if (controller.signal.aborted) return
        setError('家具数据加载失败，请刷新页面重试')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      controller.abort()
    }
  }, [])

  return { fixtures, mainGenres, fixtureMap, costIndex, loading, error }
}
