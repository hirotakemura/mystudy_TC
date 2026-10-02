import { useEffect, useState } from 'react'
import { pingActivity } from './studyTimer'

// 英語の読み上げ（端末の音声合成 Web Speech API を使う。音声ファイルは不要）

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

export interface SpeakOptions {
  rate: number
  voiceURI?: string
  /** 会話の話者ごとに声の高さを変える */
  pitch?: number
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
    const voice = pickVoice(opts.voiceURI)
    if (voice) u.voice = voice
    u.lang = voice?.lang ?? 'en-US'
    u.rate = opts.rate
    u.pitch = opts.pitch ?? 1
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
