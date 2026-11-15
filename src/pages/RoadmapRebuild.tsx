import { useState } from 'react'
import { loadRoadmap, useLoad } from '../lib/content'
import { diffDays, formatJa, formatMinutes, todayKey } from '../lib/date'
import { commuteTotal, rebuildRoadmap, weekdaysBetween } from '../lib/plan'
import { updateData } from '../lib/store'
import type { Roadmap } from '../types'

/** 開始日と受験日を決めると、その期間に合わせてロードマップを作り直す */
export default function RoadmapRebuild({ current, onClose }: { current: Roadmap; onClose: () => void }) {
  const template = useLoad(loadRoadmap)
  const today = todayKey()
  const [start, setStart] = useState(today)
  const [exam, setExam] = useState(current.exam.date > today ? current.exam.date : '')
  const [target, setTarget] = useState(current.exam.target)

  const days = start && exam ? diffDays(start, exam) : 0
  const error = !start || !exam ? '開始日と受験日を入力してください' : days < 1 ? '受験日は開始日より後にしてください' : ''
  const preview = template.status === 'ok' && !error ? rebuildRoadmap(template.value, start, exam, target) : null

  const apply = () => {
    if (!preview) return
    if (!confirm('今のロードマップを、この期間で作り直します。よろしいですか？（チェック済みのやることは引き継がれます）')) return
    updateData((d) => ({ ...d, roadmapOverride: preview }))
    onClose()
  }

  return (
    <div className="stack editor">
      <div className="session-head">
        <button className="link" onClick={onClose}>
          ‹ やめる
        </button>
      </div>

      <section className="card">
        <h2>期間を設定して作り直す</h2>
        <p className="small muted">
          学習を始める日と受験日を入れると、「準備 → 土台づくり → Part別対策 → 実戦」の流れで期間を自動で割り振ります。期間が短い場合は、前のほうの期間を省いて Part別対策・実戦を優先します。
        </p>
        <div className="field-row two">
          <label className="field">
            <span>開始日</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field">
            <span>受験日</span>
            <input type="date" value={exam} onChange={(e) => setExam(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>目標点</span>
          <input
            type="number"
            inputMode="numeric"
            min={10}
            max={990}
            step={5}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
        </label>
        {error ? <p className="small error">{error}</p> : <p className="small">学習期間：{days}日（受験日の前日まで）</p>}
      </section>

      {template.status === 'error' && <p className="error">元の計画データを読み込めませんでした：{template.error}</p>}

      {preview && (
        <>
          <section className="card">
            <h2>作り直した計画（プレビュー）</h2>
            <ol className="rebuild-list">
              {preview.phases.map((p) => (
                <li key={p.id}>
                  <div className="phase-sum">
                    <span className="phase-dates">
                      {formatJa(p.start)}〜{formatJa(p.end)}（{diffDays(p.start, p.end) + 1}日・平日{weekdaysBetween(p.start, p.end)}日）
                    </span>
                    <b>{p.title}</b>
                    <span className="small muted">
                      {p.summary}・通勤 1日{formatMinutes(commuteTotal(p))}
                    </span>
                  </div>
                </li>
              ))}
              <li>
                <div className="phase-sum">
                  <span className="phase-dates">{formatJa(preview.exam.date)}</span>
                  <b>本番（目標 {preview.exam.target}点）</b>
                </div>
              </li>
            </ol>
            <p className="small muted">作り直したあとも「✏️ 期間・内容を編集」で日付や中身を細かく調整できます。</p>
          </section>
          <button className="btn primary block big-btn" onClick={apply}>
            この期間で作り直す
          </button>
        </>
      )}
    </div>
  )
}
