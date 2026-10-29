# Feature Status — audit

> Produced under `docs/redesign/SPEC.md` §0.1 and §13. Audit date: 2026-10-29. Branch: `admin-accounts`.
> Method: read the repo (routes, components, hooks, lib, backend controllers/services, Prisma schema, seed, public assets). **No app was run in a browser**, so `live` means "code path exists end-to-end", not "tested in a browser". Items marked *unverified* need a manual check.
> Paths are relative to the repo root. The frontend has no `src/` folder; the app lives in `apps/frontend/app` and `apps/frontend/components`.

## Feature Status Matrix

| # | Feature | Spec § | Status | Evidence | Notes / missing |
|---|---|---|---|---|---|
| 1 | Design tokens + light/dark theme | 2 | partial | `apps/frontend/app/globals.css` (arcade palette, `.dark` variant, `--color-arcade-dark`) | Tokens are dark-only. No ThemeProvider, no theme toggle, no light palette. Hardcoded hex colors in Navbar, GameCard, `app/page.tsx`, PrimaryButton. Font stack overridden to Courier New; Press Start 2P used at 10–12px. |
| 2 | Header (guest/auth, avatar dropdown, mobile drawer) | 4.2 | partial | `components/Navbar.tsx`, `components/UserMenu.tsx`, `components/ui/sheet.tsx` | Navbar is rendered only when signed in (`components/AppShell.tsx:32`). No guest header, no Log in / Sign up buttons. Dropdown and mobile sheet exist. No skip link. |
| 3 | Announcement bar + admin management | 4.3, 5.15 | live | `components/AnnouncementBanner.tsx`, `components/AppShell.tsx:36`, `app/admin/banner/page.tsx`, `apps/backend/src/announcement/*`, `PUT /admin/announcement` in `admin/admin.controller.ts:177` | Stored as a `SystemSetting`. Has a preview. Tone field exists. |
| 4 | Notifications (bell + page) | 4.4 | planned | none | No model, endpoint, or UI. |
| 5 | Footer | 4.5 | planned | none | No footer component. |
| 6 | Landing (guest) | 5.1 | planned | `app/page.tsx` uses `useRequireAuth`, so guests are redirected to `/auth/login` | No guest landing. |
| 7 | Home (signed in) | 5.2 | live | `app/page.tsx` (quick stats, featured game, recent saves), `hooks/useStats.ts`, `GET /stats/:userId` (`stats/stats.controller.ts`) | Works. Layout not spec-compliant. Earlier audit noted duplicated content (Continue Playing vs Featured both point at Play). |
| 8 | Login / Sign up | 5.3 | live | `app/auth/login/*`, `app/auth/signup/page.tsx`, `POST /auth/login`, `POST /auth/signup`, `GET /auth/me`, `auth/auth.service.ts` (bcrypt, JWT, tokenVersion) | `next` redirect parameter not verified. |
| 9 | Forgot / reset password | 5.3 | planned | none | No pages, no endpoints, no token storage. |
| 10 | OAuth login | 5.3 | planned | none | No providers configured. |
| 11 | Library: search | 5.4 | planned | `components/GameLibrary.tsx` (fetch only) | `GET /games` has no `search` param (`games/dto/query-games.dto.ts`). |
| 12 | Library: grid/list view toggle | 5.4 | planned | `components/GameLibrary.tsx` (grid only) | — |
| 13 | Library: filters | 5.4 | partial | `GET /games?emulator=` (`games/games.service.ts:37`) | API supports one emulator filter. No UI. |
| 14 | Library: sorting | 5.4 | planned | `games.service.ts:43` hardcodes `createdAt desc` | No sort param, no UI. |
| 15 | Library: pagination | 5.4 | partial | API: `page`, `limit` (max 100). UI: `GameLibrary.tsx` fetches `limit=100` once | No page controls. Fine for small catalogs only. |
| 16 | Game details | 5.5 | partial | Details appear only on `app/emulator/[gameId]/page.tsx` (title, year, rating, description) | No `/games/[slug]` route. No slugs in the data model. |
| 17 | Public profile | 5.6 | planned | none | Spec marks it "planned, confirm with user". |
| 18 | Emulator player (cores load & run) | 5.7 | partial | `components/EmulatorPlayer.tsx`, `hooks/useEmulator.ts`, `lib/emulator-systems.ts`, `public/emulators/data/cores/` | Cores vendored for NES (fceumm), SNES (snes9x), Genesis (genesis_plus_gx), N64 (mupen64plus_next). **No Atari or MAME core is present**, so seeded `atari` and `mame` games cannot run. *Unverified in a browser.* |
| 19 | Real ROMs served from storage | 5.7 | partial | Uploads: `uploads/storage/{local,s3}-storage.provider.ts`; `GET /games/:id/rom` (`games/games.controller.ts:73`) streams `roms/<key>` via `open()`; seeded games use `ROMS_DIR/<id><ext>` | Seeded games use placeholder files on disk (78–101 bytes for most). `public/emulators/roms/` has one `.n64` file and empty folders otherwise. `POST /admin/games/:id/upload-rom` exists but the admin UI doesn't call it. |
| 20 | Save / load states + cloud sync | 5.7, 5.10 | live | `components/EmulatorUI.tsx`, `components/SaveManager.tsx`, `lib/saves.ts`, `saves/saves.controller.ts` (`POST /saves`, `GET /saves/game/:id`, `PUT`, `DELETE`) | Slot-based. Works from the in-player panel. No dedicated saves page (see row 27). *Unverified in a browser.* |
| 21 | Touch controls (mobile) | 5.7 | planned | none (`EmulatorUI.tsx` has keyboard mapping only) | — |
| 22 | Dashboard shell (role-based sidebar) | 5.8 | planned | No `/dashboard` route. Navigation is the top Navbar (`components/Navbar.tsx`). | Route structure differs from spec §3.2. See Questions. |
| 23 | Dashboard overview + stats | 5.9 | partial | Stats cards on `app/page.tsx` | Not at `/dashboard`. Only total games, games played, playtime, recent games. |
| 24 | Activity charts | 5.9 | planned | No chart component or library (`app/globals.css` only mentions "chart") | — |
| 25 | Achievements | 5.11 | planned | Tables exist: `Achievement`, `UserAchievement` (`prisma/contract.prisma`). No module, endpoint, seed, or UI. | Data model only. |
| 26 | Favorites | 5.12 | planned | none | No model, endpoint, or UI. |
| 27 | Play history | 5.12 | partial | `stats.service.ts` returns `recentGames` (derived from saves); shown as a card on home | No history page, no real play-event log. |
| 28 | Friends | 5.13 | planned | none | — |
| 29 | Leaderboards | 5.13 | planned | none | — |
| 30 | Multiplayer | 5.13 | planned | none | — |
| 31 | Profile edit (fields) | 5.14 | partial | `app/profile/page.tsx`: read-only account details and logout | No update endpoint (no `PATCH /users/me`). |
| 32 | Avatar upload + crop | 5.14 | planned | `User.avatar` column exists (`prisma/contract.prisma`). Uploads route only handles ROMs and game images. | No avatar endpoint or UI. |
| 33 | Settings: account (email/password) | 5.16 | planned | none | No endpoints, no page. |
| 34 | Settings: appearance | 5.16 | planned | none | Depends on row 1. |
| 35 | Settings: controls / gamepad mapping | 5.16 | planned | none (keyboard mapping is hardcoded in `EmulatorUI.tsx`) | — |
| 36 | Settings: notifications / privacy | 5.16 | planned | none | — |
| 37 | Delete account | 5.16 | planned | Only admin delete exists: `DELETE /admin/users/:id` | No self-serve deletion. |
| 38 | Admin overview | 5.15 | live | `app/admin/page.tsx` → `GET /admin/analytics/overview`, `GET /admin/analytics/top-games` | — |
| 39 | Admin: games CRUD + ROM/media upload | 5.15 | partial | List/delete `app/admin/games/page.tsx`; edit + cover/thumbnail upload `app/admin/games/[id]/page.tsx`; create via `/upload` (`components/GameUploadForm.tsx`) | Create is at `/upload`, not `/dashboard/admin/games/new`. ROM replacement API exists but no UI. |
| 40 | Admin: systems / cores | 5.15 | planned | Static list in `lib/emulator-systems.ts` | No endpoints, no admin UI. |
| 41 | Admin: users management | 5.15 | live | `app/admin/users/page.tsx` → role, status, force logout, delete (`admin/admin.controller.ts`) | — |
| 42 | Admin: reports & logs | 5.15 | partial | `GET /admin/logs` (paginated `AdminLog`) | No UI page. |
| 43 | Role guards (server + client) | 3.1 | live | Server: `AdminGuard` (`auth/admin.guard.ts`), `RolesGuard` + `@Roles('admin')` on game routes, `JwtAuthGuard` on user routes. Client: `app/admin/layout.tsx` gate; Navbar adds admin links only for admins. | Verified by reading only. Quickstart step 5 (403/401 with real tokens) is still open. |
| 44 | Legal pages | 5.17 | planned | none | Content comes from the user (spec §15). |
| 45 | 404 / 500 / offline | 5.18 | planned | No `not-found.tsx`, `error.tsx`, or offline handling in `apps/frontend/app` | Next.js defaults apply. |
| 46 | Production deployment | — | planned | No Dockerfile, compose file, or CI config in the repo | Decided: runs locally only for now. Out of scope. |

