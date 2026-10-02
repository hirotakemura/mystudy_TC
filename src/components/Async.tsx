import type { ReactNode } from 'react'
import { loadRoadmap, useLoad, type Loadable } from '../lib/content'
import type { Roadmap } from '../types'

export function Async<T>({ state, children }: { state: Loadable<T>; children: (v: T) => ReactNode }) {
  if (state.status === 'loading') return <p className="muted">読み込み中…</p>
  if (state.status === 'error') return <p className="error">データの読み込みに失敗しました：{state.error}</p>
  return <>{children(state.value)}</>
}

/** 計画データを読み込んでから中身を表示する */
export function WithRoadmap({ children }: { children: (r: Roadmap) => ReactNode }) {
  return <Async state={useLoad(loadRoadmap)}>{children}</Async>
}
