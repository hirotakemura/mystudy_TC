import type { AppData, Level, Word, WordProgress } from '../types'
import { addDays } from './date'
import { updateData } from './store'

// 間隔反復：正解するたびに次に出すまでの日数を延ばし、間違えたら最初に戻す
const INTERVALS = [0, 1, 3, 7, 14, 30]
/** この box 以上を「覚えた」とみなす */
export const MASTERED_BOX = 4

export type WordStatus = 'new' | 'learning' | 'mastered'

export function wordStatus(p: WordProgress | undefined): WordStatus {
  if (!p) return 'new'
  return p.box >= MASTERED_BOX ? 'mastered' : 'learning'
}

export function recordAnswer(wordId: string, ok: boolean, today: string) {
  updateData((d) => {
    const cur = d.wordProgress[wordId]
    const box = ok ? Math.min((cur?.box ?? 0) + 1, INTERVALS.length - 1) : 0
    const next: WordProgress = {
      box,
      due: addDays(today, INTERVALS[box]),
      correct: (cur?.correct ?? 0) + (ok ? 1 : 0),
      wrong: (cur?.wrong ?? 0) + (ok ? 0 : 1),
      last: today,
    }
    return { ...d, wordProgress: { ...d.wordProgress, [wordId]: next } }
  })
}

export function dueWords(d: AppData, words: Word[], today: string): Word[] {
  return words
    .filter((w) => {
      const p = d.wordProgress[w.id]
      return p && p.due <= today
    })
    .sort((a, b) => d.wordProgress[a.id].due.localeCompare(d.wordProgress[b.id].due))
}

export function newWords(d: AppData, words: Word[]): Word[] {
  return words.filter((w) => !d.wordProgress[w.id])
}

export function filterLevel(words: Word[], level: Level | 0): Word[] {
  return level ? words.filter((w) => w.level === level) : words
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 4択の選択肢（同じ品詞から優先して紛らわしい意味を選ぶ） */
export function choicesFor(word: Word, all: Word[]): string[] {
  const others = shuffle(all.filter((w) => w.id !== word.id && w.meaning !== word.meaning))
  const samePos = others.filter((w) => w.pos === word.pos)
  const pool = [...samePos, ...others.filter((w) => w.pos !== word.pos)]
  const picked: string[] = []
  for (const w of pool) {
    if (picked.length === 3) break
    if (!picked.includes(w.meaning)) picked.push(w.meaning)
  }
  return shuffle([word.meaning, ...picked])
}

export const LEVEL_LABEL: Record<Level, string> = { 1: '600点', 2: '730点', 3: '860点' }
