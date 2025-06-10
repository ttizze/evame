# Evame Project Guide for AI Assistants

## Project Overview
Evame is an open-source platform for sharing knowledge through translations, footnotes, and explanations. Built with Next.js, TypeScript, and Prisma.

## Key Technologies
- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth v5
- **UI**: Shadcn UI (Radix UI) + Tailwind CSS
- **Internationalization**: next-intl
- **Editor**: TipTap
- **Package Manager**: Bun

## Project Structure
```
/
├── src/
│   ├── app/
│   │   ├── [locale]/          # Localized routes
│   │   ├── _constants/        # App constants
│   │   ├── _context/          # React contexts
│   │   ├── _db/               # Database queries
│   │   └── api/               # API routes
│   ├── components/
│   │   └── ui/                # Shared UI components
│   ├── features/              # Feature-specific code
│   └── lib/                   # Utility functions
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── scripts/                   # Utility scripts
├── public/                    # Static assets
└── tipitaka2500/             # Tipitaka text data
```

## Development Commands
```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Run database migrations
bunx prisma migrate dev

# Seed database
bun run seed

# Run tests
bun test

# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run check

# Import Tipitaka texts
bun run tipitaka
```

## Database Setup
1. Docker containers must be running: `docker compose up -d`
2. Database runs on port 5434 (main) and 5435 (test)
3. Connection string in `.env`: `DATABASE_URL`

## Authentication
- Development login: `dev@example.com` / `devpassword`
- Only works in development environment

## Recent Changes (f/tipitaka branch)
1. **Page Hierarchy Support**:
   - Added `parentId` and `order` fields to pages
   - Pages can now have parent-child relationships
   - Child pages displayed in UI

2. **Tipitaka Import Script**:
   - Script at `scripts/tipitaka.ts`
   - Imports hierarchical Buddhist texts from `tipitaka2500/` directory
   - Creates nested page structure automatically

3. **Modified Files**:
   - `scripts/tipitaka.ts` - New import script
   - `src/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/page.tsx` - Added child page display
   - `src/app/[locale]/_db/page-queries.server.ts` - Added parent filtering
   - `src/app/[locale]/types.ts` - Added children field to PageDetail

## Important Notes
- Always use absolute paths in tools (not relative)
- The development server may use port 3001 if 3000 is occupied
- Run lint and typecheck before committing changes
- Follow existing code patterns and conventions
- Do not add comments unless explicitly requested

## Common Tasks
1. **Adding a new page**: Create in appropriate route directory under `src/app/[locale]/`
2. **Adding UI components**: Use existing Shadcn components in `src/components/ui/`
3. **Database changes**: Update schema.prisma and run migrations
4. **Adding translations**: Update message files in `messages/` directory

## Environment Variables
Key variables needed in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Authentication secret
- Various API keys for translation services

## Testing
- Unit tests with Vitest
- E2E tests with Playwright
- Always verify database operations work correctly