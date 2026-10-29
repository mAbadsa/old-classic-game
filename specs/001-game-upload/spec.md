# Feature Specification: Game Upload

**Feature Branch**: `001-game-upload`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Game upload feature: admins (and possibly users) upload a ROM with cover and thumbnail images, with title, emulator, description; the game then appears in the library with its thumbnail and can be played. Covers the thumbnail column migration, multipart validation for ROM and image files, and the frontend upload page."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin uploads a new game (Priority: P1)

An admin opens the upload page, enters a title, selects an emulator system, optionally adds a description, and attaches a ROM file, a cover image, and a thumbnail image. On submit, the game is added to the library with its artwork and becomes playable.

**Why this priority**: This is the core value of the feature. Without it, games can only be added through the seed script or manual database work.

**Independent Test**: Log in as an admin, submit a valid upload with all three files, then confirm the game appears in the library with its thumbnail and opens in the player.

**Acceptance Scenarios**:

1. **Given** an admin is signed in, **When** they submit a title, emulator, valid ROM, cover, and thumbnail, **Then** the game appears in the library with the uploaded thumbnail and cover.
2. **Given** an uploaded game, **When** a signed-in user opens it, **Then** the game can be launched in the player.
3. **Given** an admin submits without a description, **When** the upload succeeds, **Then** the game is created with an empty description.
4. **Given** an admin submits without a thumbnail, **When** the form is validated, **Then** the upload is rejected with a message saying a thumbnail is required. *(Assumed required; see Assumptions.)*

---

### User Story 2 - Upload is rejected when inputs are invalid (Priority: P1)

When any part of an upload is invalid, nothing is saved: no partial game, no orphaned files. The user sees a message that names the problem.

**Why this priority**: Prevents broken library entries and wasted storage, and blocks malicious files.

**Independent Test**: Submit each invalid input type in turn and confirm no game is created and the message names the field at fault.

**Acceptance Scenarios**:

1. **Given** a ROM with an unsupported file type, **When** submitted, **Then** the upload is rejected and the message lists the allowed ROM types.
2. **Given** a cover or thumbnail that is not PNG, JPEG, or WebP, **When** submitted, **Then** the upload is rejected and the message lists the allowed image types.
3. **Given** a file over the size limit, **When** submitted, **Then** the upload is rejected and the message states the limit.
4. **Given** a missing or empty title or emulator, **When** submitted, **Then** the upload is rejected and the message names the missing field.
5. **Given** a valid ROM and an invalid thumbnail, **When** submitted, **Then** no game is created and the ROM is not kept.

---

### User Story 3 - Non-admins cannot upload (Priority: P1)

A user without admin rights cannot reach the upload page or submit an upload, whether through the interface or a direct request.

**Why this priority**: Uploads publish content to every user. This is a security boundary.

**Independent Test**: Sign in as a non-admin, open the upload page, and attempt a direct upload request. Both must be refused.

**Acceptance Scenarios**:

1. **Given** a non-admin is signed in, **When** they open the upload page, **Then** they are redirected or shown a "not permitted" message.
2. **Given** a signed-out visitor, **When** they send an upload request, **Then** the request is refused as unauthenticated.
3. **Given** a non-admin, **When** they send an upload request directly, **Then** the request is refused as forbidden and nothing is stored.

---

### User Story 4 - Thumbnails appear in the library (Priority: P2)

Library cards show each game's thumbnail. Games without one (such as the existing seeded games) show a placeholder.

**Why this priority**: Makes the library usable visually, but the game still works without it.

**Independent Test**: Load the library with a mix of games with and without thumbnails and confirm each card renders correctly.

**Acceptance Scenarios**:

1. **Given** a game with a thumbnail, **When** the library loads, **Then** its card shows the thumbnail.
2. **Given** a game without a thumbnail, **When** the library loads, **Then** its card shows a placeholder and nothing is broken.

---

### Edge Cases

- What happens when the same title is uploaded twice? (Allowed; each upload is a separate game with its own id.)
- What happens when the connection drops mid-upload? No game is created and no partial files remain.
- What happens when a ROM is uploaded with a valid extension but the wrong content? It is accepted as-is; content is not verified beyond the file type (no emulator-level check).
- What happens when an emulator value is not a supported system? The upload is rejected with the list of supported systems.
- What happens to existing games that have no thumbnail? They keep working and show the placeholder.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let an admin create a game by submitting a title, an emulator system, an optional description, a ROM file, a cover image, and a thumbnail image in one submission.
- **FR-002**: The system MUST accept only ROM file types the emulator system supports, and MUST reject other types with a message listing the allowed types.
- **FR-003**: The system MUST accept cover and thumbnail images only in PNG, JPEG, or WebP.
- **FR-004**: The system MUST reject any ROM, cover, or thumbnail above its size limit, and MUST state the limit in the message.
- **FR-005**: The system MUST reject a submission with a missing or empty title or emulator, and MUST name the field.
- **FR-006**: The system MUST store the game and its files together or not at all; a failed submission MUST leave no game record and no stored files.
- **FR-007**: The system MUST restrict uploads to admins and MUST refuse uploads from non-admins and signed-out visitors.
- **FR-008**: The system MUST store a thumbnail reference per game and return it with the game's details.
- **FR-009**: The library MUST display each game's thumbnail, or a placeholder when none exists.
- **FR-010**: The system MUST keep existing games (without thumbnails) working, with no data loss.
- **FR-011**: Uploaded games MUST appear in the library and be playable by signed-in users without a restart or manual step.
- **FR-012**: The upload page MUST show per-field validation messages before or after submit, and MUST show progress while the upload is in flight.

### Key Entities

- **Game**: A playable title. Attributes: title, emulator system, description, ROM reference, cover reference, thumbnail reference, created by. Each game belongs to exactly one emulator system.
- **Upload submission**: The bundle of text fields and files sent together. Exists only for the duration of the request; becomes a Game on success.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can add a new playable game with artwork in under 2 minutes.
- **SC-002**: 100% of invalid submissions (wrong file type, oversize, missing field) are rejected with a message naming the problem.
- **SC-003**: 0 games are left without their required files after any failed submission.
- **SC-004**: 100% of non-admin upload attempts are refused.
- **SC-005**: Every game in the library shows either its thumbnail or a placeholder, with no broken images.

## Assumptions

- Only admins can upload, confirmed by the product owner. This matches the existing rule on game creation and ROM upload.
- A thumbnail is required on upload; a cover is required as well. Both are sized for card and hero display, so the 5 MB image limit applies.
- The supported ROM types are the ones already defined for each emulator system; the spec does not add new systems.
- Existing games seeded without thumbnails keep working and are not backfilled.
- The feature does not include editing or deleting games after upload, which stay with the existing admin tools.
- The existing signed-in session model is reused; no new login flow is added.
- Players see uploaded games in the same library as seeded games, with no separate approval step.
