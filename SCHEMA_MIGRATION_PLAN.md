# スキーマ変更計画：注釈の直接リンク

## ✅ 完了した作業

1. **スキーマ変更**: `SegmentAnnotationLink`テーブルを追加
2. **マイグレーション作成**: `20251129085803_add_segment_annotation_link`
3. **マイグレーション適用**: データベースに反映済み

## 次のステップ

### Step 1: データ移行スクリプトの作成

**目的**: 既存のロケーターシステムから新しい直接リンクにデータを移行

**実装内容**:
1. 各ロケーターについて、最大ナンバーの本文セグメントを特定
2. そのセグメントと注釈セグメントの間に直接リンクを作成

**スクリプト**: `scripts/migrate-annotations-to-direct-links.ts`

### Step 2: fetchPageDetailの修正

**目的**: 新しいスキーマに対応

**実装内容**:
1. `segment.annotations`から直接注釈を取得
2. ロケーターシステムは後方互換性のため残す（段階的移行）

### Step 3: コードの更新

**対象ファイル**:
- `src/app/[locale]/_db/page-detail-queries.server.ts`
- `src/app/[locale]/_db/queries.server.ts`
- `src/app/[locale]/types.ts`

## 新しいスキーマ構造

```
Segment (本文)
  └─ annotations: SegmentAnnotationLink[]
      └─ annotationSegment: Segment (注釈)

Segment (注釈)
  └─ annotationTargets: SegmentAnnotationLink[]
      └─ mainSegment: Segment (本文)
```

## クエリの簡略化

**変更前**:
```typescript
segments: {
  locators: {
    locator: {
      segments: {  // 注釈
        where: { segment: { segmentType: { key: { not: "PRIMARY" } } } }
      }
    }
  }
}
```

**変更後**:
```typescript
segments: {
  annotations: {
    annotationSegment: {
      // 注釈セグメントを直接取得
    }
  }
}
```
