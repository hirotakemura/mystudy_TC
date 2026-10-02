import { useEffect, useRef } from 'react'
import type { Category } from '../types'
import { todayKey } from './date'
import { updateData } from './store'

// 演習画面を開いている時間を自動で学習時間に加算する
// - 操作（タップ・キー入力・スクロール）や音声の再生が3分以上ないと、それ以降は数えない（放置対策）
// - アプリがバックグラウンドの間は数えない
// - 15秒ごとに保存するので、途中でアプリを閉じても計測済みの時間は残る
const IDLE_MS = 3 * 60_000
const SAVE_EVERY_MS = 15_000
const ACTIVITY_EVENT = 'study-activity'

/** 画面操作以外の「学習中」の合図（音声の再生中など） */
export function pingActivity() {
  window.dispatchEvent(new Event(ACTIVITY_EVENT))
}

function addSeconds(category: Category, sec: number) {
  if (sec <= 0) return
  const day = todayKey()
  updateData((d) => {
    const today = d.autoSeconds[day] ?? {}
    return { ...d, autoSeconds: { ...d.autoSeconds, [day]: { ...today, [category]: (today[category] ?? 0) + sec } } }
  })
}

/** active の間だけ計測する。戻り値の ref には、この画面で計測した合計秒数が入る */
export function useStudyTimer(active: boolean, category: Category) {
  const total = useRef(0)
  useEffect(() => {
    if (!active) return
    let lastTick: number | null = Date.now()
    let lastActivity = Date.now()

    const flush = () => {
      if (lastTick === null) return
      const now = Date.now()
      const end = Math.min(now, lastActivity + IDLE_MS)
      if (end > lastTick) {
        const sec = (end - lastTick) / 1000
        total.current += sec
        addSeconds(category, sec)
      }
      lastTick = end < now ? null : now // 放置が続いたら次の操作まで一時停止
    }
    const onActivity = () => {
      if (document.visibilityState === 'hidden') return
      flush()
      lastActivity = Date.now()
      if (lastTick === null) lastTick = lastActivity
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush()
        lastTick = null
      } else {
        onActivity()
      }
    }

    const events = ['pointerdown', 'keydown', 'scroll', ACTIVITY_EVENT] as const
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    document.addEventListener('visibilitychange', onVisibility)
    const timer = setInterval(flush, SAVE_EVERY_MS)
    return () => {
      flush()
      clearInterval(timer)
      events.forEach((e) => window.removeEventListener(e, onActivity))
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, category])
  return total
}
