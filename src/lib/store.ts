import { useSyncExternalStore } from 'react'
import type { AppData, ScoreRecord, StudyLog } from '../types'

const STORAGE_KEY = 'toeic-study:data:v1'
export const DEFAULT_WEEKLY_GOAL = 600 // 通勤2時間 × 平日5日

export function emptyData(): AppData {
  return {
    version: 1,
    studyLogs: [],
    minimumDone: {},
    checks: {},
    scores: [],
    reviewMemos: {},
    legacyMemos: {},
    vocabRounds: [],
    settings: { theme: 'system', weeklyGoalMinutes: DEFAULT_WEEKLY_GOAL },
  }
}

/** 古い/一部欠けたデータでも読めるよう、既定値とマージする */
function normalize(raw: unknown): AppData {
  const base = emptyData()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<AppData>
  return {
    ...base,
    ...r,
    version: 1,
    settings: { ...base.settings, ...(r.settings ?? {}) },
  }
}

function load(): AppData {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    return text ? normalize(JSON.parse(text)) : emptyData()
  } catch {
    return emptyData()
  }
}

let state: AppData = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('保存に失敗しました', e)
  }
}

export function getData(): AppData {
  return state
}

export function updateData(fn: (draft: AppData) => AppData): void {
  state = fn(state)
  persist()
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData)
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function resetData(): void {
  updateData(() => emptyData())
}

// ===== バックアップ =====

export function exportJson(): string {
  return JSON.stringify({ app: 'toeic-study', exportedAt: new Date().toISOString(), data: state }, null, 2)
}

export type ImportResult = { kind: 'backup' } | { kind: 'legacy'; logs: number; scores: number; checks: number; memos: number }

/** 読み込んだJSONの種類を判定して取り込む。バックアップは置き換え、旧アプリのデータは追加（重複は除く） */
export function importJson(text: string, confirmReplace: () => boolean): ImportResult | null {
  const parsed = JSON.parse(text)
  if (parsed && typeof parsed === 'object' && parsed.app === 'my-study-toeic-export') {
    return importLegacy(parsed as LegacyExport)
  }
  const data = parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed
  if (!data || typeof data !== 'object' || !Array.isArray(data.studyLogs) || !Array.isArray(data.scores)) {
    throw new Error('このファイルはTOEIC学習管理アプリのバックアップでも、旧アプリのTOEICデータでもありません')
  }
  if (!confirmReplace()) return null
  updateData(() => normalize(data))
  return { kind: 'backup' }
}

// ===== 旧アプリ（OutSystems学習管理）からの移行 =====

interface LegacyExport {
  app: 'my-study-toeic-export'
  version: number
  studyLogs?: { id: string; date: string; minutes: number; createdAt?: string }[]
  minimumDone?: Record<string, boolean>
  toeicChecks?: Record<string, boolean>
  toeicScores?: { id: string; date: string; listening: number; reading: number; note?: string }[]
  reviewMemos?: Record<string, string>
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function importLegacy(src: LegacyExport): ImportResult {
  const cur = state
  const logIds = new Set(cur.studyLogs.map((l) => l.id))
  const logs: StudyLog[] = (src.studyLogs ?? [])
    .filter((l) => l && DATE_RE.test(l.date) && Number(l.minutes) > 0 && !logIds.has(`legacy-${l.id}`))
    .map((l) => ({
      id: `legacy-${l.id}`,
      date: l.date,
      minutes: Math.round(Number(l.minutes)),
      category: 'legacy',
      createdAt: l.createdAt ?? new Date().toISOString(),
    }))

  const scoreIds = new Set(cur.scores.map((s) => s.id))
  const scores: ScoreRecord[] = (src.toeicScores ?? [])
    .filter((s) => s && DATE_RE.test(s.date) && !scoreIds.has(`legacy-${s.id}`))
    .map((s) => ({
      id: `legacy-${s.id}`,
      date: s.date,
      listening: Number(s.listening),
      reading: Number(s.reading),
      ...(s.note ? { note: s.note } : {}),
    }))

  const checks = Object.fromEntries(Object.entries(src.toeicChecks ?? {}).filter(([, v]) => v === true))
  const memos = Object.fromEntries(
    Object.entries(src.reviewMemos ?? {}).filter(([k, v]) => DATE_RE.test(k) && typeof v === 'string' && v.trim()),
  )

  updateData((d) => ({
    ...d,
    studyLogs: [...d.studyLogs, ...logs],
    minimumDone: { ...(src.minimumDone ?? {}), ...d.minimumDone },
    checks: { ...d.checks, ...checks },
    scores: [...d.scores, ...scores],
    legacyMemos: { ...d.legacyMemos, ...memos },
  }))
  return {
    kind: 'legacy',
    logs: logs.length,
    scores: scores.length,
    checks: Object.keys(checks).length,
    memos: Object.keys(memos).length,
  }
}
