# Emulator setup (EmulatorJS)

This app embeds [EmulatorJS](https://emulatorjs.org) to run classic-console ROMs in the browser via WebAssembly cores. This doc covers self-hosting the emulator assets, adding ROMs, and wiring up each supported system (NES, SNES, Genesis, Atari 2600).

## How it fits together

- `next.config.ts` — sends the `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers on `/play/*` that browsers require before exposing `SharedArrayBuffer` (needed for EmulatorJS's threaded cores), and a `Cross-Origin-Resource-Policy` header on `/emulators/*` so that isolated page can load those same-origin assets.
- `public/emulators/` — static assets served at `/emulators/*`: the EmulatorJS distributable (`data/`), your ROM files (`roms/<system>/`), and BIOS files (`bios/`) if a core needs one. See `public/emulators/README.md`.
- `lib/emulator-systems.ts` — maps our app-facing system keys (`nes`, `snes`, `genesis`, `atari2600`) to EmulatorJS's own core identifiers (`nes`, `snes`, `segaMD`, `atari2600` — these don't follow a predictable naming pattern, which is why this table exists).
- `components/EmulatorPlayer.tsx` — a client component that sets the `EJS_*` globals EmulatorJS reads at boot and injects its `loader.js`. EmulatorJS has no importable API; it's a script that reads global config, so this component is the thin bridge between React and that convention.
- `app/play/[system]/page.tsx` — example page: `/play/nes?rom=/emulators/roms/nes/game.nes&name=Game`.
- `hooks/useEmulator.ts` — an alternative to `EmulatorPlayer` for games stored via the backend API instead of a static `public/` ROM: given a `gameId`, it calls `GET {NEXT_PUBLIC_API_URL}/games/:id` for the game's `romPath`, fetches and caches the ROM bytes in `localStorage`, then boots EmulatorJS the same way. Also exposes `play()`/`pause()`/`saveState(slot?)`/`loadState(slot?)`/`listSaveSlots()` (state is persisted to `localStorage` too, multiple slots — there's no backend save-game endpoint yet). Note: `play`/`pause`/`saveState`/`loadState` call into `EJS_emulator.gameManager`, which is undocumented/internal to EmulatorJS and isn't guaranteed stable across its versions.
- `components/EmulatorUI.tsx` — a full player UI built on `useEmulator` (`hideDefaultControls: true`, so EmulatorJS's own control-bar buttons stay hidden in favor of this one): title bar, the screen, and a shadcn/ui control bar (Play/Pause/Save/Load/Fullscreen + a "Saves" sheet listing all slots). Responsive down to mobile widths. Actual gameplay keyboard input (arrows + Z/X/A/S, per `EJS_defaultControls`) and gamepad input are both handled internally by EmulatorJS — this component only adds its own "F" shortcut for fullscreen, which doesn't collide with those.

## 1. Get the EmulatorJS data files

EmulatorJS ships as a `data/` bundle (`loader.js`, `emulator.min.js`, `cores/`, `localization/`). `public/emulators/data/` is gitignored (it's a large third-party bundle — see `public/emulators/README.md`), so each clone of this repo needs it populated locally before the player works. `EmulatorPlayer`/`useEmulator` default to `/emulators/data/` (self-hosted), so once the files are in place everything runs **fully offline, with no CDN or internet dependency at runtime**.

**Self-host (recommended — this is the default, no third-party runtime dependency):**

1. Download the `stable` release from the [EmulatorJS GitHub repo](https://github.com/EmulatorJS/EmulatorJS/releases) (a `.7z` archive, not `nightly`).
2. Extract `data/loader.js`, `data/emulator.min.js`, `data/emulator.min.css`, `data/version.json`, `data/localization/`, and `data/compression/` into `apps/frontend/public/emulators/data/`.
3. From `data/cores/` in the archive, copy `cores.json` plus only the `-wasm.data` files for the cores you actually need (each core ships 4 variants: plain/`-thread`/`-legacy`/`-thread-legacy` — keep all 4 per core for browser-compatibility fallback). This repo's four systems map to:

   | App system | `EJS_core` | Archive core files to copy |
   |---|---|---|
   | `nes` | `nes` → `fceumm` | `fceumm*-wasm.data` |
   | `snes` | `snes` → `snes9x` | `snes9x*-wasm.data` |
   | `genesis` | `segaMD` → `genesis_plus_gx` | `genesis_plus_gx*-wasm.data` |
   | `atari2600` | `atari2600` → `stella2014` | `stella2014*-wasm.data` |

   (See the `"nes"`/`"snes"`/`"segaMD"`/`"atari2600"` arrays in the archive's `data/src/emulator.js` if you add another system later — first entry in each array is the default core EmulatorJS picks.) Copying only these keeps `data/` around 20MB instead of the ~300MB full archive (every core, for every system EmulatorJS supports).
4. You should end up with:
   ```
   apps/frontend/public/emulators/data/loader.js
   apps/frontend/public/emulators/data/emulator.min.js
   apps/frontend/public/emulators/data/emulator.min.css
   apps/frontend/public/emulators/data/version.json
   apps/frontend/public/emulators/data/cores/cores.json
   apps/frontend/public/emulators/data/cores/fceumm*-wasm.data
   apps/frontend/public/emulators/data/cores/snes9x*-wasm.data
   apps/frontend/public/emulators/data/cores/genesis_plus_gx*-wasm.data
   apps/frontend/public/emulators/data/cores/stella2014*-wasm.data
   apps/frontend/public/emulators/data/localization/...
   apps/frontend/public/emulators/data/compression/...
   ```
5. Don't minify anything yourself — the official release archive is already minified.

**Use the public CDN instead (only if you deliberately don't want to vendor the files, e.g. quick one-off testing):**

Set an env var so `EmulatorPlayer`/`useEmulator` point at EmulatorJS's CDN instead of the local bundle:

```bash
# apps/frontend/.env.local
NEXT_PUBLIC_EMULATORJS_DATA_PATH=https://cdn.emulatorjs.org/stable/data/
```

This requires an internet connection every time the player loads and gives you no control over the CDN's uptime or versioning — don't use it in production, and leave it unset for normal local dev.

## 2. Add ROMs

Drop ROM files into the matching folder under `public/emulators/roms/`:

| System | Folder | Extensions |
|---|---|---|
| NES | `roms/nes/` | `.nes` |
| SNES | `roms/snes/` | `.sfc`, `.smc` |
| Genesis / Mega Drive | `roms/genesis/` | `.md`, `.gen`, `.bin` |
| Atari 2600 | `roms/atari2600/` | `.a26`, `.bin` |

**Only add ROMs you have the legal right to use** (e.g. games you own, or homebrew/public-domain ROMs). These folders are gitignored — don't commit copyrighted ROM files.

Some cores need a BIOS file to run commercial games (e.g. certain Sega CD/32X cores) — none of the four systems above strictly require one for standard cartridge games. If a core you add later does, place the BIOS under `public/emulators/bios/` and pass its URL via `EmulatorPlayer`'s `biosUrl` prop.

## 3. Play a game

Visit `/play/<system>?rom=<romUrl>`, where `<system>` is one of `nes`, `snes`, `genesis`, `atari2600` (our app-facing keys from `lib/emulator-systems.ts`, not EmulatorJS's raw core ids):

```
/play/nes?rom=/emulators/roms/nes/game.nes&name=My%20Game
/play/snes?rom=/emulators/roms/snes/game.sfc
/play/genesis?rom=/emulators/roms/genesis/game.md
/play/atari2600?rom=/emulators/roms/atari2600/game.a26
```

Or embed the player directly in your own page/component:

```tsx
import { EmulatorPlayer } from "@/components/EmulatorPlayer";

<EmulatorPlayer
  system="genesis"
  romUrl="/emulators/roms/genesis/game.md"
  gameName="My Game"
  className="h-[600px] w-full"
/>
```

Any route embedding `EmulatorPlayer` outside of `/play/*` needs the same COOP/COEP headers added to it in `next.config.ts` if you want threaded cores to work there too.

## 4. Adding another system later

EmulatorJS supports many more cores (PSX, N64, GBA, Sega CD, etc.). To add one:

1. Look up its `EJS_core` value in the [EmulatorJS options docs](https://emulatorjs.org/docs/options).
2. Add an entry to `EMULATOR_SYSTEMS` in `lib/emulator-systems.ts` with that core id, a ROM folder name, and expected extensions.
3. Create `public/emulators/roms/<new-folder>/` (the existing `.gitignore` rule already covers any subfolder under `roms/`).
4. Confirm the core is present under `public/emulators/data/cores/` in whichever release/CDN version you're using — not every core ships in every distribution.

## Troubleshooting

- **Blank player / console errors about `SharedArrayBuffer`**: you're loading the player from a route that doesn't send the COOP/COEP headers. Confirm the route is under `/play/*` (or add matching headers for your custom route in `next.config.ts`).
- **404s for `loader.js` or core files**: `public/emulators/data/` is empty — see step 1. This directory is intentionally not checked into git.
- **Core missing for a system**: not every EmulatorJS release bundles every core. Check `public/emulators/data/cores/` against the core id you configured.
