# 注釈表示機能の実装計画

## 概要

本文セグメントの下に注釈を表示する機能。サーバー側でデータ整形済み、フロントエンドは表示するだけ。

## データ構造

```typescript
SegmentForDetail {
  annotations?: SegmentForDetail[]  // 注釈セグメント（pickBestTranslation適用済み）
}
```

- インポート時にアンカーセグメント（最大ナンバー）にのみ注釈をリンク
- `fetchPageDetail`で`segment.annotations`として取得可能

## 実装タスク

### ✅ 完了
1. スキーマ変更（`SegmentAnnotationLink`）
2. インポートスクリプト（アンカー決定・リンク作成）
3. サーバー側データ取得（`fetchPageDetail`）

### 残り
1. **型定義の更新**
   - `SegmentForDetail`に`annotations?`を明示的に追加（現在は自動推論）

2. **UI実装**
   - `WrapSegmentClient`: `segment.annotations`を本文下に表示
   - `FloatingControls`: 注釈表示/非表示のトグルボタン（`nuqs`で状態管理）

## 実装の流れ

```
インポート → SegmentAnnotationLink作成
    ↓
fetchPageDetail → segment.annotations取得
    ↓
WrapSegmentClient → 表示（showAnnotationsで制御）
    ↓
FloatingControls → トグルボタン
```
