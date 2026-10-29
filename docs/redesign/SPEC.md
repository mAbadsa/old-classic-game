# Redesign Spec — Retro Game Emulator Web App

> **Audience:** Claude Code, working in this repository.
> **Purpose:** Single source of truth for the UI/UX redesign: design system (light + dark), app shell, every page, every component, states, roles and acceptance criteria.
> **Stack (expected — verify in repo):** Next.js (`apps/frontend`), NestJS (`apps/backend`), PostgreSQL + Prisma, Redis, S3/MinIO, npm workspaces.
> **Spec version:** 1.0 · 2026-10-29

---

## 0. How to use this spec (read first)

This spec describes the **target design for the whole product**, including features that may not exist yet. You decide, per feature, what to do by auditing the codebase.

### 0.1 Mandatory first step — Feature audit

Before changing any UI:

1. Read the repo (routes, components, API modules, Prisma schema, seed data).
2. Fill in the **Feature Status Matrix** (§13) by marking every feature as one of:
   - `live` — implemented end-to-end and working (UI + API + data).
   - `partial` — some parts exist (e.g. API without UI, UI with mock data).
   - `planned` — nothing exists yet.
3. Write the result to `docs/feature-status.md` (create the `docs/` folder if needed) and show it to the user **before** starting the redesign. Wait for confirmation.

### 0.2 Rules per status

| Status | What you do |
|---|---|
| `live` | Restyle and restructure it to match this spec. **Do not change business logic, API contracts or data models** unless this spec explicitly requires it — if it does, list the change and ask first. |
| `partial` | Restyle what exists. Wire the missing pieces only if they are pure UI over an existing API. Anything needing new backend work → render the `<ComingSoon>` state (§6.20) for the missing part and add a TODO entry in `docs/feature-status.md`. |
| `planned` | Do **not** build the backend. Add the route/nav entry and render the full page layout using `<ComingSoon>` (§6.20). Register it in the feature registry (§3.4) as `coming_soon`. The design in this spec stays the reference for whenever the feature gets implemented later. |

### 0.3 When a feature is implemented later

Any future work on a feature in this spec **must follow the design described here** (layout, components, states, acceptance criteria). When it ships, flip its flag in the feature registry from `coming_soon` → `live` and update `docs/feature-status.md`.

### 0.4 General working rules