### Additional features found (not in §13)

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Admin email (send to users) | live | `app/admin/email/page.tsx` → `POST /admin/emails` (`mail/mail.service.ts`) | Mail driver is configured in `.env` (`MAIL_DRIVER`, `MAIL_API_KEY`). Delivery *unverified*. |
| Game upload form | live | `app/upload/page.tsx`, `components/GameUploadForm.tsx` → `POST /games/upload` | Verified by the upload spec (T001–T021). T022 (live walkthrough) is still open. |
| Game images (cover + thumbnail) | live | `POST /admin/games/:id/images/:kind`, `POST /games/upload` | Stored via the storage provider. |

## Backend needed

These features are not implemented yet. Each needs new backend work, so each renders `<ComingSoon>` under spec §0.2.

- **Auth:** password reset (request + token + set password), OAuth (Google / GitHub), change password/email, delete own account, session list.
- **Users:** `GET /users/me` and `PATCH /users/me` (profile fields), avatar upload + storage, public profile `GET /users/:username`.
- **Games:** `search` and `sort` query params on `GET /games`; a slug field and lookup; game-details endpoint if it should differ from `GET /games/:id`.
- **Library:** ROM replacement UI over the existing `POST /admin/games/:id/upload-rom`.
- **Favorites:** new model + `GET/PUT/DELETE /favorites`.
- **History:** a play-event model, or agree that `stats.recentGames` is enough.
- **Achievements:** the tables exist; needs a module, unlock logic, endpoints, and seed data.
- **Notifications:** model + endpoints + bell/popover feed.
- **Announcements:** nothing new (done).
- **Social:** friends, leaderboards, multiplayer lobbies (all new models and endpoints).
- **Admin:** systems/cores CRUD (currently static), reports UI over `GET /admin/logs`.
- **Emulator:** Atari and MAME cores (vendored files), or remove those systems from the library.

