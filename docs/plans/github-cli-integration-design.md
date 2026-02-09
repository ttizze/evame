# CLI同期仕様

## 目的
CLIでローカルのMarkdownファイルをevameに同期する。アプリ編集は常に許可し、外部入力との競合を安全に検出する。

### 全体像
```
ローカル                         サーバー
┌──────────────┐    evame push    ┌──────────────┐
│ .md ファイル  │ ──────────────→ │  判定ロジック  │
│ (content_dir) │                 │              │
│              │    evame pull    │  AUTO_APPLY   │ → 適用
│ .evame/      │ ←────────────── │  NO_CHANGE    │ → スキップ
│  state.json  │                 │  CONFLICT     │ → 拒否
└──────────────┘                 └──────────────┘
```

- `push`: ローカルファイルをサーバーに送信。判定して自動適用 or 競合検出
- `pull`: サーバーのページを `.md` ファイルとしてダウンロード
- GitHub連携基盤は持たない。GitHubワークフローはGitHub Actions + CLIで実現する

---

## ファイル構成

### content_dir
CLIは `.evame/config.json` の `content_dir`（既定: `.`）配下の `.md` ファイルを再帰走査する。**ファイル名（拡張子除去）= slug**。ディレクトリ構造はslugに反映しない。

```
articles/                     ← content_dir: "./articles"
├── getting-started.md        → slug: getting-started
├── blog/
│   ├── my-post.md            → slug: my-post
│   └── update.md             → slug: update
└── guides/
    └── setup.md              → slug: setup
```

### 記事ファイルの判定
frontmatterに `title` があるファイルのみ同期対象。ないファイル（メモ・参考資料など）は無視する。

### Frontmatter
```yaml
---
title: "ページタイトル"                  # 必須（これがないファイルは同期対象外）
published_at: "2024-01-01T00:00:00Z"   # 任意、ISO8601
---
本文（Markdown）
```

| フィールド | 必須 | マッピング | 備考 |
|-----------|------|-----------|------|
| `title` | ○ | `pages.title` | 有無で同期対象を判定 |
| `published_at` | × | `pages.published_at` | 省略時 `null`（= DRAFT）。オフセット付きはUTCに正規化 |

- `status` はfrontmatterに含めない（`published_at` と削除操作から導出）
- body（frontmatter以降）→ `pages.body`
- 不正時は `422 Unprocessable Entity`

### slug命名規則
- `[0-9a-z\-]{1,50}`（小文字英数字とハイフンのみ）
- 異なるディレクトリに同名ファイルがあるとslugが衝突する → CLIがエラーで中断
- CLIは送信前に検証（fail fast）。サーバーも `422` で拒否（defense in depth）

---

## CLIコマンド

### コマンド一覧
| コマンド | 動作 |
|---------|------|
| `evame push` | 同期実行。競合時は非0終了 + 一覧表示 |
| `evame push --dry-run` | 差分プレビューのみ（適用しない） |
| `evame push --interactive` | 競合時にTUIで解決方法を選択 |
| `evame status` | ローカルとサーバーの差分を表示 |
| `evame pull` | サーバーのページを `.md` としてダウンロードし `state.json` を更新 |
| `evame pull --force` | ローカルファイルと内容が異なる場合も上書き |

### `evame status` の表示例
```
Slug                Local        Server       Status
──────────────────────────────────────────────────
my-post             abc123...    abc123...    ✓ synced
new-article         def456...    (none)       + new (local only)
setup               789abc...    111aaa...    ✗ mismatch
old-post            —            222bbb...    ↓ pull available
(deleted locally)   —            333ccc...    - deleted
```

### `evame pull` の動作
1. `GET /api/sync/pull` で全ページの `slug`, `title`, `body`, `published_at`, `revision` を取得
2. 各ページを frontmatter + body の `.md` ファイルとして `content_dir` に書き出す
3. `state.json` を更新（各slugの `last_applied_revision` をサーバーの `revision` に合わせる）

