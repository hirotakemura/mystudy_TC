import { useEffect, useState } from 'react'
import { WithRoadmap } from '../components/Async'
import { CategoryLegend, DayBar } from '../components/DayBar'
import { addDays, formatJa, formatMinutes, todayKey, weekStart } from '../lib/date'
import { commuteTotal, finalWeekStart, phasesOverlapping } from '../lib/plan'
import { updateData, useData } from '../lib/store'
import { daysBetween, minimumAchieved, minutesBetween, minutesByCategory, minutesOn, totalOf } from '../lib/stats'
import type { Category, Roadmap } from '../types'

export default function Review() {
  return <WithRoadmap>{(r) => <ReviewBody roadmap={r} />}</WithRoadmap>
}

function ReviewBody({ roadmap }: { roadmap: Roadmap }) {
  const data = useData()
  const today = todayKey()
  const thisWeek = weekStart(today)
  const [from, setFrom] = useState(thisWeek)
  const to = addDays(from, 6)
  const nextFrom = addDays(from, 7)
  const nextTo = addDays(from, 13)
  const days = daysBetween(from, to)
  const total = minutesBetween(data, from, to)
  const prevTotal = minutesBetween(data, addDays(from, -7), addDays(from, -1))
  const diff = total - prevTotal
  const max = Math.max(60, ...days.map((d) => minutesOn(data, d)))
  const used = new Set<Category>(data.studyLogs.filter((l) => l.date >= from && l.date <= to).map((l) => l.category))
  const minimumOnly = days.filter(
    (d) => d <= today && minimumAchieved(data, d, roadmap) && minutesOn(data, d) <= roadmap.minimumLine.minutes,
  ).length
  const studied = days.filter((d) => minutesOn(data, d) > 0 || minimumAchieved(data, d, roadmap)).length
  const weekScores = data.scores.filter((s) => s.date >= from && s.date <= to).sort((a, b) => a.date.localeCompare(b.date))
  const goal = data.settings.weeklyGoalMinutes
  const nextPhases = phasesOverlapping(roadmap, nextFrom, nextTo)
  const examNextWeek = roadmap.exam.date >= nextFrom && roadmap.exam.date <= nextTo
  const finalStartsNextWeek = finalWeekStart(roadmap) >= nextFrom && finalWeekStart(roadmap) <= nextTo

  return (
    <div className="stack">
      <div className="week-nav">
        <button className="btn small" onClick={() => setFrom(addDays(from, -7))} aria-label="前の週">
          ‹ 前週
        </button>
        <b>
          {formatJa(from)}〜{formatJa(to)}
        </b>
        <button className="btn small" onClick={() => setFrom(addDays(from, 7))} disabled={from >= thisWeek} aria-label="次の週">
          次週 ›
        </button>
      </div>
      {from !== thisWeek && (
        <button className="link" onClick={() => setFrom(thisWeek)}>
          今週に戻る
        </button>
      )}

      <section className="card">
        <div className="grid-3">
          <div>
            <div className="label">学習時間</div>
            <div className="mid">{formatMinutes(total)}</div>
            <div className={`small ${diff > 0 ? 'up' : diff < 0 ? 'down' : 'muted'}`}>
              前週比 {diff === 0 ? '±0' : `${diff > 0 ? '+' : '−'}${formatMinutes(Math.abs(diff))}`}
            </div>
          </div>
          <div>
            <div className="label">目標達成率</div>
            <div className="mid">{goal ? Math.round((total / goal) * 100) : 0}%</div>
            <div className="small muted">目標 {formatMinutes(goal)}</div>
          </div>
          <div>
            <div className="label">学習した日</div>
            <div className="mid">{studied}日</div>
            <div className="small muted">最低ラインだけ {minimumOnly}日</div>
          </div>
        </div>
        <h3>日ごとの学習時間</h3>
        <CategoryLegend used={used.size ? used : undefined} />
        <ul className="day-bars">
          {days.map((d) => (
            <li key={d} className={d === today ? 'today' : ''}>
              <span className="day">{formatJa(d)}</span>
              <DayBar parts={minutesByCategory(data, d)} max={max} />
              <span className="small">
                {minutesOn(data, d) ? formatMinutes(minutesOn(data, d)) : minimumAchieved(data, d, roadmap) ? '最低ライン' : '—'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>今週記録したスコア</h2>
        {weekScores.length === 0 ? (
          <p className="small muted">この週のスコア記録はありません。</p>
        ) : (
          <ul className="menu">
            {weekScores.map((s) => (
              <li key={s.id}>
                <span>
                  {formatJa(s.date)}
                  {s.note && <span className="small muted">・{s.note}</span>}
                </span>
                <span>
                  <b>{totalOf(s)}</b>
                  <span className="small muted">
                    （L{s.listening}／R{s.reading}）
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`card${examNextWeek ? ' hero' : ''}`}>
        <h2>来週の予定（{formatJa(nextFrom)}〜）</h2>
        {examNextWeek && (
          <p className="exam-alert">
            🎯 来週 {formatJa(roadmap.exam.date)} は本番です（目標 {roadmap.exam.target}点）
          </p>
        )}
        {finalStartsNextWeek && <p className="caution-text">来週から本番1週間前。新しい教材に手を出さず、復習のみにしましょう。</p>}
        {nextPhases.length === 0 && !examNextWeek && <p className="small muted">来週にかかる期間はありません。</p>}
        {nextPhases.map((p) => (
          <div key={p.id} className="next-phase">
            <div className="small">
              <b>{p.title}</b>
              <span className="muted">
                （{formatJa(p.start)}〜{formatJa(p.end)}）・通勤 1日{formatMinutes(commuteTotal(p))}
              </span>
            </div>
            <ul className="plain small">
              {p.commute.map((c, i) => (
                <li key={i} className="commute-row">
                  <span>{c.label}</span>
                  <span className="muted">{c.minutes}分</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <MemoCard week={from} />
      <PastMemos current={from} onPick={setFrom} />
    </div>
  )
}

function MemoCard({ week }: { week: string }) {
  const data = useData()
  const saved = data.reviewMemos[week] ?? ''
  const legacy = data.legacyMemos[week]
  const [text, setText] = useState(saved)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    setText(saved)
    setMsg('')
  }, [week, saved])

  const save = () => {
    updateData((d) => {
      const reviewMemos = { ...d.reviewMemos }
      if (text.trim()) reviewMemos[week] = text
      else delete reviewMemos[week]
      return { ...d, reviewMemos }
    })
    setMsg('保存しました')
  }

  return (
    <section className="card">
      <h2>振り返りメモ</h2>
      <textarea
        className="memo"
        rows={4}
        placeholder="できたこと・できなかったこと・来週の工夫など"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setMsg('')
        }}
      />
      <div className="btn-row spread">
        <span className="small muted">{msg}</span>
        <button className="btn primary small" onClick={save} disabled={text === saved}>
          保存
        </button>
      </div>
      {legacy && <LegacyMemo text={legacy} />}
    </section>
  )
}

function LegacyMemo({ text }: { text: string }) {
  return (
    <div className="legacy-memo">
      <span className="pill">旧アプリのメモ</span>
      <span className="small muted">OutSystems学習と共用だったメモです</span>
      <p className="pre small">{text}</p>
    </div>
  )
}

function PastMemos({ current, onPick }: { current: string; onPick: (w: string) => void }) {
  const data = useData()
  const weeks = [...new Set([...Object.keys(data.reviewMemos), ...Object.keys(data.legacyMemos)])]
    .filter((w) => w !== current)
    .sort()
    .reverse()
  if (weeks.length === 0) return null
  return (
    <section className="card">
      <details>
        <summary>
          <b>過去のメモ</b>（{weeks.length}週）
        </summary>
        <ul className="past-memos">
          {weeks.map((w) => (
            <li key={w}>
              <button className="link" onClick={() => onPick(w)}>
                {formatJa(w, true)}〜 の週
              </button>
              {data.reviewMemos[w] && <p className="pre small">{data.reviewMemos[w]}</p>}
              {data.legacyMemos[w] && <LegacyMemo text={data.legacyMemos[w]} />}
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
