# アプリアイコン生成用プロンプト（Presta For TOEIC）

画像生成AI（ChatGPT / DALL·E、Midjourney、Gemini など）に渡すプロンプトです。
アプリの配色（濃紺 `#14233F` ＋ 青 `#1F5BD8` ＋ 白）に合わせています。

> 「TOEIC」は ETS の登録商標です。アイコンには公式ロゴや「TOEIC」の文字を入れず、頭文字「P」を使った独自のデザインにしています（画像生成AIは長い文字列を崩しやすいのも理由です）。

## プロンプト（英語・推奨）

```
A modern, minimal app icon for "Presta", an English study app for busy commuters preparing for an English listening and reading test (vocabulary flashcards, shadowing practice, and score tracking).
Flat vector style, square canvas 1024x1024, full-bleed background (no rounded corners, no transparency, no border, no drop shadow outside the icon).
Background: solid deep navy #14233F.
Center motif: a bold, geometric capital letter "P" in bright blue #1F5BD8. The round bowl of the "P" is shaped like a speech bubble, and inside the bowl there are three short white (#FFFFFF) sound-wave bars of increasing height, suggesting listening, speaking aloud, and a rising score.
The only letter in the image is that single "P". No other text, words, numbers, or logos of real companies or tests.
Geometric, clean lines, generous padding: keep all important shapes inside the central 70% of the canvas so it can be cropped into a circle or rounded square.
No gradients or only a very subtle one, high contrast, clearly readable at 48x48 px.
```

## プロンプト（日本語）

```
「Presta」という、通勤中に英語試験（リスニング＆リーディング）の対策をする社会人向け学習アプリのアイコンを作成してください。単語のフラッシュカード、シャドーイング、スコア管理ができるアプリです。
フラットなベクタースタイル、1024×1024の正方形。角丸や透過、枠線、外側の影は付けず、背景は全面塗りつぶし。
背景色：濃紺 #14233F。
中央のモチーフ：明るい青 #1F5BD8 の、太く幾何学的な大文字の「P」。Pの丸い部分を吹き出しの形にし、その中に白 #FFFFFF の短い音声波形のバーを3本、左から右へ少しずつ高くなるように配置する（聞く・声に出す・スコアが上がる、を表現）。
画像内の文字はこの「P」1文字だけ。ほかの文字・単語・数字、実在する企業や試験のロゴは入れない。
幾何学的で整った線。重要な要素はキャンバス中央70%以内に収め、円形や角丸に切り抜いても欠けないようにする。
グラデーションは使わないか、ごく控えめに。48×48pxでも判別できる高いコントラスト。
```

## バリエーション（気に入らなかったとき）

英語プロンプトの「Center motif: …」の段落を、次のどれかに差し替えてください。

- もっとシンプルに：`Center motif: a bold blue (#1F5BD8) letter "P" whose bowl contains a single white upward arrow.`
- 通勤・音声を強く：`Center motif: a bold blue (#1F5BD8) letter "P" whose bowl is a pair of headphones, with small white sound waves on the right.`
- 単語学習を強く：`Center motif: a white flashcard tilted slightly, with a bold blue (#1F5BD8) letter "P" printed on it and a small blue check mark in the corner.`

## 生成後の差し替え手順

1. 生成した正方形の画像を `docs/icon-source.png` として保存する。
2. `npm run icons` を実行すると、`public/icons/` の各PNG（512・192・180・64・マスカブル512）が生成される。モチーフが小さい／大きい場合は `scripts/gen-icons.mjs` の `CROP`（切り抜く範囲）を調整する。
3. コミットして `main` に push すると GitHub Pages に反映される。インストール済みのPWAはアイコンの更新に時間がかかることがある（ホーム画面から削除して追加し直すと確実に反映）。

画像をこのリポジトリに追加してもらえれば、各サイズへの書き出しと差し替えはこちらで行えます。
