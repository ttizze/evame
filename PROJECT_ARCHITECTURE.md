# Evame プロジェクトアーキテクチャガイド

このドキュメントでは、Evameプロジェクトのアーキテクチャ、構造、および開発のためのガイドラインを提供します。

## 目次

- [プロジェクト概要](#プロジェクト概要)
- [技術スタック](#技術スタック)
- [ディレクトリ構造](#ディレクトリ構造)
- [主要コンポーネント](#主要コンポーネント)
- [データフロー](#データフロー)
- [コンポーネント開発ガイドライン](#コンポーネント開発ガイドライン)
- [データ取得とミューテーション](#データ取得とミューテーション)
- [国際化対応](#国際化対応)

## プロジェクト概要

Evame はNext.js（App Router）を使用したWebアプリケーションで、モダンなUI/UX設計を採用しています。プロジェクトはモノレポ構造を採用しており、メインのアプリケーションコードは `next` ディレクトリに集約されています。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **UI コンポーネント**: 
  - Shadcn UI (Radix UI ベース)
  - React 19
- **スタイリング**: Tailwind CSS
- **データベース**: Prisma ORM を使用した PostgreSQL
- **認証**: NextAuth v5
- **国際化**: next-intl
- **状態管理**: React Server Components + nuqs (URL検索パラメータ管理)
- **エディタ**: TipTap

## ディレクトリ構造

プロジェクトは次のようなディレクトリ構造になっています：

```
/
├── next/                         # メインアプリケーションコード
│   ├── src/                      # ソースコード
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── [locale]/         # 国際化対応ルート
│   │   │   │   ├── (common-layout)/ # 共通レイアウト
│   │   │   │   ├── (edit-layout)/   # 編集用レイアウト
│   │   │   │   ├── _components/     # ルート固有のコンポーネント
│   │   │   │   └── _lib/            # ルート固有のユーティリティ
│   │   │   ├── api/              # API ルート
│   │   │   └── _db/              # データベース関連コード
│   │   ├── components/           # 共有コンポーネント
│   │   │   └── ui/               # UI コンポーネント (Shadcn UI)
│   │   ├── features/             # 機能ごとのコード
│   │   ├── lib/                  # ユーティリティ関数
│   │   ├── types/                # 型定義
│   │   └── i18n/                 # 国際化設定
│   ├── prisma/                   # Prisma スキーマとマイグレーション
│   └── public/                   # 静的ファイル
└── components/                   # クロームエクステンション用コンポーネント（空）
```

## 主要コンポーネント

### UI コンポーネント (Shadcn UI)

`next/src/components/ui` ディレクトリには、Shadcn UI フレームワークに基づく再利用可能なUIコンポーネントがあります：

- ボタン、入力フィールド、チェックボックスなどの基本要素
- モーダル、ポップオーバー、ドロップダウンメニューなどの複合コンポーネント
- テーブル、ページネーション、カルーセルなどの高度なコンポーネント

これらのコンポーネントは Radix UI をベースにしており、アクセシビリティに優れ、カスタマイズ可能です。

### ルートと国際化

アプリケーションは国際化に対応しており、`[locale]` パラメータを使用してルーティングされています。`next-intl` を使用して翻訳を管理しています。

- ルートパスには `[locale]` セグメントが含まれ、それぞれの言語に対応するサブルートがあります
- 翻訳メッセージは `next/messages` ディレクトリにあります

### データベース

データベースは Prisma ORM を使用して管理されています：

- スキーマ定義: `next/prisma/schema.prisma`
- マイグレーション: `next/prisma/migrations/`
- シードスクリプト: `next/prisma/seed.ts`

### 認証

認証は NextAuth v5 を使用して実装されています：

- 認証設定: `next/src/auth.ts`
- 認証アクション: `next/src/app/[locale]/auth-action.ts`

## データフロー

アプリケーションは主にReact Server Componentsを使用し、必要に合わせてClient Componentsを活用します：

1. データ取得は主にサーバーコンポーネントで行われます
2. ユーザーインタラクションが必要な場合は `"use client"` ディレクティブを使用してクライアントコンポーネントを作成します
3. フォーム送信やデータ変更には Server Actions を使用します
4. URL検索パラメータの状態管理には `nuqs` を使用します

## コンポーネント開発ガイドライン

新しいコンポーネントを作成する際は、以下のガイドラインに従ってください：

### コンポーネントの配置

1. **共有UI部品**: `next/src/components/ui/` - 基本的なUIコンポーネント
2. **機能固有部品**: `next/src/features/{feature-name}/components/` - 特定の機能に関連するコンポーネント
3. **ページ固有部品**: `next/src/app/[locale]/{route}/_components/` - 特定のページ/ルートに関連するコンポーネント

### コンポーネントの構造

```typescript
// component-name.tsx
"use client"; // クライアントコンポーネントの場合のみ

import { type FC } from "react";
import { cn } from "@/lib/utils";

interface ComponentNameProps {
  // プロパティの型定義
}

export const ComponentName: FC<ComponentNameProps> = ({
  // プロパティの分割代入
}) => {
  // フック、状態、副作用

  // JSXの返却
  return (
    <div className={cn("...", className)}>
      {/* コンポーネントの内容 */}
    </div>
  );
};
```

### 命名規則

- **ディレクトリ**: ケバブケース (`auth-wizard/`)
- **コンポーネントファイル**: ケバブケース (`auth-wizard.tsx`)
- **ユーティリティ/フックファイル**: ケバブケース (`use-auth-state.ts`)

## データ取得とミューテーション

データの取得と変更操作はプロジェクト内で一貫したパターンに従っています。

### データ取得パターン

1. **フォルダ構造**:
   - コンポーネントがデータを必要とする場合、そのコンポーネントと同じディレクトリに `_db` ディレクトリを作成します
   - 例: `components/project/new-project-list/_db/`

2. **クエリファイル**:
   - データ取得関数は `_db/queries.server.ts` ファイルに配置します
   - 命名規則: `fetch{データ名}` (例: `fetchNewProjectsWithPagination`)
   - これらの関数は常に非同期関数として実装します

3. **サーバーコンポーネント**:
   - データを取得するサーバーコンポーネントは通常 `server.tsx` ファイルに実装します
   - データ取得とレンダリングを結合したコンポーネントとして機能します

```typescript
// コンポーネント例: new-project-list/server.tsx
import { fetchNewProjectsWithPagination } from "./_db/queries.server";

export default async function NewProjectList({ page, query }: Props) {
  const { projectsWithRelations } = await fetchNewProjectsWithPagination(page, 10, query);
  
  return (
    <ComponentToRenderData data={projectsWithRelations} />
  );
}
```

```typescript
// クエリ例: _db/queries.server.ts
import { prisma } from "@/lib/prisma";

export async function fetchNewProjectsWithPagination(
  page = 1,
  pageSize = 10,
  searchTerm = "",
) {
  // Prismaを使用したデータ取得ロジック
  const data = await prisma.someModel.findMany({ /* ... */ });
  return { data };
}
```

### ミューテーションパターン

1. **フォルダ構造**:
   - ミューテーション（データ変更）が必要なコンポーネントは次のファイル構成を持ちます：
     - `action.ts`: Server Action定義
     - `client.tsx`: クライアントコンポーネント
     - `db/mutations.server.ts`: データベース操作

2. **Server Action**:
   - Server Actionは `action.ts` ファイルで定義し、先頭に `"use server"` ディレクティブを記述します
   - 入力バリデーションにはZodを使用します
   - アクション関数は命名規則: `{操作}Action` (例: `togglePageLikeAction`)

3. **ミューテーション関数**:
   - 実際のデータベース操作は `db/mutations.server.ts` に実装します
   - 命名規則: 操作を表す動詞から始める (例: `togglePageLike`, `createNotification`)

4. **クライアントコンポーネント**:
   - `"use client"` ディレクティブを持つコンポーネントは通常 `client.tsx` に実装します
   - Server Actionを呼び出すフォームやボタンを含みます
   - Optimistic UIの実装には `useOptimistic` を使用します

```typescript
// action.ts
"use server";

import { z } from "zod";
import { togglePageLike } from "./db/mutations.server";

const schema = z.object({ slug: z.string() });

export async function togglePageLikeAction(previousState, formData: FormData) {
  const validation = schema.safeParse({ slug: formData.get("slug") });
  if (!validation.success) {
    return { success: false, zodErrors: validation.error.flatten().fieldErrors };
  }
  
  // データベース操作
  const result = await togglePageLike(validation.data.slug, { /* ... */ });
  
  return { success: true, data: result };
}
```

```typescript
// db/mutations.server.ts
import { prisma } from "@/lib/prisma";

export async function togglePageLike(slug: string, identifier) {
  // Prismaを使用したデータベース操作
  // ...
  return { liked, likeCount };
}
```

```typescript
// client.tsx
"use client";

import { useActionState, useOptimistic } from "react";
import { togglePageLikeAction } from "./action";

export function PageLikeButton({ liked, likeCount, slug }: Props) {
  const [state, formAction] = useActionState(togglePageLikeAction, { success: false });
  const [optimisticLiked, updateOptimisticLiked] = useOptimistic(liked, (_, newValue) => newValue);
  
  // コンポーネントのレンダリング
}
```

### テスト

- データ取得関数とミューテーション関数のテストは、それぞれ `queries.server.test.ts` と `mutations.server.test.ts` に記述します
- モックを使用してPrismaの動作をシミュレートします

## 国際化対応

1. メッセージを追加する場合は `next/messages/{locale}` ディレクトリ内の適切なファイルに追加します
2. コンポーネント内でメッセージを使用する場合：

```typescript
// サーバーコンポーネントの場合
import { getTranslations } from "next-intl/server";

export async function MyComponent() {
  const t = await getTranslations("namespace");
  return <div>{t("key")}</div>;
}

// クライアントコンポーネントの場合
"use client";
import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations("namespace");
  return <div>{t("key")}</div>;
}
```

## TODO
1. page本文､project説明
- 編集後も翻訳との紐づけを維持するために､textAndOccurrenceHashをキーにして紐づけを更新する
- 表示にはtextAndOccurrenceHashをキーにすると時間がかかるので､data-number-idをキーにする
となっているが､これ複雑すぎるので簡略化する

2. page､project､コメントで要件が違っていて複雑すぎるのでなんとかする
- pageはslugで特定してるので､slugをキーにして扱っている
- projectはidで特定してるので､idをキーにして扱っている
- コメントはidで特定してるので､idをキーにして扱っている
- page､projectは編集後のひもづけ必要なので1.のようにしているが､コメントは編集機能がないので1.のようにしていない､しかし編集できたほうがいいので､できるようにする｡
  


このガイドに従うことで、一貫性のあるコンポーネントを開発し、プロジェクト全体の整合性を維持することができます。 