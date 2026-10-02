// ===== 計画データ（public/data/plan/toeic-roadmap.json） =====

export interface CommuteItem {
  label: string
  minutes: number
  /** 省略時はラベルから推定する */
  category?: Category
}

export interface RoadmapTask {
  id: string
  text: string
}

export interface Phase {
  id: string
  title: string
  start: string
  end: string
  summary: string
  commute: CommuteItem[]
  tasks: RoadmapTask[]
  notes?: string[]
}

export interface Roadmap {
  baseline: { total: number; listening: number; reading: number; label: string }
  exam: { date: string; target: number; name: string }
  longTermGoal: { score: number; label: string }
  minimumLine: { label: string; minutes: number }
  focus: string
  phases: Phase[]
}

// ===== 学習データ（localStorage） =====

/** 学習の内訳。legacy は旧アプリから取り込んだ内訳なしの記録 */
export type Category = 'vocab' | 'grammar' | 'listening' | 'part56' | 'part7' | 'mockReview' | 'legacy'

export type CommuteSlot = 'go' | 'back'

export interface StudyLog {
  id: string
  date: string // YYYY-MM-DD
  minutes: number
  category: Category
  createdAt: string
  /** 通勤メニューのチェックから自動で作られた記録 */
  commute?: { key: string; slot: CommuteSlot }
}

export interface ScoreRecord {
  id: string
  date: string
  listening: number
  reading: number
  note?: string
}

export type ThemeSetting = 'system' | 'light' | 'dark'

export interface AppData {
  version: 1
  studyLogs: StudyLog[]
  /** 最低ラインを達成した日 */
  minimumDone: Record<string, boolean>
  /** ロードマップのチェック（キーはタスクid） */
  checks: Record<string, boolean>
  scores: ScoreRecord[]
  /** 振り返りメモ（キーは週の月曜日） */
  reviewMemos: Record<string, string>
  /** 旧アプリ（OutSystems学習管理）から取り込んだメモ。OutSystemsと共用だったので分けて持つ */
  legacyMemos: Record<string, string>
  /** 単語帳の各周の開始日（length が今の周回数） */
  vocabRounds: string[]
  lastReviewShown?: string
  settings: { theme: ThemeSetting; weeklyGoalMinutes: number }
}
