import { useEffect, useMemo, useState } from 'react'
import { SpeakButton } from '../../components/SpeakButton'
import { StarButton } from '../../components/StarButton'
import { formatMinutes, todayKey } from '../../lib/date'
import { speak, stopSpeaking, WORD_RATE } from '../../lib/speech'
import {
  LEVEL_LABEL,
  MASTERED_BOX,
  choicesFor,
  dueWords,
  favoriteWords,
  filterLevel,
  newWords,
  recordAnswer,
  setFavorite,
  shuffle,
  wordStatus,
} from '../../lib/srs'
import { playCorrect } from '../../lib/sound'
import { useStudyTimer } from '../../lib/studyTimer'
import { updateData, useData } from '../../lib/store'
import type { Level, Word } from '../../types'

// 単語はすべて4択（英単語を見て意味を選ぶ）。間違えた単語はセッションの最後にもう一度出す
interface Session {
  words: Word[]
  title: string
  /** ★の単語だけの復習 */
  favorites?: boolean
}

const NEW_PER_SESSION = 10
const REVIEW_MAX = 30
const QUIZ_SIZE = 10

export default function Vocab({ words }: { words: Word[] }) {
  const [session, setSession] = useState<Session | null>(null)
  if (session) return <VocabSession key={session.title + session.words[0]?.id} session={session} all={words} onExit={() => setSession(null)} />
  return <VocabHome words={words} onStart={setSession} />
}

