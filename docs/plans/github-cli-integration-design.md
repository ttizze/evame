# CLI同期仕様（v1）

## 目的
- ローカルMarkdownをEvameへ安全に同期する。
- v1は「最小構成で破壊的操作を避ける」を優先する。

## v1の原則
1. APIは `POST /api/sync/push` と `GET /api/sync/pull` の2本だけ。
2. CLIの同期対象は **作成/更新（UPSERT）だけ**。削除/ARCHIVEはCLIから行わない。
3. 競合解決（`resolutions` / `FORCE` / interactive）は入れない。
4. 認証は2系統のみ。
   - 人: `evame login`（Webログイン連携）
   - CI: `EVAME_PAT`（Personal Access Token）
5. `state.json` は `last_applied_revision` だけ保持する。
6. `dry_run` は `POST /api/sync/push` の同一エンドポイントで扱う。

## ユーザーストーリー
1. ユーザーがリポジトリで `evame login` を実行する。
2. CLIがブラウザログインURLを開く。
3. Webでログイン完了するとCLIにトークンが戻り、ログイン状態になる。
4. ユーザーが `evame push` でローカルMarkdownを同期する。
5. ユーザーが `evame pull` でサーバー内容をローカルへ反映する。

## ローカル構成

### 設定ファイル
- `.evame/config.json`
  - `content_dir` のみ保持
- `.evame/state.json`
  - 形式:

```json
{
  "slugs": {
    "example-slug": {
      "last_applied_revision": "<sha256>"
    }
  }
}
```

### 認証情報
- 保存先（repo外）:
  - `$XDG_CONFIG_HOME/evame/auth.json`
  - または `~/.config/evame/auth.json`
- セキュリティ:
  - `auth.json` は **0600（ユーザーのみ）**、ディレクトリは **0700** を前提にする。
  - CLIは保存/読込時に権限を固定し、緩い権限の場合は修復を試みる。修復できない場合はエラーにする。
- `EVAME_PAT` が設定されている場合はファイルより優先。

### Markdown仕様
- 1ファイル = 1slug（ファイル名がslug）
- 必須frontmatter: `published_at`（ISO8601 or `null`）
- `title` は本文先頭の `# ...`（無い場合は本文先頭の非空1行）。frontmatterの `title` は使わない
- `body` はfrontmatter以降の本文（`title` に使った見出し行は本文から除外）

## DB実態との対応
- `title`: `segments.number = 0` の `text`
- `body`: `pages.mdastJson` を `mdastToMarkdown()` で復元
- `published_at`: `pages.published_at`（新規追加）
- `archived_at`: `pages.archived_at`（新規追加）

## Revision

```text
Revision = SHA256("{slug}.md\t{SHA256(body)}\t{published_at_or_empty}\t{title}")
```

- `body` は必ずサーバー正規形で算出する。
  - `markdown -> MDAST -> markdown` のround-trip後の文字列を使う。
- `published_at` はUTC ISO8601、`null` は空文字。

## Push API

### Endpoint
- `POST /api/sync/push`

### Request

```json
{
  "dry_run": false,
  "inputs": [
    {
      "slug": "hello-world",
      "expected_revision": "<or null>",
      "title": "Hello",
      "body": "markdown body",
      "published_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 判定（1slug）
- slug未使用: `AUTO_APPLY`
- slugがARCHIVE: `CONFLICT(archived_page)`
- slug既存 + `expected_revision = null`
  - 同内容: `NO_CHANGE`
  - 差分あり: `CONFLICT(content_conflict)`
- slug既存 + `expected_revision != null`
  - 一致 + 同内容: `NO_CHANGE`
  - 一致 + 差分: `AUTO_APPLY`
  - 不一致: `CONFLICT(revision_mismatch)`

### 全体ルール
- 1件でも `CONFLICT` があれば **全体中断**（DB更新なし）
  - HTTP `409`
  - `status = "conflict"`
- 競合がなければ全件適用（または `dry_run`）
  - 変更あり: `status = "applied"`
  - 変更なし: `status = "no_change"`

### Response

```json
{
  "status": "applied",
  "results": [
    {
      "slug": "hello-world",
      "action": "AUTO_APPLY",
      "detail": "UPSERT",
      "applied_revision": "<sha256>"
    }
  ]
}
```

## Pull API

### Endpoint
- `GET /api/sync/pull`

### Response
- 認証ユーザーの **非ARCHIVEページのみ** を返す。

```json
{
  "pages": [
    {
      "slug": "hello-world",
      "title": "Hello",
      "body": "markdown body",
      "published_at": "2024-01-01T00:00:00.000Z",
      "revision": "<sha256>"
    }
  ]
}
```

## CLI実装方針
- `push` 入力はローカル `.md` ファイルのみから作る（DELETE入力は作らない）。
- `push` 成功時に `applied_revision` を `state.json` に保存。
- `pull` はサーバー内容でローカルを書き戻し、存在しないslugは `state.json` から除去。
- `--force` なしの `pull` はローカル差分があるファイルを上書きしない。

## TDD実装手順（統合）
1. DBスキーマ: `published_at`, `archived_at`, `personal_access_tokens`
2. `compute-revision` の純粋関数テスト
3. `sync-judgment` の純粋関数テスト（UPSERTのみ）
4. 認証（service）テスト（session token + PAT）
5. Push service/route テスト（競合時全体中断を含む）
6. Pull route テスト（title/body/revision/ARCHIVE除外）
7. CLI lib/index テスト（login, push, pull, state更新）

## 検証コマンド

```bash
# 純粋関数
bunx vitest run src/app/api/sync/_domain/compute-revision.test.ts
bunx vitest run src/app/api/sync/push/_domain/sync-judgment.test.ts

# API
bunx vitest run src/app/api/sync/cli-login/_utils/redirect-uri.test.ts
bunx vitest run src/app/api/sync/_service/authenticate-token.test.ts
bunx vitest run src/app/api/sync/push/route.integration.test.ts
bunx vitest run src/app/api/sync/pull/route.integration.test.ts
bunx vitest run src/app/api/sync/cli-login/route.integration.test.ts

# CLI
bun test scripts/evame-cli/lib.test.ts

# 最終チェック
bunx vitest run
bun run biome
bun run typecheck
```
