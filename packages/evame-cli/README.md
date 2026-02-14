# @reimei/evame-cli

Evame の Markdown 同期用 CLI です。

## インストール

```bash
npm i -g @reimei/evame-cli
```

## 使い方

```bash
evame login
evame pull
evame push --dry-run
evame push
```

## 環境変数

- `EVAME_BASE_URL`: Evame サーバーの URL（例: `https://example.com`）
- `EVAME_PAT`: CI 用の Personal Access Token（ローカルは `evame login` 推奨）

