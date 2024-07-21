#  EveEve プロジェクト

## 概要
EveEve（Everyone Translate Everything）は、インターネットに公開されているテキストに高品質な対訳を付与し、読みやすいレイアウトで提供することを目指すオープンソースプロジェクトです。このプロジェクトの目的は、世界中の人々に、物語と知識への扉を開くことです。

## プロジェクト名の由来
「EveEve」は "Everyone Translate Everything" の略です。この名前は、世界中の人々が協力して、あらゆるテキストを翻訳し、知識を共有するというプロジェクトの理念を体現しています。

## 現在の機能
- 基本的なHTML翻訳機能
- LLM（大規模言語モデル）を使用した翻訳
- シンプルなウェブインターフェース
- 翻訳結果の保存
- 翻訳結果の共有
- リーダーモード

## 開発中の機能
- 読みやすいレイアウト：対訳を見やすく配置（改善中）
- コミュニティによる翻訳品質の向上システム（開発中）
- 脚注の追加（計画段階）
- ハイライト機能（計画段階）
- 複数フォーマット対応：HTML、PDF、EPUB、プレーンテキスト（計画段階）
- chrome拡張機能(計画段階)
- 高度な自然言語処理機能の統合(計画段階)
   - 文章から重要な部分を抜き出し、辞書から訳を検索する等

## 対象テキスト
このプロジェクトでは、インターネット上で公開されているテキストを対象としています。ただし、著作権法を遵守し、適切な許可なく著作物を使用しないよう細心の注意を払ってください｡

## システム構成
- React (Remix SSRモード)
- 翻訳エンジン: Gemini（現在はコンテキスト長のメリットからこれのみを使用）

## 使用方法
1. このリポジトリをクローンします：
   ```
   git clone https://github.com/ttizze/eveeve.git
   ```
2. 必要な依存関係をインストールします：
   ```
   cd eveeve
   cd web
   bun i
   ```
3. googleログインの設定をする必要があります｡
   https://console.cloud.google.com/apis
   設定方法は以下のページを参考にしてください
   https://developers.google.com/identity/sign-in/web/sign-in?hl=ja
   https://zenn.dev/yoiyoicho/articles/c44a80e4bb4515#google%E3%83%AD%E3%82%B0%E3%82%A4%E3%83%B3%E3%81%AE%E5%85%AC%E5%BC%8F%E3%83%89%E3%82%AD%E3%83%A5%E3%83%A1%E3%83%B3%E3%83%88%E3%82%92%E8%AA%AD%E3%82%80

   承認済みのリダイレクトURIには
   http://localhost:5173/api/auth/callback/google
   を設定してください

   クライアントIDとクライアントシークレットを取得してください

3. 環境変数ファイルを作成し、必要な値を設定します：
   ```
   cp .env.example .env
   ```
   `.env` ファイルを開き、以下の変数を適切な値に設定してください：
   - SESSION_SECRET
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET

4. dockerを起動します：
   ```
   docker compose up -d
   ```
5. dbの設定を行います：
   ```
   bunx prisma migrate dev
   ```
6. 起動します：
   ```
   bun run dev
   ```
6. ブラウザで `http://localhost:5173` にアクセスして、eveeve を使用開始します。


## 貢献方法
翻訳、プログラミング、デザイン、ドキュメンテーションなど、あらゆる形の貢献を歓迎します。現在特に以下の分野での貢献を求めています：

- PDF等､複数フォーマット入力対応の実装
- 文字サイズや色の変更機能


## 既知の制限事項
- 出力フォーマットは現在限られています。
- 長文テキストの処理に制限があります。

## ライセンス
このプロジェクトはMITライセンスの下で公開されています。詳細はLICENSEファイルをご覧ください。

## コンタクト
質問や提案がある場合は、Issueを作成するか、プロジェクトのdiscordに参加してください。
https://discord.gg/2JfhZdu9zW

## 一緒に、世界中の人々に物語と知識への扉を開くビジョンを実現しましょう！
