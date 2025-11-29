# 注釈表示機能の実装計画

## 概要

本文セグメントの下に注釈を表示する機能。サーバー側でデータを整形し、フロントエンドは表示するだけのシンプルな実装。

## 基本方針

### サーバー側で完結
- `fetchPageDetail`で注釈を整形
- 同じロケーターに複数本文がある場合、最大ナンバーのセグメントにだけ注釈を紐づける
- `segment.annotations`として直接アクセス可能にする

### フロントエンドはシンプルに
- 判定ロジックは一切なし
- `segment.annotations`を表示するだけ
- 表示/非表示はURLクエリで制御

## データ構造の変更

### 変更前
```typescript
SegmentForDetail {
  locators: [
    {
      locator: {
        value: "1",
        segments: [注釈セグメント]
      }
    }
  ]
}
```

### 変更後
```typescript
SegmentForDetail {
  annotations?: Segment[]  // 注釈セグメントの配列（重複排除済み）
  isAnnotationAnchor?: boolean  // このセグメントが注釈のアンカーかどうか
  // locators は必要に応じて残す（UIでは使わない）
}

PageDetail {
  annotationLabels?: string[]  // 注釈タイプのラベル一覧（例: ["Commentary"]）
}
```

## 実装タスク

### タスク1: サーバー側のデータ整形

**ファイル**: `src/app/[locale]/_db/page-detail-queries.server.ts`

**実装内容**:
1. `locator.segments`から`segmentType.key !== "PRIMARY"`のものだけを注釈として抽出
2. 各ロケーターについて、最大ナンバーの本文セグメントを特定（アンカー決定）
3. アンカーセグメントに`annotations`配列を付与
4. アンカー以外のセグメントからは注釈を削除
5. `PageDetail`に`annotationLabels`を追加

**テスト**:
- 注釈のみが取得されること
- アンカー決定が正しく動作すること

### タスク2: 型定義の更新

**ファイル**: `src/app/[locale]/types.ts`

**実装内容**:
- `SegmentForDetail`に`annotations?`と`isAnnotationAnchor?`を追加
- `PageDetail`に`annotationLabels?`を追加

### タスク3: フロントエンドの実装

#### 3.1 WrapSegmentClientの拡張

**ファイル**: `src/app/[locale]/_components/wrap-segments/client.tsx`

**実装内容**:
- `segment.annotations`を取得
- `useQueryState("showAnnotations")`で表示/非表示を制御
- 表示時は`WrapSegmentsComponent`で注釈を描画
- 原文・訳文の下に注釈を表示

#### 3.2 フローティングコントローラーの拡張

**ファイル**: `src/app/[locale]/_components/floating-controls.client.tsx`

**実装内容**:
- 注釈トグルボタンを追加
- `PageDetail.annotationLabels`からラベルを取得
- 注釈が0件の場合はボタンを非表示
- `useQueryState("showAnnotations")`で状態管理

## 実装の流れ

```
1. fetchPageDetail (サーバー)
   ↓
   注釈を整形
   - アンカー決定
   - annotations 付与
   - annotationLabels 生成
   ↓
2. WrapSegmentClient (クライアント)
   ↓
   segment.annotations を表示
   - showAnnotations で制御
   ↓
3. FloatingControls (クライアント)
   ↓
   トグルボタンで表示/非表示
```

## 実装順序

1. ✅ **データ取得の確認**（完了）
2. **サーバー側の整形**
   - `fetchPageDetail`の修正
   - 型定義の更新
   - テスト追加
3. **フロントエンドの実装**
   - `WrapSegmentClient`の拡張
   - フローティングコントローラーの拡張

## メリット

- **シンプル**: フロントエンドに判定ロジックが一切ない
- **パフォーマンス**: サーバー側で1回だけ計算
- **保守性**: ロジックが1箇所に集約
- **テストしやすい**: サーバー側のロジックをテストすればOK
