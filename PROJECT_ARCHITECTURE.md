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
- [コンテンツとセグメントの翻訳要件](#コンテンツとセグメントの翻訳要件)
- [データ保存と表示の流れ](#データ保存と表示の流れ)
- [Markdown処理とレンダリング](#markdown処理とレンダリング)

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

## コンテンツとセグメントの翻訳要件

Evame では翻訳対象を「コンテンツ（Content）」と「セグメント（Segment）」に分離して設計しています。現在はページとページコメント（`ContentKind.PAGE` / `ContentKind.PAGE_COMMENT`）が主なコンテンツですが、要件上は注釈や単語単位の翻訳など任意の対象を追加できるように抽象化されています。

- **翻訳対象の抽象化**  
  - すべての翻訳対象は `Content` をルートとし、実際に翻訳・投票を行う最小単位は `Segment` です。新しい対象が増えても、`Segment` を同期すれば既存の翻訳 UI とロジックをそのまま流用できます。
  - ページ本文とページコメントは同じ `Content`-`Segment` パイプラインを共有しているため、エディタや表示ロジックを個別に持たせる必要がありません。

- **セグメントタイプでの役割分離**  
  - 本文・注釈・語釈などの役割は `SegmentType`（例: `PRIMARY`, `COMMENTARY`, `GLOSS`）で判別します。`ContentKind` とは別軸で管理することで、「ページかコメントか」と「本文か注釈か」が混同されないようにしています。
  - Tipitaka のように本文と注釈が同じページに混在する場合でも、`SegmentType` によって UI 側で表示・並び順のルールを切り替えられます。

- **注釈と本文の Content ID 運用**  
  - 注釈は本文と同じ `contentId` を共有するケースと、別 `Content` として分離するケースの両方をサポートします（Tipitaka では後者を採用）。いずれの場合でも、`SegmentType` により役割を判別し、翻訳・投票の一貫性を保ちます。

- **ロケーターによる多対多の関連付け**  
  - `SegmentLocator` と `SegmentLocatorLink` を介して本文と注釈の対応付けを行います。これにより、1つの注釈が複数の本文（例: Tika が Mula と Atthakatha の両方）を参照するケースにも対応できます。
  - ロケーターは段落番号などの外部参照値をキーにしているため、注釈データの追加や再インポート時も安定してリレーションを再構築できます。

この要件に従うことで、翻訳対象が増えても `Segment` と `SegmentType/SegmentLocator` を拡張するだけで済み、既存のページ/コメント向けのワークフローを崩さずに対応できます。

/**
 * ■ データ保存戦略（2025-04-24 修正）
 *
 * ● editorHtml
 *   - TipTap が吐いた HTML
 *   - html → mdast 変換の一時フォーマット（DB には残さない）
 *
 * ● mdast (🍀 正規フォーマット)
 *   - DB(json) に保存
 *   - 表示レンダリング、全文検索、TOC 生成、リンク抽出などはすべてここから
 *   - 注意点として､mdastに変換するときにsanitizeしているのでタグ等が消える場合がある｡基本はオリジナルではなく通常のタグを使用し､どうしてもカスタマイズが必要な場合はsanitizeスキーマを変更する
 *
 * ▼ エディタを乗り換えるとき
 *
 *   1. エディタの形式からmdastを出力する関数を書く
 *   2. その関数をmdastToReactに渡す
 */
db､page､コメント､projectの移行
表示と入力双方のテストの確認
strongタグ等

### データ保存と表示の流れ

プロジェクトでは、TipTapエディタからの入力とMarkdownファイルからのインポートの2つの方法でコンテンツを保存できます。どちらの場合も、最終的にはmdast形式に統一されてデータベースに保存され、同じ方法で表示されます。

#### TipTapエディタからの保存フロー

1. **ユーザー入力**
   - TipTapエディタでユーザーがコンテンツを編集
   - TipTapがHTML形式で出力（`editorHtml`）

2. **HTML → mdast 変換**
   ```
   TipTap HTML → htmlToMdastWithSegments() → mdast + segments
   ```
   - `src/app/[locale]/_lib/html-to-mdast-with-segments.ts` の `htmlToMdastWithSegments` 関数を使用
   - 処理の流れ:
     - `rehypeParse`: HTML → HAST（HTML AST）に変換
     - `rehypeSanitize`: XSS対策のためのサニタイズ
     - `rehypeRemark`: HAST → MDAST に変換
     - `remarkHashAndSegments`: セグメント情報とハッシュを生成
     - `remarkAutoUploadImages`: 画像の自動アップロード

3. **データベース保存**
   - `processPageHtml` → `upsertPageAndSegments` を経由
   - `mdastJson` を `Page.mdastJson` に保存（JSON形式）
   - `segments` を `Segment` テーブルに保存（翻訳との紐づけ用）

#### Markdownファイルからのインポートフロー

1. **Markdownファイル読み込み**
   - `scripts/tipitaka-import/pages.ts` などでMarkdownファイルを読み込み
   - ファイルをヘッダー（タイトル）と本文に分割

2. **Markdown → mdast 変換**
   ```
   Markdown文字列 → markdownToMdastWithSegments() → mdast + segments
   ```
   - `src/app/[locale]/_lib/markdown-to-mdast-with-segments.ts` の `markdownToMdastWithSegments` 関数を使用
   - 処理の流れ:
     - `remarkParse`: Markdown → MDAST に直接変換（HTML経由不要）
     - `remarkHashAndSegments`: セグメント情報とハッシュを生成
     - `remarkAutoUploadImages`: 画像の自動アップロード

3. **データベース保存**
   - `createContentPage` → `upsertPageWithSegments` を経由
   - TipTapと同様に `mdastJson` と `segments` を保存

#### 表示フロー（共通）

どちらの方法で保存されたコンテンツも、同じ方法で表示されます：

1. **データベースから取得**
   - `Page.mdastJson` と `Segment` テーブルからデータを取得

2. **mdast → React要素への変換**
   ```
   mdast + segments → mdastToReact() → React要素
   ```
   - `src/app/[locale]/_components/mdast-to-react/server.tsx` の `mdastToReact` 関数を使用
   - 処理の流れ:
     - `remarkTweet`: ツイート埋め込み
     - `remarkEmbedder`: oEmbed埋め込み
     - `remarkLinkCard`: リンクカード生成
     - `remarkRehype`: MDAST → HAST に変換
     - `rehypeRaw`: 生HTMLのパース
     - `rehypeSlug`: 見出しにID付与
     - `rehypePrettyCode`: コードハイライト
     - `rehypeReact`: HAST → React要素に変換
     - `WrapSegment`: セグメント要素をラップ（原文と訳文の制御）

3. **ブラウザ表示**
   - React要素がサーバーコンポーネントとしてレンダリング
   - 最終的には静的なHTMLとしてストリーミング
   - クライアント側で翻訳表示モードの切り替えなどのインタラクティブ機能が動作

#### 共通の変換ポイント

- **セグメント生成**: `remarkHashAndSegments` プラグインが、`p`, `h1`-`h6`, `li`, `td`, `th`, `blockquote` などのブロック要素ごとにセグメントを生成し、`textAndOccurrenceHash` を計算します
- **画像処理**: どちらの方法でも `remarkAutoUploadImages` が画像を自動的にアップロードします
- **軽量化**: `removePosition` でmdastから位置情報を削除して軽量化します

この設計により、入力方法が異なっても、保存形式と表示方法が統一され、一貫性のあるコンテンツ管理が可能になっています。

## Markdown処理とレンダリング

### mdastToReact

`mdastToReact` 関数は、mdast（Markdown Abstract Syntax Tree）のJSON形式をReact要素に変換する関数です。この関数は `src/app/[locale]/_components/mdast-to-react/server.tsx` に実装されています。

#### 主な機能

1. **mdast → hast → React要素への変換**
   - `unified` プロセッサを使用して、mdastをHTML AST（hast）に変換し、最終的にReact要素に変換します

2. **セグメント機能の統合**
   - `p`, `h1`-`h6`, `li`, `td`, `th`, `blockquote` などの特定のHTML要素を `WrapSegment` でラップし、セグメント情報（原文と訳文の紐づけ）を付与します
   - これにより、原文と訳文を動的に切り替える機能が実現されます

3. **各種プラグインの適用**
   - **ツイート埋め込み**: `remarkTweet` でツイートを `react-tweet` のコンポーネントに変換
   - **oEmbed埋め込み**: `remarkEmbedder` で外部コンテンツ（YouTube、Vimeoなど）を埋め込み
   - **リンクカード**: `remarkLinkCard` でリンクをカード形式で表示
   - **コードハイライト**: `rehypePrettyCode` でシンタックスハイライト（ダーク/ライトモード自動切替対応）
   - **画像最適化**: `img` タグを Next.js の `Image` コンポーネントに変換
   - **見出しID**: `rehypeSlug` で見出しにスラッグIDを自動付与

#### 原文と訳文のReact化について

原文もReact要素に変換する理由は、単純にHTMLとして表示するためではなく、以下の機能を実現するためです：

- **セグメント制御**: `WrapSegment` を通じて、原文と訳文の表示/非表示を動的に切り替える
- **インタラクティブ機能**: 投票、ポップオーバー、翻訳表示モードの切り替えなどの機能を提供
- **コンポーネント統合**: 画像の最適化、コードハイライト、埋め込みコンテンツなど、Reactコンポーネントとして統合する必要がある要素を処理

原文を完全に静的なHTMLとして扱うと、これらの機能を実現するために別の仕組み（DOM操作など）が必要になり、かえって複雑になります。サーバーコンポーネントとして実装されているため、React要素に変換しても最終的には静的なHTMLとしてストリーミングされ、パフォーマンスへの影響は最小限です。

## TODO
1. page本文､project説明
- 編集後も翻訳との紐づけを維持するために､textAndOccurrenceHashをキーにして紐づけを更新する
- 表示にはtextAndOccurrenceHashをキーにすると時間がかかるので､data-number-idをキーにする
- numberは､翻訳で渡すときのキーにもなっている｡
- これらをどうにかして簡略化する

2. page､project､コメントで要件が違っていて複雑すぎるのでなんとかする
- page､projectは編集後のひもづけ必要なので1.のようにしているが､コメントは編集機能がないので1.のようにしていない､しかし編集できたほうがいいので､できるようにする｡
  

3. Lexicalへの移行
tiptapにはmdを吐く公式の無料機能がないので､htmlを吐いているが､mdと統一するためにLexicalに移行し､Lexicalが吐いたmdを扱うようにしたい

このガイドに従うことで、一貫性のあるコンポーネントを開発し、プロジェクト全体の整合性を維持することができます。 
