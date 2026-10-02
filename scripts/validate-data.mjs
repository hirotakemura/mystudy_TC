// 計画データ（public/data/plan/toeic-roadmap.json）の整合性チェック
// 使い方: npm run validate:data
import { readFileSync } from 'node:fs'

const file = new URL('../public/data/plan/toeic-roadmap.json', import.meta.url)
const r = JSON.parse(readFileSync(file, 'utf8'))
const errors = []
const DATE = /^\d{4}-\d{2}-\d{2}$/
const CATS = ['vocab', 'grammar', 'listening', 'part56', 'part7', 'mockReview']
const need = (cond, msg) => cond || errors.push(msg)

need(DATE.test(r.exam?.date), 'exam.date は YYYY-MM-DD 形式にしてください')
need(Number.isInteger(r.exam?.target), 'exam.target は整数にしてください')
need(r.baseline?.listening + r.baseline?.reading === r.baseline?.total, 'baseline の L + R が total と一致しません')
need(r.minimumLine?.minutes > 0, 'minimumLine.minutes は正の数にしてください')
need(Array.isArray(r.phases) && r.phases.length > 0, 'phases が空です')

const ids = new Set()
let prevEnd = ''
for (const p of r.phases ?? []) {
  const at = `phases[${p.id}]`
  need(!ids.has(p.id), `${at}: id が重複しています`)
  ids.add(p.id)
  need(DATE.test(p.start) && DATE.test(p.end), `${at}: start/end は YYYY-MM-DD 形式にしてください`)
  need(p.start <= p.end, `${at}: start が end より後です`)
  need(p.start > prevEnd, `${at}: 前の期間と日付が重なっています`)
  need(p.end < r.exam.date, `${at}: 本番日以降まで続いています`)
  prevEnd = p.end
  need(Array.isArray(p.commute) && p.commute.length > 0, `${at}: commute が空です`)
  for (const c of p.commute ?? []) {
    need(typeof c.label === 'string' && c.minutes > 0, `${at}: commute の label/minutes が不正です`)
    need(c.category === undefined || CATS.includes(c.category), `${at}: commute.category は ${CATS.join('/')} のいずれかです`)
  }
  for (const t of p.tasks ?? []) {
    need(!ids.has(t.id), `${at}: タスクid ${t.id} が重複しています`)
    ids.add(t.id)
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'))
  process.exit(1)
}
console.log(`✓ 計画データOK（期間${r.phases.length}件・タスク${ids.size - r.phases.length}件）`)
