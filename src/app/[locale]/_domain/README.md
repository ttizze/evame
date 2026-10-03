## MDAST + Segments 処理フロー

純粋なセグメント抽出はこのディレクトリに、画像アップロードを含む変換パイプラインは `../_service` に置きます。ここでは Markdown を MDAST(JSON) に変換しつつ、本文の「セグメント」を抽出する処理をまとめています。セグメントは、本文を段落などの単位に分解し、テキストと安定ハッシュ、段落番号、ページブレーク等のメタデータを付与した配列です。抽出結果は `VFile.data.segments` に格納され、DB には `Segment` レコードとして保存されます。

### 主要エントリ

- `../_service/markdown-to-mdast-with-segments.ts`
  - 入力: `markdown`, `header`, `autoUploadImages`
  - パイプライン:
    1. `remark-parse` で Markdown → MDAST
    2. `remark-custom-blocks` でカスタム記法を MDAST 化（ページブレーク等）
    3. `remark-hash-and-segments` でセグメント抽出 + ハッシュ生成
    4. `remark-auto-upload-images` で画像の自動アップロード処理
    5. `unist-util-remove-position` で `position` 情報を削除し軽量化
  - 出力: `mdastJson`, `segments`, `file(VFile)`

- `../_service/html-to-mdast-with-segments.ts`: 編集画面とコメントから受け取るHTMLをサニタイズし、画像アップロード・セグメント抽出を行う。
- `../_service/mdast-to-html.ts`: 編集loaderで保存済みMDASTからエディターの初期HTMLを生成する。

### セグメント抽出ロジック

`remark-hash-and-segments.ts` が抽出処理の中核です。

- タイトル（`header`）が渡された場合は「番号 0」のセグメントとして先頭に追加し、安定ハッシュを生成します。
- 本文は MDAST のブロック（`paragraph`, `heading`, `listItem`, `blockquote`, `tableCell`）を対象に、ネストされたブロックを除外して 1 ブロック = 1 セグメントとして扱います。
- テキスト正規化と出現回数に基づく安定ハッシュを生成します（同一文面が複数回出る場合でも区別可能）。
- 段落番号 `{para:n}` は locators に、ページブレーク（カスタムブロック由来の `<span class="pb" ...>`）は `metadata.items` に格納します。
- 元ノードに `data-number-id` を付与します。

### ロケールについて

`$locale` セグメントは TanStack Router のルートで解決されるもので、このディレクトリのプラグイン/変換処理では抽出・変更しません。ロケールは呼び出し側（ルートコンポーネントやサーバー関数）で取得・受け渡ししてください。

### 返却値の構成

- `mdastJson`: DB へ保存可能な形へシリアライズした MDAST
- `segments`: `SegmentDraft[]`。テキスト、ハッシュ、連番、メタデータ、ロケーター等
- `file`: `VFile`。警告・ログ用

### 実装のポイント

- 余計な `position` を除去して JSON サイズを抑える
- 同一テキストの重複に対しても一意に識別できるハッシュ（出現回数を含める）
- ページブレークや段落番号の記法を MDAST に揃える

