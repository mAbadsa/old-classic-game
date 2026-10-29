# Data Model: Game Upload

## Game (existing table `games`)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key, generated |
| title | text | Required on upload, 1–200 chars |
| emulator | text | Required; must be a key in `EXTENSION_BY_EMULATOR` |
| romPath | text | Storage key or URL of the ROM, written on upload. Seeded games hold a placeholder. |
| cover | text, nullable | Stored image URL. Required on upload (spec assumption). |
| thumbnail | text, nullable | Stored image URL. Added by migration `20261011T1324_add_game_thumbnail`. Required on upload. |
| description | text, nullable | Optional, max 2000 chars |
| releaseYear, rating, tags | — | Unchanged; not set by upload |
| createdAt, updatedAt | timestamptz | Unchanged |

**Validation rules (upload path)**:
- ROM extension ∈ `EXTENSION_BY_EMULATOR[emulator]`, default `.rom` only when unmapped.
- Cover and thumbnail MIME ∈ {png, jpeg, webp}; each ≤ 5 MB.
- ROM ≤ 32 MB (`MAX_ROM_SIZE_BYTES`).
- Title and emulator non-empty.

**State**: none. Games are created and then read-only in this feature. Edit and delete stay with the existing admin tools (spec out-of-scope).

## Upload submission (transient)

Exists only inside the request. Holds the three files and the text fields. On success it becomes one `Game` row. On failure, any stored files are deleted and no row is written.

## Storage object (transient keys)

Stored ROM and images are keyed `<uuid><ext>` by the provider. The keys are referenced by `romPath`, `cover`, and `thumbnail`. A key that no row references is an orphan; the rollback in `research.md` §2 prevents them.
