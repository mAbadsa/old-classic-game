# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

An npm-workspaces monorepo for a classic game emulator web app: `apps/frontend` (Next.js) talks to `apps/backend` (NestJS API backed by Postgres via Prisma Next). See `emulator-web-app-plan.md` for the full original design doc (tech stack rationale, phased roadmap, DB schema draft, security/perf notes) — the backend's actual data model has since diverged from that draft (see Data layer below) and is source of truth.

Current state: backend has `auth` (JWT signup/login/me), `users`, `games` (catalog + ROM download/upload), `saves`, `stats`, `uploads`, and an admin-only `admin` module, all wired to Postgres. `achievements`/`websocket` modules described in the plan doc do not exist yet (the `Achievement` tables do). The frontend has login/signup, a dashboard, a game library, and two EmulatorJS-based players, talking to the API via `NEXT_PUBLIC_API_URL`; there is no admin UI yet.

## Commands

Run from repo root (npm workspaces):

```bash
npm run dev              # both apps concurrently (frontend :3000, backend :$PORT — set PORT=3001 in apps/backend/.env, its code default is also 3000)
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

Backend requires a `DATABASE_URL` in `apps/backend/.env` (copy `.env.example`; Postgres >= 15) and a `JWT_SECRET` env var — `JwtStrategy` throws at startup if `JWT_SECRET` is unset. `.env.example` documents the rest (`PORT`, `CORS_ORIGIN`, `APP_URL`, `UPLOADS_DIR`, `ROMS_DIR`, `STORAGE_DRIVER`, S3 settings).

Seed sample games with `npm run seed -w apps/backend` (`src/prisma/seed.ts`, run via bare `node` — Prisma Next has no `prisma db seed`). It writes placeholder, non-playable ROM files into `ROMS_DIR`.

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

Models currently defined: `User`, `Game`, `SaveGame`, `Achievement`, `UserAchievement`, `Session`, `SystemSetting` (key/`Json` value), `AdminLog` (audit trail, intentionally no FK to `User`). Tables are mapped to plural snake_case names via `@@map`. Note `Game.tags` and `Achievement.criteria` are `Json` columns (Prisma Next doesn't support scalar list columns), and timestamp fields use `TimestamptzString` / `temporal.updatedAtString()` rather than `DateTime`.

### Backend module structure

Standard NestJS modules under `apps/backend/src/`:
- `auth/` — signup/login issuing JWTs (`AuthService`), `JwtStrategy`/`JwtAuthGuard` for authentication, `RolesGuard`/`@Roles()` decorator for authorization (role is a plain `string` column on `User`, checked against `@Roles(...)` metadata — e.g. `games.controller.ts` guards `POST /games` with `@Roles('admin')`).
- `users/` — `UsersService` wraps direct `db.orm.public.User` queries; no controller (accessed only from `auth`).
- `games/` — `GamesController`/`GamesService`, includes pagination (`page`/`limit` query params via `QueryGamesDto`) and optional `emulator` filter. `GET /games/:gameId/rom` (JWT) streams `<ROMS_DIR>/<gameId><ext>`, extension derived from `Game.emulator` via `rom-file.util.ts` (keep in sync by hand with the copy in `prisma/seed.ts`). `POST /games/:gameId/upload-rom` (admin) stores a ROM via `UploadsService`.
- `saves/` — CRUD for `SaveGame` under `JwtAuthGuard`. `userId` always comes from the token, never the body; cross-user access goes through `assertOwnerOrAdmin()` (`auth/assert-owner-or-admin.ts`) — use it for any new per-user route.
- `stats/` — `GET /stats/:userId` (owner or admin).
- `admin/` — everything under `/admin/*`, guarded by `AdminGuard` (`auth/admin.guard.ts`: JWT + `role === 'admin'` in one guard): game CRUD + ROM upload, user list/role change/delete, analytics (`overview`, `top-games`), `AdminLog` listing, and `SystemSetting` get/upsert. Split into `games-admin`/`users-admin`/`analytics`/`system` services behind `AdminService`.
- `uploads/` — `POST /uploads/rom` (multipart, `@Roles('admin')` like `POST /games`): validates the extension (`.nes`/`.smd`/`.bin`/`.rom` only, see `rom-file-validation.ts`) via multer's `fileFilter`, then hands the buffer to a `StorageProvider` (`storage/storage-provider.interface.ts`) — `LocalStorageProvider` (default; writes under `UPLOADS_DIR`, served back via `app.useStaticAssets` in `main.ts`) or `S3StorageProvider` (`STORAGE_DRIVER=s3`). Neither the controller nor `UploadsService` talks to the filesystem/S3 directly — swap the provider, not the call sites, to change where files land. Not yet wired to `POST /games`'s `romPath` — that's still supplied by the caller.

All internal imports use explicit `.js` extensions (e.g. `from './app.module.js'`) — this is an ESM project (`"type": "module"` in `apps/backend/package.json`), so extensionless imports will not resolve.

Services return plain interfaces (e.g. `User`, `Game` in each service file) rather than importing generated Prisma model types directly — keep that pattern when adding new modules.

`main.ts` applies a global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true` — DTOs must be `class-validator`-decorated and any field not declared on the DTO will be rejected, not silently dropped.

### Frontend

Next.js App Router (`apps/frontend/app/`), Tailwind v4 via `@tailwindcss/postcss`, TypeScript. **shadcn/ui** is set up (`components.json`, `components/ui/*`) on the **base-nova** style, which uses `@base-ui/react` (not Radix) as its primitive layer — its components take a `render={<Element />}` prop to compose with a custom element (Base UI's convention), not Radix's `asChild`. Add more primitives with `npx shadcn@latest add <name>` from `apps/frontend/`. Auth: `lib/auth.ts` stores the JWT from `/auth/login` in `localStorage` *and* a plain `accessToken` cookie; `proxy.ts` (Next 16's rename of `middleware.ts`) does a fast, unverified cookie pre-check to redirect logged-out users on `/`, `/games`, `/emulator`, while `hooks/useRequireAuth.ts` does the real check via `GET /auth/me`. The actual security boundary is the backend's guards. API helpers live in `lib/` (`auth`, `saves`, `stats`) with matching hooks in `hooks/`. No global state library. `emulator-web-app-plan.md`'s proposed `store/` dir still doesn't exist; treat that doc's code snippets (e.g. `eval(script)` for loading emulator glue code) as illustrative intent, not implementation.

**Emulation** is wired up via [EmulatorJS](https://emulatorjs.org) — see `apps/frontend/EMULATORS.md` for the full setup guide (self-hosting the EmulatorJS `data/` bundle, adding ROMs, supported systems, the two player components below). Key pieces:
- `lib/emulator-systems.ts` — app system key → EmulatorJS core id table.
- `components/EmulatorPlayer.tsx` + `app/play/[system]/page.tsx` — static-ROM player: points `EJS_gameUrl` straight at a file under `public/emulators/roms/`.
- `hooks/useEmulator.ts` + `components/EmulatorUI.tsx` — backend-driven player: fetches ROM bytes for a `gameId` from the API, caches them in `localStorage`, and renders a full shadcn/ui control bar (Play/Pause/Save/Load/Fullscreen, multi-slot saves menu). `useEmulator`'s `play`/`pause`/`saveState`/`loadState` call into `EJS_emulator.gameManager`, which is undocumented/internal to EmulatorJS.
- Both boot paths read/write the same `window.EJS_*` globals (typed once in `types/emulatorjs.d.ts`, ambient — extend it if you add another EmulatorJS option) — EmulatorJS has no importable API, it's a script that reads global config.
- `next.config.ts` — COOP/COEP headers on `/play/*` (check it before adding a new player route), required for EmulatorJS's threaded WASM cores; any other route embedding either player needs the same headers added.
- `public/emulators/data/`, `roms/*/`, and `bios/` are gitignored (third-party bundle + user-supplied ROMs/BIOS) — only the folder structure is tracked.
- Actual gameplay keyboard input (arrows + Z/X/A/S by default) and gamepad input are handled internally by EmulatorJS — don't add competing `keydown` handlers for game controls; app-level shortcuts (e.g. `EmulatorUI`'s "F" for fullscreen) are fine since they don't collide with EmulatorJS's defaults.

## Linting

Backend uses **oxlint**, not eslint (`apps/backend/oxlint.json` disables `no-explicit-any`, warns on `no-floating-promises`). Frontend uses eslint (`eslint-config-next`); `public/emulators/**` (vendored EmulatorJS) is in its `globalIgnores`.
