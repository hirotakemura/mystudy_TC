import { WithRoadmap } from '../components/Async'
import { Recorder } from '../components/Recorder'
import { setCheck, setMinimumDone, toggleCommute } from '../lib/actions'
import { addDays, diffDays, formatJa, formatMinutes, todayKey, weekStart } from '../lib/date'
import { cautions, commuteKey, commuteTotal, planPosition } from '../lib/plan'
import { navigate } from '../lib/router'
import { useData } from '../lib/store'
import { minimumAchieved, minutesBetween, streak } from '../lib/stats'
import type { Phase, Roadmap } from '../types'

export default function Home() {
  return <WithRoadmap>{(r) => <HomeBody roadmap={r} />}</WithRoadmap>
}

function HomeBody({ roadmap }: { roadmap: Roadmap }) {
  const data = useData()
  const today = todayKey()
  const pos = planPosition(roadmap, today)
  const daysLeft = diffDays(today, roadmap.exam.date)
  const ws = weekStart(today)
  const weekTotal = minutesBetween(data, ws, addDays(ws, 6))
  const goal = data.settings.weeklyGoalMinutes
  const rate = goal > 0 ? Math.round((weekTotal / goal) * 100) : 0
  const minDone = minimumAchieved(data, today, roadmap)
  const minChecked = !!data.minimumDone[today]
  const days = streak(data, today, roadmap)

  return (
    <div className="stack">
      <p className="date-line">{formatJa(today, true)}</p>

      {cautions(roadmap, today).map((c) => (
        <div key={c} className="caution" role="note">
          <b>⚠ 注意</b>
          <span>{c}</span>
        </div>
      ))}

      <section className="card hero">
        <div className="label">
          {roadmap.exam.name}・{formatJa(roadmap.exam.date)}
        </div>
        <div className="hero-row">
          <div>
            {daysLeft > 0 ? (
              <span className="hero-count">
                あと<b>{daysLeft}</b>日
              </span>
            ) : daysLeft === 0 ? (
              <span className="hero-count">本番当日！</span>
            ) : (
              <span className="hero-count small-count">試験は終了しました</span>
            )}
          </div>
          <div className="hero-goal">
            <span className="label">目標</span>
            <b>{roadmap.exam.target}点</b>
          </div>
        </div>
        <p className="sub">
          {roadmap.baseline.label}：{roadmap.baseline.total}点（L{roadmap.baseline.listening}／R{roadmap.baseline.reading}）・
          {roadmap.longTermGoal.label}：{roadmap.longTermGoal.score}点
        </p>
      </section>

      <PhaseCard roadmap={roadmap} today={today} />

      {pos.kind === 'phase' && <CommuteCard phase={pos.phase} today={today} />}

      <Recorder date={today} title="今日の学習時間" />

      <section className={`card minimum${minDone ? ' done' : ''}`}>
        <div className="min-row">
          <div>
            <h2>疲れた日の最低ライン</h2>
            <p className="sub">
              {roadmap.minimumLine.label}だけでもOK。達成した日は連続学習日数が続きます。
              {minDone && !minChecked && '（単語の記録から自動で達成）'}
            </p>
          </div>
          <button
            className={`check-btn${minDone ? ' on' : ''}`}
            aria-pressed={minDone}
            onClick={() => setMinimumDone(today, !minChecked)}
            disabled={minDone && !minChecked}
          >
            {minDone ? '✓ 達成' : '達成した'}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="grid-2 stats">
          <div>
            <div className="label">連続学習日数</div>
            <div className="big">
              {days}
              <small>日</small>
            </div>
          </div>
          <div>
            <div className="label">今週の合計</div>
            <div className="big">{formatMinutes(weekTotal)}</div>
          </div>
        </div>
        <div className="goal-line">
          <span className="sub">
            週の目標 {formatMinutes(goal)} に対して <b>{rate}%</b>
          </span>
          <div className="progress" role="progressbar" aria-valuenow={Math.min(rate, 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className={`progress-fill${rate >= 100 ? ' done' : ''}`} style={{ width: `${Math.min(rate, 100)}%` }} />
          </div>
        </div>
      </section>
    </div>
  )
}

function PhaseCard({ roadmap, today }: { roadmap: Roadmap; today: string }) {
  const data = useData()
  const pos = planPosition(roadmap, today)

  if (pos.kind === 'exam') {
    return (
      <section className="card phase-card">
        <h2>今日は本番です</h2>
        <p>これまでの積み重ねを信じて、落ち着いて解きましょう。受験後はスコアを記録してください。</p>
      </section>
    )
  }
  if (pos.kind === 'after') {
    return (
      <section className="card phase-card">
        <h2>おつかれさまでした</h2>
        <p>
          結果が出たら<button className="link" onClick={() => navigate('scores')}>スコア</button>
          に記録しましょう。次は{roadmap.longTermGoal.label}（{roadmap.longTermGoal.score}点）です。
        </p>
      </section>
    )
  }
  if (pos.kind !== 'phase') {
    const next = pos.next
    return (
      <section className="card phase-card">
        <h2>{next ? `次の期間：${next.title}` : '本番に向けて復習'}</h2>
        {next && (
          <p className="sub">
            {formatJa(next.start)} から（あと{diffDays(today, next.start)}日）・{next.summary}
          </p>
        )}
      </section>
    )
  }

  const phase = pos.phase
  const left = diffDays(today, phase.end)
  return (
    <section className="card phase-card">
      <div className="phase-head">
        <div>
          <div className="label">今の期間</div>
          <h2>{phase.title}</h2>
        </div>
        <span className="pill now">{left === 0 ? '今日まで' : `残り${left}日`}</span>
      </div>
      <p className="sub">
        {formatJa(phase.start)}〜{formatJa(phase.end)}・{phase.summary}
      </p>
      <h3>今週やること</h3>
      <ul className="checklist">
        {phase.tasks.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={!!data.checks[t.id]} onChange={(e) => setCheck(t.id, e.target.checked)} />
              <span>{t.text}</span>
            </label>
          </li>
        ))}
      </ul>
      {phase.notes?.map((n) => (
        <p key={n} className="small accent">
          ※ {n}
        </p>
      ))}
    </section>
  )
}

function CommuteCard({ phase, today }: { phase: Phase; today: string }) {
  const data = useData()
  const slotOf = (i: number) => data.studyLogs.find((l) => l.date === today && l.commute?.key === commuteKey(phase, i))?.commute?.slot
  const doneMin = phase.commute.reduce((s, c, i) => (slotOf(i) ? s + c.minutes : s), 0)
  const total = commuteTotal(phase)

  return (
    <section className="card">
      <div className="recorder-head">
        <h2>通勤メニュー</h2>
        <span className="total">
          {formatMinutes(doneMin)} / {formatMinutes(total)}
        </span>
      </div>
      <p className="small muted">やった項目を「行き」「帰り」でタップすると学習時間に加算されます（もう一度タップで取り消し）。</p>
      <ul className="commute">
        {phase.commute.map((c, i) => {
          const slot = slotOf(i)
          return (
            <li key={i} className={slot ? 'done' : ''}>
              <div className="commute-text">
                <span>{c.label}</span>
                <span className="small muted">目安 {c.minutes}分</span>
              </div>
              <div className="slot-btns">
                {(['go', 'back'] as const).map((s) => (
                  <button
                    key={s}
                    className={`slot${slot === s ? ' on' : ''}`}
                    aria-pressed={slot === s}
                    onClick={() => toggleCommute(today, phase, i, s)}
                  >
                    {s === 'go' ? '行き' : '帰り'}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