## Decisions (confirmed by the user, 2026-10-29)

1. **Guest access: yes.** Guests can browse the library and game details (spec §15 default). Today `/games` and `/` redirect guests to login and the Navbar is hidden for guests. The redesign must change this.
2. **Routes: `/dashboard/*`.** Move to the spec's structure (§3.2). Current `/profile`, `/admin/*`, `/upload` move under `/dashboard/`. Redirect the old paths.
3. **Atari and MAME: dropped for now.** Future plan (not in scope for the redesign): add the Atari (`atari2600`) and MAME cores, then re-enable those systems. How to hide them is not yet decided: a UI filter on the library, or removing the seeded entries. Confirm before I change code.
4. **Production deployment: not needed now.** The app runs locally only. Row 46 stays `planned` and is out of scope.

## Open questions

Spec §15 items still need answers:

5. **ROM content and legal policy (spec §15):** The seeded ROMs are placeholders. Do you have legal ROMs to bundle, or should the library only show uploaded games? Also need the ROM/legal text and upload confirmation wording.
6. **Placeholders (spec §15):** `[APP_NAME]`, logo mark, accent color (spec default pink `#FF3D9A` / `#C8176E`), hero and feature copy, FAQ, Terms/Privacy text.
7. **Public profiles (§15):** Yes or no? Spec marks it "confirm with user".
8. **Moderator role (§15):** Needed, or admin and user only?
9. **Avatar limits (§15):** Max size (spec default 2 MB) and per-user save quota.
10. **OAuth providers (§15):** Google, GitHub, both, or neither?
11. **Languages (§15):** English only, or Arabic/RTL later?
12. **Frontend source layout:** The spec says `apps/frontend/src/config/features.ts`, but the project has no `src/` folder. Create `src/`, or put the registry at `apps/frontend/config/features.ts`?
13. **Scope of "partial" items:** Should I restyle only what works (rows 2, 13, 15, 16, 19, 23, 27, 31, 39, 42), and show `<ComingSoon>` for the missing parts? Or build the missing UI over existing APIs where possible (e.g., library filter/search UI, ROM replacement UI, admin logs page)?
14. **`apps/arcade`:** An untracked app exists at `apps/arcade`. Is it in scope for this redesign? The spec says main frontend only.

## Summary

| Status | Count | Rows |
|---|---|---|
| live | 7 | 3, 7, 8, 20, 38, 41, 43 |
| partial | 12 | 1, 2, 13, 15, 16, 18, 19, 23, 27, 31, 39, 42 |
| planned | 27 | 4, 5, 6, 9, 10, 11, 12, 14, 17, 21, 22, 24, 25, 26, 28, 29, 30, 32, 33, 34, 35, 36, 37, 40, 44, 45, 46 |

Total 46, matching §13. Rows 3 and 20 are `live` but not yet exercised in a browser; row 18 is `partial` (Atari/MAME cores missing).

## Notes on the audit

- Row 3 (announcement bar) was verified by reading the mount in `AppShell`, the banner component, the admin page, and the backend route. It has not been seen rendering.
- Row 18 (emulator) and row 20 (saves) depend on the vendored EmulatorJS data in `public/emulators/data/`. I did not run a session, so a core that fails to load would not show here.
- Row 43 (role guards) was read, not exercised. The server-side 403/401 check is quickstart step 5, still open from the upload feature.
- Nothing in this audit changed any code. The only file written is this one.
