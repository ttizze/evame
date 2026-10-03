# TanStack Start のデータ更新とキャッシュ

このアプリは Router の loader、SWR、HTTP レスポンスのそれぞれでデータの更新を管理します。Next.js の Cache Components、cacheTag、updateTag、revalidateTag は使用しません。

## Router のデータ

- `src/routes` の loader が GET の Server Function から取得します。
- プロフィール・設定の更新後は `router.invalidate({ sync: true })` で loader を再実行します。
- 翻訳ジョブが実行中のページは `useLocaleListAutoRefresh` が 5 秒ごとに Router を再取得します。
- サーバー側の DB クエリにはフレームワークによる永続キャッシュを設けていません。

## SWR のデータ

| データ | 更新する場所 |
| --- | --- |
| いいね状態・件数 | `page-like-button/client.tsx` が楽観的更新と Server Function の結果を `mutate` で反映 |
| セグメントの翻訳・投票 | `add-and-vote-translations.client.tsx` が追加・削除・投票後に `mutate` で再取得 |
| 通知 | `notifications-dropdown/client.tsx` が既読操作後に `mutate` で更新 |
| 翻訳ジョブ・言語一覧 | `use-translation-jobs.ts` と `locale-selector/client.tsx` の API 取得 |

## HTTP キャッシュ

| レスポンス | ポリシー |
| --- | --- |
| ページ詳細・プロフィール・編集画面・ログインの Server Function | `private, no-store`。`Vary` で Cookie 等の認証情報を区別 |
| sitemap index・各 sitemap | CDN で 1 時間、stale-while-revalidate は 1 日 |
| robots.txt | CDN で 10 時間、stale-while-revalidate |

設定の正本は `src/routes/$locale/-*-data.ts` と `src/routes/-seo-*.ts` です。HTTP キャッシュの更新はレスポンスの期限で行い、タグによる無効化 API は使用しません。

## 変更時の確認

更新する処理が Router・SWR のどちらのデータを表示するかを確認し、その所有者で再取得を実行します。認証情報を含むレスポンスは共有キャッシュに保存しません。
