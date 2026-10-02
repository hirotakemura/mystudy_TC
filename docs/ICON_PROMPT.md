# アプリアイコン生成用プロンプト（Presta For TOEIC）

画像生成AI（ChatGPT / DALL·E、Midjourney、Gemini など）に渡すプロンプトです。
アプリの配色（濃紺 `#14233F` ＋ 青 `#1F5BD8` ＋ 白）に合わせています。

> アイコンにはアプリ名や文字を入れず、アプリの内容（英語のリスニング・音読と、スコアアップ）を図柄だけで表現します。「TOEIC」は ETS の登録商標なので、公式ロゴや文字も使いません。

## プロンプト（英語・推奨）

```
A modern, minimal app icon for an English study app for busy commuters: vocabulary flashcards, shadowing (listening and repeating aloud), and test score tracking.
Flat vector style, square canvas 1024x1024, full-bleed background (no rounded corners, no transparency, no border, no drop shadow outside the icon).
Background: solid deep navy #14233F.
Center motif: a bold, rounded speech bubble in bright blue #1F5BD8. Inside the bubble, three white (#FFFFFF) sound-wave bars of increasing height from left to right, and the tallest bar turns into a small upward arrow, suggesting listening, speaking aloud, and a rising score.
Absolutely no text, letters, numbers, or logos of real companies or tests.
Geometric, clean lines, generous padding: keep all important shapes inside the central 70% of the canvas so it can be cropped into a circle or rounded square.
No gradients or only a very subtle one, high contrast, clearly readable at 48x48 px.
```

## プロンプト（日本語）

```
通勤中に英語試験（リスニング＆リーディング）の対策をする社会人向け学習アプリのアイコンを作成してください。単語のフラッシュカード、シャドーイング（聞いて声に出す練習）、スコア管理ができるアプリです。
フラットなベクタースタイル、1024×1024の正方形。角丸や透過、枠線、外側の影は付けず、背景は全面塗りつぶし。
背景色：濃紺 #14233F。
中央のモチーフ：明るい青 #1F5BD8 の、太く丸みのある吹き出し。吹き出しの中に白 #FFFFFF の音声波形のバーを3本、左から右へ少しずつ高くなるように並べ、いちばん高いバーの先端を小さな上向きの矢印にする（聞く・声に出す・スコアが上がる、を表現）。
文字・数字・実在する企業や試験のロゴは一切入れない。
幾何学的で整った線。重要な要素はキャンバス中央70%以内に収め、円形や角丸に切り抜いても欠けないようにする。
グラデーションは使わないか、ごく控えめに。48×48pxでも判別できる高いコントラスト。
```

## バリエーション（気に入らなかったとき）

英語プロンプトの「Center motif: …」の段落を、次のどれかに差し替えてください。

- もっとシンプルに：`Center motif: a bright blue (#1F5BD8) rounded speech bubble containing a single bold white upward arrow.`
- 通勤・音声を強く：`Center motif: a pair of bright blue (#1F5BD8) headphones, with three white sound-wave bars of increasing height between the ear cups.`
- 単語学習を強く：`Center motif: two overlapping flashcards, the front one bright blue (#1F5BD8) with a white check mark, the back one white, tilted slightly.`
- 学習とスコアアップ：`Center motif: an open book in white, with a bright blue (#1F5BD8) upward arrow rising from the center of the pages.`

## 生成後の差し替え手順

1. 生成した正方形の画像を `docs/icon-source.png` として保存する。
2. `npm run icons` を実行すると、`public/icons/` の各PNG（512・192・180・64・マスカブル512）が生成される。画像のサイズは自動で合わせる。モチーフが小さい／大きい場合は `scripts/gen-icons.mjs` の `CROP`・`TIGHT`（切り抜く範囲。画像の幅に対する割合）を調整する。
3. コミットして `main` に push すると GitHub Pages に反映される。インストール済みのPWAはアイコンの更新に時間がかかることがある（ホーム画面から削除して追加し直すと確実に反映）。

画像をこのリポジトリに追加してもらえれば、各サイズへの書き出しと差し替えはこちらで行えます。
