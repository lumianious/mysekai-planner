// ======== 家具数据 Hook ========
// INPUT: fetchFixtures, filterOutdoorFixtures, fetchMainGenres
// OUTPUT: fixtures, mainGenres, fixtureMap, loading, error
// POS: src/hooks/useFixtureData.ts — 获取并缓存家具 + 分类数据

import { useState, useEffect, useMemo, useRef } from 'react'
import type { Fixture, FixtureMainGenre } from '../types/editor'
import { fetchFixtures, filterOutdoorFixtures } from '../data/fixtures'
import { fetchMainGenres } from '../data/genres'

export function useFixtureData() {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [mainGenres, setMainGenres] = useState<FixtureMainGenre[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // 按 ID 快速查找
  const fixtureMap = useMemo(
    () => new Map(fixtures.map((f) => [f.id, f])),
    [fixtures],
  )

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller

    async function loadData() {
      try {
        // 并行加载家具数据和主分类
        const [allFixtures, genres] = await Promise.all([
          fetchFixtures(),
          fetchMainGenres(),
        ])

        if (controller.signal.aborted) return

        const outdoorFixtures = filterOutdoorFixtures(allFixtures)

        // 只保留有户外家具的分类，排除 id=1 的 "すべて" 元分类（由 "全部" 按钮代替）
        const genreIdsWithItems = new Set(
          outdoorFixtures.map((f) => f.mysekaiFixtureMainGenreId),
        )
        const relevantGenres = genres.filter(
          (g) => g.id !== 1 && genreIdsWithItems.has(g.id),
        )

        setFixtures(outdoorFixtures)
        setMainGenres(relevantGenres)
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

  return { fixtures, mainGenres, fixtureMap, loading, error }
}
