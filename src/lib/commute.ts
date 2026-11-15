import type { AppData, CommuteApp, CommuteItem, PartNo } from '../types'

/** 通勤メニューの演習（JSONに app が無ければラベルから推定する） */
export interface ResolvedApp {
  app: CommuteApp
  parts?: PartNo[]
}

export function resolveApp(item: CommuteItem): ResolvedApp | null {
  if (item.app) return { app: item.app, parts: item.parts }
  if (item.manual) return null
  const l = item.label
  if (/間違/.test(l)) return { app: 'wrong' }
  if (/模試/.test(l)) return { app: 'mock' }
  if (/シャドーイング|聞き流し|音声/.test(l)) return { app: 'shadowing' }
  if (/Part\s*5\s*\/\s*6/.test(l)) return { app: 'parts', parts: [5, 6] }
  if (/Part\s*3\s*\/\s*4/.test(l)) return { app: 'parts', parts: [3, 4] }
  const one = l.match(/Part\s*([1-7])/)
  if (one) return { app: 'parts', parts: [Number(one[1]) as PartNo] }
  if (/単語/.test(l)) return { app: 'vocab' }
  if (/文法/.test(l)) return { app: 'parts', parts: [5] }
  if (/リスニング/.test(l)) return { app: 'shadowing' }
  return null
}

export function appLabel(a: ResolvedApp): string {
  const parts = a.parts?.length ? `Part ${a.parts.join('・')}` : ''
  switch (a.app) {
    case 'vocab':
      return '単語カード'
    case 'shadowing':
      return parts ? `シャドーイング（${parts}）` : 'シャドーイング'
    case 'parts':
      return parts || 'パート別問題'
    case 'wrong':
      return '間違えた問題の復習'
    case 'mock':
      return 'ミニ模試'
  }
}

/** その日にこの演習をした時間（秒、自動計測） */
export function appSeconds(d: AppData, date: string, a: ResolvedApp): number {
  const act = d.activitySeconds[date] ?? {}
  if (a.app === 'parts') return (a.parts ?? []).reduce((s, p) => s + (act[`part${p}`] ?? 0), 0)
  return act[a.app] ?? 0
}

// ===== 通勤メニューから演習画面を開く =====

const INTENT_KEY = 'toeic-study:practice-intent'

export function setPracticeIntent(a: ResolvedApp) {
  try {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify(a))
  } catch {
    /* 保存できなければ演習タブを開くだけ */
  }
}

/** 一度だけ読み出す */
export function takePracticeIntent(): ResolvedApp | null {
  try {
    const v = sessionStorage.getItem(INTENT_KEY)
    sessionStorage.removeItem(INTENT_KEY)
    return v ? (JSON.parse(v) as ResolvedApp) : null
  } catch {
    return null
  }
}

/** 編集画面で選べる演習 */
export const APP_CHOICES: { value: string; label: string; app: ResolvedApp | null }[] = [
  { value: '', label: '手動でチェック（アプリ外）', app: null },
  { value: 'vocab', label: '単語カード', app: { app: 'vocab' } },
  { value: 'shadowing', label: 'シャドーイング', app: { app: 'shadowing' } },
  { value: 'shadowing:1,2', label: 'シャドーイング（Part 1・2）', app: { app: 'shadowing', parts: [1, 2] } },
  { value: 'shadowing:3,4', label: 'シャドーイング（Part 3・4）', app: { app: 'shadowing', parts: [3, 4] } },
  { value: 'parts:1', label: 'Part 1', app: { app: 'parts', parts: [1] } },
  { value: 'parts:2', label: 'Part 2', app: { app: 'parts', parts: [2] } },
  { value: 'parts:1,2', label: 'Part 1・2', app: { app: 'parts', parts: [1, 2] } },
  { value: 'parts:3', label: 'Part 3', app: { app: 'parts', parts: [3] } },
  { value: 'parts:4', label: 'Part 4', app: { app: 'parts', parts: [4] } },
  { value: 'parts:3,4', label: 'Part 3・4', app: { app: 'parts', parts: [3, 4] } },
  { value: 'parts:1,2,3,4', label: 'Part 1〜4（リスニング）', app: { app: 'parts', parts: [1, 2, 3, 4] } },
  { value: 'parts:5', label: 'Part 5', app: { app: 'parts', parts: [5] } },
  { value: 'parts:6', label: 'Part 6', app: { app: 'parts', parts: [6] } },
  { value: 'parts:5,6', label: 'Part 5・6', app: { app: 'parts', parts: [5, 6] } },
  { value: 'parts:7', label: 'Part 7', app: { app: 'parts', parts: [7] } },
  { value: 'wrong', label: '間違えた問題の復習', app: { app: 'wrong' } },
  { value: 'mock', label: 'ミニ模試', app: { app: 'mock' } },
]

export function appValue(item: CommuteItem): string {
  const a = resolveApp(item)
  if (!a) return ''
  const v = a.parts?.length ? `${a.app}:${a.parts.join(',')}` : a.app
  // 一覧に無い組み合わせ（例：Part 6 だけ）は、近いものを表示する
  return APP_CHOICES.some((x) => x.value === v) ? v : a.app === 'parts' ? `parts:${a.parts?.[0] ?? 5}` : a.app
}
