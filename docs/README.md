# ドキュメント案内

デジタル仏教の現行仕様と運用手順をまとめています。現行の正本は TanStack Start、Cloudflare Workers、Turso Database を組み合わせた、仏典翻訳の閲覧・翻訳案の投稿・AI 翻訳ジョブ・認証済みユーザーによる投票サービスです。

## 入口

- **要件**: [`requirements.md`](requirements.md)
- **アーキテクチャ**: [`architecture/architecture.md`](architecture/architecture.md)
- **規約**: [`development-rules.md`](architecture/conventions/development-rules.md)、[`testing-rules.md`](architecture/conventions/testing-rules.md)
- **ADR**: [`adr/README.md`](adr/README.md)
- **HowTo**: [`howto/README.md`](howto/README.md)
- **Plans**: [`plans/README.md`](plans/README.md)

## まず読む手順

1. [要件](requirements.md) で、仏典の閲覧、翻訳案の投稿・生成、認証投票に限定したプロダクトの境界を確認する
2. [アーキテクチャ](architecture/architecture.md) で Worker、TanStack Start、Turso Database の責務を確認する
3. [開発環境](../README.ja.md#最短で動かす) で Nix と `just` の使い方を確認する
4. [Turso Database のマイグレーション](howto/db-reset.md) と [Cloudflare Workers のデプロイ](howto/cloudflare-workers.md) を必要に応じて参照する

`adr/` と `plans/` には過去の検討記録が含まれます。現行仕様と異なる記述がある場合は、`requirements.md` と `architecture/architecture.md` を優先します。