| ローカル | サーバー | 動作 |
|---------|---------|------|
| ファイルなし | ページあり | `.md` を新規作成 |
| ファイルあり・同内容 | ページあり | 何もしない |
| ファイルあり・内容差分 | ページあり | スキップして警告（`--force` で上書き） |
| state.jsonにあり | ARCHIVE/削除済み | ファイルは触らず `state.json` から削除 |

### ローカル設定: `.evame/config.json`
```json
{
  "content_dir": "./articles",
  "api_key": "evame_..."
}
```
- `content_dir`（既定: `.`）: 記事ファイルの探索ルート
- `api_key`: APIキー（環境変数 `EVAME_API_KEY` でも可。環境変数が優先）

### ローカル状態: `.evame/state.json`
```json
{
  "slugs": {
    "my-post": { "last_applied_revision": "abc123...", "last_applied_at": "2024-01-01T00:00:00Z" },
    "setup": { "last_applied_revision": "def456...", "last_applied_at": "2024-01-02T00:00:00Z" }
  }
}
```
- push成功時にレスポンスの `applied_revision` を保存
- `partial` 時は成功slugのみ更新
- `.evame/` は `.gitignore` に含める

---

## 同期の仕組み

### Revision
ページの版ID。内容から決定的に算出するハッシュ値で、**DBに保存せず都度算出する**。

**アルゴリズム:**
1. `"{fileName}\t{SHA256(body)}\t{published_at_or_empty}\t{title}"` を作る
   - `fileName`: `{slug}.md`
   - `SHA256(body)`: body（frontmatter除外）のSHA256hex
   - `published_at_or_empty`: UTC正規化済みISO8601。未設定時は空文字
   - `title`: ページタイトル
2. 上記文字列の `sha256` = そのslugの Revision

CLI・サーバー双方で同一アルゴリズムを使う。サーバー側は `computeRevision(page)` として都度算出する。

### 入力の生成（CLI側）
- **UPSERT_INPUT**: `content_dir` 内の `title` 付き `.md` ファイル。`expected_revision` は `state.json` の `last_applied_revision`（未登録時 `null`）
- **DELETE_INPUT**: `state.json` にあるが対応ファイルがないslug。`expected_revision` は `state.json` の `last_applied_revision`

### 判定ロジック（サーバー側）

**UPSERT_INPUT:**
| slug状態 | 条件 | 判定 |
|---------|------|------|
| 未使用（ARCHIVE含む） | — | `AUTO_APPLY(UPSERT)` |
| 既存 | `new_revision == computeRevision(page)` | `NO_CHANGE` |
| 既存 | `expected=null` かつ上記以外 | `CONFLICT(content_conflict)` |
| 既存 | `expected == computeRevision(page)` | `AUTO_APPLY(UPSERT)` |
| 既存 | `expected != computeRevision(page)` | `CONFLICT(revision_mismatch)` |

**DELETE_INPUT:**
| slug状態 | 条件 | 判定 |
|---------|------|------|
| 未使用（ARCHIVE含む） | — | `NO_CHANGE` |
| 既存 | `expected == computeRevision(page)` | `AUTO_APPLY(DELETE)` |
| 既存 | 上記以外 | `CONFLICT(delete_conflict)` |

> 判定起点はサーバーDBの `pages.slug` 照合結果のみ。クライアントの「新規/更新のつもり」は判定根拠にしない。

### 適用ルール
- 全slug `AUTO_APPLY` / `NO_CHANGE` → 適用
- 1件でも `CONFLICT` → 全体拒否（`FORCE` 解決済みを除く）
- 適用内容:
  - `UPSERT`（新規）→ ページ作成
  - `UPSERT`（更新）→ タイトル・本文・`published_at` を上書き
  - `UPSERT`（ARCHIVE復元）→ `status` を `published_at` から再計算、`archived_at = NULL`、内容上書き
  - `DELETE` → `status = ARCHIVE`, `archived_at = now()`

