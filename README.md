# Old Classic Game

A web-based classic game emulator platform, built as an npm-workspaces monorepo:

- **`apps/frontend`** — Next.js (App Router) client
- **`apps/backend`** — NestJS API with authentication, games catalog, and a Postgres data layer

See [`emulator-web-app-plan.md`](./emulator-web-app-plan.md) for the full original design doc (tech stack rationale, phased roadmap, security/performance notes). See [`CLAUDE.md`](./CLAUDE.md) for developer/architecture notes aimed at AI coding agents working in this repo.

## Status

- Backend: `auth` (JWT signup/login), `users`, and `games` modules are implemented against Postgres.
- Frontend: still the unmodified `create-next-app` starter — no API integration yet.
- Not yet built: save games, achievements, multiplayer/websockets, ROM uploads.

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 15

## Getting started

```bash
npm install
```

Set up the backend environment:

```bash
cp apps/backend/.env.example apps/backend/.env
# edit apps/backend/.env: set DATABASE_URL and JWT_SECRET
```

Run both apps concurrently:

```bash
npm run dev
```

Or individually:

```bash
npm run dev:frontend   # http://localhost:3000
npm run dev:backend
```

## Common commands

Run from the repo root:

```bash
npm run build   # build --workspaces
npm run lint    # lint --workspaces
npm run test    # test --workspaces
```

Backend-specific (from `apps/backend`):

```bash
npm run start:dev      # nest start --watch
npm run test           # vitest run
npm run test:e2e       # vitest run --config vitest.config.e2e.ts
```

Frontend-specific (from `apps/frontend`):

```bash
npm run dev
npm run build
npm run lint
```

## Data layer

The backend uses **Prisma Next** (contract-first Prisma), not classic Prisma ORM. The data contract lives at `apps/backend/src/prisma/contract.prisma`. After editing it:

```bash
cd apps/backend
npx prisma contract emit          # regenerate contract.json / contract.d.ts
npx prisma db update --db "$DATABASE_URL"     # local dev, quick path
# or, for a reviewable/shared migration:
npx prisma migration plan --name <change_name>
npx prisma db migrate --db "$DATABASE_URL"
```

See `CLAUDE.md` and the `prisma-8` skill (`apps/backend/.claude/skills/prisma-8`) for details — the API and workflow differ from classic Prisma.
