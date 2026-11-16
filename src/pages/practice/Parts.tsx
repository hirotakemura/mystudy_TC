import { useEffect, useMemo, useRef, useState } from 'react'
import { formatMinutes, todayKey } from '../../lib/date'
import { PART_INFO, partCategory, partStats, planMock, planParts, planWrong, recordPartAnswer, sessionActivity, wrongCount, type PartMode, type PartSessionPlan } from '../../lib/parts'
import type { ResolvedApp } from '../../lib/commute'
import { speak, stopSpeaking, wait, WORD_RATE } from '../../lib/speech'
import { LEVEL_LABEL, shuffle } from '../../lib/srs'
import { playCorrect } from '../../lib/sound'
import { useStudyTimer } from '../../lib/studyTimer'
import { useData } from '../../lib/store'
import type { PartNo, PartQuestion, PartSet, ShadowLine } from '../../types'

const LETTERS = 'ABCD'

type Session = PartSessionPlan

/** intent：通勤メニューの「始める」から開いたときの演習（そのまま出題を始める） */
export default function Parts({ sets, intent }: { sets: PartSet[]; intent?: ResolvedApp | null }) {
  const data = useData()
  const [session, setSession] = useState<Session | null>(() => {
    if (!intent) return null
    const plan =
      intent.app === 'mock'
        ? planMock(data, sets)
        : intent.app === 'wrong'
          ? planWrong(data, sets)
          : intent.app === 'parts' && intent.parts?.length
            ? planParts(data, sets, intent.parts, 'new')
            : null
    return plan && plan.sets.length ? plan : null
  })
  const [open, setOpen] = useState<PartNo | null>(intent?.parts?.length === 1 ? intent.parts[0] : null)
  if (session) return <PartSession key={session.sets.map((s) => s.id).join()} session={session} onExit={() => setSession(null)} />
  return <PartsHome sets={sets} open={open} setOpen={setOpen} onStart={setSession} />
}

