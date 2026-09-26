# Old Classic Game

A web-based classic game emulator platform, built as an npm-workspaces monorepo:

- **`apps/frontend`** — Next.js (App Router) client
- **`apps/backend`** — NestJS API with authentication, games catalog, and a Postgres data layer

See [`emulator-web-app-plan.md`](./emulator-web-app-plan.md) for the full original design doc (tech stack rationale, phased roadmap, security/performance notes). See [`CLAUDE.md`](./CLAUDE.md) for developer/architecture notes aimed at AI coding agents working in this repo.

## Status

- Backend (NestJS + Postgres): JWT auth, games catalog with ROM download/upload (local disk or S3), save games, per-user stats, and an admin API (`/admin/*`: games, users, analytics, audit logs, system settings).
- Frontend (Next.js): login/signup, dashboard, game library, and in-browser play via [EmulatorJS](https://emulatorjs.org) with save-state management.
- Not yet built: achievements logic, multiplayer/websockets, an admin UI.

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
# edit apps/backend/.env: set DATABASE_URL and JWT_SECRET (API runs on PORT=3001)
```

Create the schema and (optionally) seed sample games:

```bash
cd apps/backend
npx prisma db update --db "$DATABASE_URL"   # or `prisma db migrate` — see Data layer below
npm run seed                                 # sample games + placeholder ROM files
```

Set up the emulator: the EmulatorJS bundle and ROMs are **not** in the repo. Follow [`apps/frontend/EMULATORS.md`](./apps/frontend/EMULATORS.md) to put the EmulatorJS `data/` files under `apps/frontend/public/emulators/data/`. Only use ROMs you have the right to use; they are gitignored.

The frontend reads the API URL from `apps/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

Run both apps concurrently:

```bash
npm run dev
```

Or individually:

```bash
npm run dev:frontend   # http://localhost:3000
npm run dev:backend    # http://localhost:3001
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