### 原子性
- slug単位のトランザクション。`SELECT ... FOR UPDATE` で行ロック → 判定 → 適用 → コミット
- ロック待ちタイムアウト時は `409(concurrent_update_conflict)` で再試行
- 流れ: 全slug分類 → CONFLICT あれば全体拒否 → 各slugを個別トランザクションで適用

### 競合解決（`--interactive`）
1. `/api/sync/preview` で差分プレビュー取得
2. TUIで競合ごとに解決アクションを選択
3. `resolutions` に含めて `/api/sync/push` で送信

| アクション | 動作 |
|-----------|------|
| `FORCE` | 強制適用。`resolutions` でサーバーに送る |
| `SKIP` | CLI側で `inputs` から除外（次回再判定） |

### アプリ操作の扱い
| 操作 | 動作 | CLI同期への影響 |
|------|------|----------------|
| 編集 | 保存。特別な処理なし | `computeRevision(page)` が変わり、次回pushで自然に競合検出 |
| 削除 | `status=ARCHIVE`, `archived_at=now()` | CLIからは「slug未使用」に見える |
| 復元 | `published_at` に基づき DRAFT/PUBLIC に遷移 | 再pushで対応 |

### 公開判定
| 優先順 | 条件 | 判定 |
|--------|------|------|
| 1 | `status == ARCHIVE` | ARCHIVE（公開導線から除外） |
| 2 | `published_at = NULL` | DRAFT |
| 3 | `published_at > now` | DRAFT（公開待ち） |
| 4 | `published_at <= now` | PUBLIC |

- 予約公開: `published_at` に未来日時を設定
- CLI: frontmatterの `published_at` から設定（省略 = DRAFT）
- 削除ページは ARCHIVE としてデータ保持

---

## リファレンス

### パターン一覧

| No | 入力 | 事前状態 | 判定 | 動作 |
|---|---|---|---|---|
| 1 | UPSERT | slug未使用（ARCHIVE含む） | AUTO_APPLY | 新規作成 or ARCHIVE復元 |
| 2 | UPSERT | slug既存・`expected=null`・同内容 | NO_CHANGE | — |
| 3 | UPSERT | slug既存・`expected=null`・内容差分 | CONFLICT | 停止 |
| 4 | UPSERT | slug既存・`expected` 一致・同Revision | NO_CHANGE | — |
| 5 | UPSERT | slug既存・`expected` 一致・内容差分 | AUTO_APPLY | 上書き |
| 6 | UPSERT | slug既存・`expected` 不一致 | CONFLICT | 停止 |
| 7 | DELETE | slug未使用（ARCHIVE含む） | NO_CHANGE | — |
| 8 | DELETE | slug既存・`expected` 一致 | AUTO_APPLY | ARCHIVE化 |
| 9 | DELETE | slug既存・`expected` 不一致 | CONFLICT | 停止 |

> `expected_revision = null`（初回push）: slug未使用→#1、同内容→#2、内容差分→#3

### エッジケースと対策
| ケース | 対策 |
|--------|------|
| CLIローカル状態が古い | `revision_mismatch` を返す。`evame pull` で再同期 |
| App編集と外部更新が衝突 | `computeRevision(page)` が変わり自然に競合検出 |
| 判定後にアプリ編集が割り込む | `FOR UPDATE` ロックで防止 |
| 同一更新の再送（リトライ） | `new_revision == computeRevision(page)` → NO_CHANGE（冪等） |
| 複数CLIが同時にpush | slug単位ロックで直列化。後続は `revision_mismatch` |
| `partial` 時のローカル状態 | 成功slugのみ `state.json` を更新 |

### API仕様

**エンドポイント:**
| メソッド | パス | 用途 |
|---------|------|------|
| POST | `/api/sync/push` | 同期（適用） |
| POST | `/api/sync/preview` | 差分プレビュー |
| GET | `/api/sync/status` | サーバー状態取得 |
| GET | `/api/sync/pull` | 全ページのコンテンツ取得 |

