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

/** ミニ模試の構成（各パートから出すセット数） */
const MOCK_SETS: Record<PartNo, number> = { 1: 2, 2: 5, 3: 1, 4: 1, 5: 6, 6: 1, 7: 1 }
const WRONG_SETS = 10

export type SessionKind = 'parts' | 'wrong' | 'mock'

export interface PartSessionPlan {
  kind: SessionKind
  sets: PartSet[]
  title: string
}

const byPart = (sets: PartSet[], p: PartNo) => sets.filter((s) => s.part === p)
const partOrder = (a: PartSet, b: PartSet) => a.part - b.part

/** 指定したパートから出題する（複数パートならパート順に並べる） */
export function planParts(d: AppData, all: PartSet[], parts: PartNo[], mode: PartMode): PartSessionPlan {
  const sets = parts.flatMap((p) => pickSets(d, byPart(all, p), mode, PART_INFO[p].perSession))
  const label = mode === 'wrong' ? '間違えた問題' : mode === 'random' ? 'ランダム' : ''
  return { kind: 'parts', sets, title: `Part ${parts.join('・')}${label ? ` ${label}` : ''}` }
}

/** ミニ模試：全パートから少しずつ（未回答を優先）、本番と同じ Part 1→7 の順 */
export function planMock(d: AppData, all: PartSet[]): PartSessionPlan {
  const sets = ([1, 2, 3, 4, 5, 6, 7] as PartNo[]).flatMap((p) => pickSets(d, shuffle(byPart(all, p)), 'new', MOCK_SETS[p]))
  return { kind: 'mock', sets: sets.sort(partOrder), title: 'ミニ模試' }
}

/** 全パートの間違えた問題をまとめて復習 */
export function planWrong(d: AppData, all: PartSet[]): PartSessionPlan {
  return { kind: 'wrong', sets: pickSets(d, all, 'wrong', WRONG_SETS).sort(partOrder), title: '間違えた問題の復習' }
}

export function wrongCount(d: AppData, all: PartSet[]): number {
  return partStats(d, all).wrong
}

/** 自動計測で使う演習の種類（通勤メニューの進み具合に使う） */
export function sessionActivity(kind: SessionKind, set: PartSet): string {
  return kind === 'parts' ? `part${set.part}` : kind
}
