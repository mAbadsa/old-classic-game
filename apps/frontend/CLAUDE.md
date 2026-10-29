@AGENTS.md

# Frontend (`apps/frontend`)

Admin pages live in `app/admin/`. The layout checks the role on the client, and the API enforces the same rule.


Next.js App Router (`apps/frontend/app/`), Tailwind v4 via `@tailwindcss/postcss`, TypeScript. **shadcn/ui** is set up (`components.json`, `components/ui/*`) on the **base-nova** style, which uses `@base-ui/react` (not Radix) as its primitive layer — its components take a `render={<Element />}` prop to compose with a custom element (Base UI's convention), not Radix's `asChild`. Add more primitives with `npx shadcn@latest add <name>` from `apps/frontend/`. Auth: `lib/auth.ts` stores the JWT from `/auth/login` in `localStorage` *and* a plain `accessToken` cookie; `proxy.ts` (Next 16's rename of `middleware.ts`) does a fast, unverified cookie pre-check to redirect logged-out users on `/`, `/games`, `/emulator`, while `hooks/useRequireAuth.ts` does the real check via `GET /auth/me`. The actual security boundary is the backend's guards. API helpers live in `lib/` (`auth`, `saves`, `stats`) with matching hooks in `hooks/`. No global state library. `emulator-web-app-plan.md`'s proposed `store/` dir still doesn't exist; treat that doc's code snippets (e.g. `eval(script)` for loading emulator glue code) as illustrative intent, not implementation.

**Emulation** is wired up via [EmulatorJS](https://emulatorjs.org) — see `apps/frontend/EMULATORS.md` for the full setup guide (self-hosting the EmulatorJS `data/` bundle, adding ROMs, supported systems, the two player components below). Key pieces:
- `lib/emulator-systems.ts` — app system key → EmulatorJS core id table.
- `components/EmulatorPlayer.tsx` + `app/play/[system]/page.tsx` — static-ROM player: points `EJS_gameUrl` straight at a file under `public/emulators/roms/`.
- `hooks/useEmulator.ts` + `components/EmulatorUI.tsx` — backend-driven player: fetches ROM bytes for a `gameId` from the API, caches them in `localStorage`, and renders a full shadcn/ui control bar (Play/Pause/Save/Load/Fullscreen, multi-slot saves menu). `useEmulator`'s `play`/`pause`/`saveState`/`loadState` call into `EJS_emulator.gameManager`, which is undocumented/internal to EmulatorJS.
- Both boot paths read/write the same `window.EJS_*` globals (typed once in `types/emulatorjs.d.ts`, ambient — extend it if you add another EmulatorJS option) — EmulatorJS has no importable API, it's a script that reads global config.
- `next.config.ts` — COOP/COEP headers on `/play/*` (check it before adding a new player route), required for EmulatorJS's threaded WASM cores; any other route embedding either player needs the same headers added.
- `public/emulators/data/`, `roms/*/`, and `bios/` are gitignored (third-party bundle + user-supplied ROMs/BIOS) — only the folder structure is tracked.
- Actual gameplay keyboard input (arrows + Z/X/A/S by default) and gamepad input are handled internally by EmulatorJS — don't add competing `keydown` handlers for game controls; app-level shortcuts (e.g. `EmulatorUI`'s "F" for fullscreen) are fine since they don't collide with EmulatorJS's defaults.
