// 日付はすべて端末のローカル時刻で YYYY-MM-DD 文字列として扱う

export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  // 開発時のみ ?today=YYYY-MM-DD で日付を差し替えて表示を確認できる
  if (import.meta.env.DEV) {
    const t = new URLSearchParams(window.location.search).get('today')
    if (t && /^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  }
  return toKey(new Date())
}

export function addDays(key: string, days: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + days)
  return toKey(d)
}

/** a から b までの日数（b - a） */
export function diffDays(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000)
}

/** 月曜始まりの週の開始日 */
export function weekStart(key: string): string {
  const d = fromKey(key)
  const dow = (d.getDay() + 6) % 7 // 月=0 … 日=6
  return addDays(key, -dow)
}

export function isSunday(key: string): boolean {
  return fromKey(key).getDay() === 0
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export function formatJa(key: string, withYear = false): string {
  const d = fromKey(key)
  const base = `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`
  return withYear ? `${d.getFullYear()}/${base}` : base
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}分`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}時間${m}分` : `${h}時間`
}
