import { useEffect, useState } from 'react'
import type { Roadmap, ShadowItem, Word } from '../types'

// 計画・教材データはアプリ本体と分離して public/data 配下の JSON から読み込む
const cache = new Map<string, Promise<unknown>>()

function fetchJson<T>(path: string): Promise<T> {
  let p = cache.get(path)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/${path}`).then((res) => {
      if (!res.ok) throw new Error(`${path} の読み込みに失敗しました (${res.status})`)
      return res.json()
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p as Promise<T>
}

export const loadRoadmap = () => fetchJson<Roadmap>('plan/toeic-roadmap.json')
export const loadWords = () => fetchJson<Word[]>('vocab/words.json')
export const loadShadowing = () => fetchJson<ShadowItem[]>('shadowing/sentences.json')

export type Loadable<T> = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ok'; value: T }

export function useLoad<T>(loader: () => Promise<T>): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' })
  useEffect(() => {
    let alive = true
    loader().then(
      (value) => alive && setState({ status: 'ok', value }),
      (e: unknown) => alive && setState({ status: 'error', error: e instanceof Error ? e.message : String(e) }),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return state
}
