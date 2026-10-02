import type { AppData, Category, Roadmap, ScoreRecord } from '../types'
import { addDays } from './date'

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'vocab', label: '単語' },
  { id: 'grammar', label: '文法' },
  { id: 'listening', label: 'リスニング' },
  { id: 'part56', label: 'Part5-6' },
  { id: 'part7', label: 'Part7' },
  { id: 'mockReview', label: '模試復習' },
  { id: 'legacy', label: '内訳なし' },
]

/** 手動記録で選べる内訳（内訳なしは旧アプリ取り込み専用） */
export const INPUT_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'legacy')

export function categoryLabel(c: Category): string {
  return CATEGORIES.find((x) => x.id === c)?.label ?? c
}

/** 演習画面で自動計測した時間（分、内訳ごとに四捨五入） */
export function autoMinutesByCategory(d: AppData, date: string): Partial<Record<Category, number>> {
  const out: Partial<Record<Category, number>> = {}
  for (const [c, sec] of Object.entries(d.autoSeconds[date] ?? {}) as [Category, number][]) {
    const m = Math.round(sec / 60)
    if (m > 0) out[c] = m
  }
  return out
}

export function autoMinutesOn(d: AppData, date: string): number {
  return Object.values(autoMinutesByCategory(d, date)).reduce((s, m) => s + (m ?? 0), 0)
}

/** 手動・通勤メニュー・自動計測を合わせた内訳 */
export function minutesByCategory(d: AppData, date: string): Partial<Record<Category, number>> {
  const out = autoMinutesByCategory(d, date)
  for (const l of d.studyLogs) if (l.date === date) out[l.category] = (out[l.category] ?? 0) + l.minutes
  return out
}

export function minutesOn(d: AppData, date: string): number {
  return d.studyLogs.reduce((s, l) => (l.date === date ? s + l.minutes : s), autoMinutesOn(d, date))
}

export function minutesBetween(d: AppData, from: string, to: string): number {
  let total = d.studyLogs.reduce((s, l) => (l.date >= from && l.date <= to ? s + l.minutes : s), 0)
  for (const date of Object.keys(d.autoSeconds)) if (date >= from && date <= to) total += autoMinutesOn(d, date)
  return total
}

/** 学習時間の記録がある日（新しい順） */
export function studyDates(d: AppData): string[] {
  const dates = new Set(d.studyLogs.map((l) => l.date))
  for (const date of Object.keys(d.autoSeconds)) if (autoMinutesOn(d, date) > 0) dates.add(date)
  return [...dates].sort().reverse()
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

/** 最低ライン（単語15分）を達成したか。チェックしたか、単語の記録が目安以上あれば達成 */
export function minimumAchieved(d: AppData, date: string, roadmap: Roadmap): boolean {
  if (d.minimumDone[date]) return true
  const vocab = minutesByCategory(d, date).vocab ?? 0
  return vocab >= roadmap.minimumLine.minutes
}

export function studiedOn(d: AppData, date: string, roadmap: Roadmap): boolean {
  return minutesOn(d, date) > 0 || minimumAchieved(d, date, roadmap)
}

/** 連続学習日数。今日まだ学習していなくても、昨日まで続いていれば途切れない */
export function streak(d: AppData, today: string, roadmap: Roadmap): number {
  let day = studiedOn(d, today, roadmap) ? today : addDays(today, -1)
  let n = 0
  while (studiedOn(d, day, roadmap)) {
    n++
    day = addDays(day, -1)
  }
  return n
}

export const totalOf = (s: ScoreRecord) => s.listening + s.reading

export function sortedScores(d: AppData): ScoreRecord[] {
  return [...d.scores].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

/** 目標点のL/R配分（リスニングがやや高めになる一般的な配分） */
export function targetSplit(target: number): { listening: number; reading: number } {
  const listening = Math.min(495, Math.round((target * 0.54) / 5) * 5)
  return { listening, reading: target - listening }
}

export function isValidSectionScore(n: number): boolean {
  return Number.isInteger(n) && n >= 5 && n <= 495 && n % 5 === 0
}
