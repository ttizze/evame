# 注釈表示機能の要件

## 概要
`fetchPageDetail` で取得した `annotations` を使って、本文に注釈を表示する機能を実装する。

## 要件詳細

### 1. 注釈の判定ロジック

**判定基準:**
- **本文**: `segmentType.key === "PRIMARY"` のセグメント
- **注釈**: `segmentType.key !== "PRIMARY"` のセグメント（例: `COMMENTARY`）

**実装方針:**
- データベーススキーマで `SegmentAnnotationLink` により直接リンクされている
- サーバー側で `segment.annotations` として整形済み

### 2. 注釈の取得

**現在の状況:**
- `fetchPageDetail` で `segment.annotations` から直接注釈セグメントを取得できる
- 注釈は既に `segmentType.key !== "PRIMARY"` のものだけが含まれている

**データ構造:**
- `SegmentAnnotationLink` テーブルで本文セグメントと注釈セグメントが直接リンクされている
- `segment.annotations` から注釈セグメントの配列を取得可能

### 3. 注釈の表示位置

**基本ルール:**
- 本文セグメントに直接紐づいている注釈を本文のすぐ下に表示する

**複数本文セグメントがある場合:**
- 同じ段落番号に複数の本文セグメントがある場合
- インポート時に最大ナンバーの本文セグメント（アンカーセグメント）にのみ注釈がリンクされる
- **対応**: アンカーセグメントの下に注釈を表示する

**表示方法:**
- Wrap Segments コンポーネントを使用して注釈を表示する（本文と同様）

### 4. 注釈の表示/非表示の切り替え

**実装場所:**
- フローティングコントローラー（`FloatingControls` コンポーネント）

**機能:**
- フローティングコントローラーにボタンを追加
- ボタンを押すと注釈の表示/非表示を切り替えられる

**ボタンの表示内容:**
- 注釈のラベル（`segmentType.label`）をフローティングコントロールのボタンに表示する
- 複数の注釈タイプがある場合は、適切に表示する（要検討）

## 実装タスク

### Phase 1: データ取得の確認 ✅
1. [x] `fetchPageDetail` で `segment.annotations` から注釈を取得
   - スキーマ変更により `SegmentAnnotationLink` で直接リンクされている
   - `buildPageSelectWithAnnotations` で注釈を取得

### Phase 2: 型定義の更新
2. [ ] `SegmentForDetail` 型に `annotations?` を追加
   - 注釈セグメントの配列として定義

### Phase 3: 注釈表示コンポーネント
3. [ ] `WrapSegmentClient` を拡張して注釈を表示
   - `segment.annotations` を取得
   - Wrap Segments を使用して注釈を表示
   - 本文セグメントの下に適切に配置

### Phase 4: 本文レンダリングの修正
4. [ ] `ContentWithTranslations` または `mdastToReact` の処理を修正
   - 本文セグメントのレンダリング時に、`segment.annotations` を取得
   - アンカーセグメントの下に注釈を表示

### Phase 5: フローティングコントローラーの拡張
5. [ ] フローティングコントローラーに注釈表示/非表示ボタンを追加
   - 注釈のラベルをボタンに表示
   - クリックで表示/非表示を切り替え
   - `nuqs` の `useQueryState` で状態管理

## 技術的な考慮事項

### データ構造
- `SegmentAnnotationLink` テーブルで本文セグメントと注釈セグメントが直接リンクされている
- `segment.annotations` から注釈セグメントの配列を直接取得可能
- サーバー側で `pickBestTranslation` により最適な翻訳が選択されている

### パフォーマンス
- 注釈データの取得はクエリレベルで最適化済み
- クライアント側での表示/非表示切り替えは `nuqs` の `useQueryState` で実現

### 型定義
- `SegmentForDetail` 型に `annotations?` を追加
- 注釈セグメントは `SegmentForDetail` と同じ型構造

## 関連ファイル

- `src/app/[locale]/_db/page-detail-queries.server.ts` - データ取得（`segment.annotations` を整形）
- `src/app/[locale]/_db/queries.server.ts` - クエリ定義（`buildPageSelectWithAnnotations`）
- `src/app/[locale]/types.ts` - 型定義（`SegmentForDetail` に `annotations?` を追加）
- `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/content-with-translations.tsx` - コンテンツ表示
- `src/app/[locale]/_components/wrap-segments/client.tsx` - セグメント表示コンポーネント（注釈表示を追加）
- `src/app/[locale]/_components/floating-controls.client.tsx` - フローティングコントローラー（注釈トグルボタン）

## スキーマ

- `prisma/schema.prisma` - `SegmentAnnotationLink` モデルで直接リンク
- `scripts/tipitaka-import/segment-annotations.ts` - インポート時にアンカーセグメントを決定してリンク作成

