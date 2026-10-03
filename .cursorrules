# Evame の開発ルール

このリポジトリでは `AGENTS.md` を作業ルールの正本として使用します。
実装前に以下を確認してください。

- `AGENTS.md`: Nix/Bun、TDD、配置・設計・検証・PR の規約
- `AI_CONTEXT.md`: アプリケーションの前提
- `docs/README.md`: ドキュメントの入口
- `docs/architecture/architecture.md`: TanStack Start の構成と実行モデル
- `docs/architecture/conventions/route-colocation.md`: ルート境界と機能実装の配置
- `docs/architecture/conventions/server-actions.md`: Server Function の認証・検証・更新

ルートは `src/routes`、機能実装は `src/app` に置きます。
通常のコンポーネントと loader はサーバー・ブラウザーの両方で動きます。
DB・秘密の環境変数は Server Function の handler または API handler 内で使用してください。
