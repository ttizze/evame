# Evame

[日本語版はこちら](README.ja.md)

Evame is a project for sharing user-submitted texts with translations, annotations, and explanations.

## Quick start (development)

1. Install dependencies
   ```bash
   bun install
   ```
2. Prepare environment variables
   ```bash
   cp .env.example .env
   openssl rand -base64 32
   ```
   Put the generated string into `.env`.
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

- Entry: `docs/README.md`
- Requirements: `docs/requirements.md`
- Architecture: `docs/architecture.md`
- Route colocation rules: `docs/architecture/conventions/route-colocation.md`
- ADR: `docs/adr/README.md`
- HowTo: `docs/howto/README.md`
- AI context: `AI_CONTEXT.md`
- AI rules: `AGENTS.md`

## Repo structure (summary)

- `src/app`: Next.js App Router
- `src/db`: DB connection, types, seed
- `src/drizzle`: Schema and migrations
- `src/components`: Shared UI

See `docs/architecture.md` for details.
