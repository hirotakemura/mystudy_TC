import { useState } from 'react'
import { addDays, formatJa } from '../lib/date'
import { APP_CHOICES, appValue } from '../lib/commute'
import { commuteTotal, validateRoadmap, weekdaysBetween } from '../lib/plan'
import { newId, updateData, useData } from '../lib/store'
import type { CommuteItem, Phase, Roadmap, RoadmapTask } from '../types'

/** 学習計画（本番の日付・目標点・各期間の日程と中身）をアプリ内で編集する */
export default function RoadmapEditor({ roadmap, onClose }: { roadmap: Roadmap; onClose: () => void }) {
  const data = useData()
  const [draft, setDraft] = useState<Roadmap>(() => structuredClone(roadmap))
  const [errors, setErrors] = useState<string[]>([])
  const edited = !!data.roadmapOverride

  const setExam = (patch: Partial<Roadmap['exam']>) => setDraft({ ...draft, exam: { ...draft.exam, ...patch } })
  const setPhase = (i: number, patch: Partial<Phase>) =>
    setDraft({ ...draft, phases: draft.phases.map((p, j) => (j === i ? { ...p, ...patch } : p)) })

  const addPhase = () => {
    const last = [...draft.phases].sort((a, b) => a.end.localeCompare(b.end)).at(-1)
    const start = last ? addDays(last.end, 1) : draft.exam.date ? addDays(draft.exam.date, -28) : ''
    const end = start ? addDays(start, 13) : ''
    const phase: Phase = {
      id: `phase-${newId()}`,
      title: '',
      start,
      end,
      summary: '',
      commute: [{ label: '', minutes: 30 }],
      tasks: [],
    }
    setDraft({ ...draft, phases: [...draft.phases, phase] })
  }

  const save = () => {
    const next: Roadmap = {
      ...draft,
      exam: { ...draft.exam, name: draft.exam.name.trim(), target: Math.round(Number(draft.exam.target)) },
      phases: [...draft.phases]
        .map((p) => ({
          ...p,
          title: p.title.trim(),
          summary: p.summary.trim(),
          notes: p.notes?.map((n) => n.trim()).filter(Boolean),
        }))
        .sort((a, b) => a.start.localeCompare(b.start)),
    }
    const errs = validateRoadmap(next)
    setErrors(errs)
    if (errs.length) {
      window.scrollTo(0, 0)
      return
    }
    updateData((d) => ({ ...d, roadmapOverride: next }))
    onClose()
  }

  const reset = () => {
    if (!confirm('アプリで編集した学習計画を消して、最初の計画に戻します。よろしいですか？')) return
    updateData((d) => {
      const next = { ...d }
      delete next.roadmapOverride
      return next
    })
    onClose()
  }

  return (
    <div className="stack editor">
      <div className="session-head">
        <button className="link" onClick={onClose}>
          ‹ 編集をやめる
        </button>
        <button className="btn primary small" onClick={save}>
          保存
        </button>
      </div>

      {errors.length > 0 && (
        <div className="caution" role="alert">
          <b>保存できません</b>
          <ul className="plain small">
            {errors.map((e) => (
              <li key={e}>・{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="card">
        <h2>本番</h2>
        <label className="field">
          <span>試験名</span>
          <input type="text" value={draft.exam.name} onChange={(e) => setExam({ name: e.target.value })} />
        </label>
        <div className="field-row two">
          <label className="field">
            <span>受験日</span>
            <input type="date" value={draft.exam.date} onChange={(e) => setExam({ date: e.target.value })} />
          </label>
          <label className="field">
            <span>目標点</span>
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={990}
              step={5}
              value={draft.exam.target}
              onChange={(e) => setExam({ target: Number(e.target.value) })}
            />
          </label>
        </div>
        <p className="small muted">本番1週間前からの「復習のみ」の注意は、この受験日から自動で計算します。</p>
      </section>

      {draft.phases.map((p, i) => (
        <PhaseEditor
          key={p.id}
          phase={p}
          index={i}
          onChange={(patch) => setPhase(i, patch)}
          onRemove={() => {
            if (confirm(`「${p.title || '名前のない期間'}」を削除しますか？`))
              setDraft({ ...draft, phases: draft.phases.filter((_, j) => j !== i) })
          }}
        />
      ))}

      <button className="btn block" onClick={addPhase}>
        ＋ 期間を追加
      </button>

      <div className="btn-row spread">
        {edited ? (
          <button className="link danger" onClick={reset}>
            最初の計画に戻す
          </button>
        ) : (
          <span />
        )}
        <button className="btn primary" onClick={save}>
          保存する
        </button>
      </div>
      <p className="small muted">期間は開始日の順に並べ替えて保存します。チェックリストのチェック状態は、やることの行を消さない限りそのまま残ります。</p>
    </div>
  )
}

function PhaseEditor({
  phase,
  index,
  onChange,
  onRemove,
}: {
  phase: Phase
  index: number
  onChange: (patch: Partial<Phase>) => void
  onRemove: () => void
}) {
  const setCommute = (j: number, patch: Partial<CommuteItem>) =>
    onChange({ commute: phase.commute.map((c, k) => (k === j ? { ...c, ...patch } : c)) })
  const setTask = (j: number, patch: Partial<RoadmapTask>) =>
    onChange({ tasks: phase.tasks.map((t, k) => (k === j ? { ...t, ...patch } : t)) })
  const validDates = phase.start && phase.end && phase.start <= phase.end

  return (
    <section className="card phase-editor">
      <div className="phase-editor-head">
        <span className="pill">期間 {index + 1}</span>
        <button className="link danger" onClick={onRemove}>
          この期間を削除
        </button>
      </div>
      <label className="field">
        <span>期間の名前</span>
        <input type="text" placeholder="例：土台づくり" value={phase.title} onChange={(e) => onChange({ title: e.target.value })} />
      </label>
      <div className="field-row two">
        <label className="field">
          <span>開始日</span>
          <input type="date" value={phase.start} onChange={(e) => onChange({ start: e.target.value })} />
        </label>
        <label className="field">
          <span>終了日</span>
          <input type="date" value={phase.end} onChange={(e) => onChange({ end: e.target.value })} />
        </label>
      </div>
      {validDates && (
        <p className="small muted dates-note">
          {formatJa(phase.start)}〜{formatJa(phase.end)}（平日{weekdaysBetween(phase.start, phase.end)}日）
        </p>
      )}
      <label className="field">
        <span>概要</span>
        <input type="text" placeholder="例：通勤2時間で単語・文法の土台をつくる" value={phase.summary} onChange={(e) => onChange({ summary: e.target.value })} />
      </label>

      <div className="field">
        <span>通勤メニュー（1日 {commuteTotal(phase)}分）</span>
        <ul className="edit-rows commute-edit">
          {phase.commute.map((c, j) => (
            <li key={j}>
              <div className="edit-line">
              <input type="text" placeholder="内容" value={c.label} onChange={(e) => setCommute(j, { label: e.target.value })} />
              <input
                type="number"
                inputMode="numeric"
                className="min-input"
                min={1}
                aria-label="分"
                value={c.minutes}
                onChange={(e) => setCommute(j, { minutes: Number(e.target.value) })}
              />
              <span className="small muted">分</span>
              <button className="icon-del" aria-label="この行を削除" onClick={() => onChange({ commute: phase.commute.filter((_, k) => k !== j) })}>
                ✕
              </button>
              </div>
              <select
                className="select"
                aria-label="アプリの演習"
                value={appValue(c)}
                onChange={(e) => {
                  const choice = APP_CHOICES.find((x) => x.value === e.target.value)
                  // 「手動でチェック」は app を外すだけでなく、ラベルからの推定もしない
                  setCommute(j, choice?.app ? { app: choice.app.app, parts: choice.app.parts } : { app: undefined, parts: undefined, manual: true })
                }}
              >
                {APP_CHOICES.map((x) => (
                  <option key={x.value} value={x.value}>
                    演習：{x.label}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
        <button className="link" onClick={() => onChange({ commute: [...phase.commute, { label: '', minutes: 30, app: 'vocab' }] })}>
          ＋ メニューを追加
        </button>
      </div>

      <div className="field">
        <span>やること（チェックリスト）</span>
        <ul className="edit-rows">
          {phase.tasks.map((t, j) => (
            <li key={t.id}>
              <input type="text" placeholder="例：Part 5 を毎日30問" value={t.text} onChange={(e) => setTask(j, { text: e.target.value })} />
              <button className="icon-del" aria-label="この行を削除" onClick={() => onChange({ tasks: phase.tasks.filter((_, k) => k !== j) })}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button className="link" onClick={() => onChange({ tasks: [...phase.tasks, { id: `task-${newId()}`, text: '' }] })}>
          ＋ やることを追加
        </button>
      </div>

      <label className="field">
        <span>注意書き（任意・1行に1つ）</span>
        <textarea
          rows={2}
          value={(phase.notes ?? []).join('\n')}
          onChange={(e) => onChange({ notes: e.target.value.split('\n') })}
        />
      </label>
    </section>
  )
}
