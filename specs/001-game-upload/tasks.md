---

description: "Task list for Game Upload"
---

# Tasks: Game Upload

**Input**: Design documents from `/specs/001-game-upload/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/games-upload.md, quickstart.md

**Tests**: Not requested in spec.md. No test-writing tasks are included. Verification is done by the manual checks in quickstart.md (Polish phase) and the existing lint/test commands.

**Organization**: Grouped by user story so each can be implemented and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Paths are repo-relative from the root `old-classic-game/`

## Path Conventions

- Backend: `apps/backend/src/`
- Frontend: `apps/frontend/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing groundwork is in place before changing behavior.

- [X] T001 Confirm `apps/backend/src/prisma/contract.json` and `apps/backend/src/prisma/contract.d.ts` match `apps/backend/src/prisma/contract.prisma` (the `thumbnail String?` line on `Game`), and that `apps/backend/migrations/app/20261011T1324_add_game_thumbnail/` applies cleanly to a dev database. If they differ, regenerate with `npx prisma contract emit` from `apps/backend`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Storage and emulator-lookup changes that US1 (playback) and US2 (rollback) both depend on.

**⚠️ CRITICAL**: Complete before Phase 3 and Phase 4.

- [X] T002 Add `open(path: string): Promise<Readable>` and `delete(path: string): Promise<void>` to the `StorageProvider` interface in `apps/backend/src/uploads/storage/storage-provider.interface.ts`. `path` is the `SavedFile.path` key returned by `save()`.
- [X] T003 [P] Implement `open` and `delete` in `apps/backend/src/uploads/storage/local-storage.provider.ts`, resolving keys under `UPLOADS_DIR` and rejecting any key that resolves outside that directory.
- [X] T004 [P] Implement `open` and `delete` in `apps/backend/src/uploads/storage/s3-storage.provider.ts` using the same key convention as `save()`.
- [X] T005 Export `isSupportedEmulator(emulator: string): boolean` from `apps/backend/src/games/rom-file.util.ts`, returning true when `EXTENSION_BY_EMULATOR` has the key. Used by the DTO (US1) and the handler (US2).

**Checkpoint**: Storage supports read and delete; emulator support can be checked in one place.

---

## Phase 3: User Story 1 - Admin uploads a new game (Priority: P1) 🎯 MVP

**Goal**: An admin submits title, emulator, description, ROM, cover, and thumbnail. The game is created and plays in the player.

**Independent Test**: Upload a valid `.nes` with cover and thumbnail as admin. Check the response has `romPath`, `cover`, and `thumbnail`, then download the ROM from `GET /games/:id/rom` and confirm the bytes match.

- [X] T006 [US1] In `apps/backend/src/games/dto/upload-game.dto.ts`, constrain `emulator` to a supported system: `@IsIn(Object.keys(EXTENSION_BY_EMULATOR))` (or a custom validator using `isSupportedEmulator` from T005). Keep `MinLength(1)` / `MaxLength(50)`. Error should list the supported systems.
- [X] T007 [US1] Change `getRom` in `apps/backend/src/games/games.controller.ts` to stream the file at `game.romPath` via the storage provider's `open()` when `romPath` is a storage key. Keep the `ROMS_DIR/<id><ext>` path as the fallback for seeded games (their `romPath` is `pending` or a `/games/<id>/rom` URL; see `apps/backend/src/prisma/seed.ts`). Keep the same response headers as today.
- [X] T008 [US1] Confirm `apps/frontend/components/GameUploadForm.tsx` sends the form fields the backend reads: `title`, `emulator`, `description`, `rom`, `cover`, `thumbnail`. Field names already match; fix only if they diverge.
- [X] T009 [US1] Check the `emulator` `<select>` options in `apps/frontend/components/GameUploadForm.tsx` against the keys of `EXTENSION_BY_EMULATOR` in `apps/backend/src/games/rom-file.util.ts`. Remove any option the backend rejects; add any backend key missing from the list.
- [X] T010 [US1] Make the upload page's accepted ROM types (`ROM_ACCEPT` in `apps/frontend/components/GameUploadForm.tsx`) match the extensions in `EXTENSION_BY_EMULATOR` (`.nes`, `.sfc`, `.md`, `.bin`, `.zip`).

