# Backend (`apps/backend`)

Run a single test file: `npx vitest run src/auth/auth.service.spec.ts` (from `apps/backend`). Test runner is **vitest**, not jest, despite the NestJS scaffolding conventions.
Backend requires a `DATABASE_URL` in `apps/backend/.env` (copy `.env.example`; Postgres >= 15) and a `JWT_SECRET` env var — `JwtStrategy` throws at startup if `JWT_SECRET` is unset. `.env.example` documents the rest (`PORT`, `CORS_ORIGIN`, `APP_URL`, `UPLOADS_DIR`, `ROMS_DIR`, `STORAGE_DRIVER`, S3 settings).
Seed sample games with `npm run seed -w apps/backend` (`src/prisma/seed.ts`, run via bare `node` — Prisma Next has no `prisma db seed`). It writes placeholder, non-playable ROM files into `ROMS_DIR`. Create or update the admin account with `npm run seed:admin` (reads `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME` from `.env`).

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
- `announcement/` — public `GET /announcement` returns the active site banner; admins write it with `PUT /admin/announcement`.
- `mail/` — `MailService` sends through `MAIL_DRIVER` (`log` by default, or `resend` with `MAIL_API_KEY`). Admin email goes through `POST /admin/emails`.

All internal imports use explicit `.js` extensions (e.g. `from './app.module.js'`) — this is an ESM project (`"type": "module"` in `apps/backend/package.json`), so extensionless imports will not resolve.

Services return plain interfaces (e.g. `User`, `Game` in each service file) rather than importing generated Prisma model types directly — keep that pattern when adding new modules.

`main.ts` applies a global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true` — DTOs must be `class-validator`-decorated and any field not declared on the DTO will be rejected, not silently dropped.
