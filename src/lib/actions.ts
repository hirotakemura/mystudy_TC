import type { Category, CommuteSlot, Phase } from '../types'
import { commuteCategory, commuteKey } from './plan'
import { newId, updateData } from './store'

export function addLog(date: string, minutes: number, category: Category) {
  if (!(minutes > 0)) return
  updateData((d) => ({
    ...d,
    studyLogs: [...d.studyLogs, { id: newId(), date, minutes: Math.round(minutes), category, createdAt: new Date().toISOString() }],
  }))
}

export function deleteLog(id: string) {
  updateData((d) => ({ ...d, studyLogs: d.studyLogs.filter((l) => l.id !== id) }))
}

/**
 * 通勤メニューの「行き」「帰り」をタップしたとき。
 * 未チェック→その分数を記録、同じ側をもう一度→取り消し、反対側→付け替え
 */
export function toggleCommute(date: string, phase: Phase, index: number, slot: CommuteSlot) {
  const key = commuteKey(phase, index)
  const item = phase.commute[index]
  updateData((d) => {
    const existing = d.studyLogs.find((l) => l.date === date && l.commute?.key === key)
    const rest = d.studyLogs.filter((l) => l !== existing)
    if (existing?.commute?.slot === slot) return { ...d, studyLogs: rest }
    return {
      ...d,
      studyLogs: [
        ...rest,
        {
          id: existing?.id ?? newId(),
          date,
          minutes: item.minutes,
          category: commuteCategory(item),
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          commute: { key, slot },
        },
      ],
    }
  })
}

export function setMinimumDone(date: string, done: boolean) {
  updateData((d) => {
    const minimumDone = { ...d.minimumDone }
    if (done) minimumDone[date] = true
    else delete minimumDone[date]
    return { ...d, minimumDone }
  })
}

export function setCheck(taskId: string, done: boolean) {
  updateData((d) => {
    const checks = { ...d.checks }
    if (done) checks[taskId] = true
    else delete checks[taskId]
    return { ...d, checks }
  })
}