**Checkpoint**: US1 works end to end: upload → library entry → ROM downloads with matching bytes.

---

## Phase 4: User Story 2 - Invalid uploads are rejected, nothing is saved (Priority: P1)

**Goal**: Any invalid part rejects the whole upload with a message naming the problem. No game row and no stored files are left behind.

**Independent Test**: Send each invalid case in quickstart.md step 5. Each returns 400 with the right message, and `UPLOADS_DIR` has no new files and the `games` table has no new rows.

- [X] T011 [US2] In `apps/backend/src/uploads/rom-file-validation.ts`, remove the global `.nes/.smd/.bin/.rom` extension check, keeping only the size limit. Do not check the extension in `multer`'s `fileFilter`: multipart text fields may arrive after the file, so `emulator` may be unknown there. (Plan research §3 said to filter in multer; this task moves the check to the handler, which is the only place it's reliable.)
- [X] T012 [US2] In `apps/backend/src/games/games.controller.ts` `upload()`, validate everything before any storage write: the ROM extension against `EXTENSION_BY_EMULATOR[dto.emulator]` (`romExtensionForEmulator`), cover and thumbnail size via `assertImageSize`, and the required-file check. Each error message names the field and lists allowed values, per contracts/games-upload.md.
- [X] T013 [US2] Add a rollback helper in `apps/backend/src/uploads/uploads.service.ts`: store the ROM and both images in order, record each returned `path`, and if any step throws, call `storage.delete(path)` for every recorded key, then rethrow the original error. Log (don't throw) any delete failure.
- [X] T014 [US2] Make `upload()` in `apps/backend/src/games/games.controller.ts` call the T013 helper for all three files, then `gamesService.create` with `romPath`, `cover`, and `thumbnail`. If `create` throws, the T013 rollback must run.
- [X] T015 [US2] Check `apps/backend/src/games/dto/upload-game.dto.ts` against data-model.md: `title` 1–200 chars (`MinLength(1)`, `MaxLength(200)`) and `description` ≤ 2000 chars (`MaxLength(2000)`). Quote the constraint in the decorator comment if it's unclear, and fix any mismatch.

**Checkpoint**: All quickstart.md step 5 rejection cases pass, with no orphaned files or rows.

---

## Phase 5: User Story 3 - Non-admins cannot upload (Priority: P1)

**Goal**: Non-admins can't open the upload page or submit an upload. The backend is the real boundary.

**Independent Test**: With a non-admin token, `POST /games/upload` returns 403. With no token, it returns 401. The upload page shows the admin-only message for a non-admin user.

- [X] T016 [US3] Verify `POST /games/upload` in `apps/backend/src/games/games.controller.ts` has `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('admin')`, and that a non-admin token gets 403 and a missing token gets 401 (quickstart.md step 5). Fix only if a case differs.
- [X] T017 [US3] Confirm `apps/frontend/app/upload/page.tsx` gates on `user.role !== "admin"` before rendering the form (the "Only admins can upload games." branch at line 19–22), and that `user` comes from `GET /auth/me` rather than a client-only flag.
- [X] T018 [US3] Confirm `apps/frontend/components/Navbar.tsx` adds the upload link only when `user?.role === "admin"` (line 46).

**Checkpoint**: Non-admin is refused at the backend and at the page.

---

## Phase 6: User Story 4 - Thumbnails appear in the library (Priority: P2)

**Goal**: Library cards show the thumbnail, falling back to the cover, then to a placeholder.

**Independent Test**: Load the library with one game that has a thumbnail, one with only a cover, and one with neither. Each card renders without a broken image.

- [X] T019 [US4] In `apps/frontend/components/GameCard.tsx`, render a placeholder when both `thumbnail` and `cover` are null (currently `cardImage = game.thumbnail ?? game.cover` at line 23, with no placeholder for null).
- [X] T020 [US4] Confirm `apps/frontend/components/GameLibrary.tsx` passes `thumbnail` through to `GameCard` (its `Game` type already includes `thumbnail` at line 15).

**Checkpoint**: Library shows artwork or a placeholder for every game.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T021 Run `npm run lint -w apps/backend`, `npm run test -w apps/backend`, `npm run lint -w apps/frontend`, and `npm run build -w apps/frontend`. Fix any failures this feature introduced.
- [ ] T022 Walk quickstart.md steps 1–6 end to end with a real `.nes` and a real `.sfc`, and record the results.
- [ ] T023 Confirm the seeded games still play after T007 (the `ROMS_DIR` fallback path), since the spec requires existing games to keep working (FR-010).

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → Phases 3–6 → Phase 7.**
- **Phase 2 blocks US1 (T007 needs `open()`) and US2 (T013 needs `delete()`).**
- **US3 and US4 do not depend on Phase 2.** US3 is verification only; US4 is frontend only.
- Within US2: T011 → T012 → T013 → T014 → T015. T015 can run alongside T012.

### Parallel opportunities

- T003 and T004 (different provider files) after T002.
- T008, T009, T010 are frontend checks and can run alongside backend work on T006–T007.
- US3 (T016–T018) and US4 (T019–T020) can run in parallel with US1 and US2.

## Implementation Strategy

### MVP first (User Story 1)

1. Phase 1 → Phase 2.
2. Phase 3 (US1). Stop and validate: an upload plays.
3. Phase 4 (US2) before shipping. An MVP without rollback leaves orphan files, which breaks FR-006.

### Incremental delivery

1. US1 → playable uploads.
2. US2 → safe uploads.
3. US3 → access checks confirmed.
4. US4 → library visuals.
5. Polish.

**Note**: US1 and US2 are both P1, so the MVP needs both. Shipping US1 alone is a demo, not a release.

---

## Implementation notes

Status: **implemented, not verified end to end.** Lint, typecheck (src), backend tests, frontend lint, and frontend build all pass. The live checks (T001, T016 with real tokens, T022, T023) need Postgres running; the `DATABASE_URL` in `apps/backend/.env` isn't reachable.

Deviations from the plan and tasks, with reasons:

- **T005**: `isSupportedEmulator` was not added. The DTO uses `@IsIn(Object.keys(EXTENSION_BY_EMULATOR))` instead, so the helper would be dead code.
- **T007**: uploaded games store the storage **key** (`roms/<uuid><ext>`) in `romPath`, not the URL. `getRom` reads the key through `open()`. Seeded games (`/games/<id>/rom` or `pending`) still use the `ROMS_DIR` fallback. Admin ROM endpoints (`admin/`, `POST /games/:id/upload-rom`) still store URLs, so their games still resolve only via `ROMS_DIR`, as before. That's a follow-up.
- **T011**: `rom-file-validation.ts` was left unchanged. `romFileFilter` is still used by the admin and `/uploads/rom` routes, so removing its extension check would weaken them. The games upload uses its own filter that skips the ROM extension check, and the check runs in the handler against the chosen emulator.
- **Bug fixed outside the task list**: `EXTENSION_BY_EMULATOR` in `games/rom-file.util.ts` was missing `n64: '.n64'`, though the seed writes `.n64` files. N64 playback fell back to `.rom`. Added.
- **T019**: no change needed. `GameCard` already shows "No cover" when both `thumbnail` and `cover` are null.
- **Frontend `ROM_ACCEPT`** is now the union of the backend's per-system extensions. The backend enforces the exact extension for the chosen system.

Follow-ups, outside this feature:
- The frontend `TYPE_TO_SYSTEM` (`hooks/useEmulator.ts`) has no `n64` entry, so N64 can't be chosen in the upload form even though the backend accepts it.
- The admin and `/uploads/rom` routes still use the global `.nes/.smd/.bin/.rom` filter.
- Rollback doesn't cover a crash between save and create; orphaned files are possible in that case. A sweep job would fix it.

