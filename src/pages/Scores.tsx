import { useState } from 'react'
import { WithRoadmap } from '../components/Async'
import { pointFromDate, ScoreChart, type ChartPoint } from '../components/ScoreChart'
import { formatJa, todayKey } from '../lib/date'
import { newId, updateData, useData } from '../lib/store'
import { isValidSectionScore, sortedScores, targetSplit, totalOf } from '../lib/stats'
import type { Roadmap, ScoreRecord } from '../types'

export default function Scores() {
  return <WithRoadmap>{(r) => <ScoresBody roadmap={r} />}</WithRoadmap>
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n)
}

function ScoresBody({ roadmap }: { roadmap: Roadmap }) {
  const data = useData()
  const scores = sortedScores(data)
  const latest = scores[scores.length - 1]
  const base = roadmap.baseline
  const target = roadmap.exam.target
  const split = targetSplit(target)

  const points: ChartPoint[] = [
    { key: 'baseline', label: '基準', title: base.label, total: base.total, listening: base.listening, reading: base.reading, baseline: true },
    ...scores.map((s) => ({
      key: s.id,
      label: pointFromDate(s.date),
      title: formatJa(s.date, true) + (s.note ? `・${s.note}` : ''),
      total: totalOf(s),
      listening: s.listening,
      reading: s.reading,
    })),
  ]

  return (
    <div className="stack">
      <section className="card">
        <div className="score-summary">
          <div>
            <div className="label">{latest ? '最新スコア' : base.label}</div>
            <div className="big">{latest ? totalOf(latest) : base.total}</div>
            <div className="small muted">
              L{latest ? latest.listening : base.listening}／R{latest ? latest.reading : base.reading}
            </div>
          </div>
          <div>
            <div className="label">3年前との差</div>
            <div className={`big${latest ? (totalOf(latest) >= base.total ? ' up' : ' down') : ''}`}>
              {latest ? signed(totalOf(latest) - base.total) : '—'}
            </div>
            <div className="small muted">基準 {base.total}点</div>
          </div>
          <div>
            <div className="label">目標まで</div>
            <div className="big">{Math.max(0, target - (latest ? totalOf(latest) : base.total))}</div>
            <div className="small muted">目標 {target}点</div>
          </div>
        </div>
        <Advice latest={latest} roadmap={roadmap} split={split} />
      </section>

      <section className="card">
        <h2>推移</h2>
        <ScoreChart points={points} target={target} />
        <p className="small muted">点をタップすると、その回のスコアを表示します。「基準」は{base.label}です。</p>
      </section>

      <ScoreForm />

      <section className="card">
        <h2>一覧</h2>
        <div className="table-scroll">
          <table className="score-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>L</th>
                <th>R</th>
                <th>合計</th>
                <th>基準比</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {[...scores].reverse().map((s) => (
                <tr key={s.id}>
                  <td>
                    {formatJa(s.date, true)}
                    {s.note && <div className="small muted">{s.note}</div>}
                  </td>
                  <td>{s.listening}</td>
                  <td>{s.reading}</td>
                  <td>
                    <b>{totalOf(s)}</b>
                  </td>
                  <td className={totalOf(s) >= base.total ? 'up' : 'down'}>{signed(totalOf(s) - base.total)}</td>
                  <td>
                    <button
                      className="link danger"
                      onClick={() =>
                        confirm(`${formatJa(s.date)} のスコアを削除しますか？`) &&
                        updateData((d) => ({ ...d, scores: d.scores.filter((x) => x.id !== s.id) }))
                      }
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="baseline-row">
                <td>{base.label}</td>
                <td>{base.listening}</td>
                <td>{base.reading}</td>
                <td>
                  <b>{base.total}</b>
                </td>
                <td>基準</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Advice({ latest, roadmap, split }: { latest?: ScoreRecord; roadmap: Roadmap; split: { listening: number; reading: number } }) {
  const cur = latest ?? { listening: roadmap.baseline.listening, reading: roadmap.baseline.reading }
  const total = cur.listening + cur.reading
  const gapL = split.listening - cur.listening
  const gapR = split.reading - cur.reading
  let msg: string
  if (total >= roadmap.exam.target) {
    msg = `目標の${roadmap.exam.target}点を達成！ 次は${roadmap.longTermGoal.label}（${roadmap.longTermGoal.score}点）に向けて、弱いほうを伸ばしましょう。`
  } else if (gapR >= gapL) {
    msg = `リーディング強化：Rが目標配分（${split.reading}点）より${gapR}点低いです。単語・文法の土台とPart 5/6・7の演習を優先しましょう。`
  } else {
    msg = `リスニング強化：Lが目標配分（${split.listening}点）より${gapL}点低いです。Part 3/4のシャドーイングを増やしましょう。`
  }
  return (
    <div className="advice">
      <div className="small muted">
        目標{roadmap.exam.target}点の配分の目安：L{split.listening}／R{split.reading}
        {!latest && '（スコア未記録のため3年前のスコアで判定）'}
      </div>
      <p>{msg}</p>
    </div>
  )
}

function ScoreForm() {
  const [date, setDate] = useState(todayKey())
  const [l, setL] = useState('')
  const [r, setR] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)

  const ln = Number(l)
  const rn = Number(r)
  const lErr = l === '' ? '入力してください' : isValidSectionScore(ln) ? '' : '5〜495の5点刻みで入力してください'
  const rErr = r === '' ? '入力してください' : isValidSectionScore(rn) ? '' : '5〜495の5点刻みで入力してください'
  const ok = !lErr && !rErr && !!date

  const submit = () => {
    setTouched(true)
    if (!ok) return
    updateData((d) => ({
      ...d,
      scores: [...d.scores, { id: newId(), date, listening: ln, reading: rn, ...(note.trim() ? { note: note.trim() } : {}) }],
    }))
    setL('')
    setR('')
    setNote('')
    setTouched(false)
  }

  return (
    <section className="card">
      <h2>スコアを記録</h2>
      <div className="score-form">
        <label className="field">
          <span>日付</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="field-row two">
          <label className="field">
            <span>L（リスニング）</span>
            <input type="number" inputMode="numeric" min={5} max={495} step={5} value={l} onChange={(e) => setL(e.target.value)} />
            {touched && lErr && <small className="error">{lErr}</small>}
          </label>
          <label className="field">
            <span>R（リーディング）</span>
            <input type="number" inputMode="numeric" min={5} max={495} step={5} value={r} onChange={(e) => setR(e.target.value)} />
            {touched && rErr && <small className="error">{rErr}</small>}
          </label>
        </div>
        <label className="field">
          <span>メモ（任意）</span>
          <input type="text" placeholder="例：公式問題集10 TEST1" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="btn-row spread">
          <span className="small muted">{ok ? `合計 ${ln + rn}点` : ''}</span>
          <button className="btn primary" onClick={submit}>
            記録する
          </button>
        </div>
      </div>
    </section>
  )
}
