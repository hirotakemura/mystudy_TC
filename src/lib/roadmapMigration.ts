import type { Roadmap } from '../types'

// 以前の初期値（通勤メニューが単語帳・公式問題集などアプリ外の教材だった版）。
// アプリ内で保存した計画のうち、この内容から変えていない部分だけを新しい初期値に置き換える。
const OLD: Record<string, { commute: string[]; tasks: Record<string, string>; summary: string }> = {
  prep: {
    commute: ['単語帳を1冊選び、1周目を開始', '中学〜高校基礎文法の参考書を1冊選んで読み始め', '公式問題集の音声を聞き流し'],
    tasks: { 'prep-1': '公式問題集で1回分を解いて現在地を確認' },
    summary: '現在地の確認と申込の準備',
  },
  foundation: {
    commute: ['単語（TOEIC頻出単語帳を1冊に絞って周回）', '文法（中学〜高校基礎文法の復習）', 'リスニング（公式問題集の音声を聞き流し＋シャドーイング）'],
    tasks: {
      'foundation-1': '単語45分（TOEIC頻出単語帳を1冊に絞って周回）',
      'foundation-2': '文法45分（中学〜高校基礎文法の復習）',
      'foundation-3': 'リスニング30分（公式問題集の音声を聞き流し＋シャドーイング）',
    },
    summary: '通勤2時間で単語・文法・リスニングの土台をつくる',
  },
  parts: {
    commute: ['Part 5/6 の問題演習 30問', 'Part 7 の長文 1〜2題（時間を計る）', 'Part 3/4 のシャドーイング', '単語帳の周回'],
    tasks: {
      'parts-1': 'Part 5/6の問題演習を毎日30問',
      'parts-2': 'Part 7の長文を毎日1〜2題（時間を計る）',
      'parts-3': 'Part 3/4のシャドーイング',
      'parts-4': '単語帳の周回は継続',
    },
    summary: '通勤2時間でPart 5/6・7・3/4を対策',
  },
  practice: {
    commute: ['模試で間違えた問題の復習', '単語帳の周回（間違えた単語中心）', 'Part 3/4 の音声で復習・シャドーイング'],
    tasks: {
      'practice-1': 'OutSystemsの受験が落ち着いた週末に、公式問題集で2時間通しの模試',
      'practice-2': '平日の通勤は模試で間違えた問題の復習',
    },
    summary: '週末に模試、平日の通勤は模試の復習',
  },
}

/** 以前の初期値のままの部分を、新しい初期値（template）に置き換える。変更が無ければ同じオブジェクトを返す */
export function migrateRoadmap(r: Roadmap, template: Roadmap): Roadmap {
  let changed = false
  const phases = r.phases.map((p) => {
    const old = OLD[p.id]
    const fresh = template.phases.find((t) => t.id === p.id)
    if (!old || !fresh) return p
    // 置き換えるのは「以前の初期値のまま」かつ「新しい初期値と内容が違う」ときだけ（同じなら何もしない）
    let next = p
    const labels = (cs: { label: string }[]) => cs.map((c) => c.label).join('\n')
    if (labels(p.commute) === old.commute.join('\n') && labels(fresh.commute) !== labels(p.commute)) {
      next = { ...next, commute: structuredClone(fresh.commute) }
    }
    if (p.summary === old.summary && fresh.summary !== p.summary) next = { ...next, summary: fresh.summary }
    const tasks = next.tasks.map((t) => {
      const freshTask = fresh.tasks.find((x) => x.id === t.id)
      return old.tasks[t.id] === t.text && freshTask && freshTask.text !== t.text ? { ...t, text: freshTask.text } : t
    })
    if (tasks.some((t, i) => t !== next.tasks[i])) next = { ...next, tasks }
    if (next !== p) changed = true
    return next
  })
  return changed ? { ...r, phases } : r
}
