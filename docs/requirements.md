# 要件・仕様（実装準拠）

本書は「現在のコードが実現している仕様」と「守るべき運用ルール」をまとめた要求仕様です。

## 目的
- ユーザー投稿テキストに翻訳・注釈・解説を付けて共有できるようにする
- 多言語対応の読みやすい閲覧体験を提供する
- 共同翻訳・評価が循環する場を提供する

## 対象ユーザー
- 読者: 既存ページの閲覧・翻訳の評価
- 投稿者: ページの作成・編集・公開
- 翻訳協力者: セグメント翻訳の追加・投票

## コア機能（現行）

### ページ/セグメント
- ページはセグメント（文書の分割単位）で管理する
- セグメント種別は `PRIMARY` / `COMMENTARY`
- ページは親子構造（`parentId`）と並び順（`order`）を持てる
- ページ状態は `DRAFT` / `PUBLIC` / `ARCHIVE`

### 翻訳
- 翻訳はセグメント単位で登録する
- ロケール別に翻訳を保持する
- 翻訳は point によって評価される
- 翻訳は作成者本人が削除できる
- 初期表示はサーバー側で最良翻訳を選定して返す（ページオーナー upvote → point 降順 → createdAt 降順）

### 翻訳の投票
- upVote/downVote を切り替え可能
- 投票により point が更新される
- 現在ユーザーの投票状態を返す

### 注釈
- セグメントに注釈セグメントを紐づける
- 注釈も翻訳対象（セグメント翻訳として扱う）

### コメント
- ページコメントを投稿できる
- コメントはスレッド構造（親子）を持つ
- コメントは論理削除（`isDeleted`）
- 返信数・最終返信日時を保持する
- コメント本文もセグメントとして翻訳対象

### いいね/フォロー/通知
- ページにいいねを付けられる
- ユーザーをフォローできる
- 通知タイプ: follow / page comment / page like /
  page segment translation vote / page comment segment translation vote

### 検索/タグ
- タイトル/本文/タグ/ユーザーで検索できる
- ページはタグ付け可能（多対多）
- タグページからページ一覧を取得できる

### AI 翻訳/ジョブ
- 翻訳ジョブを作成し、進捗とステータスを管理する
- ステータス: `PENDING` / `IN_PROGRESS` / `COMPLETED` / `FAILED`
- 翻訳処理は Qstash を経由して実行する
- 完了時は対象ページを revalidate する

### ファイルアップロード
- 画像等のアップロードは R2（開発は MinIO）に保存する

### ユーザー/プロフィール
- handle、名前、アイコン、プロフィール等を保持する
- AI ユーザー判定フラグ、プラン、累積ポイントを保持する

## Premium（課金: Polar）
- 課金対象は Premium のみ（C2C は本フェーズ外）
- Premium はサブスクリプション（1ユーザー = 1契約）を前提とする
- 課金事業者（MoR）は Polar とし、税務・請求・返金/チャージバック責任は Polar 側が負う
- プラン種別は `free` / `premium` のみとする（将来拡張可）
- ユーザープランの更新は Polar の webhook を単一のソースとする
- キャンセル/失効は webhook で `free` へ戻す
- プレミアム特典（現行実装に合わせる）
  - 翻訳の追加ロケール上限を拡張（free: 2 / premium: 4）
  - AI 翻訳のモデル選択拡張（premium 専用モデルの選択を許可）
- UI は「アップグレード導線」と「プラン状態表示」に限定する
- 管理画面から手動で plan を変更しない（運用で触らない）
- 返金・チャージバックの一次対応は Polar の標準フローに従う

