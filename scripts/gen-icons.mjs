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

// 元画像（1024×1024想定）から切り抜く範囲 [x, y, 辺]。モチーフの大きさに合わせて調整する
const CROP = [0, 0, 1024] // 通常のアイコン：全体
const TIGHT = [112, 112, 800] // ファビコン：中央を大きく見せる
const MASKABLE_SCALE = 0.82 // マスカブル：端末側で丸く切り抜かれるので縮小して余白を足す

const source = new URL('../docs/icon-source.png', import.meta.url)
const fromImage = (crop, scale = 1) => {
  const url = 'data:image/png;base64,' + readFileSync(source).toString('base64')
  const [x, y, size] = crop
  // 縮小したときの余白はアプリの濃紺で塗る
  return `<div style="width:512px;height:512px;overflow:hidden;position:relative;background:#14233f">
    <img src="${url}" style="position:absolute;transform-origin:0 0;
      transform:translate(${256 - 256 * scale}px, ${256 - 256 * scale}px) scale(${(512 / size) * scale}) translate(${-x}px, ${-y}px)"/>
  </div>`
}

const JOBS = existsSync(source)
  ? [
      ['icon-512.png', 512, fromImage(CROP)],
      ['icon-192.png', 192, fromImage(CROP)],
      ['apple-touch-icon.png', 180, fromImage(CROP)],
      ['favicon-64.png', 64, fromImage(TIGHT)],
      ['icon-maskable-512.png', 512, fromImage(CROP, MASKABLE_SCALE)],
    ]
  : [
      ['icon-512.png', 512, svg(1, true)],
      ['icon-192.png', 192, svg(1, true)],
      ['apple-touch-icon.png', 180, svg(1, false)], // iOS が角を丸めるため四角のまま
      ['favicon-64.png', 64, svg(1.12, true)],
      ['icon-maskable-512.png', 512, svg(0.78, false)], // 端末側で丸く切り抜かれるので余白を多めに
    ]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [name, size, src] of JOBS) {
  await page.setViewportSize({ width: size, height: size })
  // 512px で描いてから、ビューポートに合わせて縮小する
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}body>*{display:block;zoom:${size / 512}}svg{width:512px;height:512px}</style>${src}`,
  )
  await page.waitForLoadState('load')
  writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), await page.screenshot({ omitBackground: true }))
}
await browser.close()
