import { useState } from 'react'
import { formatJa } from '../lib/date'

export interface ChartPoint {
  key: string
  label: string // x軸の表示
  title: string // ツールチップの見出し
  total: number
  listening: number
  reading: number
  baseline?: boolean
}

const W = 340
const H = 220
const PAD = { top: 14, right: 40, bottom: 26, left: 34 }
const SERIES = [
  { id: 'total', name: '合計', cls: 's-total' },
  { id: 'listening', name: 'L', cls: 's-l' },
  { id: 'reading', name: 'R', cls: 's-r' },
] as const

/** 合計・L・Rの推移（目標の破線、最新値のラベル、タップでツールチップ） */
export function ScoreChart({ points, target }: { points: ChartPoint[]; target: number }) {
  const [sel, setSel] = useState<number | null>(null)
  const values = points.flatMap((p) => [p.total, p.listening, p.reading])
  const lo = Math.max(0, Math.floor((Math.min(...values) - 30) / 100) * 100)
  const hi = Math.min(990, Math.ceil((Math.max(target, ...values) + 30) / 100) * 100)
  const iw = W - PAD.left - PAD.right
  const ih = H - PAD.top - PAD.bottom
  const step = points.length > 1 ? iw / (points.length - 1) : 0
  const x = (i: number) => PAD.left + (points.length > 1 ? i * step : iw / 2)
  const y = (v: number) => PAD.top + ih - ((v - lo) / (hi - lo)) * ih
  const ticks: number[] = []
  for (let t = lo; t <= hi; t += 100) ticks.push(t)
  const last = points.length - 1
  const labelEvery = Math.ceil(points.length / 6)

  // 最新値のラベルが重ならないよう縦位置をずらす
  const lastLabels = SERIES.map((s) => ({ ...s, v: points[last][s.id], y: y(points[last][s.id]) })).sort((a, b) => a.y - b.y)
  for (let i = 1; i < lastLabels.length; i++) {
    if (lastLabels[i].y - lastLabels[i - 1].y < 12) lastLabels[i].y = lastLabels[i - 1].y + 12
  }

  const tip = sel !== null ? points[sel] : null
  const tipLeft = sel !== null ? (x(sel) / W) * 100 : 0

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="スコアの推移（グラフの下に同じ内容の表があります）">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="axis" x={PAD.left - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {target >= lo && target <= hi && (
          <g>
            <line className="target" x1={PAD.left} x2={W - PAD.right} y1={y(target)} y2={y(target)} />
            <text className="target-label" x={PAD.left + 4} y={y(target) - 4}>
              目標 {target}
            </text>
          </g>
        )}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === last ? (
            <text key={p.key} className="axis" x={x(i)} y={H - 8} textAnchor="middle">
              {p.label}
            </text>
          ) : null,
        )}
        {sel !== null && <line className="cursor" x1={x(sel)} x2={x(sel)} y1={PAD.top} y2={PAD.top + ih} />}
        {SERIES.map((s) => (
          <g key={s.id} className={s.cls}>
            {points.length > 1 && (
              <polyline className="line" points={points.map((p, i) => `${x(i)},${y(p[s.id])}`).join(' ')} />
            )}
            {points.map((p, i) => (
              <circle
                key={p.key}
                className={`pt${p.baseline ? ' hollow' : ''}`}
                cx={x(i)}
                cy={y(p[s.id])}
                r={sel === i ? 4.5 : s.id === 'total' ? 3.5 : 3}
              />
            ))}
          </g>
        ))}
        {lastLabels.map((l) => (
          <text key={l.id} className={`end-label ${l.cls}`} x={x(last) + 7} y={l.y + 4}>
            {l.v}
          </text>
        ))}
        {points.map((p, i) => (
          <rect
            key={p.key}
            className="hit"
            x={x(i) - Math.max(step, 24) / 2}
            y={0}
            width={Math.max(step, 24)}
            height={H}
            onClick={() => setSel(sel === i ? null : i)}
          />
        ))}
      </svg>
      {tip && (
        <div className={`tooltip${tipLeft > 60 ? ' left' : ''}`} style={{ left: `${tipLeft}%` }} onClick={() => setSel(null)}>
          <b>{tip.title}</b>
          <span>
            <i className="s-total" />
            合計 {tip.total}
          </span>
          <span>
            <i className="s-l" />L {tip.listening}
          </span>
          <span>
            <i className="s-r" />R {tip.reading}
          </span>
        </div>
      )}
      <div className="legend">
        <span>
          <i className="s-total" />
          合計
        </span>
        <span>
          <i className="s-l" />
          リスニング
        </span>
        <span>
          <i className="s-r" />
          リーディング
        </span>
        <span>
          <i className="dash" />
          目標
        </span>
      </div>
    </div>
  )
}

export function pointFromDate(date: string): string {
  return formatJa(date).replace(/（.）/, '')
}
