# Digital Buddhism

[日本語版はこちら](README.ja.md)

Digital Buddhism is a global, multilingual service for reading Buddhist scriptures and
improving their translations together. Anyone can read published scriptures
and translations. Authenticated users can submit translation candidates and
vote on candidates; AI translation jobs can also propose candidates for the
community to review.

The top page is the Buddhist scripture translation index. Article or page
publishing, standalone comments, replies, follows, likes, and notifications
are outside the current product scope.

## Quick start

The supported development environment is the Nix flake. It provides Bun,
Node.js, and `just`. Project CLI tools such as Wrangler are run through
`bunx` from the locked project dependencies.

```bash
nix develop
cp .env.example .env
```

Fill in the Turso Database, authentication, and (when running translation jobs) AI
provider values in `.env`.

```bash
just install
just migrate
just dev
```

Open <http://localhost:5173>. Use a dedicated development database in Turso Database;
`just migrate` applies the checked-in migrations to the database selected by
`TURSO_DATABASE_URL`.

No PostgreSQL server or Docker service is required.

## Checks and deployment

```bash
just biome
just typecheck
just test
just build
just deploy
```

The Worker secrets and variables must be configured in the target Cloudflare
account before deployment. See
[`docs/howto/cloudflare-workers.md`](docs/howto/cloudflare-workers.md).

## Architecture

- UI and routing: TanStack Start / TanStack Router
- Runtime and deployment: Cloudflare Workers
- Database: Turso Database, accessed with `@tursodatabase/serverless`
- Package manager: Bun

The main documentation entry point is [`docs/README.md`](docs/README.md).
The architecture and runtime boundaries are described in
[`docs/architecture/architecture.md`](docs/architecture/architecture.md).

## Repository structure

```text
src/
├── routes/       # TanStack Router file-based routes
├── components/   # Shared UI
├── db/           # Turso Database client, queries, mutations, and migrations
├── domain/       # Scripture, translation, voting, and job rules
└── styles/       # Application styles
docs/             # Requirements, architecture, and operations
```
