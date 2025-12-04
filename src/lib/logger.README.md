# ロギングガイド

このプロジェクトでは、[Pino](https://github.com/pinojs/pino)を使用した構造化ロギングを実装しています。

## 特徴

- **高速**: Pinoは非常に高速なログライブラリです
- **構造化ログ**: JSON形式でログを出力（本番環境）
- **開発体験**: 開発環境では`pino-pretty`で読みやすく表示
- **Sentry統合**: サーバー側ロガーはSentryと自動統合

## 基本的な使い方

### サーバー側（推奨）

```typescript
import { createServerLogger } from "@/lib/logger.server";

const logger = createServerLogger("my-service");

// デバッグログ（開発環境のみ）
logger.debug({ userId: "123" }, "User logged in");

// 情報ログ
logger.info({ pageId: 456 }, "Page loaded");

// 警告ログ
logger.warn({ slug: "invalid-page" }, "Page not found");

// エラーログ（Sentryにも送信）
logger.error({ err: error }, "Failed to load page");
```

### クライアント側

通常、クライアント側ではログを出力しません。エラーはSentryが自動的にキャプチャします。

## ログレベル

環境変数`LOG_LEVEL`で設定できます：

- `debug`: すべてのログを出力（開発環境のデフォルト）
- `info`: 情報レベル以上を出力（本番環境のデフォルト）
- `warn`: 警告以上を出力
- `error`: エラーのみ出力

```bash
# .env.local
LOG_LEVEL=debug
```

## オブザーバビリティのベストプラクティス

オブザーバビリティ・エンジニアリングの原則に基づいたログ戦略：

### 1. ログの目的

ログは**問題の診断とトラブルシューティング**のために使用します。本番環境では通常、正常フローではログを出しませんが、**DEBUGレベルで正常フローの重要なポイントを記録**することで、必要に応じて有効化してトラブルシューティングに活用できます。

### 2. 適切なログレベルを使う

- **DEBUG**: 正常フローの追跡情報（本番ではデフォルトで出力されないが、必要に応じて有効化可能）
  - エントリーポイント（リクエスト受信、関数開始など）
  - 主要な分岐点（条件分岐、ループの開始/終了など）
  - 重要な処理の完了（データ取得完了、レンダリング完了など）
- **INFO**: 重要なビジネスイベントのみ（例: アーカイブされたページへのアクセス、重要な状態変更）
- **WARN**: 異常な状態だが処理は継続できる（例: 期待しないステータス、データ不整合の可能性）
- **ERROR**: エラーが発生したがアプリケーションは継続できる

**原則**: 
- 本番環境のデフォルト: エラー、警告、重要なビジネスイベントのみ記録
- DEBUGレベルで正常フローの重要なポイントを記録（必要に応じて有効化）
- リクエストIDなどでログを追跡可能にする

### 3. ログを記録すべきケース

✅ **記録する**:
- エラーが発生した場合
- 異常な状態（期待しない値、データ不整合など）
- 重要なビジネスイベント（例: アーカイブされたページへのアクセス）
- セキュリティ関連のイベント

❌ **記録しない**:
- 正常なリクエスト処理
- データベースクエリの成功
- 正常なページレンダリング
- 正常なデータ取得

### 2. 構造化ログを使う

❌ 悪い例:
```typescript
logger.info(`User ${userId} accessed page ${pageSlug}`);
```

✅ 良い例:
```typescript
logger.info({ userId, pageSlug }, "User accessed page");
```

### 3. コンテキスト情報を含める（リクエスト追跡）

リクエストIDを含めることで、1つのリクエストに関連するすべてのログを追跡できます：

```typescript
const logger = createServerLogger("page-view", {
  requestId: request.id,  // 重要: リクエスト追跡のため
  userId: user.id,
  path: request.path,
});

// 同じリクエストIDで複数のログを出力すると、後で追跡しやすい
logger.debug({ requestId: request.id, pageSlug }, "Request started");
logger.debug({ requestId: request.id, pageSlug }, "Data fetched");
logger.debug({ requestId: request.id, pageSlug }, "Response sent");
```

本番環境で問題が発生した場合、`LOG_LEVEL=debug`に設定して再現させれば、そのリクエストIDに関連するすべてのDEBUGログを取得できます。

### 4. 機密情報を避ける

❌ 悪い例:
```typescript
logger.info({ password, creditCard }, "User data");
```

✅ 良い例:
```typescript
logger.info({ userId, email }, "User data");
```

### 5. エラーは適切に記録

```typescript
try {
  // ...
} catch (error) {
  logger.error({ err: error, context: "page-load" }, "Failed to load page");
  throw error; // 必要に応じて再スロー
}
```

### 6. 正常フローの追跡（DEBUGレベル）

正常フローでもトラブルシューティング時に追跡できるよう、**DEBUGレベルで重要なポイントを記録**します。本番環境ではデフォルトで出力されませんが、必要に応じて`LOG_LEVEL=debug`で有効化できます。

✅ **良い例**: DEBUGレベルで正常フローを記録
```typescript
// エントリーポイント: リクエスト受信
logger.debug({ pageSlug, locale, handle }, "Page view request received");

// データ取得の開始と完了
logger.debug({ pageSlug }, "Fetching page context");
const data = await fetchPageContext(pageSlug, locale);
logger.debug({ pageSlug, found: !!data }, "Page context fetched");

if (!data) {
  // 警告: データが見つからない（異常な状態）
  logger.warn({ pageSlug, locale, handle }, "Page context not found");
  return notFound();
}

if (pageDetail.status !== "PUBLIC") {
  // 警告: 期待しないステータス（異常な状態）
  logger.warn({ pageSlug, status: pageDetail.status }, "Page status is not PUBLIC");
  return notFound();
}

// 重要なビジネスイベントのみ記録（INFOレベル）
if (pageDetail.status === "ARCHIVE") {
  logger.info({ pageSlug, pageId: pageDetail.id }, "Archived page accessed");
}

// 処理完了
logger.debug({ pageSlug }, "Page rendered successfully");
```

❌ **悪い例**: 過剰なDEBUGログ（細かすぎる）
```typescript
// 過剰: すべてのステップでログを出す（不要）
logger.debug({ pageSlug }, "Starting function");
logger.debug({ pageSlug }, "Validating input");
logger.debug({ pageSlug }, "Input validated");
logger.debug({ pageSlug }, "Calling database");
logger.debug({ pageSlug }, "Database called");
// ... など
```

**バランス**: エントリーポイント、主要な分岐点、重要な処理の完了など、**トラブルシューティングに役立つ最小限のポイント**のみ記録します。

### 7. 高頻度イベントのサンプリング

高頻度で発生するイベント（例: ページビュー）は、全件記録せずにサンプリングを検討：

```typescript
// サンプリング例: 100件に1件のみ記録
const shouldLog = Math.random() < 0.01; // 1%の確率
if (shouldLog) {
  logger.info({ pageSlug, userId }, "Page view (sampled)");
}
```

ただし、エラーや警告は**常に記録**してください。

## 開発環境での表示

開発環境では、JSON形式でログが出力されます。読みやすくするには、`pino-pretty`をパイプで使用：

```bash
bun run dev | bunx pino-pretty
```

または、ログをファイルに出力してから表示：

```bash
bun run dev > app.log 2>&1
tail -f app.log | bunx pino-pretty
```

## 本番環境での出力

本番環境では、JSON形式で構造化ログが出力されます：

```json
{
  "level": "info",
  "time": "2024-01-15T01:30:45.123Z",
  "service": "page-view",
  "pageId": 456,
  "slug": "my-page",
  "msg": "Page loaded"
}
```

このJSON形式は、ログ管理ツール（Datadog、Elasticsearch、CloudWatchなど）で簡単に解析できます。

## 一時的なデバッグログについて

調査目的で追加した一時的なデバッグログは、以下のいずれかを行ってください：

1. **削除する**: 問題が解決したら削除（推奨）
2. **DEBUGレベルにする**: 本番環境ではデフォルトで出力されないが、必要に応じて有効化可能
3. **環境変数で制御**: 特定の調査のみ有効化したい場合

```typescript
// 環境変数で制御する例（特定の調査のみ）
if (process.env.ENABLE_SPECIFIC_DEBUG === "true") {
  logger.debug({ ... }, "Specific debug information");
}
```

**通常のDEBUGログとの違い**:
- **通常のDEBUGログ**: 正常フローの重要なポイントを常に記録（本番では`LOG_LEVEL=debug`で有効化）
- **一時的なデバッグログ**: 特定の問題調査のためだけに追加（調査後は削除）

## 本番環境でのDEBUGログの活用

本番環境で問題が発生した場合、DEBUGログを有効化して正常フローを追跡できます：

```bash
# 一時的にDEBUGログを有効化
LOG_LEVEL=debug bun run start

# または環境変数で設定
export LOG_LEVEL=debug
```

**使用シナリオ**:
- 特定のリクエストで問題が発生している場合
- パフォーマンス問題の調査
- データフローの確認
- 新しい機能のデプロイ後の動作確認

**注意**: DEBUGログは大量に出力されるため、調査が終わったら`LOG_LEVEL=info`に戻してください。

## ログ量の目安

本番環境でのログ量の目安：

- **デフォルト（LOG_LEVEL=info）**: 1リクエストあたり 0-2ログ（エラー・警告・重要なイベントのみ）
- **DEBUG有効時（LOG_LEVEL=debug）**: 1リクエストあたり 5-10ログ（エントリーポイント、主要な分岐点、処理完了など）
- **正常フロー**: DEBUGレベルで記録（本番ではデフォルトで出力されない）
- **エラー・警告**: 常に記録（LOG_LEVELに関係なく）

**注意**: ログ量が多すぎると：
- ストレージコストが増加
- ログ解析が困難になる
- パフォーマンスに影響する可能性がある
- 重要なログが見つけにくくなる

**推奨アプローチ**:
- 正常フローの重要なポイントはDEBUGレベルで記録
- 本番環境ではデフォルトで`LOG_LEVEL=info`を使用
- トラブルシューティング時のみ`LOG_LEVEL=debug`に変更
- リクエストIDを含めてログを追跡可能にする

