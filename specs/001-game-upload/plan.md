# Implementation Plan: Game Upload

**Branch**: `001-game-upload` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-game-upload/spec.md`

## Summary

Admins create a playable game in one multipart request: title, emulator, optional description, a ROM, a cover, and a thumbnail. The backend endpoint `POST /games/upload` already exists and the thumbnail column migration is written, but the current code has three gaps against the spec, and the plan closes them:

1. **Uploaded games can't be played.** `GET /games/:gameId/rom` reads `ROMS_DIR/<gameId><ext>`, but upload stores the ROM under the storage provider and writes only `romPath`. Nothing copies it to where playback reads.
2. **Failed uploads leave orphan files** (FR-006). `upload()` stores the ROM and images before creating the row, and nothing removes them if a later step fails.
3. **ROM validation doesn't match the emulator.** The upload filter allows only `.nes .smd .bin .rom` for every system. `EXTENSION_BY_EMULATOR` expects `.nes`, `.sfc` (snes), `.md` (genesis), `.bin` (atari), `.zip` (mame). A SNES `.sfc` upload is rejected; a Genesis `.md` upload is rejected too.

The frontend upload page already posts `FormData` to `/games/upload`, and `GameCard` already renders `thumbnail`. The frontend work is verification plus admin gating, not new build-out.

## Technical Context

**Language/Version**: TypeScript (ESM, explicit `.js` import extensions); Node per the backend toolchain.

**Primary Dependencies**: NestJS 12 (`@nestjs/platform-express`, `multer` ^2.2), Prisma Next data layer (`db.orm.public`), class-validator DTOs, Next.js 16 App Router + React on the frontend, EmulatorJS for playback.

**Storage**: Postgres for `games` (via the Prisma Next contract); ROM and image bytes via `StorageProvider` (`LocalStorageProvider` under `UPLOADS_DIR`, `S3StorageProvider` when `STORAGE_DRIVER=s3`). Playback currently reads from `ROMS_DIR`.

**Testing**: vitest (`npm run test -w apps/backend`, `*.spec.ts`). One existing spec covers image validation. No controller or e2e test covers upload yet.

**Target Platform**: Linux server (backend, Node) and modern browsers (frontend).

**Project Type**: Web application (monorepo: `apps/backend` NestJS API, `apps/frontend` Next.js).

**Performance Goals**: Upload of a 32 MB ROM plus two 5 MB images completes within the request timeout; `GET /games` unchanged.

**Constraints**: ROM buffered in memory (`memoryStorage`), so peak memory per request is roughly the ROM size; acceptable at the current scale. Admin-only (FR-007). No partial state on failure (FR-006).

**Scale/Scope**: Small catalog, a handful of admins. Single-file-per-field uploads; no batch.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (`[PRINCIPLE_1_NAME]` etc.), so it defines no gates. The gates applied here come from `CLAUDE.md`:

- Admin-only mutation via `JwtAuthGuard` + `RolesGuard` + `@Roles('admin')`: **pass** (existing on `POST /games/upload`).
- Services return plain interfaces, not generated Prisma types: **pass** (`Game` interface in `games.service.ts`).
- Storage swapped via provider, not call sites: **pass**; the fix below must keep that (add delete to the provider, not the filesystem).
- ESM explicit `.js` imports: **pass**, to be kept in new files.
- Mapping duplicated between `rom-file.util.ts` and `prisma/seed.ts` is kept in sync by hand: **known exception**, not touched by this plan.

Post-design re-check: **pass**, with the playback fix (Phase 1) keeping `ROMS_DIR`/`romPath` consistent.

## Project Structure

### Documentation (this feature)

```text
specs/001-game-upload/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── games-upload.md  # Phase 1
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/backend/src/
├── games/
│   ├── games.controller.ts     # POST /games/upload, GET /games/:id/rom  (change)
│   ├── games.service.ts        # create(); updateRomPath() already exists
│   ├── rom-file.util.ts        # EXTENSION_BY_EMULATOR — source of allowed ROM types (use)
│   └── dto/upload-game.dto.ts  # title/emulator/description (add emulator allowlist)
├── uploads/
│   ├── rom-file-validation.ts  # global ext list → per-emulator (change)
│   ├── image-file-validation.ts
│   ├── uploads.service.ts      # store/rollback (change)
│   └── storage/
│       ├── storage-provider.interface.ts  # add delete() (change)
│       ├── local-storage.provider.ts      # implement delete (change)
│       └── s3-storage.provider.ts         # implement delete (change)
├── prisma/contract.prisma      # thumbnail column already present
└── migrations/app/20261011T1324_add_game_thumbnail/   # already written

apps/frontend/
├── app/upload/page.tsx         # admin-only page (verify gating)
├── components/GameUploadForm.tsx  # posts FormData (verify fields)
└── components/GameCard.tsx     # shows thumbnail (done; verify placeholder)
```

**Structure Decision**: Stay in the existing `games/` and `uploads/` modules. No new module. The spec's core flow needs changes in two places, not new architecture.

## Phase 0 & 1 summary

See `research.md` for the decisions (each with alternatives) and `data-model.md` / `contracts/games-upload.md` / `quickstart.md` for the design. Key decisions:

- Playback reads the ROM via `romPath` through the storage provider, not a copy into `ROMS_DIR`.
- ROM allowed types come from `EXTENSION_BY_EMULATOR`, one source of truth; the global filter goes.
- Upload is all-or-nothing: validate everything first, store, create the row, and on failure delete what was stored.

## Complexity Tracking

> Constitution gates have no violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
