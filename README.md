![EveEve](./web/public/title-logo-dark.png)

# EveEve

## 概要

EveEve（Everyone Translate Everything）は、パブリックドメインのテクストに､対訳､脚注､解説を付け、美しいレイアウトで提供し､知識と文化の交流を促進することを目指すオープンソースプロジェクトです。

このプロジェクトの目的は、世界中の人々に、物語と知識への扉を開くことです。

## プロジェクト名の由来

「EveEve」は "Everyone Translate Everything" の略です。この名前は、世界中の人々が協力して、あらゆるテクストを翻訳し、知識を共有するというプロジェクトの理念を体現しています。

## 現在の機能

- HTML 翻訳
- LLM（大規模言語モデル）を使用した翻訳
- 翻訳結果の保存
- 翻訳結果への投票
- 翻訳の投稿
- リーダーモード

## 開発中の機能

- 読みやすいレイアウト：対訳を見やすく配置（改善中）
- 脚注の追加（計画段階）
- ハイライト機能（計画段階）
- 複数フォーマット対応：HTML、PDF、EPUB、プレーンテクスト（計画段階）
- chrome 拡張機能(計画段階)
- 高度な自然言語処理機能の統合(計画段階)
  - 文章から重要な部分を抜き出し、辞書から訳を検索する等

## 翻訳時の理想のユーザ体験

1. テクストの入力

   - ユーザがインターネット上のテクスト(html､pdf､epub etc･･･)を母国語で読みたいと思い､chrome 拡張､または eveeve の translator ページで URL を入力する
   - ローカルファイルの場合､chrome 拡張､または eveeve の translator ページでファイルを選択し､アップロードする
   - ユーザが直接テクストを入力したい場合､eveeve の translator ページでタイトル､本文､著者､ライセンスを入力する

2. テクストの処理

   - インターネット上のもの､またはローカルファイルの場合､入力されたデータから LLM が自動でタイトル､本文､著者､ライセンスを抜き出す
   - ユーザが直接テクストを入力した場合､入力されたデータをそのまま使用する

3. テクストの同定

   - 既存のものに同様のタイトルがあった場合､それとの比較を表示する
   - ユーザがタイトルは同じだが別のものだと判断した場合､または同様のタイトルがなかった場合､新しいものとして登録し､翻訳を開始する
   - 既存のデータの場合､リーダページへのリンクを表示する

4. テクストの翻訳

   - 新規テクストが読み込まれると、テクストのそれぞれに LLM で翻訳を付ける

5. テクストの表示
   - リーダーページが読み込まれると、対訳表示､訳文のみ表示､等カスタマイズ可能な形でテクストが表示される
   - ユーザがいい翻訳だと思った場合 good に投票､他にもっと良い翻訳がある場合､他の翻訳候補を表示し､投票すると､その翻訳が表示される
   - 良い翻訳がなかった場合は、ユーザが翻訳を投稿するとその翻訳が表示される
   - このサイクルが繰り返されることで、より良い翻訳が生まれる

## 対象テクスト

このプロジェクトでは、インターネット上で公開されているテクストを対象としています。ただし、著作権法を遵守し、適切な許可なく著作物を使用しないよう細心の注意を払ってください｡

## システム構成

- React (Remix SSR モード)
- 翻訳エンジン: Gemini（現在はコンテクスト長のメリットからこれのみを使用）

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
8. ブラウザで `http://localhost:5173` にアクセスして、eveeve を使用開始します:
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
