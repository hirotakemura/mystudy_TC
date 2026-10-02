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

// ===== 教材データ（public/data/vocab, public/data/shadowing） =====

/** 1: 600点レベル、2: 730点レベル、3: 860点レベル */
export type Level = 1 | 2 | 3

export interface Word {
  id: string
  word: string
  pos: string
  meaning: string
  example: string
  exampleJa: string
  level: Level
}

export interface ShadowLine {
  /** 会話の話者（M/W）、応答問題の Q/A。省略時はナレーション */
  speaker?: 'M' | 'W' | 'Q' | 'A'
  en: string
  ja: string
}

export interface ShadowItem {
  id: string
  part: 1 | 2 | 3 | 4
  level: Level
  title: string
  scene: string
  lines: ShadowLine[]
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

/** 単語の覚え具合（間隔反復）。box が大きいほど次に出すまでの間隔が長い */
export interface WordProgress {
  box: number
  due: string
  correct: number
  wrong: number
  last: string
}

export interface ShadowProgress {
  count: number
  last: string
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
  /** 演習画面で自動計測した学習時間（日付 → 内訳 → 秒） */
  autoSeconds: Record<string, Partial<Record<Category, number>>>
  wordProgress: Record<string, WordProgress>
  shadowProgress: Record<string, ShadowProgress>
  lastReviewShown?: string
  settings: {
    theme: ThemeSetting
    weeklyGoalMinutes: number
    /** シャドーイングの読み上げの速さ（1 = 標準）。単語の読み上げは1.0固定 */
    speechRate: number
    /** 読み上げに使う声（未指定なら英語の声を自動で選ぶ） */
    voiceURI?: string
    /** 単語カードを表示したときに自動で読み上げる */
    autoSpeak: boolean
  }
}
