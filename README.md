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
- chrome拡張機能との互換性を考慮したAPI設計

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
- バックエンド: 
  - 現在: Hono（API用）
  - 将来的に: FastAPI（自然言語処理タスク用に移行を検討中）
- フロントエンド: 
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
   bun run install
   ```
3. supabaseを設定します：
   ```
   bun supabase start
   bun supabase db reset
   ```
4. 環境変数を設定します：
   ```
   touch server/.dev.vars
   # .dev.varsに以下の内容を記述します
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   SUPABASE_URL="YOUR_SUPABASE_URL"
   SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"

   touch web/.env
   # .envに以下の内容を記述します
   VITE_PUBLIC_API_BASE_URL="http://localhost:8787"
   ```
4. バックエンドサービス（API）を起動します：
   ```
   bun run start
   ```
6. ブラウザで `http://localhost:5173` にアクセスして、eveeve を使用開始します。


## 貢献方法
翻訳、プログラミング、デザイン、ドキュメンテーションなど、あらゆる形の貢献を歓迎します。現在特に以下の分野での貢献を求めています：
- remix-authでの認証認可システムの実装
- prismaでのデータベース管理
- FastAPIへの移行検討と自然言語処理機能の拡充
- 複数フォーマット対応の実装
- 文字サイズや色の変更機能

貢献する前に、CONTRIBUTING.md ファイルをお読みください。

## 既知の制限事項
- 現在はLLMによる機械翻訳のみをサポートしており、人間によるレビュー機能はありません。
- 出力フォーマットは現在限られています。
- 長文や複雑な構造のテキストの処理に制限があります。
- 高度な自然言語処理タスクはまだ実装されていません。

## アーキテクチャに関する注記
現在のアーキテクチャは、chrome拡張機能との互換性を考慮して設計されています。
APIはHonoを使用して実装され、フロントエンドのRemixとは分離されています。将来的には、より高度な自然言語処理タスクを効率的に処理するため、バックエンドの一部またはすべてをFastAPIに移行することを検討しています。この移行により、Pythonの豊富な自然言語処理ライブラリを活用できる可能性があります。

## ライセンス
このプロジェクトはMITライセンスの下で公開されています。詳細はLICENSEファイルをご覧ください。

## コンタクト
質問や提案がある場合は、Issueを作成するか、プロジェクトのdiscordに参加してください。

一緒に、世界中の人々に物語と知識への扉を開くビジョンを実現しましょう！
