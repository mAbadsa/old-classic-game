# `public/emulators/`

Static assets served as-is by Next.js under `/emulators/*`. See [`EMULATORS.md`](../../EMULATORS.md) at the frontend root for the full setup guide.

```
emulators/
├── data/            EmulatorJS's own distributable — loader.js, emulator.min.js,
│                    cores/, localization/. NOT included in this repo (gitignored,
│                    it's a large third-party bundle); download and extract it
│                    here yourself so the emulator works offline (see EMULATORS.md).
├── roms/
│   ├── nes/         .nes files
│   ├── snes/        .sfc / .smc files
│   ├── genesis/     .md / .gen / .bin files
│   └── atari2600/   .a26 / .bin files
└── bios/            BIOS files, only if a specific core requires one.
```

**Do not commit ROM or BIOS files you don't have the legal right to redistribute.** `roms/*` and `bios/` are gitignored (see `.gitignore`) — only the folder structure (via `.gitkeep`) is tracked.
