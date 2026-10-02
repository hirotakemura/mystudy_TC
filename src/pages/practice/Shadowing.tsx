import { useEffect, useRef, useState } from 'react'
import { formatJa, formatMinutes, todayKey } from '../../lib/date'
import { speak, stopSpeaking, wait } from '../../lib/speech'
import { LEVEL_LABEL } from '../../lib/srs'
import { useStudyTimer } from '../../lib/studyTimer'
import { updateData, useData } from '../../lib/store'
import type { ShadowItem, ShadowLine } from '../../types'

const PART_LABEL: Record<ShadowItem['part'], string> = {
  1: 'Part 1 写真描写',
  2: 'Part 2 応答',
  3: 'Part 3 会話',
  4: 'Part 4 説明文',
}
const RATES = [0.7, 0.8, 0.9, 1.0, 1.1]

export default function Shadowing({ items }: { items: ShadowItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const item = items.find((i) => i.id === openId)
  if (item) return <Player key={item.id} item={item} onExit={() => setOpenId(null)} />
  return <ShadowList items={items} onOpen={setOpenId} />
}

function ShadowList({ items, onOpen }: { items: ShadowItem[]; onOpen: (id: string) => void }) {
  const data = useData()
  const [part, setPart] = useState<0 | ShadowItem['part']>(0)
  const shown = part ? items.filter((i) => i.part === part) : items
  const practiced = items.filter((i) => data.shadowProgress[i.id]).length

  return (
    <>
      <section className="card">
        <h2>シャドーイングのやり方</h2>
        <ol className="howto small">
          <li>まず英文を見ずに聞く（「英文」をオフ）</li>
          <li>「1文ずつ」で、聞いた直後に同じように声に出す（リピート）</li>
          <li>慣れたら「通し再生」で、音声を追いかけるように重ねて言う（シャドーイング）</li>
        </ol>
        <p className="small muted">
          練習した教材：{practiced} / {items.length}。通勤中は小声やつぶやき（マンブリング）でもOKです。
        </p>
      </section>
      <div className="chips" role="radiogroup" aria-label="Part">
        {([0, 1, 2, 3, 4] as const).map((p) => (
          <button key={p} role="radio" aria-checked={part === p} className={`chip plain-chip${part === p ? ' on' : ''}`} onClick={() => setPart(p)}>
            {p === 0 ? 'すべて' : `Part ${p}`}
          </button>
        ))}
      </div>
      <ul className="shadow-list">
        {shown.map((i) => {
          const p = data.shadowProgress[i.id]
          return (
            <li key={i.id}>
              <button className="shadow-item" onClick={() => onOpen(i.id)}>
                <span className="shadow-text">
                  <span className="small muted">
                    {PART_LABEL[i.part]}・{LEVEL_LABEL[i.level]}
                  </span>
                  <b>{i.title}</b>
                  <span className="small">
                    {i.scene}・{i.lines.length}文
                  </span>
                </span>
                <span className={`pill${p ? ' ok' : ''}`}>{p ? `${p.count}回` : '未練習'}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** 会話の話者ごとに声の高さを変えて聞き分けやすくする */
const PITCH: Record<NonNullable<ShadowLine['speaker']>, number> = { M: 0.85, W: 1.2, Q: 1.0, A: 1.15 }

function Player({ item, onExit }: { item: ShadowItem; onExit: () => void }) {
  const data = useData()
  const { speechRate, voiceURI } = data.settings
  const [current, setCurrent] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [showEn, setShowEn] = useState(true)
  const [showJa, setShowJa] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [msg, setMsg] = useState('')
  const studied = useStudyTimer(true, 'listening')
  const runId = useRef(0)
  const progress = data.shadowProgress[item.id]

  useEffect(() => () => stopSpeaking(), [])

  const say = (i: number) => {
    const line = item.lines[i]
    return speak(line.en, { rate: speechRate, voiceURI, pitch: line.speaker ? PITCH[line.speaker] : 1 })
  }

  const stop = () => {
    runId.current++
    stopSpeaking()
    setPlaying(false)
    setCurrent(null)
  }

  /** 全文を再生する。repeat のときは1文ごとに、自分で言うための間をあける */
  const playAll = async (repeat: boolean) => {
    stop()
    const my = ++runId.current
    setPlaying(true)
    setMsg('')
    for (let i = 0; i < item.lines.length; i++) {
      setCurrent(i)
      const start = Date.now()
      const ok = await say(i)
      if (!ok || my !== runId.current) return
      const spoken = Date.now() - start
      await wait(repeat ? spoken + 800 : 350)
      if (my !== runId.current) return
    }
    setPlaying(false)
    setCurrent(null)
    countPractice()
  }

  const playOne = async (i: number) => {
    stop()
    const my = ++runId.current
    setCurrent(i)
    setPlaying(true)
    await say(i)
    if (my !== runId.current) return
    setPlaying(false)
    setCurrent(null)
  }

  const countPractice = () => {
    const today = todayKey()
    updateData((d) => ({
      ...d,
      shadowProgress: { ...d.shadowProgress, [item.id]: { count: (d.shadowProgress[item.id]?.count ?? 0) + 1, last: today } },
    }))
    setMsg('最後まで練習しました（+1回）')
  }

  return (
    <div className="stack">
      <div className="session-head">
        <button
          className="link"
          onClick={() => {
            stop()
            onExit()
          }}
        >
          ‹ 一覧に戻る
        </button>
        <span className="small muted">
          {progress ? `練習${progress.count}回・最終 ${formatJa(progress.last)}` : '未練習'}
        </span>
      </div>

      <section className="card">
        <div className="small muted">
          {PART_LABEL[item.part]}・{LEVEL_LABEL[item.level]}レベル
        </div>
        <h2>
          {item.title}：{item.scene}
        </h2>

        <div className="player-controls">
          {playing ? (
            <button className="btn primary block big-btn" onClick={stop}>
              ■ 停止
            </button>
          ) : (
            <div className="grid-2">
              <button className="btn primary big-btn" onClick={() => playAll(false)}>
                ▶ 通し再生
              </button>
              <button className="btn big-btn" onClick={() => playAll(true)}>
                ▶ 1文ずつ
              </button>
            </div>
          )}
        </div>

        <div className="ctrl-row">
          <span className="label">速さ</span>
          <div className="segmented rate">
            {RATES.map((r) => (
              <button
                key={r}
                className={Math.abs(speechRate - r) < 0.01 ? 'on' : ''}
                onClick={() => updateData((d) => ({ ...d, settings: { ...d.settings, speechRate: r } }))}
              >
                {r.toFixed(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="ctrl-row toggles">
          <label className="toggle-line small">
            <input
              type="checkbox"
              checked={showEn}
              onChange={(e) => {
                setShowEn(e.target.checked)
                setRevealed(new Set())
              }}
            />
            英文を表示
          </label>
          <label className="toggle-line small">
            <input type="checkbox" checked={showJa} onChange={(e) => setShowJa(e.target.checked)} />
            和訳を表示
          </label>
        </div>
        {msg && <p className="small notice">{msg}</p>}
      </section>

      <ol className="lines">
        {item.lines.map((l, i) => {
          const visible = showEn || revealed.has(i)
          return (
            <li key={i} className={current === i ? 'now' : ''}>
              <button className="line-btn" onClick={() => playOne(i)} aria-label={`${i + 1}文目を再生`}>
                ▶
              </button>
              <div className="line-text">
                {l.speaker && <span className={`speaker sp-${l.speaker}`}>{l.speaker}</span>}
                {visible ? (
                  <span className="en">{l.en}</span>
                ) : (
                  <button className="link hidden-en" onClick={() => setRevealed(new Set(revealed).add(i))}>
                    英文を見る
                  </button>
                )}
                {showJa && <span className="ja small muted">{l.ja}</span>}
              </div>
            </li>
          )
        })}
      </ol>
      <p className="small muted center">
        この教材での演習時間：{formatMinutes(Math.round(studied.current / 60))}（画面を開いている間、自動で記録）
      </p>
    </div>
  )
}