全エンドポイントAPIキー認証。APIキーはプロジェクトに紐づく（1キー = 1プロジェクト）。

**リクエスト（push / preview 共通）:**
```json
{
  "inputs": [
    {
      "type": "UPSERT",
      "slug": "my-post",
      "expected_revision": "abc123...",
      "new_revision": "def456...",
      "title": "記事タイトル",
      "body": "本文...",
      "published_at": "2024-01-01T00:00:00Z"
    },
    {
      "type": "DELETE",
      "slug": "old-post",
      "expected_revision": "111aaa..."
    }
  ],
  "resolutions": { "conflict-post": "FORCE" }
}
```
- `resolutions` は `--interactive` 時のみ
- 制約: 最大100件 / body最大1MB / 全体最大10MB（超過時 `413`）

**レスポンス（push / preview 共通）:**
```json
{
  "status": "applied",
  "results": [
    { "slug": "my-post", "action": "AUTO_APPLY", "detail": "UPSERT", "applied_revision": "def456..." },
    { "slug": "old-post", "action": "AUTO_APPLY", "detail": "DELETE" },
    { "slug": "unchanged", "action": "NO_CHANGE" }
  ]
}
```
`status`: `applied` / `no_change` / `conflict` / `partial` / `preview`

競合時は `reason` を含む:
```json
{ "slug": "conflict-post", "action": "CONFLICT", "reason": "content_conflict", "server_revision": "current..." }
```

**ステータスレスポンス（GET /api/sync/status）:**
```json
{
  "pages": [
    { "slug": "my-post", "revision": "abc123...", "status": "PUBLIC" },
    { "slug": "setup", "revision": "def456...", "status": "DRAFT" }
  ]
}
```

**プルレスポンス（GET /api/sync/pull）:**
```json
{
  "pages": [
    {
      "slug": "my-post",
      "revision": "abc123...",
      "status": "PUBLIC",
      "title": "記事タイトル",
      "body": "本文...",
      "published_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

いずれもARCHIVEページは含まない。

**HTTPステータス:**
`200` 成功 / `401` 認証不正 / `409` 競合 / `413` 制約超過 / `422` バリデーションエラー

### テーブル構造

**`pages`（既存）:**
| カラム | 説明 |
|--------|------|
| `id` | PK |
| `slug` | 一意 |
| `title` | ページタイトル |
| `body` | Markdown本文 |
| `status` | `DRAFT` / `PUBLIC` / `ARCHIVE` |
| `published_at` | 公開開始日時 |
| `archived_at` | ARCHIVE遷移日時（ARCHIVE以外は `NULL`） |
| `updated_at` | 更新日時 |

同期用の追加カラムはない。競合判定は `computeRevision(page)` で都度算出する。

### 実装配置
| 役割 | パス |
|------|------|
| CLI同期 | `src/app/api/sync/push/route.ts` |
| 差分プレビュー | `src/app/api/sync/preview/route.ts` |
| ステータス取得 | `src/app/api/sync/status/route.ts` |
| コンテンツ取得 | `src/app/api/sync/pull/route.ts` |
| 判定/適用 | `src/app/[locale]/_service/import/orchestrate-import.server.ts` |
| ファイル適用 | `src/app/[locale]/_service/import/apply-import-file.server.ts` |

### GitHub Actionsでの利用
GitHub連携基盤は持たない。GitHub Actionsから `evame push` を呼ぶことで同等のワークフローを実現する。

```yaml
# .github/workflows/publish.yml
name: Publish to evame
on:
  push:
    branches: [main]
    paths: ['articles/**']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx evame push
        env:
          EVAME_API_KEY: ${{ secrets.EVAME_API_KEY }}
```

```yaml
# .github/workflows/preview.yml
name: Preview changes
on:
  pull_request:
    paths: ['articles/**']
jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx evame push --dry-run
        env:
          EVAME_API_KEY: ${{ secrets.EVAME_API_KEY }}
```
