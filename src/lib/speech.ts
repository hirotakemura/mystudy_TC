import { useEffect, useState } from 'react'
import { getData } from './store'
import { pingActivity } from './studyTimer'

// 英語の読み上げ（端末の音声合成 Web Speech API を使う。音声ファイルは不要）

/** 単語・例文の読み上げの速さ（シャドーイングの設定とは別に固定） */
export const WORD_RATE = 1.0

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function englishVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported) return []
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'))
}

/** 端末にある英語の声の一覧（読み込みが遅い端末があるので変化を購読する） */
export function useEnglishVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState(englishVoices)
  useEffect(() => {
    if (!speechSupported) return
    const update = () => setVoices(englishVoices())
    update()
    speechSynthesis.addEventListener('voiceschanged', update)
    return () => speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])
  return voices
}

function pickVoice(voiceURI?: string): SpeechSynthesisVoice | undefined {
  const voices = englishVoices()
  return (
    voices.find((v) => v.voiceURI === voiceURI) ??
    voices.find((v) => v.lang === 'en-US' && v.localService) ??
    voices.find((v) => v.lang === 'en-US') ??
    voices[0]
  )
}

// ===== 男性・女性の声 =====
// iPhone などは声の高さ（pitch）の指定がほとんど効かないため、会話の男女は「別の声」で読み分ける。
// 声の性別は API で取れないので、各端末（iOS / macOS / Android / Windows）の英語の声の名前から判定する。

export type VoiceRole = 'male' | 'female'

// 先にあるほど自動で選ばれやすい（聞き取りやすい声を先に。Fred などの古い機械的な声は後ろ）
const MALE = [
  'aaron', 'evan', 'nathan', 'tom', 'alex', 'daniel', 'arthur', 'oliver', 'gordon', 'lee', 'rishi', 'reed', 'eddy',
  'rocko', 'guy', 'christopher', 'eric', 'roger', 'brian', 'andrew', 'ryan', 'liam', 'william', 'thomas', 'george',
  'james', 'david', 'mark', 'male', 'fred',
]
const FEMALE = [
  'samantha', 'karen', 'moira', 'tessa', 'victoria', 'fiona', 'nicky', 'allison', 'ava', 'susan', 'zoe', 'serena',
  'kate', 'martha', 'catherine', 'veena', 'joelle', 'sandy', 'shelley', 'flo', 'zira', 'aria', 'jenny', 'sonia',
  'libby', 'natasha', 'clara', 'emma', 'female',
]
/** 効果音のような声（「Bubbles」「Zarvox」など）は会話に使わない */
const NOVELTY = [
  'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester', 'organ', 'superstar',
  'trinoids', 'whisper', 'wobble', 'zarvox', 'junior', 'ralph', 'kathy', 'princess', 'grandpa', 'grandma',
]

const words = (v: SpeechSynthesisVoice) => v.name.toLowerCase().split(/[^a-z]+/)
const isNovelty = (v: SpeechSynthesisVoice) => NOVELTY.some((n) => v.name.toLowerCase().includes(n))

export function voiceGender(v: SpeechSynthesisVoice): VoiceRole | null {
  if (isNovelty(v)) return null
  const w = words(v)
  if (MALE.some((n) => w.includes(n))) return 'male'
  if (FEMALE.some((n) => w.includes(n))) return 'female'
  return null
}

/** 自動で選ぶ男性／女性の声（アメリカ英語・端末内蔵・高品質を優先） */
export function autoRoleVoice(role: VoiceRole, voices = englishVoices()): SpeechSynthesisVoice | undefined {
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang === 'en-US' ? 3 : v.lang === 'en-GB' ? 2 : 1) +
    (v.localService ? 0.5 : 0) +
    (/premium|enhanced|拡張|プレミアム/i.test(v.name) ? 0.3 : 0)
  const list = role === 'male' ? MALE : FEMALE
  const rank = (v: SpeechSynthesisVoice) => {
    const i = list.findIndex((n) => words(v).includes(n))
    return i < 0 ? list.length : i
  }
  return voices.filter((v) => voiceGender(v) === role).sort((a, b) => score(b) - score(a) || rank(a) - rank(b))[0]
}

function roleVoice(role: VoiceRole): SpeechSynthesisVoice | undefined {
  const { maleVoiceURI, femaleVoiceURI } = getData().settings
  const chosen = role === 'male' ? maleVoiceURI : femaleVoiceURI
  return englishVoices().find((v) => v.voiceURI === chosen) ?? autoRoleVoice(role)
}

/** 話者（M/W：会話、Q/A：応答問題の質問と応答）を男女の声に割り当てる */
export function speakerRole(speaker?: 'M' | 'W' | 'Q' | 'A'): VoiceRole | undefined {
  if (!speaker) return undefined
  return speaker === 'M' || speaker === 'Q' ? 'male' : 'female'
}

export interface SpeakOptions {
  rate: number
  voiceURI?: string
  /** 会話の話者の性別（その性別の声で読む。見つからなければ声の高さで区別する） */
  role?: VoiceRole
}

let generation = 0

/** 読み上げが終わったら解決する。stopSpeaking() で中断された場合は false */
export function speak(text: string, opts: SpeakOptions): Promise<boolean> {
  const my = ++generation
  // 音声が使えない端末でも練習の流れが止まらないよう、文の長さから時間を見積もって進める
  const estimateMs = (text.split(/\s+/).length / (2.6 * opts.rate)) * 1000 + 400
  if (!speechSupported) return wait(estimateMs).then(() => my === generation)

  speechSynthesis.cancel()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    const byRole = opts.role ? roleVoice(opts.role) : undefined
    const voice = byRole ?? pickVoice(opts.voiceURI)
    if (voice) u.voice = voice
    u.lang = voice?.lang ?? 'en-US'
    u.rate = opts.rate
    // 男女の声が見つからない端末では、声の高さで区別する（効く端末のみ）
    u.pitch = opts.role && !byRole ? (opts.role === 'male' ? 0.8 : 1.2) : 1
    let done = false
    const started = Date.now()
    const finish = () => {
      if (done) return
      done = true
      clearInterval(ping)
      clearTimeout(guard)
      resolve(my === generation)
    }
    u.onend = finish
    // 再生に失敗しても、読み上げにかかるはずの時間は待ってから次へ進む（練習のテンポを保つ）
    u.onerror = () => {
      clearTimeout(guard)
      setTimeout(finish, Math.max(0, estimateMs - (Date.now() - started)))
    }
    // 再生中は学習中として扱う（自動計測が放置扱いにしないように）
    const ping = setInterval(pingActivity, 5000)
    // onend が来ない端末への保険
    const guard = setTimeout(finish, estimateMs * 2.5 + 3000)
    pingActivity()
    speechSynthesis.speak(u)
  })
}

export function stopSpeaking() {
  generation++
  if (speechSupported) speechSynthesis.cancel()
}

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
