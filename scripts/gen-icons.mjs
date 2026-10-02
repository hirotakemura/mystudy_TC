// アプリアイコンPNGを下の SVG から生成する（Playwright の Chromium を使用）
// 使い方: npm run icons
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
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

const JOBS = [
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
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${src}`,
  )
  writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), await page.screenshot({ omitBackground: true }))
}
await browser.close()
