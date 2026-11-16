import { useRef, useState } from 'react'
import { todayKey } from '../lib/date'
import { playCorrect } from '../lib/sound'
import { autoRoleVoice, speak, speechSupported, useEnglishVoices, voiceGender, type VoiceRole } from '../lib/speech'
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
  const voices = useEnglishVoices()

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
        <h2>効果音</h2>
        <label className="toggle-line">
          <input
            type="checkbox"
            checked={data.settings.sound}
            onChange={(e) => {
              updateData((d) => ({ ...d, settings: { ...d.settings, sound: e.target.checked } }))
              if (e.target.checked) setTimeout(playCorrect, 0)
            }}
          />
          正解したときに音を鳴らす（単語・パート別問題）
        </label>
        <p className="small muted">iPhoneは、本体のマナーモード（消音）がオンだと鳴りません。</p>
      </section>

      <section className="card">
        <h2>英語の読み上げ</h2>
        {!speechSupported ? (
          <p className="small error">この端末・ブラウザは読み上げ（音声合成）に対応していません。</p>
        ) : (
          <>
            <label className="field">
              <span>声</span>
              <select
                className="select"
                value={data.settings.voiceURI ?? ''}
                onChange={(e) =>
                  updateData((d) => ({ ...d, settings: { ...d.settings, voiceURI: e.target.value || undefined } }))
                }
              >
                <option value="">自動（アメリカ英語を優先）</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name}（{v.lang}）
                  </option>
                ))}
              </select>
            </label>
            <div className="btn-row">
              <button
                className="btn small"
                onClick={() =>
                  speak('Thank you for calling. How may I help you today?', {
                    rate: data.settings.speechRate,
                    voiceURI: data.settings.voiceURI,
                  })
                }
              >
                🔊 試しに聞く
              </button>
              <span className="small muted">シャドーイングの速さ {data.settings.speechRate.toFixed(1)}（シャドーイング画面で変更。単語は1.0固定）</span>
            </div>
            <h3>会話の声（Part 2〜4・シャドーイング）</h3>
            {(['male', 'female'] as VoiceRole[]).map((role) => (
              <RoleVoice key={role} role={role} voices={voices} />
            ))}
            <p className="small muted">
              端末に入っている音声を使うので、オフラインでも再生できます。iPhoneで男性の声が見つからない場合は「設定 → アクセシビリティ → 読み上げコンテンツ → 声 → 英語」から男性の声（Aaron、Fred、Daniel など）を追加してください。
            </p>
          </>
        )}
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
          <li>学習した単語：{Object.keys(data.wordProgress).length}語・シャドーイング：{Object.keys(data.shadowProgress).length}教材</li>
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
        <p className="small muted">計画データは public/data/plan、単語は public/data/vocab、シャドーイングの英文は public/data/shadowing のJSONで管理しています。</p>
      </section>
    </div>
  )
}

/** 会話の男性・女性の話者に使う声を選ぶ */
function RoleVoice({ role, voices }: { role: VoiceRole; voices: SpeechSynthesisVoice[] }) {
  const data = useData()
  const key = role === 'male' ? 'maleVoiceURI' : 'femaleVoiceURI'
  const auto = autoRoleVoice(role, voices)
  const label = role === 'male' ? '男性' : '女性'
  // その性別と判定できた声を先に並べる
  const sorted = [...voices].sort((a, b) => Number(voiceGender(b) === role) - Number(voiceGender(a) === role))
  return (
    <div className="field">
      <span>{label}の声</span>
      <div className="voice-row">
        <select
          className="select"
          value={data.settings[key] ?? ''}
          onChange={(e) => updateData((d) => ({ ...d, settings: { ...d.settings, [key]: e.target.value || undefined } }))}
        >
          <option value="">自動（{auto ? auto.name : `${label}の声が見つかりません`}）</option>
          {sorted.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name}（{v.lang}）{voiceGender(v) === role ? '' : voiceGender(v) ? ` ※${voiceGender(v) === 'male' ? '男性' : '女性'}` : ''}
            </option>
          ))}
        </select>
        <button
          className="btn small"
          aria-label={`${label}の声を試しに聞く`}
          onClick={() => speak(role === 'male' ? 'Hi, did you book a room for the meeting?' : 'Yes, the large conference room is free.', { rate: 1, role })}
        >
          🔊
        </button>
      </div>
      {!auto && !data.settings[key] && <small className="error">{label}の声が見つからないため、声の高さを変えて読み分けます（iPhoneでは効かない場合があります）。</small>}
    </div>
  )
}
