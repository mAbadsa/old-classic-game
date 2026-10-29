# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

An npm-workspaces monorepo for a classic game emulator web app: `apps/frontend` (Next.js) talks to `apps/backend` (NestJS API backed by Postgres via Prisma Next). See `emulator-web-app-plan.md` for the full original design doc (tech stack rationale, phased roadmap, DB schema draft, security/perf notes) — the backend's actual data model has since diverged from that draft (see the Data layer section in `apps/backend/CLAUDE.md`) and is source of truth.

Current state: backend has `auth` (JWT signup/login/me), `users`, `games` (catalog + ROM download/upload), `saves`, `stats`, `uploads`, and an admin-only `admin` module, all wired to Postgres. `achievements`/`websocket` modules described in the plan doc do not exist yet (the `Achievement` tables do). The frontend has login/signup, a dashboard, a game library, and two EmulatorJS-based players, talking to the API via `NEXT_PUBLIC_API_URL`; an admin area at `apps/frontend/app/admin` covers the dashboard, games, users, banner, and email.

## Commands

Scripts are defined in each `package.json`. The backend needs `DATABASE_URL` and `JWT_SECRET` in `apps/backend/.env` before it starts (see `apps/backend/CLAUDE.md`).

## Linting

Backend uses **oxlint**, not eslint (`apps/backend/oxlint.json` disables `no-explicit-any`, warns on `no-floating-promises`). Frontend uses eslint (`eslint-config-next`); `public/emulators/**` (vendored EmulatorJS) is in its `globalIgnores`.

## UI redesign
All UI work follows docs/redesign/SPEC.md (behavior, tokens, states)
and docs/redesign/mockups/ (visual look). If they disagree, the spec wins.
Never change API contracts or business logic as part of UI work without asking.

