import { CATEGORIES, categoryLabel } from '../lib/stats'
import type { Category } from '../types'

/** 1日分の学習時間を内訳ごとに色分けした横棒 */
export function DayBar({ parts, max }: { parts: Partial<Record<Category, number>>; max: number }) {
  const total = Object.values(parts).reduce((s, m) => s + (m ?? 0), 0)
  return (
    <div className="bars" role="img" aria-label={total ? describe(parts) : '記録なし'}>
      {CATEGORIES.map((c) => {
        const m = parts[c.id]
        return m ? <div key={c.id} className={`seg cat-${c.id}`} style={{ width: `${(m / max) * 100}%` }} /> : null
      })}
    </div>
  )
}

function describe(parts: Partial<Record<Category, number>>): string {
  return (Object.entries(parts) as [Category, number][]).map(([c, m]) => `${categoryLabel(c)}${m}分`).join('、')
}

export function CategoryLegend({ used }: { used?: Set<Category> }) {
  return (
    <div className="legend">
      {CATEGORIES.filter((c) => !used || used.has(c.id)).map((c) => (
        <span key={c.id}>
          <i className={`cat-${c.id}`} aria-hidden />
          {c.label}
        </span>
      ))}
    </div>
  )
}
