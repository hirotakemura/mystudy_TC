import { getData } from './store'

// 効果音（音声ファイルは使わず、Web Audio API でその場で音を作るのでオフラインでも鳴る）
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    // iPhone などでは、タップした時に resume しないと鳴らない
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(c: AudioContext, freq: number, start: number, length: number, volume: number) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, start + length)
  osc.connect(gain).connect(c.destination)
  osc.start(start)
  osc.stop(start + length + 0.02)
}

/** 正解の音（「ピンポン」と上がる2音）。設定で効果音をオフにしていれば鳴らさない */
export function playCorrect() {
  if (!getData().settings.sound) return
  const c = audio()
  if (!c) return
  const t = c.currentTime + 0.01
  tone(c, 880, t, 0.18, 0.25) // ラ
  tone(c, 1318.5, t + 0.12, 0.35, 0.25) // ミ
}
