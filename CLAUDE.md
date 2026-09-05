# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

An npm-workspaces monorepo for a classic game emulator web app: `apps/frontend` (Next.js) talks to `apps/backend` (NestJS API backed by Postgres via Prisma Next). See `emulator-web-app-plan.md` for the full original design doc (tech stack rationale, phased roadmap, DB schema draft, security/perf notes) — the backend's actual data model has since diverged from that draft (see Data layer below) and is source of truth.

Current state: backend has real `auth` (JWT signup/login), `users`, and `games` modules wired to Postgres. `saves`/`achievements`/`websocket` modules described in the plan doc do not exist yet. The frontend is still the unmodified `create-next-app` starter page — no API integration, routing, or components built yet.

## Commands

Run from repo root (npm workspaces):

```bash
npm run dev              # both apps concurrently (frontend :3000, backend :3000 by default — set PORT for backend)
npm run dev:frontend     # frontend only
npm run dev:backend      # backend only
npm run build            # build --workspaces
npm run lint             # lint --workspaces
npm run test             # test --workspaces
```

### Backend (`apps/backend`)

```bash
npm run start:dev -w apps/backend      # nest start --watch
npm run lint -w apps/backend           # oxlint src/ test/
npm run test -w apps/backend           # vitest run (*.spec.ts)
npm run test:watch -w apps/backend
npm run test:cov -w apps/backend
npm run test:e2e -w apps/backend       # vitest run --config vitest.config.e2e.ts (*.e2e-spec.ts)
```

Run a single test file: `npx vitest run src/auth/auth.service.spec.ts` (from `apps/backend`). Test runner is **vitest**, not jest, despite the NestJS scaffolding conventions.

Backend requires a `DATABASE_URL` in `apps/backend/.env` (copy `.env.example`; Postgres >= 15) and a `JWT_SECRET` env var — `JwtStrategy` throws at startup if `JWT_SECRET` is unset.

### Frontend (`apps/frontend`)

```bash
npm run dev -w apps/frontend      # next dev
npm run lint -w apps/frontend     # eslint
npm run build -w apps/frontend
```

## Architecture

### Data layer: Prisma Next ("Prisma 8"), not classic Prisma ORM

This is **contract-first Prisma**, a different workflow from `schema.prisma` + generated `PrismaClient`. Before touching data-layer code, load the `prisma-8` skill (in `apps/backend/.claude/skills`) rather than relying on prior Prisma knowledge — APIs and conventions differ from classic Prisma.

Key files (`apps/backend/src/prisma/`):
- `contract.prisma` — the actual data contract / source of truth for models (edit this, not `contract.json`/`contract.d.ts`).
- `contract.json` / `contract.d.ts` — generated; regenerate with `npx prisma contract emit` after editing `contract.prisma`, and commit both.
- `db.ts` — exports the typed client: `import { db } from '../prisma/db.js'`. Query via `db.orm.public.<Model>` (e.g. `db.orm.public.User.where((u) => u.email.eq(...)).first()`), not `db.<model>.findFirst(...)` as in classic Prisma.

Migrations live in `apps/backend/migrations/` (a Prisma Next `migrations/app/<timestamp>_<name>/` format, not the classic `prisma/migrations/`), with contract snapshots under `migrations/snapshots/`.

Models currently defined: `User`, `Game`, `SaveGame`, `Achievement`, `UserAchievement`, `Session`. Note `Game.tags` and `Achievement.criteria` are `Json` columns (Prisma Next doesn't support scalar list columns), and timestamp fields use `TimestamptzString` / `temporal.updatedAtString()` rather than `DateTime`.

### Backend module structure

Standard NestJS modules under `apps/backend/src/`:
- `auth/` — signup/login issuing JWTs (`AuthService`), `JwtStrategy`/`JwtAuthGuard` for authentication, `RolesGuard`/`@Roles()` decorator for authorization (role is a plain `string` column on `User`, checked against `@Roles(...)` metadata — e.g. `games.controller.ts` guards `POST /games` with `@Roles('admin')`).
- `users/` — `UsersService` wraps direct `db.orm.public.User` queries; no controller (accessed only from `auth`).
- `games/` — `GamesController`/`GamesService`, includes pagination (`page`/`limit` query params via `QueryGamesDto`) and optional `emulator` filter.

All internal imports use explicit `.js` extensions (e.g. `from './app.module.js'`) — this is an ESM project (`"type": "module"` in `apps/backend/package.json`), so extensionless imports will not resolve.

Services return plain interfaces (e.g. `User`, `Game` in each service file) rather than importing generated Prisma model types directly — keep that pattern when adding new modules.

`main.ts` applies a global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true` — DTOs must be `class-validator`-decorated and any field not declared on the DTO will be rejected, not silently dropped.

### Frontend

Plain Next.js App Router (`apps/frontend/app/`), Tailwind v4 via `@tailwindcss/postcss`, TypeScript. No state management, API client, or auth wiring exists yet — `emulator-web-app-plan.md`'s proposed structure (`components/`, `hooks/`, `store/`, `lib/`) has not been created. When building it out, note the plan's own examples (e.g. `eval(script)` for loading emulator glue code) are illustrative sketches, not code to copy as-is — treat them as intent, not implementation.

## Linting

Backend uses **oxlint**, not eslint (`apps/backend/oxlint.json` disables `no-explicit-any`, warns on `no-floating-promises`). Frontend uses eslint (`eslint-config-next`).
