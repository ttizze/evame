![Evame](./next/public/title-logo-dark.png)

# Evame

[English README](README.md)

Evame は、ユーザが投稿したテクストに対訳・脚注・解説を付け、美しいレイアウトで提供することを目的としたオープンソースプロジェクトです。世界中の人々に物語と知識への扉を開くことを目指しています。

## リポジトリ構成

```
/
├── next/                         # メインアプリケーション
│   ├── src/                      # ソースコード
│   ├── drizzle/                   # Drizzle スキーマとマイグレーション
│   └── public/                   # 静的ファイル
└── components/                   # Chrome 拡張機能 (現在は空)
```

開発の中心は `next/` ディレクトリにあります。共通 UI コンポーネントは `next/src/components/ui` にあり、機能ごとのコードは `next/src/features` にまとめられています。

## 技術スタック

- TypeScript
- Shadcn UI (Radix UI)
- Tailwind CSS
- Drizzle ORM と PostgreSQL
- NextAuth 認証
- next-intl による i18n
- TipTap エディタ
- LLM を用いた翻訳サービス

## 現在の機能

- 記事投稿
- LLM による翻訳
- 翻訳の保存と投票
- ユーザー投稿の翻訳を表示するリーダーモード

## 開発中の機能

- 対訳レイアウトの改良
- 脚注
- ハイライト
- HTML、PDF、EPUB、プレーンテキストへの対応
- Chrome 拡張機能
- 辞書検索などの高度な NLP 機能

## 開発環境のセットアップ

1. リポジトリをクローンします。
2. 依存関係をインストールします。
   ```bash
   bun install
   cd next
   bun install
   ```
3. `.env` を作成して `SESSION_SECRET` を設定します。
   ```bash
   cd next
   cp .env.example .env
   openssl rand -base64 32
   ```
   生成した文字列を `.env` に追加してください。
4. Docker を起動します。
   ```bash
   docker compose up -d
   ```
5. データベースをセットアップし、シードを実行します。
   ```bash
   cd next
   bunx drizzle-kit migrate dev
   bun run seed
   ```
6. 開発サーバーを起動します。
   ```bash
   bun run dev
   ```
7. ブラウザで `http://localhost:5173` にアクセスします。

ローカル開発では `/auth/login` で `dev@example.com` と `devpassword` を使用してログインできます。本番環境ではこの簡易ログインは無効です。

## 貢献

あらゆる形の貢献を歓迎しています。詳細は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

## ライセンス

このプロジェクトは MIT ライセンスで公開されています。詳細は [LICENSE](LICENSE) をご確認ください。

## コンタクト

質問や提案がある場合は Issue を作成するか、[Discord](https://discord.gg/2JfhZdu9zW) に参加してください。

世界中の人々に物語と知識への扉を開きましょう！
