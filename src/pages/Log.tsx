import { useState } from 'react'
import { CategoryLegend, DayBar } from '../components/DayBar'
import { Recorder } from '../components/Recorder'
import { formatJa, formatMinutes, todayKey } from '../lib/date'
import { useData } from '../lib/store'
import { minutesByCategory, minutesOn, studyDates } from '../lib/stats'
import type { Category } from '../types'

const PAGE = 30

export default function Log() {
  const data = useData()
  const today = todayKey()
  const [date, setDate] = useState(today)
  const [shown, setShown] = useState(PAGE)

  const dates = studyDates(data)
  const visible = dates.slice(0, shown)
  const max = Math.max(60, ...visible.map((d) => minutesOn(data, d)))
  const used = new Set<Category>(dates.flatMap((d) => Object.keys(minutesByCategory(data, d)) as Category[]))

  return (
    <div className="stack">
      <section className="card">
        <label className="field">
          <span>記録する日</span>
          <div className="date-pick">
            <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
            {date !== today && (
              <button className="btn small" onClick={() => setDate(today)}>
                今日
              </button>
            )}
          </div>
        </label>
        <p className="small muted">記録し忘れた日の分も、日付を選んであとから追加できます。</p>
      </section>

      <Recorder date={date} title={date === today ? '今日の学習時間' : `${formatJa(date)}の学習時間`} />

      <section className="card">
        <h2>これまでの記録</h2>
        {dates.length === 0 ? (
          <p className="muted small">まだ記録がありません。ホームの通勤メニューや +10分 ボタンから記録しましょう。</p>
        ) : (
          <>
            <CategoryLegend used={used} />
            <ul className="day-bars history">
              {visible.map((d) => (
                <li key={d}>
                  <button className={`day-btn${d === date ? ' on' : ''}`} onClick={() => setDate(d)}>
                    <span className="day">{formatJa(d)}</span>
                    <DayBar parts={minutesByCategory(data, d)} max={max} />
                    <span className="small">{formatMinutes(minutesOn(data, d))}</span>
                  </button>
                </li>
              ))}
            </ul>
            {dates.length > shown && (
              <button className="link" onClick={() => setShown(shown + PAGE)}>
                さらに表示（残り{dates.length - shown}日）
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
