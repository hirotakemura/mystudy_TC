import { useState } from 'react'
import { Async } from '../components/Async'
import { loadShadowing, loadWords, useLoad } from '../lib/content'
import { formatMinutes, todayKey } from '../lib/date'
import { speechSupported } from '../lib/speech'
import { autoMinutesByCategory } from '../lib/stats'
import { useData } from '../lib/store'
import Shadowing from './practice/Shadowing'
import Vocab from './practice/Vocab'

export type PracticeTab = 'vocab' | 'shadowing'
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
    return sessionStorage.getItem(TAB_KEY) === 'shadowing' ? 'shadowing' : 'vocab'
  } catch {
    return 'vocab'
  }
}

export default function Practice() {
  const [tab, setTab] = useState<PracticeTab>(initialTab)
  const state = useLoad(() => Promise.all([loadWords(), loadShadowing()]))
  const data = useData()
  const auto = autoMinutesByCategory(data, todayKey())

  const choose = (t: PracticeTab) => {
    setTab(t)
    setPracticeTab(t)
  }

  return (
    <div className="stack">
      <div className="segmented big-seg">
        <button className={tab === 'vocab' ? 'on' : ''} onClick={() => choose('vocab')}>
          単語
        </button>
        <button className={tab === 'shadowing' ? 'on' : ''} onClick={() => choose('shadowing')}>
          シャドーイング
        </button>
      </div>
      <p className="small muted auto-note">
        ⏱ 演習中の時間は自動で記録されます（今日：単語 {formatMinutes(auto.vocab ?? 0)}・リスニング{' '}
        {formatMinutes(auto.listening ?? 0)}）。3分以上操作がないと計測を止めます。
      </p>
      {!speechSupported && <p className="caution small">この端末・ブラウザは英語の読み上げに対応していません。</p>}
      <Async state={state}>
        {([words, items]) => (tab === 'vocab' ? <Vocab words={words} /> : <Shadowing items={items} />)}
      </Async>
    </div>
  )
}
