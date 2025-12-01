# スキーマ設計の問題点分析

## 現在のスキーマ構造

```
Content (本文ページ)
  ├─ Segment (本文セグメント, PRIMARY)
  └─ SegmentLocator (ロケーター)
      └─ SegmentLocatorLink
          └─ Segment (本文セグメント) ← 本文とロケーターのリンク

Content (注釈ページ)
  └─ Segment (注釈セグメント, COMMENTARY)
      └─ SegmentLocatorLink
          └─ SegmentLocator (本文ページのロケーター) ← 注釈とロケーターのリンク
```

## 問題点

### 1. ロケーターの所有関係が不明確

**現状**:
- `SegmentLocator`は`contentId`に紐づいている
- しかし、注釈セグメント（別のContent）も同じロケーターにリンクしている
- ロケーターは「どのContentのものか」が曖昧

**問題**:
- ロケーターが本文のContentに属しているが、注釈も同じロケーターを使う
- クエリで「本文セグメント → ロケーター → 注釈セグメント」という間接的な取得が必要

### 2. クエリの複雑さ

**現状のクエリ**:
```typescript
segments: {
  where: { segmentType: { key: "PRIMARY" } },  // 本文のみ
  select: {
    locators: {
      select: {
        locator: {
          select: {
            segments: {
              where: {
                segment: {
                  segmentType: { key: { not: "PRIMARY" } }  // 注釈のみ
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**問題**:
- ネストが深い
- 本文セグメント → ロケーター → 注釈セグメントという間接的な関係
- 同じロケーターに複数本文がある場合の処理が複雑

### 3. データの取得方法が非直感的

**理想**: 本文セグメントから直接注釈を取得したい
```typescript
segment.annotations  // 直接アクセス
```

**現状**: 間接的な取得が必要
```typescript
segment.locators[0].locator.segments  // 複雑
```

## 改善案

### 案1: 注釈を直接本文セグメントに紐づける（推奨）

**スキーマ変更**:
```prisma
model Segment {
  // ... 既存のフィールド ...
  
  // 注釈セグメントへの直接リンク
  annotations SegmentAnnotationLink[]
}

model SegmentAnnotationLink {
  mainSegmentId    Int @map("main_segment_id")
  annotationSegmentId Int @map("annotation_segment_id")
  createdAt        DateTime @default(now()) @map("created_at")
  
  mainSegment Segment @relation("MainSegment", fields: [mainSegmentId], references: [id], onDelete: Cascade)
  annotationSegment Segment @relation("AnnotationSegment", fields: [annotationSegmentId], references: [id], onDelete: Cascade)
  
  @@id([mainSegmentId, annotationSegmentId])
  @@index([mainSegmentId])
  @@index([annotationSegmentId])
}
```

**メリット**:
- 直接的な関係でシンプル
- クエリが簡単になる
- 同じロケーターに複数本文がある場合の処理が不要（直接紐づけるため）

**デメリット**:
- マイグレーションが必要
- 既存のロケーターシステムとの整合性

### 案2: ロケーターの設計を見直す

**スキーマ変更**:
```prisma
model SegmentLocator {
  // contentId を削除（または nullable に）
  // ロケーターは独立したエンティティとして扱う
  
  // または、ロケーターを「参照先」として扱う
  referenceContentId Int? @map("reference_content_id")  // 参照先のContent
}
```

**メリット**:
- ロケーターが独立した概念になる
- 複数のContentから参照可能

**デメリット**:
- 既存のロケーターシステムとの整合性
- マイグレーションが複雑

### 案3: 現在の設計を維持し、サーバー側で整形（現実的）

**変更なし**: スキーマはそのまま

**改善点**:
- `fetchPageDetail`で注釈を整形
- `segment.annotations`として直接アクセス可能にする
- フロントエンドは整形済みデータを使うだけ

**メリット**:
- マイグレーション不要
- 既存システムとの整合性を保てる
- 実装が簡単

**デメリット**:
- スキーマの根本的な問題は解決しない
- 毎回サーバー側で計算が必要

## 推奨: 案3（現実的な選択）

**理由**:
1. 既存のロケーターシステムは他の用途でも使われている可能性がある
2. マイグレーションのリスクが高い
3. サーバー側で整形すれば、フロントエンドはシンプルになる
4. 将来的に案1や案2に移行することも可能

**実装**:
- `fetchPageDetail`で注釈を整形
- `segment.annotations`として提供
- 型定義を拡張

## 長期的な改善（将来検討）

もし将来的にスキーマを見直すなら、**案1（直接リンク）**が最もシンプルで直感的。

ただし、その場合は：
- 既存のロケーターシステムとの整合性を確認
- マイグレーション戦略を慎重に検討
- 段階的な移行を検討



