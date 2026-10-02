import { speak, WORD_RATE } from '../lib/speech'
import { useData } from '../lib/store'

/** 単語・例文を読み上げるボタン（速さは1.0固定） */
export function SpeakButton({ text, label = '読み上げ' }: { text: string; label?: string }) {
  const { settings } = useData()
  return (
    <button
      className="speak-btn"
      aria-label={`${label}：${text}`}
      onClick={(e) => {
        e.stopPropagation()
        speak(text, { rate: WORD_RATE, voiceURI: settings.voiceURI })
      }}
    >
      🔊
    </button>
  )
}
