# web-svelte

SvelteKit -> Cloudflare Workers への一括移行に向けた、並走用の実装ベースです。

## コマンド

```sh
# SvelteKit 開発サーバー
bun run dev

# Cloudflare Worker と同じビルド出力でローカル起動
bun run dev:cf

# 型チェック
bun run check

# Cloudflare 向けビルド
bun run build

# Cloudflare デプロイ
bun run deploy
```

## 主要ファイル

- `svelte.config.js`: `@sveltejs/adapter-cloudflare` を設定
- `wrangler.jsonc`: Worker エントリと static assets binding を設定
- `src/routes/api/health/+server.ts`: Cloudflare 向け最小API疎通確認
