# Contract: Games upload and ROM playback

## POST /games/upload

- **Auth**: `Authorization: Bearer <jwt>`, user must have role `admin`. Non-admin → 403. No/invalid token → 401.
- **Content-Type**: `multipart/form-data`
- **Fields**:

| Field | Kind | Required | Rules |
|-------|------|----------|-------|
| title | text | yes | 1–200 chars |
| emulator | text | yes | Key in `EXTENSION_BY_EMULATOR` (`nes`, `snes`, `genesis`, `atari`, `mame`) |
| description | text | no | ≤ 2000 chars |
| rom | file | yes | Extension per emulator (`.nes`, `.sfc`, `.md`, `.bin`, `.zip`); ≤ 32 MB |
| cover | file | yes | PNG, JPEG, or WebP; ≤ 5 MB |
| thumbnail | file | yes | PNG, JPEG, or WebP; ≤ 5 MB |

- **201 Created**: body is the created `Game` (`id, title, emulator, romPath, cover, thumbnail, description, …`).
- **400 Bad Request**: message names the failing field and lists allowed values, e.g. `Unsupported ROM file type ".exe" for "nes". Allowed: .nes`. Nothing is stored or created.
- **Unknown file field** → 400 (existing behavior).

## GET /games/:gameId/rom

- **Auth**: JWT (any signed-in user).
- **200**: ROM bytes, `application/octet-stream`, `Content-Disposition: attachment`.
- **404**: game not found, or no ROM file resolvable.
- **Change**: resolves the file from `romPath` through the storage provider; falls back to `ROMS_DIR/<id><ext>` for seeded games. Response shape is unchanged, so `useEmulator.ts` needs no change.

## Errors on rollback

If a stored file cannot be deleted during rollback, the original error is still the one returned. The leftover is logged, not surfaced to the admin.
