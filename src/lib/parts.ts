import type { AppData, Category, PartNo, PartSet } from '../types'
import { shuffle } from './srs'
import { updateData } from './store'

export const PART_INFO: Record<PartNo, { name: string; section: 'L' | 'R'; perSession: number; hint: string }> = {
  1: { name: '写真描写', section: 'L', perSession: 5, hint: '場面を表す4つの文を聞いて、合うものを選ぶ' },
  2: { name: '応答', section: 'L', perSession: 10, hint: '質問を聞いて、最も適切な応答を3つから選ぶ' },
  3: { name: '会話', section: 'L', perSession: 2, hint: '2人の会話を聞いて、3つの設問に答える' },
  4: { name: '説明文', section: 'L', perSession: 2, hint: 'アナウンスや電話のメッセージを聞いて、3つの設問に答える' },
  5: { name: '短文穴埋め', section: 'R', perSession: 10, hint: '文の空所に入る語句を選ぶ（品詞・文法・語彙）' },
  6: { name: '長文穴埋め', section: 'R', perSession: 2, hint: 'メールやお知らせの4つの空所を埋める（文挿入あり）' },
  7: { name: '読解', section: 'R', perSession: 2, hint: '文書を読んで設問に答える（ダブルパッセージあり）' },
}

/** 演習時間の内訳（自動計測） */
export function partCategory(p: PartNo): Category {
  return p <= 4 ? 'listening' : p <= 6 ? 'part56' : 'part7'
}

export const questionKey = (set: PartSet, i: number) => `${set.id}#${i}`

export function partStats(d: AppData, sets: PartSet[]) {
  let total = 0
  let answered = 0
  let correct = 0
  let wrong = 0
  for (const s of sets) {
    s.questions.forEach((_, i) => {
      total++
      const r = d.partResults[questionKey(s, i)]
      if (r) {
        answered++
        if (r.ok) correct++
        else wrong++
      }
    })
  }
  return { total, answered, wrong, rate: answered ? Math.round((correct / answered) * 100) : null }
}

export type PartMode = 'new' | 'wrong' | 'random'

/** 出題するセットを選ぶ */
export function pickSets(d: AppData, sets: PartSet[], mode: PartMode, count: number): PartSet[] {
  const results = (s: PartSet) => s.questions.map((_, i) => d.partResults[questionKey(s, i)])
  if (mode === 'wrong') return shuffle(sets.filter((s) => results(s).some((r) => r && !r.ok))).slice(0, count)
  if (mode === 'random') return shuffle(sets).slice(0, count)
  // 未回答のセットを優先し（やさしい順）、足りなければ解いた日が古いものから
  const fresh = sets.filter((s) => results(s).some((r) => !r))
  const done = sets
    .filter((s) => !fresh.includes(s))
    .sort((a, b) => (results(a)[0]?.last ?? '').localeCompare(results(b)[0]?.last ?? ''))
  return [...fresh.sort((a, b) => a.level - b.level), ...done].slice(0, count)
}

export function recordPartAnswer(set: PartSet, i: number, ok: boolean, today: string) {
  const key = questionKey(set, i)
  updateData((d) => ({
    ...d,
    partResults: { ...d.partResults, [key]: { ok, n: (d.partResults[key]?.n ?? 0) + 1, last: today } },
    partHistory: [...d.partHistory, { d: today, p: set.part, ok }],
  }))
}
