![Evame](./web/public/title-logo-dark.png)

# Evame

## 概要

Evameは、ユーザの投稿したテクストに対訳､脚注､解説を付け、美しいレイアウトで提供し､知識と文化の交流を促進することを目指すオープンソースプロジェクトです。

このプロジェクトの目的は、世界中の人々に、物語と知識への扉を開くことです。

## 現在の機能

- 記事投稿
- LLM（大規模言語モデル）を使用した翻訳
- 翻訳結果の保存
- 翻訳結果への投票
- 翻訳の投稿

## 開発中の機能

- 読みやすいレイアウト：対訳を見やすく配置（改善中）
- 脚注の追加（計画段階）
- ハイライト機能（計画段階）
- 複数フォーマット対応：HTML、PDF、EPUB、プレーンテクスト（計画段階）
- chrome 拡張機能(計画段階)
- 高度な自然言語処理機能の統合(計画段階)
  - 文章から重要な部分を抜き出し、辞書から訳を検索する等

## システム構成

- React (Remix SSR モード)
- 翻訳エンジン: Gemini（現在はコンテクスト長のメリットからこれのみを使用）

## 使用方法

1. このリポジトリをクローンします：
   ```
   git clone https://github.com/ttizze/evame.git
   ```
2. 必要な依存関係をインストールします：

   ```
   cd evame
   cd web
   bun i
   ```

3. 環境変数ファイルを作成し、必要な値を設定します：

   ```
   cp .env.example .env
   ```

   以下のコマンドを実行してください

   ```
   openssl rand -base64 32
   ```

   このコマンドで生成された文字列を`.env`ファイルの`SESSION_SECRET`に設定してください:

   - SESSION_SECRET

4. docker を起動します：
   ```
   docker compose up -d
   ```
5. db の設定を行います：
   ```
   bunx prisma migrate dev
   ```
6. seed を実行します：
   ```
   bun run seed
   ```
7. 起動します：
   ```
   bun run dev
   ```
8. ブラウザで `http://localhost:5173` にアクセスして、evame を使用開始します:
9. ローカル開発環境では、認証プロセスが簡略化されています：

   - `http://localhost:5173/auth/login` にアクセスして、dev@example.comと devpassword でログインしてください。

   注意: この簡易認証は開発環境でのみ機能し、本番環境では無効になります。本番環境では通常の Google 認証フローが使用されます。

## 貢献方法

翻訳、プログラミング、デザイン、ドキュメンテーションなど、あらゆる形の貢献を歓迎します。現在特に以下の分野での貢献を求めています：

- PDF 等､複数フォーマット入力対応の実装
- 文字サイズや色の変更機能

## 既知の制限事項

- 出力フォーマットは現在限られています。
- 長文テクストの処理に制限があります。

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は LICENSE ファイルをご覧ください。

## コンタクト

質問や提案がある場合は、Issue を作成するか、プロジェクトの discord に参加してください。
https://discord.gg/2JfhZdu9zW

## 一緒に、世界中の人々に物語と知識への扉を開くビジョンを実現しましょう！
