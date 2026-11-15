import { useEffect, type ReactNode } from 'react'
import { loadRoadmap, useLoad, type Loadable } from '../lib/content'
import { migrateRoadmap } from '../lib/roadmapMigration'
import { updateData, useData } from '../lib/store'
import type { Roadmap } from '../types'

export function Async<T>({ state, children }: { state: Loadable<T>; children: (v: T) => ReactNode }) {
  if (state.status === 'loading') return <p className="muted">読み込み中…</p>
  if (state.status === 'error') return <p className="error">データの読み込みに失敗しました：{state.error}</p>
  return <>{children(state.value)}</>
}

/** 計画データを読み込んでから中身を表示する */
export function WithRoadmap({ children }: { children: (r: Roadmap) => ReactNode }) {
  const state = useLoad(loadRoadmap)
  const override = useData().roadmapOverride
  // 以前の初期値のままの通勤メニュー・やることは、新しい初期値に置き換えて保存する
  const migrated = override && state.status === 'ok' ? migrateRoadmap(override, state.value) : override
  useEffect(() => {
    if (migrated && migrated !== override) updateData((d) => ({ ...d, roadmapOverride: migrated }))
  }, [migrated, override])
  // アプリ内で編集した計画があればそちらを優先する（JSONの読み込みを待たない）
  if (migrated) return <>{children(migrated)}</>
  return <Async state={state}>{children}</Async>
}
