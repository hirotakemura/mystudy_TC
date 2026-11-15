// 計画データ・教材データ（public/data 配下）の整合性チェック
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

// ===== 単語（public/data/vocab/words.json） =====
const words = JSON.parse(readFileSync(new URL('../public/data/vocab/words.json', import.meta.url), 'utf8'))
const wordIds = new Set()
const spellings = new Set()
for (const w of words) {
  const at = `words[${w.id ?? '?'}]`
  need(typeof w.id === 'string' && !wordIds.has(w.id), `${at}: id が無いか重複しています`)
  wordIds.add(w.id)
  need(!spellings.has(w.word), `${at}: 単語「${w.word}」が重複しています`)
  spellings.add(w.word)
  for (const k of ['word', 'pos', 'meaning', 'example', 'exampleJa']) need(typeof w[k] === 'string' && w[k].trim(), `${at}: ${k} が空です`)
  need([1, 2, 3].includes(w.level), `${at}: level は 1/2/3 のいずれかです`)
}
need(new Set(words.map((w) => w.meaning)).size >= 4, '4択の選択肢を作るには意味の異なる単語が4語以上必要です')

// ===== シャドーイング（public/data/shadowing/sentences.json） =====
const items = JSON.parse(readFileSync(new URL('../public/data/shadowing/sentences.json', import.meta.url), 'utf8'))
const itemIds = new Set()
let lineCount = 0
for (const it of items) {
  const at = `shadowing[${it.id ?? '?'}]`
  need(typeof it.id === 'string' && !itemIds.has(it.id), `${at}: id が無いか重複しています`)
  itemIds.add(it.id)
  need([1, 2, 3, 4].includes(it.part), `${at}: part は 1〜4 です`)
  need([1, 2, 3].includes(it.level), `${at}: level は 1/2/3 のいずれかです`)
  need(Array.isArray(it.lines) && it.lines.length > 0, `${at}: lines が空です`)
  for (const l of it.lines ?? []) {
    lineCount++
    need(typeof l.en === 'string' && l.en.trim() && typeof l.ja === 'string', `${at}: en/ja が不正です`)
    need(l.speaker === undefined || ['M', 'W', 'Q', 'A'].includes(l.speaker), `${at}: speaker は M/W/Q/A です`)
  }
}

// ===== パート別問題（public/data/parts/part1〜7.json） =====
const partCounts = []
const setIds = new Set()
for (let part = 1; part <= 7; part++) {
  const sets = JSON.parse(readFileSync(new URL(`../public/data/parts/part${part}.json`, import.meta.url), 'utf8'))
  let qs = 0
  for (const s of sets) {
    const at = `part${part}[${s.id ?? '?'}]`
    need(typeof s.id === 'string' && !setIds.has(s.id), `${at}: id が無いか重複しています`)
    setIds.add(s.id)
    need(s.part === part, `${at}: part が ${part} ではありません`)
    need([1, 2, 3].includes(s.level), `${at}: level は 1/2/3 のいずれかです`)
    need(Array.isArray(s.questions) && s.questions.length > 0, `${at}: questions が空です`)
    if (part === 1) need(typeof s.scene === 'string' && s.scene.trim(), `${at}: Part 1 には scene（場面の説明）が必要です`)
    if (part >= 2 && part <= 4) need(Array.isArray(s.talk) && s.talk.length > 0, `${at}: Part 2〜4 には talk（読み上げる文）が必要です`)
    if (part >= 6) need(Array.isArray(s.passages) && s.passages.length > 0, `${at}: Part 6/7 には passages（本文）が必要です`)
    if (part === 6) s.questions.forEach((_, i) => need(s.passages.some((p) => p.text.includes(`[${i + 1}]`)), `${at}: 本文に空所 [${i + 1}] がありません`))
    const nChoices = part === 2 ? 3 : 4
    for (const [i, q] of (s.questions ?? []).entries()) {
      qs++
      need(Array.isArray(q.choices) && q.choices.length === nChoices, `${at} Q${i + 1}: 選択肢は${nChoices}つにしてください`)
      need(new Set(q.choices).size === q.choices.length, `${at} Q${i + 1}: 選択肢が重複しています`)
      need(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, `${at} Q${i + 1}: answer が選択肢の範囲外です`)
      need(typeof q.explanation === 'string' && q.explanation.trim(), `${at} Q${i + 1}: explanation（解説）が空です`)
      if (q.choicesJa) need(q.choicesJa.length === q.choices.length, `${at} Q${i + 1}: choicesJa の数が選択肢と合いません`)
    }
  }
  partCounts.push(`Part${part} ${qs}問`)
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'))
  process.exit(1)
}
console.log(`✓ 計画データOK（期間${r.phases.length}件・タスク${ids.size - r.phases.length}件）`)
console.log(`✓ 単語OK（${words.length}語）`)
console.log(`✓ シャドーイングOK（${items.length}教材・${lineCount}文）`)
console.log(`✓ パート別問題OK（${partCounts.join('・')}）`)
