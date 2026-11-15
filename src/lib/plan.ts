import type { Category, CommuteItem, Phase, Roadmap } from '../types'
import { addDays, diffDays, fromKey } from './date'

/** 今日がロードマップのどこにいるか */
export type PlanPosition =
  | { kind: 'before'; next: Phase }
  | { kind: 'phase'; phase: Phase }
  | { kind: 'gap'; next: Phase | null }
  | { kind: 'exam' }
  | { kind: 'after' }

export function planPosition(roadmap: Roadmap, today: string): PlanPosition {
  const { phases, exam } = roadmap
  if (today === exam.date) return { kind: 'exam' }
  if (today > exam.date) return { kind: 'after' }
  const phase = phases.find((p) => p.start <= today && today <= p.end)
  if (phase) return { kind: 'phase', phase }
  if (phases.length && today < phases[0].start) return { kind: 'before', next: phases[0] }
  return { kind: 'gap', next: phases.find((p) => p.start > today) ?? null }
}

export function currentPhase(roadmap: Roadmap, today: string): Phase | null {
  const pos = planPosition(roadmap, today)
  return pos.kind === 'phase' ? pos.phase : null
}

/** 期間 [from, to] と重なる期間（フェーズ）を返す */
export function phasesOverlapping(roadmap: Roadmap, from: string, to: string): Phase[] {
  return roadmap.phases.filter((p) => p.start <= to && p.end >= from)
}

/** 本番1週間前（この日以降は新しい教材に手を出さず復習のみ） */
export function finalWeekStart(roadmap: Roadmap): string {
  return addDays(roadmap.exam.date, -7)
}

/** 注意表示：期間の最終週／本番1週間前 */
export function cautions(roadmap: Roadmap, today: string): string[] {
  const out: string[] = []
  if (today >= finalWeekStart(roadmap) && today < roadmap.exam.date) {
    out.push('本番1週間前です。新しい教材に手を出さず、これまでの復習のみに集中しましょう。')
  }
  const phase = currentPhase(roadmap, today)
  if (phase) {
    const left = diffDays(today, phase.end)
    if (left <= 6 && !(today >= finalWeekStart(roadmap))) {
      out.push(`「${phase.title}」の最終週です。新しい教材に手を出さず、この期間の復習で仕上げましょう。`)
    }
  }
  return out
}

export function commuteKey(phase: Phase, index: number): string {
  return `${phase.id}:${index}`
}

export function commuteTotal(phase: Phase): number {
  return phase.commute.reduce((s, c) => s + c.minutes, 0)
}

/** 平日（月〜金）の日数 */
export function weekdaysBetween(from: string, to: string): number {
  let n = 0
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const dow = fromKey(d).getDay()
    if (dow !== 0 && dow !== 6) n++
  }
  return n
}

/** 期間の目安の学習時間（通勤メニュー × 平日の日数） */
export function plannedMinutes(phase: Phase): number {
  return commuteTotal(phase) * weekdaysBetween(phase.start, phase.end)
}

/** 通勤メニューの内訳（JSONに category が無ければラベルから推定） */
export function commuteCategory(item: CommuteItem): Category {
  if (item.category) return item.category
  const l = item.label
  if (/模試/.test(l)) return 'mockReview'
  if (/Part\s*5|Part\s*6/.test(l)) return 'part56'
  if (/Part\s*7/.test(l)) return 'part7'
  if (/単語/.test(l)) return 'vocab'
  if (/文法/.test(l)) return 'grammar'
  return 'listening'
}

/** 編集した計画のチェック。問題があればメッセージの一覧を返す */
export function validateRoadmap(r: Roadmap): string[] {
  const errors: string[] = []
  const DATE = /^\d{4}-\d{2}-\d{2}$/
  if (!DATE.test(r.exam.date)) errors.push('本番の日付を入力してください')
  if (!r.exam.name.trim()) errors.push('試験名を入力してください')
  if (!(r.exam.target >= 10 && r.exam.target <= 990)) errors.push('目標点は10〜990点で入力してください')
  if (r.phases.length === 0) errors.push('期間を1つ以上作ってください')
  const sorted = [...r.phases].sort((a, b) => a.start.localeCompare(b.start))
  sorted.forEach((p, i) => {
    const name = p.title.trim() || `${i + 1}番目の期間`
    if (!p.title.trim()) errors.push(`${i + 1}番目の期間に名前を付けてください`)
    if (!DATE.test(p.start) || !DATE.test(p.end)) errors.push(`「${name}」の開始日と終了日を入力してください`)
    else if (p.start > p.end) errors.push(`「${name}」の終了日が開始日より前になっています`)
    if (i > 0 && p.start <= sorted[i - 1].end) errors.push(`「${sorted[i - 1].title}」と「${name}」の日付が重なっています`)
    if (DATE.test(r.exam.date) && p.end >= r.exam.date) errors.push(`「${name}」は本番の前日までに終わるようにしてください`)
    if (p.commute.some((c) => !c.label.trim() || !(c.minutes > 0))) errors.push(`「${name}」の通勤メニューに、内容か分数が空の行があります`)
    if (p.tasks.some((t) => !t.text.trim())) errors.push(`「${name}」のやることに空の行があります`)
  })
  return errors
}
