import type { ReactNode } from 'react'
import { useRoadmap } from '../lib/plan'
import type { Roadmap } from '../types'

/** 計画データを読み込んでから中身を表示する */
export function WithRoadmap({ children }: { children: (r: Roadmap) => ReactNode }) {
  const state = useRoadmap()
  if (state.status === 'loading') return <p className="muted">読み込み中…</p>
  if (state.status === 'error') return <p className="error">データの読み込みに失敗しました：{state.error}</p>
  return <>{children(state.value)}</>
}
