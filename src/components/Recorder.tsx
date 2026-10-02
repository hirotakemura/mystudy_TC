import { useState } from 'react'
import { addLog, deleteLog } from '../lib/actions'
import { formatMinutes } from '../lib/date'
import { useData } from '../lib/store'
import { INPUT_CATEGORIES, autoMinutesByCategory, categoryLabel, minutesOn } from '../lib/stats'
import type { Category } from '../types'

/** 学習時間の記録（内訳を選んで +10/+15/+30 か任意の分数） */
export function Recorder({ date, title }: { date: string; title: string }) {
  const data = useData()
  const [cat, setCat] = useState<Category>('vocab')
  const [custom, setCustom] = useState('')
  const logs = data.studyLogs.filter((l) => l.date === date).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const total = minutesOn(data, date)
  const auto = Object.entries(autoMinutesByCategory(data, date)) as [Category, number][]

  const addCustom = () => {
    const n = Number(custom)
    if (Number.isFinite(n) && n > 0 && n <= 1440) {
      addLog(date, n, cat)
      setCustom('')
    }
  }

  return (
    <section className="card">
      <div className="recorder-head">
        <h2>{title}</h2>
        <span className="total">{formatMinutes(total)}</span>
      </div>
      <div className="chips" role="radiogroup" aria-label="内訳">
        {INPUT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="radio"
            aria-checked={cat === c.id}
            className={`chip cat-${c.id}${cat === c.id ? ' on' : ''}`}
            onClick={() => setCat(c.id)}
          >
            <i aria-hidden />
            {c.label}
          </button>
        ))}
      </div>
      <div className="btn-row add-row">
        {[10, 15, 30].map((m) => (
          <button key={m} className="btn primary" onClick={() => addLog(date, m, cat)}>
            +{m}分
          </button>
        ))}
        <div className="custom-min">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            placeholder="分"
            aria-label="任意の分数"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          />
          <button className="btn" onClick={addCustom} disabled={!(Number(custom) > 0)}>
            追加
          </button>
        </div>
      </div>
      {logs.length + auto.length > 0 && (
        <ul className="log-items">
          {auto.map(([c, m]) => (
            <li key={`auto-${c}`}>
              <span>
                <i className={`dot cat-${c}`} aria-hidden />
                {categoryLabel(c)}
                <span className="muted small">（演習・自動計測）</span>
              </span>
              <span>{formatMinutes(m)}</span>
            </li>
          ))}
          {logs.map((l) => (
            <li key={l.id}>
              <span>
                <i className={`dot cat-${l.category}`} aria-hidden />
                {categoryLabel(l.category)}
                {l.commute && <span className="muted small">（通勤・{l.commute.slot === 'go' ? '行き' : '帰り'}）</span>}
              </span>
              <span>
                {formatMinutes(l.minutes)}
                <button className="link danger" aria-label="この記録を削除" onClick={() => deleteLog(l.id)}>
                  削除
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