function PartsHome({
  sets,
  open,
  setOpen,
  onStart,
}: {
  sets: PartSet[]
  open: PartNo | null
  setOpen: (p: PartNo | null) => void
  onStart: (s: Session) => void
}) {
  const data = useData()
  const parts = ([1, 2, 3, 4, 5, 6, 7] as const).filter((p) => sets.some((s) => s.part === p))
  const wrong = wrongCount(data, sets)
  const total = partStats(data, sets)

  return (
    <>
      <p className="small muted">
        TOEIC L&amp;R の形式に合わせたオリジナル問題（全{total.total}問）です。リスニングは端末の読み上げ音声で再生します（Part 1 は写真の代わりに場面の説明を表示）。
      </p>
      <section className="card">
        <div className="start-list">
          <button className="start-btn primary" onClick={() => onStart(planMock(data, sets))}>
            <b>ミニ模試</b>
            <span>Part 1〜7 から少しずつ、本番と同じ順に約25問</span>
          </button>
          <button className="start-btn" disabled={wrong === 0} onClick={() => onStart(planWrong(data, sets))}>
            <b>間違えた問題の復習</b>
            <span>{wrong ? `全パートの間違えた問題 ${wrong}問から` : '間違えた問題はありません'}</span>
          </button>
        </div>
      </section>
      {(['L', 'R'] as const).map((sec) => (
        <section key={sec} className="card">
          <h2>{sec === 'L' ? 'リスニング（Part 1〜4）' : 'リーディング（Part 5〜7）'}</h2>
          <ul className="part-list">
            {parts
              .filter((p) => PART_INFO[p].section === sec)
              .map((p) => {
                const ps = sets.filter((s) => s.part === p)
                const st = partStats(data, ps)
                const isOpen = open === p
                const start = (mode: PartMode) => onStart(planParts(data, sets, [p], mode))
                return (
                  <li key={p} className={isOpen ? 'open' : ''}>
                    <button className="part-row" onClick={() => setOpen(isOpen ? null : p)} aria-expanded={isOpen}>
                      <span className="part-no">{p}</span>
                      <span className="part-text">
                        <b>{PART_INFO[p].name}</b>
                        <span className="small muted">
                          {st.answered}/{st.total}問
                          {st.rate !== null && `・正答率 ${st.rate}%`}
                        </span>
                      </span>
                      <span className="bar part-bar" aria-hidden>
                        <span className="bar-fill" style={{ width: `${(st.answered / st.total) * 100}%` }} />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="part-menu">
                        <p className="small muted">{PART_INFO[p].hint}</p>
                        <div className="btn-row">
                          <button className="btn primary small" onClick={() => start('new')}>
                            {st.answered < st.total ? '未回答から解く' : 'もう一度解く'}
                          </button>
                          <button className="btn small" disabled={st.wrong === 0} onClick={() => start('wrong')}>
                            間違えた問題（{st.wrong}）
                          </button>
                          <button className="btn small" onClick={() => start('random')}>
                            ランダム
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
          </ul>
        </section>
      ))}
    </>
  )
}

/** 設問ごとの選択肢の並び（表示順 → 元の位置） */
type Order = number[][]
/** 解答（キーは「セットid#設問番号」）：選んだ表示位置と正誤 */
type Answers = Record<string, { shown: number; ok: boolean }>

function PartSession({ session, onExit }: { session: Session; onExit: () => void }) {
  const today = todayKey()
  const [pos, setPos] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const finished = pos >= session.sets.length
  const set = session.sets[pos]
  const current = set ?? session.sets[session.sets.length - 1]
  const studied = useStudyTimer(!finished, partCategory(current.part), sessionActivity(session.kind, current))
  const order: Order = useMemo(() => (set ? set.questions.map((qq) => shuffle(qq.choices.map((_, i) => i))) : []), [set])

  useEffect(() => () => stopSpeaking(), [pos])

  const answer = (qi: number, shown: number) => {
    const key = `${set.id}#${qi}`
    if (key in answers) return
    const ok = order[qi][shown] === set.questions[qi].answer
    setAnswers({ ...answers, [key]: { shown, ok } })
    if (ok) playCorrect()
    recordPartAnswer(set, qi, ok, today)
  }

  if (finished) {
    const list = Object.values(answers)
    const okCount = list.filter((a) => a.ok).length
    return (
      <section className="card result">
        <h2>{session.title} おつかれさまでした</h2>
        <div className="big">
          {okCount}
          <small> / {list.length}問正解</small>
        </div>
        <p className="sub">演習時間 {formatMinutes(Math.max(1, Math.round(studied.current / 60)))}（学習時間に自動で記録済み）</p>
        <ResultByPart session={session} answers={answers} />
        <button className="btn primary block" onClick={onExit}>
          パート一覧に戻る
        </button>
      </section>
    )
  }

  const allAnswered = set.questions.every((_, i) => `${set.id}#${i}` in answers)

  return (
    <div className="stack">
      <div className="session-head">
        <button
          className="link"
          onClick={() => {
            stopSpeaking()
            onExit()
          }}
        >
          ‹ 終了
        </button>
        <span className="small muted">
          {session.title}・{pos + 1} / {session.sets.length}
        </span>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${(pos / session.sets.length) * 100}%` }} />
      </div>

      <SetView set={set} order={order} answers={answers} onAnswer={answer} allAnswered={allAnswered} />

      {allAnswered && (
        <button
          className="btn primary block big-btn next-sticky"
          onClick={() => {
            stopSpeaking()
            setPos(pos + 1)
            window.scrollTo(0, 0)
          }}
        >
          {pos + 1 < session.sets.length ? '次の問題へ' : '結果を見る'}
        </button>
      )}
    </div>
  )
}

function ResultByPart({ session, answers }: { session: Session; answers: Answers }) {
  const parts = [...new Set(session.sets.map((s) => s.part))]
  if (parts.length < 2) return null
  return (
    <ul className="menu result-parts">
      {parts.map((p) => {
        const keys = session.sets.filter((s) => s.part === p).flatMap((s) => s.questions.map((_, i) => `${s.id}#${i}`))
        const ok = keys.filter((k) => answers[k]?.ok).length
        const rate = keys.length ? Math.round((ok / keys.length) * 100) : 0
        return (
          <li key={p}>
            <span>
              Part {p} {PART_INFO[p].name}
            </span>
            <span className={rate < 60 ? 'down' : 'up'}>
              {ok}/{keys.length}（{rate}%）
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** 会話の話者ごとに声の高さを変える */
const PITCH: Record<NonNullable<ShadowLine['speaker']>, number> = { M: 0.85, W: 1.2, Q: 1.0, A: 1.15 }

/** 読み上げる内容（Part 1/2 は選択肢も音声だけで出題する） */
/** 記号（A. B. …）を読んだあと、選択肢の文を読むまでの間（ミリ秒） */
const PAUSE_AFTER_LETTER = 600
/** 選択肢・Part 2 の質問文を読んだあとの間 */
const PAUSE_AFTER_CHOICE = 1200
/** Part 3/4 の会話・説明文の1文ごとの間 */
const PAUSE_AFTER_LINE = 400

function audioScript(set: PartSet, order: Order): { text: string; pitch: number; pause: number }[] {
  const shortParts = set.part === 1 || set.part === 2
  const lines = (set.talk ?? []).map((l) => ({
    text: l.en,
    pitch: l.speaker ? PITCH[l.speaker] : 1,
    pause: shortParts ? PAUSE_AFTER_CHOICE : PAUSE_AFTER_LINE,
  }))
  if (shortParts) {
    const qq = set.questions[0]
    const pitch = set.part === 2 ? PITCH.A : 1
    // 記号と文を別々に読み、間をあける（本番と同じように「A.」→ 少し間 → 選択肢）
    order[0].forEach((orig, shown) => {
      lines.push({ text: `${LETTERS[shown]}.`, pitch, pause: PAUSE_AFTER_LETTER })
      lines.push({ text: qq.choices[orig], pitch, pause: PAUSE_AFTER_CHOICE })
    })
  }
  return lines
}

function AudioPlayer({ set, order }: { set: PartSet; order: Order }) {
  const { voiceURI } = useData().settings
  const [playing, setPlaying] = useState(false)
  const run = useRef(0)
  useEffect(() => () => {
    run.current++
  }, [])

  const play = async () => {
    const my = ++run.current
    setPlaying(true)
    for (const l of audioScript(set, order)) {
      // 本番と同じ速さ（1.0）で読み上げる
      const ok = await speak(l.text, { rate: WORD_RATE, voiceURI, pitch: l.pitch })
      if (!ok || my !== run.current) return
      await wait(l.pause)
      if (my !== run.current) return
    }
    setPlaying(false)
  }
  const stop = () => {
    run.current++
    stopSpeaking()
    setPlaying(false)
  }

  return playing ? (
    <button className="btn block big-btn" onClick={stop}>
      ■ 停止
    </button>
  ) : (
    <button className="btn primary block big-btn" onClick={play}>
      ▶ 音声を再生
    </button>
  )
}

function SetView({
  set,
  order,
  answers,
  onAnswer,
  allAnswered,
}: {
  set: PartSet
  order: Order
  answers: Answers
  onAnswer: (qi: number, shown: number) => void
  allAnswered: boolean
}) {
  const [showJa, setShowJa] = useState(false)
  const listening = set.part <= 4
  const audioOnlyChoices = set.part === 1 || set.part === 2

  return (
    <>
      <section className="card">
        <div className="small muted">
          Part {set.part} {PART_INFO[set.part].name}・{LEVEL_LABEL[set.level]}レベル
          {set.title && `・${set.title}`}
        </div>

        {set.scene && (
          <div className="scene">
            <span className="scene-icon" aria-hidden>
              📷
            </span>
            <span>{set.scene}</span>
          </div>
        )}

        {listening && (
          <div className="audio-box">
            <AudioPlayer key={set.id} set={set} order={order} />
            {!allAnswered && (
              <p className="small muted">{audioOnlyChoices ? '選択肢も音声だけで流れます。聞き終わったら答えを選んでください。' : '設問を先に読んでから音声を再生しましょう。'}</p>
            )}
          </div>
        )}

        {set.passages?.map((p, i) => (
          <div key={i} className="passage">
            {p.title && <div className="passage-title">{p.title}</div>}
            <p className="pre">{p.text}</p>
            {allAnswered && showJa && p.ja && <p className="pre small muted ja-box">{p.ja}</p>}
          </div>
        ))}

        {/* 聞き取り後のスクリプト（Part 2〜4） */}
        {allAnswered && set.talk && (
          <details className="script" open={set.part === 2}>
            <summary>スクリプト</summary>
            <ul className="plain">
              {set.talk.map((l, i) => (
                <li key={i}>
                  {l.speaker && <span className={`speaker sp-${l.speaker}`}>{l.speaker}</span>} {l.en}
                  <div className="small muted">{l.ja}</div>
                </li>
              ))}
            </ul>
          </details>
        )}
        {allAnswered && set.passages?.some((p) => p.ja) && (
          <label className="toggle-line small">
            <input type="checkbox" checked={showJa} onChange={(e) => setShowJa(e.target.checked)} />
            本文の和訳を表示
          </label>
        )}
      </section>

      {set.questions.map((qq, qi) => (
        <QuestionCard
          key={qi}
          set={set}
          qq={qq}
          qi={qi}
          order={order[qi]}
          picked={answers[`${set.id}#${qi}`]}
          hideText={audioOnlyChoices}
          onAnswer={(shown) => onAnswer(qi, shown)}
        />
      ))}
    </>
  )
}

/** 解説の (A)〜(D) はデータ上の並びなので、シャッフル後の表示の記号に置き換える */
function relabel(text: string, order: number[]): string {
  return text.replace(/\(([A-D])\)/g, (m, l: string) => {
    const shown = order.indexOf(LETTERS.indexOf(l))
    return shown >= 0 ? `(${LETTERS[shown]})` : m
  })
}

function QuestionCard({
  set,
  qq,
  qi,
  order,
  picked,
  hideText,
  onAnswer,
}: {
  set: PartSet
  qq: PartQuestion
  qi: number
  order: number[]
  picked?: { shown: number; ok: boolean }
  hideText: boolean
  onAnswer: (shown: number) => void
}) {
  const answered = !!picked
  const label = set.questions.length > 1 ? (set.part === 6 ? `空所 [${qi + 1}]` : `Q${qi + 1}.`) : null
  return (
    <section className={`card question${answered ? (picked.ok ? ' ok' : ' ng') : ''}`}>
      {(label || qq.q) && (
        <p className="q-text">
          {label && <b className="q-label">{label}</b>} {qq.q}
        </p>
      )}
      <ul className={`options${hideText && !answered ? ' letters' : ''}`}>
        {order.map((orig, shown) => {
          const correct = orig === qq.answer
          const cls = answered ? (correct ? ' correct' : picked.shown === shown ? ' wrong' : ' dim') : ''
          return (
            <li key={shown}>
              <button className={`option${cls}`} disabled={answered} onClick={() => onAnswer(shown)}>
                <b className="opt-letter">({LETTERS[shown]})</b>
                {(!hideText || answered) && <span className="opt-text"> {qq.choices[orig]}</span>}
                {answered && qq.choicesJa && <span className="opt-ja small muted">{qq.choicesJa[orig]}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {answered && (
        <div className="explain">
          <div className={`verdict ${picked.ok ? 'ok' : 'ng'}`}>
            {picked.ok ? '⭕ 正解' : `❌ 不正解（正解は (${LETTERS[order.indexOf(qq.answer)]})）`}
            {qq.tag && <span className="pill">{qq.tag}</span>}
          </div>
          <p className="small">{relabel(qq.explanation, order)}</p>
          {qq.ja && <p className="small muted">訳：{qq.ja}</p>}
        </div>
      )}
    </section>
  )
}
