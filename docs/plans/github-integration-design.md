# GitHub連携機能仕様（接続・認可・運用）

## 目的
- GitHub連携機能そのもの（接続・認可・設定・停止/解除）を同期ロジックから分離して明確化する
- 接続機能の責務を固定し、同期判定ロジックとの境界を保つ

## 関連ドキュメント
- 同期判定・適用仕様: `docs/plans/github-cli-integration-design.md`

## 境界前提
- 同期判定の識別境界は `slug` のグローバル空間を採用する
- GitHub接続データは `site_id` を持たない（接続ID基準で管理）

## 連携方式
- GitHub App方式を採用する（OAuth Token直保持は採用しない）
- 理由:
  - リポジトリ権限を最小化しやすい
  - インストール単位で無効化しやすい
  - 監査しやすい

## 連携状態
- `DISCONNECTED`: 未接続
- `CONNECTING`: インストール/初期設定途中
- `CONNECTED`: 接続完了（同期可能）
- `PAUSED`: 接続情報は保持、同期停止
- `REAUTH_REQUIRED`: 権限剥奪・アンインストール等で再認可が必要

## 初回接続フロー
1. ユーザーが「GitHub連携を開始」を押す
2. サーバーがCSRF防止 `state` を発行し、GitHub Appインストール画面へ遷移
3. コールバックで `state` と `installation_id` を検証
4. インストール配下リポジトリ一覧を取得
5. ユーザーが `repository / branch / file_glob` を選択
6. 接続設定を保存
7. 初回同期は「差分プレビュー（非永続）」を返し、競合有無を表示する

## 設定変更フロー（接続後）
- 変更可能:
  - `branch`
  - `file_glob`
  - `auto_sync_enabled`
- 変更時ルール:
  - 保存後に差分プレビュー（非永続）を返す
  - `repository` 変更は再接続フローで扱う

## Webhook受信フロー
1. 署名検証（失敗時 `401`）
2. `installation_id` から接続情報を解決
3. `repository / branch` が接続設定と一致するか検証
4. `delivery_id` で重複排除
5. 入力対象ファイルを抽出し、同期エンジンへ投入
6. 結果をGitHub Check Runへ反映
   - 競合なし: success
   - 競合あり: failure + 理由

## 停止・解除・再認可
- 一時停止:
  - `PAUSED` に遷移
  - push受信時は同期処理を実行しない
- 再開:
  - `CONNECTED` に遷移
  - 再開直後に差分プレビュー（非永続）を返す
- 解除:
  - `DISCONNECTED` に遷移
  - 以後のWebhook入力は無視
- 再認可:
  - `REAUTH_REQUIRED` から接続フロー再実行で復帰

## 最小権限
- Repository permissions:
  - `Contents: Read`
  - `Metadata: Read`
  - `Checks: Write`
- Webhook events:
  - `push`
  - `installation`
  - `installation_repositories`

## データ構造（GitHub連携専用）

### 1. `github_connections`
- `id`
- `owner_user_id`（接続設定の作成者）
- `installation_id`
- `account_login`
- `status`（`DISCONNECTED` / `CONNECTING` / `CONNECTED` / `PAUSED` / `REAUTH_REQUIRED`）
- `last_validated_at`
- `created_at`
- `updated_at`

### 2. `github_connection_settings`
- `github_connection_id`
- `repository_id`
- `repository_full_name`（`owner/repo`）
- `branch`
- `file_glob`
- `auto_sync_enabled`
- `updated_at`

### 3. `webhook_deliveries`（重複排除用）
- `delivery_id`
- `installation_id`
- `event_type`
- `received_at`
- `status`（`ACCEPTED` / `DUPLICATE` / `REJECTED`）

## API/エラー方針（接続機能）
- `200 OK`: 接続状態取得、正常コールバック
- `202 Accepted`: 非同期処理受理
- `400 Bad Request`: 不正なcallbackパラメータ
- `401 Unauthorized`: `invalid_webhook_signature`
- `403 Forbidden`: `github_repo_access_denied`
- `409 Conflict`: `repository_not_in_installation`

## 実装配置
- 接続開始: `src/app/api/github/connect/route.ts`
- コールバック: `src/app/api/github/callback/route.ts`
- Webhook入口: `src/app/api/github/webhook/route.ts`
- 連携設定UI: `src/app/[locale]/(common-layout)/[handle]/page-management/_components/git-hub-integration-tab.tsx`
