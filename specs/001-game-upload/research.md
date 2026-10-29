# Research: Game Upload

No `NEEDS CLARIFICATION` items remained from the spec or Technical Context. The stack is already chosen. Four design questions came up while reading the existing code; each is resolved below.

## 1. Where playback reads the ROM

- **Decision**: `GET /games/:gameId/rom` streams the file at `romPath` through the storage provider, falling back to `ROMS_DIR/<id><ext>` for seeded games whose `romPath` is a placeholder.
- **Rationale**: Uploaded ROMs live in `UPLOADS_DIR` (or S3) under random names. Copying each one into `ROMS_DIR` under the game id would duplicate bytes and break on S3, where there is no local directory.
- **Alternatives considered**:
  - Copy the upload into `ROMS_DIR/<id><ext>`: simple, but S3 mode can't do it, and it doubles disk use.
  - Rename uploads to `<id><ext>` in storage: changes the storage key scheme for every provider.

## 2. Keeping uploads all-or-nothing

- **Decision**: Validate every part first (ROM type, sizes, emulator, title). Then store the ROM and both images. Then create the row. If any step after the first store fails, call `delete()` on each stored key before rethrowing.
- **Rationale**: Covers FR-006 with the smallest change. It needs one new method on `StorageProvider`, and call sites stay the same.
- **Alternatives considered**:
  - Database transaction around the create: doesn't clean up files, which live outside Postgres.
  - Store files after the row (create with placeholder paths, then update): leaves a visible half-made game if the process dies.
  - Background cleanup job for orphans: real machinery for a rare case.
- **Known ceiling**: a crash between store and create still orphans files. Acceptable at this scale; a sweep job is the upgrade path.

## 3. ROM types per system

- **Decision**: Use `EXTENSION_BY_EMULATOR` as the allowed list for the chosen emulator. Reject unknown emulators at the DTO layer with the supported list. Drop the global `.nes .smd .bin .rom` filter.
- **Rationale**: One mapping already drives playback. A second list drifts from it. The current filter rejects `.sfc` and `.md`, the extensions playback expects, and admits `.smd`, which playback never maps.
- **Alternatives considered**:
  - Keep the global list and add the missing extensions: two lists to keep in sync, which is the drift we're removing.
  - Accept any extension: passes FR-002 only loosely and lets mismatched files through.
- **Note**: `romExtensionForEmulator` falls back to `.rom` for unmapped emulators. Upload rejects unmapped emulators at the DTO, so the fallback never applies on upload; a new system needs a mapping entry before it can be uploaded.

## 4. Image handling

- **Decision**: Keep the existing `image-file-validation.ts` (PNG/JPEG/WebP, 5 MB). Enforce it inside the same validate-first pass, not after storing the ROM.
- **Rationale**: Today `assertImageSize` runs after `storeRom`, so an oversize thumbnail leaves a stored ROM behind. Moving the check up removes that case without new code.
- **Alternatives considered**: Re-encode or resize images on upload: adds an image library for no spec requirement.
