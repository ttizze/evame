# 注釈表示機能の要件

## 概要
`fetchPageDetail` で取得した locators からセグメントリンクを使って、本文に注釈を表示する機能を実装する。

## 要件詳細

### 1. 注釈の判定ロジック

**判定基準:**
- **本文**: `segmentType.key === "PRIMARY"` のセグメント
- **注釈**: `segmentType.key !== "PRIMARY"` のセグメント（例: `COMMENTARY`）

**実装方針:**
- クエリで実現可能ならクエリで実装
- クエリが難しい場合は `fetchPageDetail` の中でフィルタリングして注釈だけに限定

### 2. 注釈の取得

**現在の状況:**
- `fetchPageDetail` で locators からセグメントリンクを取得できる
- 現状、本文も注釈も入ってきている

**必要な変更:**
- locators から取得するセグメントを注釈だけに限定する
- 注釈の判定は `segmentType.key !== "PRIMARY"` で行う

### 3. 注釈の表示位置

**基本ルール:**
- 本文に紐づいている注釈を本文のすぐ下に表示する

**複数本文セグメントがある場合:**
- 同じロケーターに紐づいている本文セグメントが複数ある場合
- 例: ロケーター「1」に3つの本文セグメントが紐づいている
- **対応**: ナンバーが一番下の本文セグメントの下に注釈を表示する

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

### Phase 1: データ取得の修正
1. [ ] `fetchPageDetail` またはクエリを修正して、注釈だけを取得するようにする
   - `segmentType.key !== "PRIMARY"` のセグメントのみを注釈として取得
   - 現在の `buildPageSelectWithLocators` では既に `segmentType: { key: { not: "PRIMARY" } }` でフィルタリングされているが、本文も混入している可能性があるため確認・修正が必要

### Phase 2: 注釈データの構造化
2. [ ] 注釈データをロケーターごとにグループ化
   - ロケーターID → 注釈セグメントの配列のマップを作成
   - 各ロケーターに紐づく本文セグメントの最大ナンバーを特定

### Phase 3: 注釈表示コンポーネント
3. [ ] 注釈を表示するコンポーネントを作成
   - Wrap Segments を使用して注釈を表示
   - 本文セグメントの下に適切に配置

### Phase 4: 本文レンダリングの修正
4. [ ] `ContentWithTranslations` または `mdastToReact` の処理を修正
   - 本文セグメントのレンダリング時に、対応する注釈を取得
   - 同じロケーターに紐づく本文セグメントが複数ある場合、一番下のセグメントの下に注釈を表示

### Phase 5: フローティングコントローラーの拡張
5. [ ] フローティングコントローラーに注釈表示/非表示ボタンを追加
   - 注釈のラベルをボタンに表示
   - クリックで表示/非表示を切り替え
   - 状態管理（クライアント側）

## 技術的な考慮事項

### データ構造
- 現在の `SegmentForDetail` 型には `locators` が含まれている
- `locators` の中に `locator.segments` があり、これがリンクされたセグメント
- この `segments` の中から `segmentType.key !== "PRIMARY"` のものを注釈として判定

### パフォーマンス
- 注釈データの取得は可能な限りクエリレベルで最適化
- クライアント側での表示/非表示切り替えは状態管理で実現

### 型定義
- 注釈専用の型定義が必要になる可能性がある
- `SegmentForDetail` を拡張するか、新しい型を定義するか検討

## 関連ファイル

- `src/app/[locale]/_db/page-detail-queries.server.ts` - データ取得
- `src/app/[locale]/_db/queries.server.ts` - クエリ定義
- `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/content-with-translations.tsx` - コンテンツ表示
- `src/app/[locale]/_components/mdast-to-react/server.tsx` - mdast → React 変換
- `src/app/[locale]/_components/wrap-segments/` - セグメント表示コンポーネント
- `src/app/[locale]/_components/floating-controls.client.tsx` - フローティングコントローラー

