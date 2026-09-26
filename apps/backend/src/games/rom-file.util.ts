// Maps a Game.emulator value to the ROM file extension GET /games/:gameId/rom
// expects to find under ROMS_DIR. Keep in sync with the `romExtension` values
// src/prisma/seed.ts writes placeholder files under — that script can't
// import this module directly (it's executed via bare `node`, outside
// Nest's build; see its own top-of-file comment), so the two are kept in
// sync by hand rather than shared.
export const EXTENSION_BY_EMULATOR: Record<string, string> = {
  nes: '.nes',
  snes: '.sfc',
  genesis: '.md',
  atari: '.bin',
  mame: '.zip',
};

export function romExtensionForEmulator(emulator: string): string {
  return EXTENSION_BY_EMULATOR[emulator] ?? '.rom';
}
