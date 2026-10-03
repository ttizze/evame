# Evame

[日本語版はこちら](README.ja.md)

Evame is a project for sharing user-submitted texts with translations, annotations, and explanations.

## Quick start (development)
Run all project toolchain commands below inside `nix develop`.
Supported systems are Apple silicon macOS and aarch64/x86_64 Linux. Intel macOS is unsupported because the pinned nixpkgs release no longer supports `x86_64-darwin`.

```bash
nix develop
```

1. Install dependencies
   ```bash
   bun install
   ```
2. Prepare environment variables
   ```bash
   cp .env.example .env
   openssl rand -base64 32
   openssl rand -hex 32
   ```
   Set the base64 value as `BETTER_AUTH_SECRET` and the hex value as `ENCRYPTION_KEY`. Configure Google and Resend for authentication. Maintenance is controlled by the JSON boolean `maintenance` in the `SETTINGS` KV binding in `wrangler.jsonc`.
   Use `VITE_PUBLIC_DOMAIN` for the public site URL, server-side `CF_IMAGE_HOST` for the image host, and `EVAME_BASE_URL` for the CLI endpoint.
3. Start DB
   ```bash
   docker compose up -d
   ```
4. Run migrations and seed
   ```bash
   bun run db:migrate
   bun run seed
   ```
5. Start dev server
   ```bash
   bun run dev
   ```
6. Open `http://localhost:3000`

## Key links

- Docs entry: `docs/README.md`
- Cloudflare operations: `docs/howto/cloudflare-workers.md`
- AI context: `AI_CONTEXT.md`
- AI rules: `AGENTS.md`

## Repo structure (summary)

- `src/routes`: TanStack Start routes
- `src/app`: Feature implementations used by the routes
- `src/db`: DB connection, types, seed
- `src/drizzle`: Schema and migrations
- `src/components`: Shared UI

See `docs/architecture/architecture.md` for details.
