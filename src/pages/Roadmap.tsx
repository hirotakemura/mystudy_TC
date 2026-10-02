import { WithRoadmap } from '../components/Async'
import { setCheck } from '../lib/actions'
import { diffDays, formatJa, formatMinutes, todayKey } from '../lib/date'
import { commuteTotal, plannedMinutes, planPosition } from '../lib/plan'
import { updateData, useData } from '../lib/store'
import { minutesBetween } from '../lib/stats'
import type { Roadmap } from '../types'

export default function RoadmapPage() {
  return <WithRoadmap>{(r) => <RoadmapBody roadmap={r} />}</WithRoadmap>
}

function RoadmapBody({ roadmap }: { roadmap: Roadmap }) {
  const data = useData()
  const today = todayKey()
  const pos = planPosition(roadmap, today)
  const currentId = pos.kind === 'phase' ? pos.phase.id : null
  const examToday = pos.kind === 'exam'

  return (
    <div className="stack">
      <section className="card focus">
        <div className="label">方針</div>
        <p>{roadmap.focus}</p>
      </section>

      <VocabCounter />

      <ol className="timeline">
        {roadmap.phases.map((p) => {
          const isNow = p.id === currentId
          const isPast = p.end < today
          const done = p.tasks.filter((t) => data.checks[t.id]).length
          const planned = plannedMinutes(p)
          const actual = minutesBetween(data, p.start, p.end)
          const pct = planned ? Math.round((actual / planned) * 100) : 0
          return (
            <li key={p.id} className={`tl-item${isNow ? ' now' : ''}${isPast ? ' past' : ''}`}>
              <details className="card phase" open={isNow}>
                <summary>
                  <div className="phase-sum">
                    <span className="phase-dates">
                      {formatJa(p.start)}〜{formatJa(p.end)}
                    </span>
                    <b>{p.title}</b>
                  </div>
                  <div className="phase-badges">
                    {isNow && <span className="pill now">今ここ</span>}
                    <span className={`pill${done === p.tasks.length ? ' ok' : ''}`}>
                      {done}/{p.tasks.length}
                    </span>
                  </div>
                </summary>
                <p className="sub">{p.summary}</p>
                <ul className="checklist">
                  {p.tasks.map((t) => (
                    <li key={t.id}>
                      <label>
                        <input type="checkbox" checked={!!data.checks[t.id]} onChange={(e) => setCheck(t.id, e.target.checked)} />
                        <span>{t.text}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                {p.notes?.map((n) => (
                  <p key={n} className="small accent">
                    ※ {n}
                  </p>
                ))}
                <h3>通勤メニュー（1日 {formatMinutes(commuteTotal(p))}）</h3>
                <ul className="plain small">
                  {p.commute.map((c, i) => (
                    <li key={i} className="commute-row">
                      <span>{c.label}</span>
                      <span className="muted">{c.minutes}分</span>
                    </li>
                  ))}
                </ul>
                <div className="plan-vs">
                  <div>
                    <span className="label">目安</span>
                    <b>{formatMinutes(planned)}</b>
                  </div>
                  <div>
                    <span className="label">実績</span>
                    <b>{formatMinutes(actual)}</b>
                  </div>
                  <div>
                    <span className="label">達成率</span>
                    <b>{p.start > today ? '—' : `${pct}%`}</b>
                  </div>
                </div>
                <div className="progress">
                  <div className={`progress-fill${pct >= 100 ? ' done' : ''}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="small muted">目安は通勤メニュー × 平日の日数です。</p>
              </details>
            </li>
          )
        })}
        <li className={`tl-item exam${examToday ? ' now' : ''}`}>
          <div className="card phase exam-card">
            <div className="phase-sum">
              <span className="phase-dates">{formatJa(roadmap.exam.date)}</span>
              <b>本番：{roadmap.exam.name}</b>
            </div>
            <p className="sub">
              目標 {roadmap.exam.target}点
              {diffDays(today, roadmap.exam.date) > 0 && `・あと${diffDays(today, roadmap.exam.date)}日`}
            </p>
          </div>
        </li>
      </ol>
    </div>
  )
}

function VocabCounter() {
  const data = useData()
  const rounds = data.vocabRounds
  const n = rounds.length
  const today = todayKey()
  return (
    <section className="card vocab">
      <div>
        <div className="label">単語帳の周回</div>
        <div className="big">{n === 0 ? '未開始' : `${n}周目`}</div>
        {n > 0 && <div className="small muted">{formatJa(rounds[n - 1])} から</div>}
      </div>
      <div className="btn-row">
        <button
          className="btn small"
          disabled={n === 0}
          aria-label="周回数を1つ戻す"
          onClick={() => updateData((d) => ({ ...d, vocabRounds: d.vocabRounds.slice(0, -1) }))}
        >
          −
        </button>
        <button className="btn primary small" onClick={() => updateData((d) => ({ ...d, vocabRounds: [...d.vocabRounds, today] }))}>
          {n === 0 ? '1周目を開始' : `${n + 1}周目へ`}
        </button>
      </div>
    </section>
  )
}
