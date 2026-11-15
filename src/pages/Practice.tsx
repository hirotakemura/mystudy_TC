import { useState } from 'react'
import { Async } from '../components/Async'
import { loadParts, loadShadowing, loadWords, useLoad } from '../lib/content'
import { formatMinutes, todayKey } from '../lib/date'
import { speechSupported } from '../lib/speech'
import { autoMinutesByCategory } from '../lib/stats'
import { useData } from '../lib/store'
import Parts from './practice/Parts'
import Shadowing from './practice/Shadowing'
import Vocab from './practice/Vocab'

export type PracticeTab = 'parts' | 'vocab' | 'shadowing'
const TABS: { id: PracticeTab; label: string }[] = [
  { id: 'parts', label: 'パート別' },
  { id: 'vocab', label: '単語' },
  { id: 'shadowing', label: 'シャドーイング' },
]
const TAB_KEY = 'toeic-study:practice-tab'

/** ホームなどから開くときに、どちらのタブを出すか指定する */
export function setPracticeTab(tab: PracticeTab) {
  try {
    sessionStorage.setItem(TAB_KEY, tab)
  } catch {
    /* 保存できなくても既定のタブで開く */
  }
}

function initialTab(): PracticeTab {
  try {
    const t = sessionStorage.getItem(TAB_KEY)
    return TABS.some((x) => x.id === t) ? (t as PracticeTab) : 'parts'
  } catch {
    return 'parts'
  }
}

export default function Practice() {
  const [tab, setTab] = useState<PracticeTab>(initialTab)
  const state = useLoad(() => Promise.all([loadParts(), loadWords(), loadShadowing()]))
  const data = useData()
  const auto = autoMinutesByCategory(data, todayKey())

  const choose = (t: PracticeTab) => {
    setTab(t)
    setPracticeTab(t)
  }

  return (
    <div className="stack">
      <div className="segmented big-seg">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => choose(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="small muted auto-note">
        ⏱ 演習中の時間は自動で記録されます（今日：{formatMinutes(Object.values(auto).reduce((s, m) => s + (m ?? 0), 0))}）。3分以上操作がないと計測を止めます。
      </p>
      {!speechSupported && <p className="caution small">この端末・ブラウザは英語の読み上げに対応していません。</p>}
      <Async state={state}>
        {([parts, words, items]) =>
          tab === 'parts' ? <Parts sets={parts} /> : tab === 'vocab' ? <Vocab words={words} /> : <Shadowing items={items} />
        }
      </Async>
    </div>
  )
}