## 画面・ルート（代表）
- `/[locale]`: ホーム（新着/人気/タグ別）
- `/[locale]/new-pages`: 新着ページ一覧
- `/[locale]/search`: 検索（title/content/tags/user）
- `/[locale]/tag/[tagName]`: タグ別一覧
- `/[locale]/user/[handle]`: ユーザーページ
- `/[locale]/user/[handle]/page/[pageSlug]`: ページ詳細（公開のみ）
- `/[locale]/user/[handle]/page/[pageSlug]/preview`: プレビュー
- `/[locale]/user/[handle]/page-management`: ページ管理
- `/[locale]/user/[handle]/page/[pageSlug]/edit`: 編集
- `/[locale]/auth/login`: ログイン
- `/[locale]/terms` / `/[locale]/privacy` / `/[locale]/maintenance`

## 並び順/ランキング（現行）
- 新着ページ: `createdAt` 降順
- 人気ページ: いいね数降順 → `createdAt` 降順
- タグの人気ページ: いいね数降順
- 翻訳一覧:
  1) ページオーナーの upvote がある翻訳を最上位
  2) `point` 降順
  3) `createdAt` 降順
- 最良翻訳の選定: ページオーナー upvote → `point` 降順 → `createdAt` 降順（DISTINCT ON）
- コメント一覧: `createdAt` 昇順

## 権限/アクセス
- 編集/管理はページ所有者のみ
- 公開ページは `PUBLIC` のみ表示
- ログインが必要な機能は認証済みユーザーのみ

## i18n/ロケール
- ルートは `src/app/[locale]` を基点とする
- 翻訳はロケール単位で取得・表示する

## 生成/SEO/配信
- `force-static` を基本とし、必要に応じて ISR を使う
- `robots.txt` / `sitemap.xml` を提供する
- OG 画像生成 API を持つ

## データ整合性（要点）
- ページ/コメントは contents と 1:1 で紐づく
- ページとタグは多対多（`tag_pages`）
- 翻訳投票は翻訳ID + ユーザーIDで一意
- フォローは follower + following で一意

## 必須条件（実装前提）
- **静的生成を最優先**: ルート全体を dynamic にしない
- `layout` / `provider` では `useSearchParams` / `useQueryState` を使わない
- URL 同期は必要最小の Client Component に限定する
- `useSearchParams` / `useQueryState` を使う場合は、使用箇所の直近に `Suspense` を置く

## 表示モード同期（view）
- `view` の URL 同期は UI 操作コンポーネント（例: `ViewCycle`）に限定する
- provider は状態共有のみを担当し、副作用（URL/クッキー同期）を持たせない

## 運用ルール
- コード配置は `docs/architecture/conventions/route-colocation.md` に従う
- 変更は最小限で、シンプルさを最優先する
- `useMemo` / `useCallback` を使用しない
- `useEffect` は必要な場合のみ
- 不要なコードは削除する

## Premium（Polar）実装タスク
### 設計
- Polar の商品/価格を 1 プラン（Premium）に絞って作成する
- Premium の entitlements は上記「プレミアム特典」に揃える

### データ/DB
- ユーザーテーブルに `plan` を保持（既存を流用）
- Polar 連携用に `polarCustomerId` / `polarSubscriptionId` を保持

### API / Webhook
- Polar の Checkout セッション作成 API を実装
- Webhook 受信で `plan` を更新（購入/更新/解約/失効）
- Webhook 署名検証を必須化
- 失敗時の再送処理を idempotent にする

### UI
- ヘッダー or 設定画面に「Premium へアップグレード」導線を追加
- プラン状態（free/premium）を表示
- Premium 限定機能の説明を最小で明示

### 権限/ガード
- Premium 特典の適用は `plan === "premium"` のみに限定
- ガードは server 側で判定し、client 側は表示制御のみにする

### 運用
- Polar 側で税務/請求/返金・チャージバックを処理
- 料金・返金ポリシーは `/[locale]/terms` / `/[locale]/privacy` に反映

### テスト（最小）
- 「Premium で翻訳ロケール上限が 4 になる」
- 「Webhook 受信で plan が premium/free に切り替わる」

## 測り方（確認方法）
- `next build` の出力でルートが不要に dynamic 化されていないこと
- `bun run typecheck` / `bun run biome` が通ること
- 変更した画面・ルートで最低限の手動動作確認を行うこと