function VocabHome({ words, onStart }: { words: Word[]; onStart: (s: Session) => void }) {
  const data = useData()
  const today = todayKey()
  const [level, setLevel] = useState<Level | 0>(0)
  const [query, setQuery] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const pool = filterLevel(words, level)
  const favs = favoriteWords(data, pool)
  const due = dueWords(data, pool, today)
  const fresh = newWords(data, pool)
  const mastered = pool.filter((w) => wordStatus(data.wordProgress[w.id]) === 'mastered').length
  const learning = pool.length - mastered - fresh.length
  const studied = pool.filter((w) => data.wordProgress[w.id])

  const q = query.trim().toLowerCase()
  const base = favOnly ? favs : pool
  const listed = q ? base.filter((w) => w.word.toLowerCase().includes(q) || w.meaning.includes(q)) : base

  return (
    <>
      <section className="card">
        <div className="chips" role="radiogroup" aria-label="レベル">
          {([0, 1, 2, 3] as const).map((l) => (
            <button key={l} role="radio" aria-checked={level === l} className={`chip plain-chip${level === l ? ' on' : ''}`} onClick={() => setLevel(l)}>
              {l === 0 ? 'すべて' : LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
        <div className="grid-3 word-stats">
          <div>
            <div className="label">覚えた</div>
            <div className="mid ok-text">{mastered}</div>
          </div>
          <div>
            <div className="label">学習中</div>
            <div className="mid">{learning}</div>
          </div>
          <div>
            <div className="label">未学習</div>
            <div className="mid muted">{fresh.length}</div>
          </div>
        </div>
        <div className="progress stacked" aria-label={`${pool.length}語中 覚えた${mastered}語、学習中${learning}語`}>
          <div className="progress-fill done" style={{ width: `${(mastered / pool.length) * 100}%` }} />
          <div className="progress-fill" style={{ width: `${(learning / pool.length) * 100}%` }} />
        </div>
        <p className="small muted">
          全{pool.length}語。正解するたびに次に出す間隔が延び（翌日→3日後→1週間後…）、{MASTERED_BOX}回続けて正解すると「覚えた」になります。
        </p>
      </section>

      <section className="card">
        <h2>今日の単語</h2>
        <div className="start-list">
          <button
            className="start-btn primary"
            disabled={due.length === 0}
            onClick={() => onStart({ words: shuffle(due.slice(0, REVIEW_MAX)), title: '復習' })}
          >
            <b>復習する</b>
            <span>{due.length ? `今日復習する単語 ${due.length}語` : '今日の復習はありません 🎉'}</span>
          </button>
          <button
            className="start-btn fav"
            disabled={favs.length === 0}
            onClick={() => onStart({ words: shuffle(favs).slice(0, REVIEW_MAX), title: '★ 苦手な単語', favorites: true })}
          >
            <b>苦手な単語だけ復習</b>
            <span>
              {favs.length
                ? `★を付けた単語 ${favs.length}語${favs.length > REVIEW_MAX ? `（1回 ${REVIEW_MAX}語まで）` : ''}`
                : 'まだありません。わからない単語に★を付けるとここにたまります'}
            </span>
          </button>
          <button
            className="start-btn"
            disabled={fresh.length === 0}
            onClick={() => onStart({ words: fresh.slice(0, NEW_PER_SESSION), title: '新しい単語' })}
          >
            <b>新しい単語を覚える</b>
            <span>{fresh.length ? `${Math.min(NEW_PER_SESSION, fresh.length)}語（4択で意味を選び、例文で確認）` : 'すべて学習済みです'}</span>
          </button>
          <button
            className="start-btn"
            onClick={() =>
              onStart({
                words: shuffle(studied.length >= 4 ? studied : pool).slice(0, QUIZ_SIZE),
                title: '4択テスト',
              })
            }
          >
            <b>ランダムテスト</b>
            <span>{studied.length >= 4 ? `学習した単語から${QUIZ_SIZE}問` : `${QUIZ_SIZE}問（まだ学習した単語が少ないので全体から）`}</span>
          </button>
        </div>
        <label className="toggle-line small">
          <input
            type="checkbox"
            checked={data.settings.autoSpeak}
            onChange={(e) => updateData((d) => ({ ...d, settings: { ...d.settings, autoSpeak: e.target.checked } }))}
          />
          問題を表示したら単語を自動で読み上げる
        </label>
        <label className="toggle-line small">
          <input
            type="checkbox"
            checked={data.settings.autoFavorite}
            onChange={(e) => updateData((d) => ({ ...d, settings: { ...d.settings, autoFavorite: e.target.checked } }))}
          />
          間違えた単語に自動で★を付ける
        </label>
      </section>

      <section className="card">
        <details>
          <summary>
            <b>単語一覧</b>（{pool.length}語）
          </summary>
          <input type="text" className="search" placeholder="英語・日本語で検索" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="chips">
            <button className={`chip plain-chip${!favOnly ? ' on' : ''}`} onClick={() => setFavOnly(false)}>
              すべて
            </button>
            <button className={`chip plain-chip${favOnly ? ' on' : ''}`} onClick={() => setFavOnly(true)}>
              ★のみ（{favs.length}）
            </button>
          </div>
          <ul className="word-list">
            {listed.map((w) => {
              const st = wordStatus(data.wordProgress[w.id])
              return (
                <li key={w.id}>
                  <div className="word-line">
                    <span>
                      <b>{w.word}</b> <span className="small muted">{w.pos}</span>
                    </span>
                    <span className={`pill st-${st}`}>{st === 'new' ? '未学習' : st === 'mastered' ? '覚えた' : '学習中'}</span>
                  </div>
                  <div className="word-line">
                    <span className="small">{w.meaning}</span>
                    <span className="word-actions">
                      <SpeakButton text={w.word} />
                      <StarButton wordId={w.id} word={w.word} />
                    </span>
                  </div>
                </li>
              )
            })}
            {listed.length === 0 && <li className="small muted">{favOnly && !q ? '★を付けた単語はまだありません' : '見つかりませんでした'}</li>}
          </ul>
        </details>
      </section>
    </>
  )
}

function VocabSession({ session, all, onExit }: { session: Session; all: Word[]; onExit: () => void }) {
  const data = useData()
  const today = todayKey()
  const [queue, setQueue] = useState(session.words)
  const [pos, setPos] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, boolean>>({})
  const finished = pos >= queue.length
  const studied = useStudyTimer(!finished, 'vocab', 'vocab')
  const word = queue[pos]
  // pos ごとに選択肢を作り直す（同じ単語が再出題されたときも並びを変える）
  const choices = useMemo(() => (word ? choicesFor(word, all) : []), [word, pos, all])
  const { voiceURI, autoSpeak } = data.settings

  useEffect(() => {
    if (word && autoSpeak) speak(word.word, { rate: WORD_RATE, voiceURI })
    return () => stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos])

  const next = () => {
    setPos(pos + 1)
    setPicked(null)
  }

  const answer = (meaning: string) => {
    if (picked) return
    const ok = meaning === word.meaning
    setPicked(meaning)
    if (ok) playCorrect()
    // 覚え具合は1回目の答えだけで記録する。間違えた単語は最後にもう一度出す
    if (!(word.id in results)) {
      recordAnswer(word.id, ok, today)
      setResults({ ...results, [word.id]: ok })
    }
    if (!ok && queue.indexOf(word, pos + 1) === -1) setQueue([...queue, word])
    // わからなかった単語は★にためる（設定でオフにできる）
    if (!ok && data.settings.autoFavorite) setFavorite(word.id, true, today)
  }

  if (finished) {
    const okCount = Object.values(results).filter(Boolean).length
    const wrong = session.words.filter((w) => results[w.id] === false)
    return (
      <section className="card result">
        <h2>{session.title} おつかれさまでした</h2>
        <div className="big">
          {okCount}
          <small> / {session.words.length}</small>
        </div>
        <p className="sub">
          1回目で正解・演習時間 {formatMinutes(Math.max(1, Math.round(studied.current / 60)))}
        </p>
        {wrong.length > 0 && (
          <>
            <h3>次回もう一度出る単語</h3>
            <ul className="word-list">
              {wrong.map((w) => (
                <li key={w.id} className="word-line">
                  <span>
                    <b>{w.word}</b> {w.meaning}
                  </span>
                  <span className="word-actions">
                    <SpeakButton text={w.word} />
                    <StarButton wordId={w.id} word={w.word} />
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <button className="btn primary block" onClick={onExit}>
          単語のトップに戻る
        </button>
      </section>
    )
  }

  return (
    <div className="stack">
      <div className="session-head">
        <button className="link" onClick={onExit}>
          ‹ 終了
        </button>
        <span className="small muted">
          {session.title}・{Math.min(pos + 1, queue.length)} / {queue.length}
        </span>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${(pos / queue.length) * 100}%` }} />
      </div>

      <section className="card flash">
        <div className="flash-word">
          <b>{word.word}</b>
          <SpeakButton text={word.word} />
          <StarButton wordId={word.id} word={word.word} />
        </div>
        <div className="small muted">
          {word.pos}・{LEVEL_LABEL[word.level]}レベル
        </div>

        <ul className="options">
            {choices.map((c) => (
              <li key={c}>
                <button
                  className={`option${picked ? (c === word.meaning ? ' correct' : c === picked ? ' wrong' : ' dim') : ''}`}
                  disabled={!!picked}
                  onClick={() => answer(c)}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>

        {picked && (
          <div className="answer">
            {/* 案内は「次へ」ボタンに隠れないよう、答えの欄の上に出す */}
            {picked !== word.meaning ? (
              <p className="small muted center answer-note">
                この単語は最後にもう一度出ます。{data.settings.autoFavorite && '★に追加しました。'}
              </p>
            ) : (
              session.favorites &&
              word.id in data.favoriteWords && <p className="small muted center answer-note">覚えたら単語の横の ★ をタップして外しましょう。</p>
            )}
            <div className="meaning">{word.meaning}</div>
            {/* 読み上げボタンは例文の長さに関係なく左に固定 */}
            <div className="example">
              <SpeakButton text={word.example} label="例文を読み上げ" />
              <div className="example-text">
                <p>{word.example}</p>
                <p className="small muted">{word.exampleJa}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {picked && (
        <button className="btn primary block big-btn next-sticky" onClick={next}>
          {pos + 1 < queue.length ? '次へ' : '結果を見る'}
        </button>
      )}
    </div>
  )
}
