# 公開HTMLとデータ更新

## 配信経路

公開トップ・記事・著者・新着・タグ・About・規約は、公開・更新時とデプロイ時にAstroでHTMLを事前生成し、非公開R2バケット `evame-reader-html` に保存する。本文・一覧・コメントを含む完成済みHTMLを返し、初めて開くURLやWorkers CacheのミスでもDB取得とAstroの描画を待たせない。Astroの `output: server` は生成処理と検索・下書きプレビューのために維持する。ビルド時のDB取得も、閲覧時に初めて生成する方式も、公開済みの生成対象URLには使わない。

- `evame-start` は同一ドメインの入口。メンテナンス判定後、公開GET/HEADをDB接続なしでREADER bindingへ渡す。外側は `private, no-store` にし、言語Cookieとセキュリティヘッダーを付ける。
- `evame-reader` は保存済みHTMLをR2から読み、Cloudflare Workers Cacheへ保存する。キャッシュ命中時はR2もDBもAstroも実行しない。キャッシュは失効・退避され得るため、永続HTMLの代わりにはしない。
- `ReaderBackend` はGatewayの非公開WorkerEntrypoint。BACKEND bindingからだけ公開データと生成対象一覧を取得でき、ブラウザー向けHTTPルートには登録しない。
- `reader/src/pages/[...path].astro` は通常の描画と生成で同じコンポーネントを使う。生成では認証ヘッダーを渡さず、同じデータを原文・翻訳・両方表示に再利用する。セッションCookieを含むレスポンスやprivateな結果を共有HTMLに保存しない。

生成対象は21言語の公開記事、実在するコメントの全ページ、新着・著者・タグの全ページ、著者の人気順と新着順、Aboutと規約。`view=user/source/both` もそれぞれ生成する。URLの既定値・不正値・追跡パラメーターは正規化し、同じ内容のHTMLを使う。検索、所有者の下書きプレビュー、存在しないページ番号など事前生成範囲外のURLは従来どおりリクエスト時に描画する。404は共有キャッシュへ保存せず、所有者のプレビューを隠さない。

HTMLの `X-Evame-HTML: generated` / `dynamic` で配信経路を確認できる。生成済みHTMLでも、認証ヘッダー・コメント投稿・いいね・翻訳・通知などは従来のReact islandとprivate APIで動作する。トップの30秒更新、Cookieバー、フローティングバー、目次、アイコンを含む既存の表示と操作を維持する。

## 更新検出と公開

`src/drizzle/0001_reader_publication.sql` のトリガーは、本文・段落・翻訳・コメント・タグ・公開状態・プロフィール・フォローの変更を、元の書き込みと同じDBトランザクションで `reader_revisions` へ記録する。認証セッションやAPIキーは対象にしない。階層の構造と見出しの版を本文の版から分け、本文だけの変更で同じツリー全体を再生成しない。

`src/app/api/reader-data/_db/queries.ts` は1回の読み取りSQLで整合した生成元を取得する。書き込みトランザクションを保持しない。`_service/load-reader-catalog.ts` がDBの版を照合して生成元を再利用し、`_domain/reader-documents.ts` は要求された言語のURLだけを返す。掲載記事・ページ数・階層・コメント著者・フォロー関係からURLごとの依存情報を作り、変更のない記事を再生成しない。Aboutの件数も生成時に最新DBから取得し、以前の短期キャッシュを永続HTMLへ固定しない。閲覧数・いいね・人気順は1時間ごとのCronで再集計・再生成し、ブラウザー側の即時更新も維持する。

Gatewayは公開内容を変える操作の後にReaderの非公開 `/__invalidate` を呼ぶ。Readerは変更されたHTMLを生成し、非公開化・削除したURLは404へ置き換える。既存Gatewayには従来どおり204で完了を返す。バッチ対応Gatewayには途中経過を202で返し、Gatewayは次のバッチを要求する。全バッチとReader自身の `cache.purge({tags:["evame-reader"]})` の成功を待ってから、利用者へ保存成功を返す。下書きの自動保存、いいね、画像アップロード、Geminiキー、翻訳の投入だけでは公開HTMLを更新しない。

`reader/src/publication.ts` がR2のHTMLと公開一覧を所有する。公開一覧は `publication/<locale>.json` に分け、1回に96件ずつ処理する。生成中のURLも先に公開一覧へ登録するため、初回生成中の非公開化でも必ず404を書き込める。DBの版とR2の条件付き書き込みで古い生成結果の上書きを防ぐ。同一の404本文でETagが変わらない場合も版が巻き戻らないよう、HTMLコメントにDBの版を含める。競合時は生成をやり直し、DBへの書き込みを再実行しない。生成に失敗したバッチは完了扱いにせず、再実行で再開できる。HTMLはR2内部だけで扱い、R2の公開ドメインは有効にしない。

生成・無効化に失敗した場合は保存成功を返さない。DBへの変更が完了している可能性はある。Cloudflare上のpurgeは受付成功と伝播に分かれるため、実CDNのMISS/HITと更新後の本文・非公開化を本番で確認する。ローカルworkerdにpurgeがない場合は共有キャッシュを無効にし、R2からの配信だけを検証する。

## デプロイ

後方互換の本番DBマイグレーションを先に実行し、AstroとTanStackをビルドする。公開HTMLはデプロイ後に現在のDBから生成する。

初回切り替え時だけ、非公開R2バケットを作成し、マイグレーション後・Reader切り替え前に `bun run initialize:reader-html` を実行する。本番DBとCloudflareへの認証を環境変数・ローカル認証で渡す。各言語の未生成URLを `pending:deployment` として登録し、切り替え中の通常の記事保存が過去記事全件の生成を引き受けないようにする。既存の公開一覧は上書きせず、HTMLも公開しない。これは移行準備であり、以後のデプロイでは不要。

1. 旧Readerでも動くGatewayを先にデプロイする。
2. Readerをデプロイし、新旧のHTMLが参照するJS/CSSを配信する。
3. 両Workerの更新成功後にアセット履歴を確定する。旧アセットは配信終了から30日間保持する。
4. `scripts/generate-reader-html.mjs` が認証済みのCloudflare remote binding経由で非公開 `/__publish` を繰り返し呼び、全URLを現在のコードで生成する。完了後にキャッシュを無効化する。

コードだけの更新で、一般利用者の保存処理に全サイトの再生成を引き受けさせない。コンテンツ更新は内容の差分だけを生成し、コードの一括更新はデプロイ処理が担当する。生成中は既存HTMLを維持し、更新後のHTMLが参照するアセットを先に配信してリンク切れを防ぐ。HTML生成だけが失敗してもアセットの実際の配信履歴は保持し、Actions cacheにも保存する。

## 検証

ユニット・DBテストでURL正規化、差分対象、更新検出、初回生成と非公開化の競合、既存HTMLの更新競合、認証情報の除外を確認する。成果物テストは認証済みの保存・公開・編集・非公開化・削除に加え、DBを停止してから未訪問URLのトップ・本文・著者一覧を読む。JavaScript無効のコメント途中ページと、ログイン後の投稿・言語選択・Tiptap・既存UIはブラウザーで検証する。本番相当のローカル検証はサーバーとブラウザー両方のSentry送信を無効にする。

- [Astro Cloudflareのカスタムfetch](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [R2の整合性](https://developers.cloudflare.com/r2/reference/consistency/)
- [R2 Workers APIと条件付き書き込み](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [Cloudflare Workers Cache](https://developers.cloudflare.com/workers/cache/)
