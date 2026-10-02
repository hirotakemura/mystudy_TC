import { useRef, useState } from 'react'
import { todayKey } from '../lib/date'
import { exportJson, importJson, resetData, updateData, useData } from '../lib/store'
import type { ThemeSetting } from '../types'

const THEMES: { id: ThemeSetting; label: string }[] = [
  { id: 'system', label: '端末に合わせる' },
  { id: 'light', label: 'ライト' },
  { id: 'dark', label: 'ダーク' },
]

export default function Settings() {
  const data = useData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const goalHours = data.settings.weeklyGoalMinutes / 60

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `toeic-study-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('バックアップをダウンロードしました')
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const result = importJson(await file.text(), () =>
        confirm('現在のデータをバックアップの内容で置き換えます。よろしいですか？'),
      )
      if (!result) return
      setMsg(
        result.kind === 'backup'
          ? 'バックアップを読み込みました'
          : `旧アプリのTOEICデータを取り込みました（学習記録${result.logs}件・スコア${result.scores}件・チェック${result.checks}件・メモ${result.memos}件）`,
      )
    } catch (e) {
      setMsg(`読み込みに失敗しました：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const setGoal = (hours: number) =>
    updateData((d) => ({ ...d, settings: { ...d.settings, weeklyGoalMinutes: Math.round(hours * 60) } }))

  return (
    <div className="stack">
      <section className="card">
        <h2>表示</h2>
        <div className="segmented">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={data.settings.theme === t.id ? 'on' : ''}
              onClick={() => updateData((d) => ({ ...d, settings: { ...d.settings, theme: t.id } }))}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>週の目標時間</h2>
        <div className="stepper">
          <button className="btn small" aria-label="30分減らす" disabled={goalHours <= 0.5} onClick={() => setGoal(goalHours - 0.5)}>
            −
          </button>
          <b>{goalHours}時間</b>
          <button className="btn small" aria-label="30分増やす" disabled={goalHours >= 60} onClick={() => setGoal(goalHours + 0.5)}>
            ＋
          </button>
          {data.settings.weeklyGoalMinutes !== 600 && (
            <button className="link" onClick={() => setGoal(10)}>
              既定に戻す
            </button>
          )}
        </div>
        <p className="small muted">既定は10時間（通勤2時間 × 平日5日）。ホームと振り返りの達成率に使います。</p>
      </section>

      <section className="card">
        <h2>バックアップ</h2>
        <p className="small muted">
          データはこの端末のブラウザ（localStorage）にのみ保存されています。機種変更やブラウザのデータ削除に備えて、定期的にエクスポートしてください。
        </p>
        <div className="btn-row">
          <button className="btn primary" onClick={download}>
            JSONをエクスポート
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            JSONをインポート
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        {msg && <p className="small notice">{msg}</p>}
        <ul className="plain small muted">
          <li>学習記録：{data.studyLogs.length}件</li>
          <li>スコア：{data.scores.length}件</li>
          <li>振り返りメモ：{Object.keys(data.reviewMemos).length}件（旧アプリのメモ {Object.keys(data.legacyMemos).length}件）</li>
        </ul>
      </section>

      <section className="card">
        <h2>旧アプリからの移行</h2>
        <p className="small muted">
          旧アプリ（OutSystems学習管理）の設定画面の「TOEICデータを書き出す」で保存したJSONも、上の「JSONをインポート」から読み込めます。
          今のデータに追加される形で取り込まれ（同じ記録は重複しません）、学習時間は「内訳なし」、振り返りメモは「旧アプリのメモ」として表示されます。
        </p>
      </section>

      <section className="card">
        <h2>データの初期化</h2>
        <button
          className="btn danger"
          onClick={() => confirm('すべての学習データを削除します。元に戻せません。よろしいですか？') && resetData()}
        >
          すべてのデータを削除
        </button>
        <p className="small muted">計画データ（ロードマップ）は public/data/plan/toeic-roadmap.json で管理しています。</p>
      </section>
    </div>
  )
}
