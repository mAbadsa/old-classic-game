// Maps our app-facing system keys to EmulatorJS's own core identifiers.
// EmulatorJS core names are fixed strings defined by the project — see
// https://emulatorjs.org/docs/options (EJS_core) — they don't follow a
// predictable pattern (e.g. Genesis is "segaMD", not "genesis"), so this
// table is the single place that translation happens.
export const EMULATOR_SYSTEMS = {
  nes: {
    label: "Nintendo Entertainment System",
    core: "nes",
    romFolder: "nes",
    extensions: [".nes"],
  },
  snes: {
    label: "Super Nintendo Entertainment System",
    core: "snes",
    romFolder: "snes",
    extensions: [".sfc", ".smc"],
  },
  genesis: {
    label: "Sega Genesis / Mega Drive",
    core: "segaMD",
    romFolder: "genesis",
    extensions: [".md", ".gen", ".bin"],
  },
  atari2600: {
    label: "Atari 2600",
    core: "atari2600",
    romFolder: "atari2600",
    extensions: [".a26", ".bin"],
  },
} as const;

export type EmulatorSystemKey = keyof typeof EMULATOR_SYSTEMS;

export function isEmulatorSystemKey(value: string): value is EmulatorSystemKey {
  return value in EMULATOR_SYSTEMS;
}
