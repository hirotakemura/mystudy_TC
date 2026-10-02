// アプリアイコンPNGを生成する（Playwright の Chromium を使用）
// 使い方: npm run icons
// - docs/icon-source.png（画像生成AIで作った正方形の画像）があれば、それを切り抜いて使う
// - 無ければ下の SVG から生成する
import { createRequire } from 'node:module'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
// ローカルに無ければグローバルの playwright を使う
const { chromium } = (() => {
  try {
    return require('playwright')
  } catch {
    return require(process.env.PW_PATH ?? '/opt/node22/lib/node_modules/playwright')
  }
})()

// 濃紺の地に、開いた本と上向きの矢印（スコアアップ）
const glyph = `
  <path d="M96 152c40-22 88-22 160 8 72-30 120-30 160-8v220c-40-22-88-22-160 8-72-30-120-30-160-8z"
        fill="none" stroke="#ffffff" stroke-width="26" stroke-linejoin="round"/>
  <path d="M256 160v220" stroke="#ffffff" stroke-width="22"/>
  <path d="M300 300l50-56 34 30 52-66" fill="none" stroke="#5b8cff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M400 206h38v38" fill="none" stroke="#5b8cff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>`

const svg = (scale, rounded) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="#14233f"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -266)">${glyph}</g>
</svg>`

// 元画像から切り抜く範囲 [x, y, 辺]（元画像の幅に対する割合）。モチーフの大きさに合わせて調整する
const CROP = [0, 0, 1] // 通常のアイコン：全体
const TIGHT = [0.08, 0.1, 0.86] // ファビコン：モチーフを大きく見せる
const MASKABLE_SCALE = 0.84 // マスカブル：端末側で丸く切り抜かれるので縮小し、余白は元画像の四隅の色でなじませる

const source = new URL('../docs/icon-source.png', import.meta.url)

const SVG_JOBS = [
  ['icon-512.png', 512, svg(1, true)],
  ['icon-192.png', 192, svg(1, true)],
  ['apple-touch-icon.png', 180, svg(1, false)], // iOS が角を丸めるため四角のまま
  ['favicon-64.png', 64, svg(1.12, true)],
  ['icon-maskable-512.png', 512, svg(0.78, false)], // 端末側で丸く切り抜かれるので余白を多めに
]
const IMAGE_JOBS = [
  ['icon-512.png', 512, CROP, 1],
  ['icon-192.png', 192, CROP, 1],
  ['apple-touch-icon.png', 180, CROP, 1],
  ['favicon-64.png', 64, TIGHT, 1],
  ['icon-maskable-512.png', 512, CROP, MASKABLE_SCALE],
]

const browser = await chromium.launch()
const page = await browser.newPage()
if (existsSync(source)) {
  const url = 'data:image/png;base64,' + readFileSync(source).toString('base64')
  const out = await page.evaluate(
    async ({ url, jobs }) => {
      const img = new Image()
      img.src = url
      await img.decode()
      const W = Math.min(img.width, img.height)
      // 元画像の四隅の色（縮小したときの余白をなじませる背景に使う）
      const probe = document.createElement('canvas')
      probe.width = probe.height = 1
      const pg = probe.getContext('2d')
      const colorAt = (x, y) => {
        pg.drawImage(img, x, y, 16, 16, 0, 0, 1, 1)
        return `rgb(${[...pg.getImageData(0, 0, 1, 1).data].slice(0, 3).join(',')})`
      }
      const tl = colorAt(0, 0)
      const br = colorAt(img.width - 16, img.height - 16)
      return jobs.map(([name, size, [cx, cy, cs], scale]) => {
        const c = document.createElement('canvas')
        c.width = c.height = size
        const g = c.getContext('2d')
        g.imageSmoothingQuality = 'high'
        const src = [cx * W, cy * W, cs * W, cs * W]
        if (scale === 1) {
          g.drawImage(img, ...src, 0, 0, size, size)
        } else {
          // 背景：元画像の左上→右下の色のグラデーション
          const bg = g.createLinearGradient(0, 0, size, size)
          bg.addColorStop(0, tl)
          bg.addColorStop(1, br)
          g.fillStyle = bg
          g.fillRect(0, 0, size, size)
          // 前景：縮小した画像を、縁をぼかして重ねる（境目の枠が出ないように）
          const d = size * scale
          const fg = document.createElement('canvas')
          fg.width = fg.height = d
          const fx = fg.getContext('2d')
          fx.drawImage(img, ...src, 0, 0, d, d)
          fx.globalCompositeOperation = 'destination-in'
          const m = fx.createRadialGradient(d / 2, d / 2, d * 0.36, d / 2, d / 2, d * 0.5)
          m.addColorStop(0, '#000')
          m.addColorStop(1, 'rgba(0,0,0,0)')
          fx.fillStyle = m
          fx.fillRect(0, 0, d, d)
          g.drawImage(fg, (size - d) / 2, (size - d) / 2)
        }
        return [name, c.toDataURL('image/png').split(',')[1]]
      })
    },
    { url, jobs: IMAGE_JOBS },
  )
  for (const [name, data] of out) writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), Buffer.from(data, 'base64'))
} else {
  for (const [name, size, src] of SVG_JOBS) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${src}`,
    )
    writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), await page.screenshot({ omitBackground: true }))
  }
}
await browser.close()