- Work on a branch: `feat/redesign`. Small commits per phase (§14).
- Never delete working functionality to "simplify" the redesign.
- Reuse existing data fetching, auth and state logic; replace presentation only.
- If something in the repo contradicts this spec (e.g. a field doesn't exist), **stop and ask** instead of inventing data.
- Placeholders written as `[LIKE THIS]` must not ship as-is: ask the user for the real value (see §15).
- Everything must work in **light and dark** mode and from **360px to 1920px** width.

---

## 1. Product overview & design principles

### 1.1 Product

A web app to browse and play classic games (NES, SNES, Genesis, Atari, MAME, DOS…) in the browser via WASM emulators, with accounts, cloud saves, achievements and (later) social/multiplayer features.

- **Product name:** `[APP_NAME]` — used in logo, `<title>`, metadata. Store in one constant (`config/site.ts`).
- **Tone:** nostalgic but modern. Retro identity in the *details*, calm and readable everywhere else.

### 1.2 The five UX rules (apply on every screen)

1. **Group related items.** Every group of controls/content has a small, clear label (mono caps). Users scan by group.
2. **One accent color.** The accent is used *only* for: the primary action, the active/selected state, focus rings and key highlights. Everything else is neutral grays. Status colors (success/warning/danger/info) are used only for status, never decoration.
3. **Room to breathe.** Spacing follows the 4/8px scale (§2.4). Consistent gaps between fields; no cramped clusters.
4. **One primary action per view/section.** Exactly one filled accent button per region. Others are secondary (outline) or ghost.
5. **Make the active state obvious.** Current nav item, selected tab, selected game card, focused input: accent border/underline + (dark mode) a soft glow.

### 1.3 Retro identity — where it is allowed

| Element | Retro treatment |
|---|---|
| Logo, page H1, hero headline, primary CTA label | `Press Start 2P` (pixel font) |
| Primary button | Hard offset shadow (`4px 4px 0` black / dark) + accent glow in dark mode |
| Backgrounds | Very subtle 32px grid pattern (opacity ≤ 3%) on page background only |
| Corners | Square (radius 0–2px). No pill/rounded-card look |
| Labels / metadata | `JetBrains Mono`, uppercase, letter-spaced |

**Not allowed:** neon text-shadows on body text, multiple glowing elements per view, pixel font for paragraphs/forms/tables, two competing accent colors, thick 3px borders on every component (old design).

---

## 2. Design tokens (theme)

Implement tokens as **CSS custom properties** on `:root` (light) and `[data-theme="dark"]` (dark). If the project uses Tailwind, map tokens in `tailwind.config` (`colors: { bg: 'var(--color-bg)', … }`) so components only use token names — **never raw hex in components**.

### 2.1 Color tokens

| Token | Dark (default) | Light | Usage |
|---|---|---|---|
| `--color-bg` | `#0D0D11` | `#F7F6F2` | Page background |
| `--color-surface` | `#15151B` | `#FFFFFF` | Cards, panels, header |
| `--color-surface-2` | `#1E1E26` | `#F0EFEA` | Nested surfaces, inputs, cover placeholders, hover rows |
| `--color-surface-raised` | `#1B1B22` | `#FFFFFF` | Menus, popovers, modals |
| `--color-border` | `#2A2A33` | `#E2E0D8` | Default borders/dividers |
| `--color-border-strong` | `#3A3A46` | `#C9C6BC` | Secondary button borders, input hover |
| `--color-text` | `#ECECF1` | `#16161C` | Primary text |
| `--color-text-muted` | `#A3A3B2` | `#5C5C6B` | Secondary text, labels, metadata |
| `--color-text-subtle` | `#7C7C8A` | `#7A7A88` | Placeholders, disabled text (never for essential info) |
| `--color-accent` | `#FF3D9A` | `#C8176E` | Primary actions, active states, focus |
| `--color-accent-hover` | `#FF5EAD` | `#A91260` | Hover of accent elements |
| `--color-accent-fg` | `#0D0D11` | `#FFFFFF` | Text/icons on accent backgrounds |
| `--color-accent-soft` | `rgba(255,61,154,0.12)` | `rgba(200,23,110,0.08)` | Selected row/chip background |
| `--color-accent-glow` | `rgba(255,61,154,0.35)` | `transparent` | Glow on primary/selected (dark only) |
| `--color-success` | `#3DDC97` | `#12805C` | Synced, completed, live |
| `--color-warning` | `#FFC94D` | `#9A6700` | Warnings, beta |
| `--color-danger` | `#FF6B6B` | `#C62828` | Errors, destructive |
| `--color-info` | `#5BA8FF` | `#1F5FBF` | Info banners |
| `--color-grid-line` | `rgba(255,255,255,0.025)` | `rgba(0,0,0,0.035)` | Background grid pattern |
| `--color-overlay` | `rgba(0,0,0,0.6)` | `rgba(22,22,28,0.4)` | Modal backdrop |
| `--color-hard-shadow` | `#000000` | `#16161C` | Retro offset shadow |

Status colors have a `-soft` variant at 12% (dark) / 8% (light) alpha for banner/badge backgrounds.

**Accent is configurable:** keep it in one place. Alternative accents the user may choose later: yellow `#FFE14D`/`#8A6D00`, green `#3DDC97`/`#12805C`, blue `#5BA8FF`/`#1F5FBF` (dark/light).

**Contrast requirement:** all text ≥ 4.5:1 against its background, large text (≥24px) and UI borders that convey state ≥ 3:1. Verify with a contrast checker when tokens change.

### 2.2 Theme switching

- Modes: `system` (default), `light`, `dark`.
- Toggle lives in the header (icon button) and in Settings → Appearance.
- Persist choice in a cookie **and** localStorage; read the cookie server-side (or use `next-themes`) so there is **no flash of wrong theme** on load.
- Set `data-theme` on `<html>` and `color-scheme: light|dark`.
- Respect `prefers-color-scheme` when mode is `system`.
- The emulator player page (§5.7) is **always dark** regardless of theme (immersion), but chrome around it follows tokens.

### 2.3 Typography

Fonts (load via `next/font/google`, `display: swap`):

| Role | Font | Fallback |
|---|---|---|
| Display (pixel) | `Press Start 2P` | `monospace` |
| UI / body | `Inter` | `system-ui, sans-serif` |
| Mono / labels / metadata | `JetBrains Mono` | `ui-monospace, monospace` |

Type scale:

| Token | Font | Size / line-height | Weight | Use |
|---|---|---|---|---|
| `display-xl` | Pixel | 40 / 1.4 (mobile 24) | 400 | Landing hero only |
| `display-lg` | Pixel | 24 / 1.5 (mobile 18) | 400 | Page H1 |
| `display-sm` | Pixel | 12 / 1.4 | 400 | Primary CTA labels, logo |
| `heading-lg` | Inter | 24 / 1.3 | 600 | Section titles (non-pixel) |
| `heading-md` | Inter | 18 / 1.4 | 600 | Card titles, modal titles |
| `heading-sm` | Inter | 15 / 1.4 | 600 | Game titles in cards |
| `body` | Inter | 15 / 1.6 | 400 | Default text |
| `body-sm` | Inter | 14 / 1.5 | 400/500 | Buttons, nav, table cells |
| `label` | Mono | 12 / 1.4, `letter-spacing: 0.12em`, UPPERCASE | 500 | Group labels, stat labels |
| `meta` | Mono | 12 / 1.4 | 400 | Platform, year, timestamps |

Rule: pixel font never below 11px and never for more than ~6 words.

### 2.4 Spacing, sizing, layout

- Spacing scale (px): `2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`. Use only these.
- Container: `max-width: 1200px`, side padding `40px` desktop / `16px` mobile.
- Section gap: `48px` desktop / `32px` mobile. Card padding: `24px` / `16px`. Field gap: `16px`; label → input gap: `6px`.
- Minimum touch target: **44×44px**.
- Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`.

### 2.5 Radius, borders, shadows, z-index, motion

- Radius: `--radius-none: 0` (cards, buttons, inputs), `--radius-xs: 2px` (badges, chips), `--radius-full` (avatars only).
- Borders: `1px solid var(--color-border)`; selected/active: `2px solid var(--color-accent)`.
- Shadows:
  - `--shadow-hard`: `4px 4px 0 var(--color-hard-shadow)` (primary button only; `3px 3px` for small).
  - `--shadow-glow`: `0 0 24px var(--color-accent-glow)` (dark mode; primary + selected).
  - `--shadow-popover`: dark `0 12px 32px rgba(0,0,0,0.5)` / light `0 12px 32px rgba(22,22,28,0.12)`.
- Z-index: `banner 30, header 40, dropdown 50, drawer 60, modal 70, toast 80, tooltip 90`.
- Motion: `--duration-fast 120ms`, `--duration-base 200ms`, `--ease: cubic-bezier(0.2, 0, 0, 1)`. Respect `prefers-reduced-motion: reduce` (disable non-essential transitions, no glow pulse).

### 2.6 Iconography

- One icon library: **Lucide** (`lucide-react`), stroke 1.75, sizes 16/20/24.
- No emoji in UI. Icon-only buttons always have `aria-label`.

### 2.7 Background pattern

```css
.bg-grid {
  background-color: var(--color-bg);
  background-image:
    linear-gradient(var(--color-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-grid-line) 1px, transparent 1px);
  background-size: 32px 32px;
}
```
Only on the page background. Never inside cards.

---

## 3. Information architecture

### 3.1 Roles

| Role | Description |
|---|---|
| `guest` | Not signed in. Can see landing, browse library and game details (read-only), legal pages. Must sign in to play/save. *(Confirm: can guests browse? default = yes.)* |
| `user` | Signed in. Plays, saves, achievements, profile, settings, user dashboard. |
| `admin` | Everything a user can + Admin area in dashboard. |
| `moderator` | **Optional / planned** — subset of admin (announcements + user moderation). Only implement if the user confirms. |

Role must come from the backend (JWT claims / `/auth/me`), never trusted from the client alone. Admin routes are protected on **both** server (NestJS guards) and client (route guard + redirect).

### 3.2 Route map

| Route | Access | Page (§) | Notes |
|---|---|---|---|
| `/` | all | Landing (guest) **or** Home (signed in) | Same URL, render by auth state (§5.1 / §5.2) |
| `/login` | guest | Login | Redirect to `/` if already signed in |
| `/signup` | guest | Sign up | |
| `/forgot-password` | guest | Request reset | `planned` unless exists |
| `/reset-password` | guest | Set new password (token) | `planned` unless exists |
| `/games` | all | Game library | |
| `/games/[slug]` | all | Game details | |
| `/play/[slug]` | user | Emulator player | Guests → `/login?next=/play/[slug]` |
| `/dashboard` | user | Dashboard overview | Config depends on role |
| `/dashboard/saves` | user | Cloud saves | |
| `/dashboard/achievements` | user | Achievements | |
| `/dashboard/favorites` | user | Favorites | |
| `/dashboard/history` | user | Play history / activity | |
| `/dashboard/friends` | user | Friends | `planned` |
| `/dashboard/leaderboards` | user | Leaderboards | `planned` |
| `/dashboard/multiplayer` | user | Multiplayer lobbies | `planned` |
| `/dashboard/notifications` | user | Notifications | |
| `/dashboard/profile` | user | Profile edit | |
| `/dashboard/settings` | user | Settings (tabs) | |
| `/dashboard/admin` | admin | Admin overview | |
| `/dashboard/admin/games` | admin | Games management | |
| `/dashboard/admin/games/new`, `/[id]` | admin | Create / edit game | |
| `/dashboard/admin/systems` | admin | Systems / emulator cores | |
| `/dashboard/admin/users` | admin | Users management | |
| `/dashboard/admin/announcements` | admin | Header announcements | |
| `/dashboard/admin/reports` | admin | Reports / logs | `planned` |
| `/u/[username]` | all | Public profile | `planned` (confirm with user) |
| `/terms`, `/privacy`, `/legal/roms` | all | Legal | Content from user |
| `not-found`, `error` | all | 404 / 500 | |

### 3.3 Navigation

- **Header nav (signed in):** Home · Library · Saves · Achievements. (Dashboard via avatar menu.)
- **Header nav (guest):** Library · Features (anchor on landing) · About (anchor). Right side: "Log in" (ghost) + "Sign up" (primary).
- **Dashboard sidebar:** see §5.8.
- Active route: accent underline (2px) + `--color-text`, `aria-current="page"`.

### 3.4 Feature registry (single source of truth for "coming soon")

Create `apps/frontend/src/config/features.ts`:

```ts
export type FeatureStatus = 'live' | 'beta' | 'coming_soon';

export const FEATURES = {
  auth:              { status: 'live',        label: 'Accounts' },
  passwordReset:     { status: 'coming_soon', label: 'Password reset' },
  oauth:             { status: 'coming_soon', label: 'Sign in with Google/GitHub' },
  library:           { status: 'live',        label: 'Game library' },
  libraryFilters:    { status: 'coming_soon', label: 'Filters & sorting' },
  gameDetails:       { status: 'coming_soon', label: 'Game details' },
  player:            { status: 'coming_soon', label: 'Play in browser' },
  saves:             { status: 'coming_soon', label: 'Cloud saves' },
  achievements:      { status: 'coming_soon', label: 'Achievements' },
  favorites:         { status: 'coming_soon', label: 'Favorites' },
  history:           { status: 'coming_soon', label: 'Play history' },
  notifications:     { status: 'coming_soon', label: 'Notifications' },
  announcements:     { status: 'coming_soon', label: 'Site announcements' },
  profile:           { status: 'coming_soon', label: 'Profile' },
  avatarUpload:      { status: 'coming_soon', label: 'Avatar upload' },
  settings:          { status: 'coming_soon', label: 'Settings' },
  controlsMapping:   { status: 'coming_soon', label: 'Controls & gamepad' },
  friends:           { status: 'coming_soon', label: 'Friends' },
  leaderboards:      { status: 'coming_soon', label: 'Leaderboards' },
  multiplayer:       { status: 'coming_soon', label: 'Multiplayer' },
  publicProfile:     { status: 'coming_soon', label: 'Public profile' },
  adminGames:        { status: 'coming_soon', label: 'Manage games' },
  adminSystems:      { status: 'coming_soon', label: 'Manage systems' },
  adminUsers:        { status: 'coming_soon', label: 'Manage users' },
  adminAnnouncements:{ status: 'coming_soon', label: 'Manage announcements' },
  adminReports:      { status: 'coming_soon', label: 'Reports & logs' },
} as const;
```

**The statuses above are placeholders — set each one from your audit (§0.1).**
Helper: `isLive(key)`, `<FeatureGate feature="saves" fallback={<ComingSoon feature="saves" />}>…</FeatureGate>`.
Nav items for `coming_soon` features stay visible with a small `Soon` badge (§6.11) — they open the page with the `<ComingSoon>` state, never a 404.

---

## 4. App shell

### 4.1 Layout structure

```
<AnnouncementBar />   (optional, §4.3 — above header)
<Header />            (sticky, §4.2)
<main id="main">      (page content)
<Footer />            (§4.5)
<Toaster />
```
- First focusable element: "Skip to content" link → `#main`.
- Body uses `.bg-grid`.

### 4.2 Header

**Height:** 64px desktop, 56px mobile. Sticky top, `--color-surface` background with 1px bottom border. On scroll > 8px: background stays solid (no blur gradient tricks), add `--shadow-popover` lightly *(optional)*.

**Left group:** Logo (pixel font `display-sm`, `[APP_NAME]`, the dot/mark in accent) → links to `/`. Then primary nav (§3.3).

**Right group — guest:**
- Theme toggle (icon button: sun/moon/monitor, cycles or opens a small menu).
- "Log in" (ghost button) · "Sign up" (primary button, the only primary in header).

**Right group — signed in:**
- Global search icon button (opens command/search dialog → searches games). `coming_soon` acceptable.
- Theme toggle.
- Notifications bell (icon button with unread count badge, max "9+"). Opens popover (§4.4). If `notifications` not live → bell hidden.
- **User menu trigger:** avatar (32px circle) + username (hidden < `md`) + chevron.

**User dropdown menu** (§6.9 Dropdown), right-aligned, 240px wide:
1. Header block: avatar 40px, display name, `@username`, role badge if admin.
2. Group: Dashboard · Profile · Saves · Achievements
3. Group: Settings · Theme (submenu: System / Light / Dark with check on active)
4. Group (admin only): Admin panel
5. Divider → Log out (danger text color, no fill)

Behavior: opens on click/Enter/Space, closes on Esc/outside click/route change, arrow-key navigation, focus returns to trigger. `aria-haspopup="menu"`, `aria-expanded`.

**Avatar fallback:** initials (first letters of display name, max 2) on `--color-surface-2` with `--color-text`. Broken image → fallback.

**Mobile (< md):** nav collapses into a hamburger (left of logo or right end). Opens a full-height drawer from the start side with: nav links, then (signed in) user block + menu items, or (guest) Log in / Sign up. Theme toggle inside drawer. Focus trapped; Esc closes.

**States:** while auth is loading → render a 32px circular skeleton in place of the avatar (no layout shift, never flash the guest buttons).

### 4.3 Announcement bar (variable header slot)

A full-width, dismissible strip **above** the header for site-wide messages managed by admins (§5.15).

| Property | Spec |
|---|---|
| Variants | `info` (info-soft bg), `success`, `warning`, `maintenance` (warning), `promo` (accent-soft bg) |
| Content | Optional icon · message (max ~140 chars, 1 line desktop, wraps to 2 on mobile) · optional link ("Learn more →") |
| Height | Auto, min 40px; padding 8px 16px; `body-sm` |
| Dismiss | × icon button (`aria-label="Dismiss announcement"`). Dismissed IDs stored in localStorage (guests) and server (users, optional). Non-dismissible flag for `maintenance`. |
| Multiple | Show highest priority first; if >1 active, show "1 / 3" with prev/next arrows (no auto-rotate, or auto-rotate ≥ 8s paused on hover/focus and disabled under reduced motion). |
| Audience | `all` · `guests` · `users` · `admins` |
| Scheduling | `startsAt`, `endsAt` (UTC); only active ones are returned by API |
| A11y | `role="region" aria-label="Site announcements"`; content changes announced politely (`aria-live="polite"`) |
| Data | `GET /announcements/active` (public; filtered by audience server-side) |

If `announcements` is not live: render nothing (no empty strip). Keep the slot in the layout component so it can be enabled later.

**Data model (when implemented):**
```
Announcement { id, message, linkUrl?, linkLabel?, variant, audience, priority (int), dismissible (bool), startsAt, endsAt?, createdBy, createdAt, updatedAt }
```

### 4.4 Notifications popover (signed in)

- 360px wide popover from the bell. Header: "Notifications" + "Mark all as read" (ghost, small).
- List items: icon by type (achievement, save synced, system, friend request) · text · relative time (`meta`) · unread dot in accent.
- Footer link: "View all" → `/dashboard/notifications`.
- Empty state: "You're all caught up."
- `coming_soon` → bell hidden in header; `/dashboard/notifications` shows `<ComingSoon>`.

### 4.5 Footer

- `--color-surface`, top border, padding 40px.
- Columns: Logo + one-line tagline · Product (Library, Features) · Account (Dashboard, Settings) · Legal (Terms, Privacy, ROM policy) · bottom row: © year `[APP_NAME]`, theme toggle (optional), GitHub link `[optional]`.
- Mobile: columns stack; accordions not needed.
- Hidden on `/play/[slug]`.

---

## 5. Pages

Each page section lists: **Purpose · Layout · Content · States · Responsive · Acceptance criteria.** Common states every data view must implement: `loading` (skeletons matching final layout), `empty`, `error` (message + Retry button), and `coming_soon` where applicable.

### 5.1 Landing page — `/` (guest)

**Purpose:** explain the product and convert to sign up. One primary CTA per section.

**Sections:**
1. **Hero** — Left: H1 (`display-xl` pixel, max 2 lines, e.g. "[Hero headline]"), sub-text (`body`, `text-muted`, ≤ 2 lines), CTAs: "Start playing" (primary → `/signup`) + "Browse library" (secondary → `/games`). Right: visual — a framed "CRT/console screen" panel showing a static screenshot or the 4:3 cover grid of featured games (no autoplaying video). Below CTAs: `meta` line listing supported systems (NES · SNES · Genesis · Atari · MAME · DOS).
2. **Supported systems** — row of system cards (system name in `label`, game count `meta`). Clicking → `/games?system=snes`.
3. **Features** (`id="features"`) — 3–6 cards in a grid: Play in browser · Cloud saves · Gamepad support · Achievements · (Multiplayer — with `Soon` badge if not live). Each: icon, `heading-md` title, 1–2 line description. No primary buttons in cards.
4. **Featured games** — horizontal grid of 6–8 `GameCard` (grid variant) from `GET /games?featured=true` (or latest if no flag). "View all →" link.
5. **How it works** — 3 numbered steps (Create account → Pick a game → Play & save). Numbers in pixel font accent.
6. **FAQ** — accordion (5–8 items). Must include a question about ROMs/legality → links `/legal/roms`. Content `[FAQ content from user]`.
7. **Final CTA band** — `--color-surface` band: headline + single primary "Create free account".

**States:** featured games loading skeleton (6 cards); on error, hide the section (landing must never show an error block).

**Responsive:** hero stacks (visual below text) < `lg`; features 1 col < `md`, 2 cols `md`, 3 cols `lg`.

**SEO:** title, description, Open Graph image `[og image]`, canonical. Server-rendered.

**Acceptance:** guest sees landing at `/`; signed-in user never sees it (sees Home). Lighthouse a11y ≥ 95. No layout shift from fonts (use `next/font`).

### 5.2 Home — `/` (signed in)

**Purpose:** get the user back into a game in one click.

**Sections (top → bottom):**
1. **Greeting row** — `heading-lg` "Welcome back, [display name]" + `meta` streak/last-seen *(only if data exists)*.
2. **Continue playing (hero card)** — last played game: cover (4:3), `label` "CONTINUE PLAYING", title (`display-lg` pixel), meta line (system · last played relative time · save slot · "Synced" with success dot). Actions: **Resume** (primary, the only primary on the page) → `/play/[slug]?slot=n`; "View saves" (secondary). If no history: card becomes "Start your first game" with primary "Browse library".
3. **Stats row** — 4 `StatCard`s: Games played · Hours played · Cloud saves · Achievements (x / y). Each links to its dashboard page. Use only real data; if a metric's feature isn't live, show the card with `—` value and `Soon` badge.
4. **Recently played** — list (5 items): thumb 48px, title, `meta` (system · time), secondary "Play" button. "Open library →" link.
5. **Latest saves** — 3 items: title, slot + location label, relative time. "All saves →".
6. **Recommended / New in library** — 6 `GameCard`s (grid). Source: newest games or same-system recommendations.
7. **Recent achievements** — 3–5 badges (`coming_soon` if not live, compact variant).

**Layout:** sections 4 & 5 side-by-side (3:2) ≥ `lg`, stacked below.

**Acceptance:** exactly one primary button visible; all lists have empty states; data from existing endpoints (e.g. `/users/me/stats`, recent games) — reuse what exists.

### 5.3 Auth pages — `/login`, `/signup`, `/forgot-password`, `/reset-password`

**Layout:** centered card, max-width 420px, on `.bg-grid`. Logo on top (links home). Optional left decorative panel ≥ `lg` (retro screen illustration) — the form card stays the focus.

**Login:** H1 "Log in" (pixel `display-lg`) · Email · Password (show/hide toggle) · "Forgot password?" link (right aligned, hidden if feature not live) · **Log in** (primary, full width) · divider "or" + OAuth buttons (secondary, only if `oauth` live) · footer "No account? Sign up".

**Sign up:** Username (3–20 chars, `a-z0-9_`, live availability check if API exists) · Email · Password (min 8, strength hint) · Confirm password · checkbox "I agree to the Terms and Privacy Policy" (required, links) · **Create account** (primary).

**Forgot / Reset:** single field + primary; success state shows confirmation message without revealing whether the email exists.

**Behavior & states:**
- Inline field errors under each input (`--color-danger`, icon, `aria-describedby`), shown on blur and on submit.
- Form-level error alert at top for server errors (e.g. "Email or password is incorrect").
- Submit button shows spinner + disabled while pending; prevent double submit.
- Autocomplete attributes (`email`, `current-password`, `new-password`, `username`).
- After login: redirect to `next` param if safe (same-origin path) else `/`.
- Rate-limit message if API returns 429.

**Acceptance:** fully keyboard operable; errors announced to screen readers; works in both themes.

### 5.4 Game library — `/games`

**Purpose:** find a game fast. Simple, calm, scannable.

**Page header:** H1 "Library" (pixel `display-lg`) + `meta` result count ("128 games · 6 systems"). Right: search input (with icon, 320px, `/` keyboard shortcut to focus, debounce 300ms).

**Toolbar (one row, wraps on mobile):**
- **System tabs** (§6.10): All · NES · SNES · Genesis · Atari · MAME · DOS (from API, with counts). Active tab = accent underline.
- **Filters** button (secondary, with active-filter count badge) → opens filter panel.
- **Sort** select (§6.4): Recently added (default) · Title A–Z · Title Z–A · Release year (newest) · Release year (oldest) · Most played · Recently played (signed in only).
- **View toggle** (segmented control, 2 icon buttons, `aria-pressed`): **Grid** / **List**.

**Filter panel:**
- Desktop (≥ `lg`): collapsible left sidebar (260px) — toggled by the Filters button; open state remembered.
- Mobile: bottom/side drawer with "Apply" (primary) and "Reset" (ghost).
- Filter groups (each with `label` heading, §1.2 rule 1):
  - **System** (checkbox list, multi) — mirrors tabs.
  - **Genre** (checkbox list) `[if genre field exists]`
  - **Release year** (range: from / to selects or dual slider)
  - **Players** (1 / 2 / 2+) `[if field exists]`
  - **My games** (signed in): Has saves · Favorites · Played · Not played
  - **Status:** Playable now (emulator ready) `[if field exists]`
- Only render filters whose data fields exist in the schema; list missing ones in `docs/feature-status.md`.

**Active filter chips** row under toolbar: each chip removable (×), plus "Clear all" link. Hidden when none.

**State in URL:** `?q=&system=snes,nes&genre=&yearFrom=&yearTo=&sort=title_asc&view=grid&page=2`. Shareable, back/forward works. `view` also persisted in localStorage as user default.

**Results — Grid view:** responsive grid `repeat(auto-fill, minmax(200px, 1fr))`, gap 16px (mobile: 2 columns, gap 12). Uses `GameCard` grid variant (§6.13).

**Results — List view:** table-like rows (not a `<table>` unless sortable headers): cover thumb 56×42 · Title (`heading-sm`) + system/genre `meta` · Year · Players · Last played (signed in) · Saves count · actions (Play secondary button, favorite icon button). Columns collapse on mobile into 2-line rows.

**Grouping (optional, default ON when tab = "All" and sort = Title):** group by system with sticky `label` headers ("SNES · 12"). Off for other sorts.

**Selection/active state:** hovered/focused card shows accent border; keyboard focus ring always visible. On desktop, clicking a card goes to `/games/[slug]`; the card's own Play button goes straight to `/play/[slug]`.

**Pagination:** use existing API `meta {total, page, limit, totalPages}`. Default: numbered pagination (§6.17) + page size select (24 / 48 / 96). *(Infinite scroll is NOT required.)*

**States:**
- Loading: skeleton cards/rows matching current view (12 items).
- Empty (no games at all): illustration-free empty state "No games yet" (admins see "Add a game" primary → admin).
- No results: "No games match your filters" + "Clear filters" (secondary).
- Error: inline error + Retry.
- If `libraryFilters` not live (backend lacks query params): toolbar still renders; filter/sort controls that aren't supported are disabled with tooltip "Coming soon" — search + view toggle still work client-side if possible.

**Acceptance:** switching view keeps scroll position near the same items; filters reflect in URL; 60fps scrolling with 96 items; fully keyboard operable.

### 5.5 Game details — `/games/[slug]`

**Layout:** two columns ≥ `lg` (media 7/12, info 5/12), stacked on mobile.

- **Breadcrumb:** Library / SNES / Title.
- **Media:** cover/box art (4:3), screenshot gallery thumbnails (lightbox on click) `[if data exists]`.
- **Info panel:** title (pixel `display-lg`), system badge, year, genre, players, publisher/developer `[if exists]`, short description.
- **Primary action:** **Play** (primary, full width in panel). Guests: "Log in to play" (primary → `/login?next=…`).
- **Secondary actions:** Favorite (icon toggle + label), Share (copy link → toast).
- **Your saves** (signed in): list of save slots for this game with "Load" per slot (secondary) and "Delete" (ghost danger, confirm dialog). Empty: "No saves yet."
- **Achievements for this game** (progress bar x/y) — `coming_soon` aware.
- **Controls** quick reference (keyboard + gamepad mapping table for this system).
- **More from [system]** — 6 `GameCard`s.
- **Leaderboard** snippet — `coming_soon`.

**States:** 404 if slug unknown → not-found page. Loading skeleton for the two columns.

### 5.6 Public profile — `/u/[username]` *(planned, confirm with user)*

Avatar 96px, display name, `@username`, bio, member since, favorite system, stats (games played, achievements), recent achievements, favorite games. Visibility controlled by Settings → Privacy. Entire page `coming_soon` until confirmed.

### 5.7 Emulator player — `/play/[slug]`

**Always dark.** Minimal chrome so the game is the focus.

**Layout:**
- **Top bar (48px):** back arrow ("Back to game") · game title + system `meta` · right: save status indicator ("Saved 2m ago" with success dot / "Saving…" / "Offline — will sync"), Settings (icon), Fullscreen (icon).
- **Stage:** canvas centered, keeps native aspect ratio (4:3 default), integer scaling option, letterboxed on `#000`. Optional CRT/scanline filter toggle (off by default).
- **Side panel (collapsible, 320px, ≥ `lg`; bottom sheet on mobile):** tabs —
  - **Saves:** quick save (primary), quick load (secondary), slot list (1–[N]) with thumbnail, timestamp, overwrite/load/delete; cloud sync status per slot.
  - **Controls:** current mapping (keyboard + gamepad), "Remap" → settings; gamepad connected indicator.
  - **Info:** short game info, achievements progress.
- **Keyboard shortcuts:** `F` fullscreen · `F5` quick save · `F9` quick load · `Esc` pause menu · `P` pause. Show a dismissible hint the first time.
- **Pause menu (overlay):** Resume (primary) · Save · Load · Settings · Exit game (confirm if unsaved).
- **Mobile:** on-screen touch controls overlay (D-pad + A/B/X/Y/Start/Select per system), opacity adjustable, landscape recommended (show hint in portrait).
- **Loading:** progress bar "Loading emulator core… / Loading game…" with percentage if available; error state with retry and "Report problem" (`coming_soon`).
- **Leaving:** `beforeunload` warning if there's unsaved progress.

If `player` isn't live: page shows `<ComingSoon>` with the game's cover and "Back to game".

### 5.8 Dashboard — shell (`/dashboard/*`)

**Layout:** sidebar (240px, `--color-surface`, right border) + content area (container max 1100px). Mobile: sidebar becomes a horizontal scrollable tab bar under the header or a drawer (choose drawer if > 8 items).

**Sidebar — user configuration** (grouped, each group has a `label` heading):
- **PLAY:** Overview · Saves · Achievements · Favorites · History
- **SOCIAL:** Friends · Leaderboards · Multiplayer
- **ACCOUNT:** Profile · Notifications · Settings

**Sidebar — admin configuration** = user groups + an extra group at the bottom:
- **ADMIN:** Admin overview · Games · Systems · Users · Announcements · Reports

Items whose feature is `coming_soon` show a `Soon` badge, stay clickable, and render `<ComingSoon>`.
Active item: accent left bar 2px is **not** used (avoid left-border card trope) → use `--color-accent-soft` background + accent text color + `aria-current="page"`.

Sidebar footer: "Help center" link `[optional]`, app version `meta`.

**Content header pattern (every dashboard page):** breadcrumb (optional) · H1 (`heading-lg` Inter, *not* pixel inside dashboard to keep it calm — pixel only for Overview's greeting) · description line (`text-muted`) · right-aligned page-level primary action if any.

### 5.9 Dashboard — Overview (user)

- Greeting + date.
- Continue playing card (same component as Home §5.2.2, compact).
- Stats grid (4–6 `StatCard`s): games played, total playtime, cloud saves (+ storage used / quota if available), achievements, favorites, current streak *(only real data)*.
- **Activity chart:** playtime per day, last 30 days (bar chart, accent bars; tooltip). `coming_soon` if no data source.
- **By system:** horizontal bars of playtime share per system.
- Recent activity feed (played, saved, unlocked) — 10 items.
- **Roadmap card** "What's coming": lists features with `coming_soon` status from the registry (auto-generated) — so users see what is under construction in one place.

### 5.10 Dashboard — Saves

- Toolbar: search by game · filter by system · sort (recent / game A–Z) · storage usage meter (`x MB of y MB`) if quota exists.
- Grouped by game (collapsible): game thumb + title header; slots as rows: slot #, screenshot thumb, location/label `[if exists]`, updated time, size, sync status badge (Synced / Local only / Conflict).
- Row actions: Load (secondary → `/play/[slug]?slot=n`), Rename `[optional]`, Download `[optional]`, Delete (danger, confirm dialog with game + slot named).
- Bulk select + delete (checkboxes) `[optional]`.
- Conflict state: badge `warning` + "Resolve" → dialog comparing local vs cloud (timestamps) with "Keep cloud" / "Keep local".
- Empty: "No saves yet — your progress will appear here after you save in a game." + "Browse library".

### 5.11 Dashboard — Achievements

- Summary: total unlocked x/y, progress bar, rarest achievement.
- Filters: All / Unlocked / Locked · by system · by game.
- Grid of achievement tiles: icon/badge (pixel style), title, description, game, unlocked date or progress. Locked tiles: muted, lock icon (hidden-description option for secret achievements).
- `coming_soon` until the system exists (schema tables may exist — check).

### 5.12 Dashboard — Favorites & History

- **Favorites:** reuses library grid/list with view toggle; remove from favorites action; empty state links to library.
- **History:** table — game, system, started, duration, last save; filters by date range (7d / 30d / all) and system.

### 5.13 Dashboard — Friends · Leaderboards · Multiplayer *(planned)*

Design targets for later (render `<ComingSoon>` now with a short description of each):
- **Friends:** list, requests (incoming/outgoing), search users, online status, invite to play.
- **Leaderboards:** per game/system, time ranges, your rank highlighted (accent-soft row).
- **Multiplayer:** lobbies list (game, host, players x/y, latency), create lobby (primary), join, invite link.

### 5.14 Dashboard — Profile (`/dashboard/profile`)

**Layout:** two cards stacked (or 2 columns ≥ `lg`).

**Card 1 — Avatar:**
- Current avatar 96px circle; "Change photo" (secondary) · "Remove" (ghost).
- Upload: click or drag & drop; accepts JPG/PNG/WEBP; max **2 MB** `[confirm]`; client-side square crop dialog (zoom slider) → output 256×256 WEBP; preview before save.
- Upload to S3/MinIO via existing storage (presigned URL if available). Show progress; error messages for type/size.
- Fallback initials when no avatar.

**Card 2 — Profile details (form):**
- Display name (2–40 chars)
- Username (3–20, `a-z0-9_`, unique, availability check; warn that profile URL changes)
- Bio (max 160, live counter)
- Favorite system (select)
- Country `[optional]`
- Actions: **Save changes** (primary; disabled until form is dirty) · "Cancel" (ghost, resets).
- Success → toast "Profile updated". Unsaved changes + navigation → confirm dialog.

**Validation:** inline, same as auth forms. Server errors mapped to fields.

Email & password changes live in **Settings → Account** (§5.16), not here.

### 5.15 Dashboard — Admin area

All admin pages: H1, description, page primary action, data table (§6.16) with search, filters, sort, pagination, row actions menu, bulk actions where noted, and confirm dialogs for destructive actions. Admin pages show an `ADMIN` badge next to H1.

**Admin overview:** KPI cards (total users, new users 7d, active users 7d, total games, plays 7d, storage used), charts (signups/day, plays/day), top games table, recent admin actions log. Real data only; missing metrics → `—` + `Soon`.

**Games management:**
- Table: cover thumb · title · system · year · status (Published / Draft / Hidden) · plays · updated · actions (Edit, Preview, Hide/Publish, Delete).
- Filters: system, status. Bulk: publish, hide, delete.
- **Create/Edit game form** (sections with `label` headings): Basic info (title, slug auto from title, system, year, genre, players, publisher, developer, description) · Media (cover upload, screenshots multi-upload, reorder) · ROM file (upload to storage, checksum displayed, file size; replace) · Emulator config (core, default controls preset, aspect ratio) · Visibility (status, featured toggle). Primary: "Save" / "Publish". Preview link.
- ROM upload must show the legal confirmation checkbox "I have the right to distribute this file" `[confirm wording with user]`.

**Systems:** list of supported systems/cores: name, core, version, enabled toggle, games count, default controls mapping editor.

**Users management:**
- Table: avatar · display name · username · email · role · status (Active / Banned) · joined · last active · actions (View, Change role, Ban/Unban, Reset password email, Delete).
- Filters: role, status. Search by name/email.
- User detail drawer: profile info, stats, saves count, recent activity, admin notes.
- Admins cannot ban/demote themselves; last admin cannot be demoted (show reason).

**Announcements management (controls §4.3):**
- Table: message (truncated) · variant badge · audience · priority · schedule (start → end) · status (Scheduled / Active / Expired / Draft) · actions.
- Create/Edit form: message (max 140, counter), link URL + label (optional), variant select, audience select, priority, dismissible toggle, start/end datetime, **live preview** of the bar in both themes. Primary: "Publish" / "Schedule".

**Reports & logs** *(planned)*: error reports from players, audit log of admin actions, filters by type/date.

### 5.16 Dashboard — Settings (`/dashboard/settings`)

Tabs (§6.10), URL `?tab=`:
1. **Account:** email (change with password confirmation + verification), password change (current, new, confirm), connected accounts (OAuth, `coming_soon`).
2. **Appearance:** theme (System / Light / Dark radio cards with mini previews), reduce motion override, CRT filter default for player.
3. **Controls:** keyboard mapping per system (table: action → key; click to rebind; conflict warning), gamepad mapping (detect connected gamepad via Gamepad API, "Press a button…" capture), reset to defaults (ghost).
4. **Notifications:** toggles per type (achievements, saves sync issues, friend requests, announcements; in-app / email).
5. **Privacy:** profile visibility (Public / Friends / Private), show activity, show online status.
6. **Danger zone:** export my data `[optional]`, delete account (danger button → dialog requiring typing username).

Each tab: one primary "Save" per form section, disabled until dirty; or auto-save toggles with toast — pick one pattern and use it everywhere (**default: explicit Save for forms, instant save for toggles**).

### 5.17 Legal pages — `/terms`, `/privacy`, `/legal/roms`

Readable long-form layout: max-width 720px, `body` 16/1.7, table of contents (sticky ≥ `lg`), last updated date. Content provided by user `[LEGAL CONTENT]`. ROM policy must state which games are offered (homebrew / public domain / licensed) `[from user]`.

### 5.18 System pages

- **404:** pixel-font "404 — GAME OVER", short message, "Back to home" (primary) + "Browse library" (secondary).
- **500 / error boundary:** "Something broke", Retry (primary), Home (secondary). Error details hidden in production.
- **Offline banner:** when `navigator.onLine` false → warning announcement-style strip "You're offline. Saves will sync when you reconnect."
- **Maintenance:** uses Announcement bar `maintenance` variant.

---

## 6. Component library

Build in `apps/frontend/src/components/ui/` (primitives) and `components/` (product components). If the repo already has components, refactor them in place. Recommended base: **Radix UI primitives** (or shadcn/ui on Radix) for Dropdown, Dialog, Tabs, Popover, Tooltip, Select, Switch — styled with the tokens. Each component must support light/dark, keyboard, focus-visible ring (`2px solid var(--color-accent)`, `outline-offset: 2px`) and disabled state.

### 6.1 Button

| Variant | Style | Use |
|---|---|---|
| `primary` | bg accent, text accent-fg, `--shadow-hard` (small: 3px), dark mode adds `--shadow-glow`; label may use pixel font (`display-sm`) for hero/CTA, Inter 600 elsewhere | One per region |
| `secondary` | transparent bg, 1px `--color-border-strong`, text `--color-text` | Alternative actions |
| `ghost` | no border/bg, text muted → text on hover, bg surface-2 on hover | Tertiary, toolbars |
| `danger` | bg danger, white/dark fg | Confirm destructive (inside dialogs only) |
| `danger-ghost` | text danger, no bg | "Delete" triggers in lists |
| `icon` | 44×44 (40 in dense toolbars), ghost style, `aria-label` required | |

Sizes: `sm` (36px h, 12px x-pad), `md` (44px, 20px), `lg` (52px, 28px). States: hover (accent-hover / border-strong), active (translate 2px 2px and shadow shrinks — "press" feel for primary), focus-visible ring, disabled (40% opacity, no shadow, `cursor: not-allowed`), loading (spinner replaces icon, label kept, `aria-busy`).

### 6.2 Input / Textarea

Height 44px, bg `--color-surface-2` (dark) / `--color-surface` (light), 1px border, radius 0, padding 0 14px. Label above (`body-sm` 500), optional hint below (`meta` muted), error below (danger + icon). Focus: border accent + ring. Prefix/suffix icon slots. Textarea min 3 rows, auto-grow optional, char counter slot.

### 6.3 Search input

Input + leading search icon + clear (×) button when filled + optional `/` shortcut hint chip. `type="search"`, `role="searchbox"`.

### 6.4 Select

Radix Select styled as Input; chevron icon; menu uses Dropdown styling (§6.9).

### 6.5 Checkbox, Radio, Switch

Square checkbox 18px (radius 2), accent fill when checked with accent-fg check icon. Radio round 18px. Switch 40×22, track border-strong → accent when on. All with labels clickable; 44px row height in lists.

### 6.6 Segmented control (view toggle)

Group of icon/text buttons in one bordered container; active segment: accent-soft bg + accent text/icon; `role="group"`, each button `aria-pressed`.

### 6.7 Badge

`meta` font 11–12px, radius 2, padding 2px 8px. Variants: `neutral` (border only), `accent` (accent-soft bg, accent text), `success/warning/danger/info` (soft bg + color text), `system` (neutral with system name), `soon` (warning-soft, text "Soon"), `admin` (accent).

### 6.8 Card

`--color-surface`, 1px border, padding 24 (16 mobile), radius 0. Interactive cards: hover border-strong; selected: 2px accent border + glow (dark). Optional header (`label` + action) and footer.

### 6.9 Dropdown menu

`--color-surface-raised`, 1px border, `--shadow-popover`, min-width 200, padding 4. Items 40px high, icon 16 + label, hover/focus bg surface-2; checked items show check icon; group labels (`label` style); separators; danger item text danger. Keyboard: arrows, Home/End, typeahead, Esc.

### 6.10 Tabs

Horizontal list, bottom border 1px; tab: `body-sm`, padding 12px 16px, muted; active: text color + 2px accent underline; optional count badge. Scrollable horizontally on mobile with fade edges. Radix Tabs semantics (`role="tablist"`, arrow keys).

### 6.11 Nav item / Sidebar item

Height 40px, icon 20 + label, radius 0, padding 0 12px. Active: accent-soft bg + accent text + `aria-current`. Optional right badge (count / `Soon`).

### 6.12 Avatar

Sizes 24 / 32 / 40 / 64 / 96. Circle. Image with `alt="[display name]"`; fallback initials; optional status dot (online) bottom-right with surface-colored ring.

### 6.13 GameCard

**Grid variant:** cover 4:3 (`object-fit: cover`, `--color-surface-2` placeholder with system name if no image) · body padding 16: title (`heading-sm`, 2-line clamp), `meta` line (system · year), optional badges row ("Saved", "Favorite"). Hover/focus: border accent (dark: glow) and reveal a **Play** primary button (small) at the bottom of the body — on touch devices Play is always visible as an icon button. Favorite toggle icon in the cover's top-right corner (signed in).
**List variant:** see §5.4 list view.
**Compact variant:** 48px thumb + title + meta (used in lists on Home/Dashboard).
Whole card is a link (`<a>` wrapping title; use the "stretched link" pattern so inner buttons stay separately focusable).

### 6.14 StatCard

`label` (mono caps, muted) · value (`heading-lg`, 28–32px, 600) · optional delta/sub-text (`meta`) · optional link (whole card clickable). No accent color on values unless highlighting a single key metric.

### 6.15 Alert / Banner (inline)

Variants info/success/warning/danger: soft bg, icon, title (optional), text, optional action link, optional dismiss. Not to be confused with the global Announcement bar (§4.3), which reuses its variant colors.

### 6.16 DataTable (admin)

Header row (`label` style, sortable columns show arrow icon and `aria-sort`), rows 52px, zebra off, row hover surface-2, selected row accent-soft, checkbox column for bulk select, sticky header, horizontal scroll container on small screens, row actions via `…` dropdown, empty/loading/error rows, pagination footer with page size.

### 6.17 Pagination

Prev / numbered pages (with ellipsis) / Next; current page: accent-soft bg + accent text + `aria-current="page"`; `nav aria-label="Pagination"`. Mobile: Prev · "Page 2 of 9" · Next.

### 6.18 Dialog (modal) & Drawer

Dialog: centered, max-width 480 (forms 560), `--color-surface-raised`, 1px border, overlay `--color-overlay`, padding 24, title `heading-md`, footer actions right-aligned (secondary left of primary/danger). Focus trap, Esc closes, returns focus. Confirm dialogs for destructive actions name the exact item.
Drawer: from start/end/bottom, same rules.

### 6.19 Toast

Bottom-right (bottom-center mobile), surface-raised, border, icon by variant, message, optional action ("Undo"), auto-dismiss 5s (not for errors), `aria-live="polite"` (errors `assertive`). Max 3 stacked.

### 6.20 ComingSoon (feature under construction) ⭐

Used for every `coming_soon` feature — full page or inline section.

**Full-page variant:**
- Container card centered in content area, max-width 560, padding 40.
- Icon (construction/hammer from Lucide) in a 48px square with `--color-warning-soft` bg.
- `Badge soon` "UNDER CONSTRUCTION".
- Title: "[Feature label] is coming soon" (`heading-md`).
- Description: 1–2 lines describing what the feature will do (pass via prop; defaults from registry `description`).
- Optional "What to expect" bullet list (3 items max).
- Actions: one secondary button back to a useful place ("Back to dashboard" / "Browse library"). *(Optional, later: "Notify me" toggle.)*
- No fake data, no disabled forms behind it.

**Inline variant:** compact row inside a card/section: icon 20 + "Coming soon" badge + one-line text. Used for e.g. a Stat card or a section on Home.

**Props:** `feature: keyof FEATURES`, `title?`, `description?`, `expectations?: string[]`, `variant: 'page' | 'inline'`, `backHref?`.

**Rule:** a feature in `coming_soon` must never call an API that doesn't exist and must never 404.

### 6.21 EmptyState

Icon 32 (muted) · title (`heading-md`) · description (muted, 1–2 lines) · one action (primary *only if* it is the main action of that page, else secondary).

### 6.22 Skeleton

Blocks with `--color-surface-2` and a subtle shimmer (disabled under reduced motion). Must match final layout dimensions to avoid layout shift.

### 6.23 Tooltip

On hover (300ms delay) and focus; `--color-text` bg with `--color-bg` text (inverted), `meta` size, max-width 240. Never put essential info only in tooltips.

### 6.24 Progress bar & Spinner

Progress: 8px track surface-2, fill accent, square ends, label + percentage text (`meta`). `role="progressbar"` with values. Spinner: 16/20px, accent stroke, `aria-label="Loading"`.

### 6.25 Chart styling

Use one chart lib (e.g. Recharts). Single series → accent; multi-series → accent + neutrals (text-muted, border-strong) or status palette only if semantic. Gridlines `--color-border`, axis labels `meta` muted, tooltips styled like popovers. Always provide accessible summary text/table for charts.

---

## 7. Interaction & content rules

- **Copy tone:** short, friendly, plain English. Buttons are verbs ("Resume", "Save changes", "Delete save"). Avoid "Click here", "Submit".
- **Dates:** relative for < 7 days ("2h ago"), absolute after ("Oct 12, 2026"); full timestamp in `title` attribute.
- **Numbers:** thousands separators; durations "34h 12m".
- **Destructive actions:** always confirm, name the item, offer Undo toast where technically possible.
- **Optimistic UI** for favorites and toggles; rollback + error toast on failure.
- **Focus management:** after route change, focus H1 or `#main`; after dialog closes, return focus.
- **Loading > 300ms** shows skeleton; < 300ms shows nothing (avoid flicker).
- **Images:** `next/image`, explicit sizes, lazy-loaded below the fold, `alt` = game title + "cover".

## 8. Accessibility (WCAG 2.2 AA target)

- Semantic landmarks (`header`, `nav`, `main`, `footer`), one H1 per page, ordered headings.
- All interactive elements are real `<button>`/`<a>`/`<input>`; no click handlers on divs.
- Visible focus everywhere; never `outline: none` without replacement.
- Color is never the only indicator (active tab also has underline; status also has icon/text).
- Forms: labels, `aria-invalid`, `aria-describedby` for errors/hints.
- Live regions for toasts, announcement bar, save status in player.
- Gamepad/keyboard: player and library fully usable without a mouse.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Test with keyboard only + axe (add `@axe-core/react` in dev or Playwright + axe in CI if tests exist).

## 9. Responsive behavior summary

| Area | < 640 | 640–1023 | ≥ 1024 |
|---|---|---|---|
| Header | Logo + hamburger + avatar | Logo + hamburger + actions | Full nav |
| Library grid | 2 cols | 3–4 cols | auto-fill 200px |
| Library filters | Drawer | Drawer | Sidebar |
| Dashboard nav | Drawer / top tabs | Drawer | Sidebar 240px |
| Home sections | Stacked | Stacked | 3:2 split |
| Player side panel | Bottom sheet | Bottom sheet | Side panel 320px |
| Tables | Card rows / horizontal scroll | Horizontal scroll | Full |

## 10. Internationalization readiness

- UI language: **English** for now. `[Confirm: Arabic later?]`
- Even if only English ships: use CSS **logical properties** (`margin-inline-start`, `padding-inline`, `inset-inline-end`) and `dir`-aware icons (chevrons/arrows flip in RTL) so Arabic/RTL can be added without redesign.
- Keep all UI strings in one place (`messages/en.json` or constants) — no hard-coded copy scattered in components, so translation can be added later.
- Pixel font has no Arabic glyphs — if Arabic is added, display font for Arabic must be chosen separately `[later]`.

## 11. Performance

- Fonts via `next/font` (subset latin, preload display font only on pages using it).
- Library: paginate server-side; images responsive & lazy; avoid layout shift (aspect-ratio boxes).
- Emulator cores and ROMs loaded only on `/play/*` (dynamic import), never in the main bundle.
- Target: LCP < 2.5s, CLS < 0.1 on landing and library (desktop & mid-range mobile).

## 12. API expectations (verify, adapt, don't invent)

The UI needs the following capabilities. **Map each to existing endpoints during the audit.** Missing ones → feature stays `coming_soon` (UI) and is listed in `docs/feature-status.md` under "Backend needed". Response pagination format already used: `{ data: [], meta: { total, page, limit, totalPages } }`.

| Capability | Likely endpoint |
|---|---|
| Current user + role | `GET /auth/me` |
| Login / signup / logout | `POST /auth/login`, `/auth/signup`, `/auth/logout` |
| Password reset | `POST /auth/forgot-password`, `/auth/reset-password` |
| User stats | `GET /users/me/stats` |
| Recent games / history | `GET /users/me/history` |
| Games list w/ filters | `GET /games?q&system&genre&yearFrom&yearTo&sort&page&limit` |
| Systems w/ counts | `GET /systems` |
| Game details | `GET /games/:slug` |
| Saves CRUD | `GET/POST/DELETE /saves`, `GET /games/:id/saves` |
| Achievements | `GET /users/me/achievements` |
| Favorites | `GET/POST/DELETE /users/me/favorites` |
| Profile update / avatar | `PATCH /users/me`, `POST /users/me/avatar` (presigned upload) |
| Settings / controls | `GET/PATCH /users/me/settings` |
| Notifications | `GET /notifications`, `POST /notifications/read-all` |
| Announcements (public) | `GET /announcements/active` |
| Admin: games/users/announcements/systems | `/admin/*` CRUD |

## 13. Feature Status Matrix (to be filled by Claude Code)

Copy this table into `docs/feature-status.md` and fill **Status**, **Evidence** (files/endpoints found) and **Notes / missing pieces**.

| # | Feature | Spec § | Status (live/partial/planned) | Evidence | Notes / missing |
|---|---|---|---|---|---|
| 1 | Design tokens + light/dark theme | 2 | | | |
| 2 | Header (guest/auth, avatar dropdown, mobile drawer) | 4.2 | | | |
| 3 | Announcement bar + admin management | 4.3, 5.15 | | | |
| 4 | Notifications (bell + page) | 4.4 | | | |
| 5 | Footer | 4.5 | | | |
| 6 | Landing (guest) | 5.1 | | | |
| 7 | Home (signed in) | 5.2 | | | |
| 8 | Login / Sign up | 5.3 | | | |
| 9 | Forgot / reset password | 5.3 | | | |
| 10 | OAuth login | 5.3 | | | |
| 11 | Library: search | 5.4 | | | |
| 12 | Library: grid/list view toggle | 5.4 | | | |
| 13 | Library: filters | 5.4 | | | |
| 14 | Library: sorting | 5.4 | | | |
| 15 | Library: pagination | 5.4 | | | |
| 16 | Game details | 5.5 | | | |
| 17 | Public profile | 5.6 | | | |
| 18 | Emulator player (cores load & run) | 5.7 | | | |
| 19 | Real ROMs served from storage | 5.7 | | | |
| 20 | Save / load states + cloud sync | 5.7, 5.10 | | | |
| 21 | Touch controls (mobile) | 5.7 | | | |
| 22 | Dashboard shell (role-based sidebar) | 5.8 | | | |
| 23 | Dashboard overview + stats | 5.9 | | | |
| 24 | Activity charts | 5.9 | | | |
| 25 | Achievements | 5.11 | | | |
| 26 | Favorites | 5.12 | | | |
| 27 | Play history | 5.12 | | | |
| 28 | Friends | 5.13 | | | |
| 29 | Leaderboards | 5.13 | | | |
| 30 | Multiplayer | 5.13 | | | |
| 31 | Profile edit (fields) | 5.14 | | | |
| 32 | Avatar upload + crop | 5.14 | | | |
| 33 | Settings: account (email/password) | 5.16 | | | |
| 34 | Settings: appearance | 5.16 | | | |
| 35 | Settings: controls / gamepad mapping | 5.16 | | | |
| 36 | Settings: notifications / privacy | 5.16 | | | |
| 37 | Delete account | 5.16 | | | |
| 38 | Admin overview | 5.15 | | | |
| 39 | Admin: games CRUD + ROM/media upload | 5.15 | | | |
| 40 | Admin: systems / cores | 5.15 | | | |
| 41 | Admin: users management | 5.15 | | | |
| 42 | Admin: reports & logs | 5.15 | | | |
| 43 | Role guards (server + client) | 3.1 | | | |
| 44 | Legal pages | 5.17 | | | |
| 45 | 404 / 500 / offline | 5.18 | | | |
| 46 | Production deployment | — | | | |

Below the table, add a **"Backend needed"** list and a **"Questions for the user"** list.

## 14. Implementation plan (phases)

Each phase = one PR/commit group; run lint, type-check and existing tests after each; show the user screenshots or a summary before moving on.

1. **Audit** → `docs/feature-status.md` (§0.1). *Stop for confirmation.*
2. **Foundation:** tokens (§2), theme switching without flash, fonts, icon lib, base primitives (Button, Input, Select, Checkbox/Switch, Badge, Card, Tabs, Dropdown, Dialog, Toast, Tooltip, Skeleton, ComingSoon, EmptyState), feature registry (§3.4). Add a dev-only `/dev/ui` page showing every component in both themes.
3. **App shell:** Header (all states), Announcement bar slot, mobile drawer, Footer, skip link, error/404 pages.
4. **Public pages:** Landing, Auth pages, Legal shells.
5. **Library + Game details.**
6. **Home (signed in).**
7. **Dashboard shell + user pages** (Overview, Saves, Achievements, Favorites, History, Profile, Settings, Notifications, social `coming_soon`).
8. **Admin area** (role-guarded).
9. **Player page restyle** (if player is live; else ComingSoon).
10. **QA pass:** checklist §16 in both themes, 3 breakpoints, keyboard-only, axe.

## 15. Open placeholders (ask the user before shipping)

- `[APP_NAME]` and logo mark.
- Final accent color (default pink `#FF3D9A` / `#C8176E`).
- Hero headline, sub-headline, feature copy, FAQ content.
- ROM/legal policy and Terms/Privacy text; ROM upload confirmation wording.
- Can guests browse the library and game details? (default: yes)
- Is a `moderator` role needed?
- Public profiles: yes/no?
- Avatar max size (default 2 MB) and save-storage quota per user.
- Languages: English only, or Arabic/RTL later?
- OAuth providers (Google / GitHub)?

## 16. Definition of done — QA checklist (per page)

- [ ] Matches spec layout and uses only tokens (no raw hex/px outside the scales).
- [ ] Works and looks correct in **light** and **dark**; no theme flash on reload.
- [ ] Correct at 360, 768, 1280 and 1920px; no horizontal page scroll.
- [ ] Exactly one primary button per region; accent used only for primary/active/focus.
- [ ] Loading, empty, error (and coming-soon where relevant) states implemented.
- [ ] Keyboard-only usable; visible focus; Esc closes overlays; focus returns.
- [ ] Screen reader: landmarks, labels, `aria-current`, live regions where specified.
- [ ] Text contrast ≥ 4.5:1 (3:1 for large text/UI states) in both themes.
- [ ] `prefers-reduced-motion` respected.
- [ ] Role-restricted UI hidden for non-admins **and** blocked server-side.
- [ ] No calls to non-existent endpoints; `coming_soon` features never 404.
- [ ] Lint, type-check and existing tests pass; no business logic regressions.
- [ ] `docs/feature-status.md` updated.
