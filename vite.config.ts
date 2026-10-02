import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages のサブパス配信時は BASE_PATH=/<repo>/ を指定してビルドする
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-64.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Presta For TOEIC',
        short_name: 'Presta',
        description: 'TOEIC L&R の通勤学習・ロードマップ・スコアを管理するアプリ',
        lang: 'ja',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        background_color: '#f3f5f9',
        theme_color: '#14233f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 計画データ(JSON)もプリキャッシュしてオフラインで動作させる
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        // 大きいアイコンはインストール時に端末が取得するため、プリキャッシュしない
        globIgnores: ['**/icons/icon-512.png', '**/icons/icon-maskable-512.png'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
