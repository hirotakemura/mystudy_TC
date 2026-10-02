import { speak } from '../lib/speech'
import { useData } from '../lib/store'

/** 英文を読み上げるボタン */
export function SpeakButton({ text, label = '読み上げ' }: { text: string; label?: string }) {
  const { settings } = useData()
  return (
    <button
      className="speak-btn"
      aria-label={`${label}：${text}`}
      onClick={(e) => {
        e.stopPropagation()
        speak(text, { rate: settings.speechRate, voiceURI: settings.voiceURI })
      }}
    >
      🔊
    </button>
  )
}
