import { todayKey } from '../lib/date'
import { isFavorite, setFavorite } from '../lib/srs'
import { useData } from '../lib/store'

/** 単語に★（苦手な単語）を付け外しするボタン */
export function StarButton({ wordId, word }: { wordId: string; word: string }) {
  const data = useData()
  const on = isFavorite(data, wordId)
  return (
    <button
      className={`star-btn${on ? ' on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `${word} の★を外す` : `${word} に★を付ける`}
      onClick={(e) => {
        e.stopPropagation()
        setFavorite(wordId, !on, todayKey())
      }}
    >
      {on ? '★' : '☆'}
    </button>
  )
}
