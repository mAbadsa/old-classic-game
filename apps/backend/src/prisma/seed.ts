// One-off seed script — not part of the request-serving process. Run with
// `npm run seed` (see package.json) or `node src/prisma/seed.ts` directly.
//
// This project uses Prisma Next (contract-first — contract.prisma / db.ts),
// not classic Prisma ORM: there's no generated `PrismaClient`, and Prisma
// Next has no `prisma db seed` equivalent (see the prisma-8 skill,
// references/migrations.md "What Prisma Next doesn't do yet" — a plain
// script against a `db` client, exactly like this one, is the documented
// workaround). Queries go through the same `db.orm.public.Game` surface
// every service in this app already uses (see games.service.ts).
//
// Constructs its own client (mirroring db.ts's own construction) rather than
// importing db.ts's shared singleton: this file is executed directly via
// `node src/prisma/seed.ts` (Node's native TS support, no bundler), and a
// same-directory `./db.js` value import would fail there — the codebase's
// `.js`-extension-on-a-.ts-file convention only resolves through nest's
// build/dev tooling, not bare `node` on the source file. Importing only a
// package (@prisma/orm-postgres/runtime) and a type-only + JSON import (both
// erased-or-real at runtime) sidesteps that entirely, per the prisma-8
// skill's references/runtime.md "Running as a script" guidance.
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});

const ROMS_DIR = process.env['ROMS_DIR'] ?? join(process.cwd(), 'public', 'roms');

// Mirrors games/rom-file.util.ts's EXTENSION_BY_EMULATOR — duplicated, not
// imported, because this script runs via bare `node` (see the module-level
// comment above) while that file lives under Nest's normal build. Keep the
// two in sync by hand if you add an emulator.
const EXTENSION_BY_EMULATOR: Record<string, string> = {
  nes: '.nes',
  snes: '.sfc',
  genesis: '.md',
  atari: '.bin',
  mame: '.zip',
};

interface SeedGame {
  title: string;
  emulator: string;
  description: string;
  releaseYear: number;
  rating: number;
}

const games: SeedGame[] = [
  {
    title: 'Super Mario Bros.',
    emulator: 'nes',
    description: 'The side-scrolling platformer that defined the genre and launched the Mario franchise.',
    releaseYear: 1985,
    rating: 4.9,
  },
  {
    title: 'The Legend of Zelda',
    emulator: 'nes',
    description: 'An open-world action-adventure where Link explores Hyrule to rescue Princess Zelda.',
    releaseYear: 1986,
    rating: 4.8,
  },
  {
    // The one real, legally-playable ROM in this list — everything else
    // above/below gets a placeholder text file (see the loop below). This is
    // free homebrew: GPLv3 with an explicit exception permitting
    // redistribution of exact compiled binaries without source. Its real
    // .nes file is placed by hand at public/roms/<this game's id>.nes after
    // seeding, overwriting the placeholder this script would otherwise write.
    // Source: https://github.com/pinobatch/croom-nes
    title: 'Concentration Room',
    emulator: 'nes',
    description: 'A free homebrew card-matching game by Damian Yerrick — flip cards to find pairs, solo or head-to-head.',
    releaseYear: 2010,
    rating: 4.0,
  },
  {
    // The second real, legally-playable ROM (see the Concentration Room
    // entry above for how that mechanism works). Code is GPLv3+, assets are
    // CC BY-NC-SA 4.0 (non-commercial, share-alike, attribution required —
    // satisfied by this description/credit; this app doesn't sell it).
    // Built explicitly as a legal, non-infringing Mario-style platformer —
    // per its own README: "intended to provide a good platformer base like
    // Super Mario World tends to serve, without copyright infringement."
    // Source: https://github.com/NovaSquirrel/NovaTheSquirrel
    title: 'Nova the Squirrel',
    emulator: 'nes',
    description:
      'An open-source Mario/Kirby-inspired puzzle-platformer by NovaSquirrel — copy enemy abilities to solve rooms and reach the goal.',
    releaseYear: 2019,
    rating: 4.1,
  },
  {
    // The third real, legally-playable ROM (see the Concentration Room entry
    // above). GPLv3, no binary-redistribution exception needed here — this
    // .nes was built from that source by us (ca65/ld65 via a locally-built
    // cc65, not committed to this repo), so the compiled output carries the
    // same GPLv3 terms as the source it was built from.
    // Source: https://github.com/Grazen0/nes-pong
    title: 'Pong NES',
    emulator: 'nes',
    description: 'An open-source NES take on the original Pong — two paddles, one ball, first to miss loses.',
    releaseYear: 2023,
    rating: 3.8,
  },
  {
    title: 'Super Mario World',
    emulator: 'snes',
    description: "Mario and Yoshi's first adventure together across the islands of Dinosaur Land.",
    releaseYear: 1990,
    rating: 4.9,
  },
  {
    title: 'The Legend of Zelda: A Link to the Past',
    emulator: 'snes',
    description: 'Link travels between the Light and Dark Worlds to save Hyrule from Ganon.',
    releaseYear: 1991,
    rating: 4.9,
  },
  {
    title: 'Sonic the Hedgehog',
    emulator: 'genesis',
    description: "Sega's speedy blue mascot debuts, racing through Green Hill Zone to stop Dr. Robotnik.",
    releaseYear: 1991,
    rating: 4.7,
  },
  {
    title: 'Streets of Rage 2',
    emulator: 'genesis',
    description: 'A beat-em-up classic where players fight through the city to take down a crime syndicate.',
    releaseYear: 1992,
    rating: 4.7,
  },
  {
    title: 'Pac-Man',
    emulator: 'atari',
    description: 'Guide Pac-Man through a maze, eating dots and avoiding four colorful ghosts.',
    releaseYear: 1980,
    rating: 4.2,
  },
  {
    title: 'Missile Command',
    emulator: 'atari',
    description: 'Defend six cities from a relentless barrage of incoming ballistic missiles.',
    releaseYear: 1980,
    rating: 4.0,
  },
  {
    title: 'Space Invaders',
    emulator: 'mame',
    description: 'The genre-defining arcade shooter where players fend off descending rows of aliens.',
    releaseYear: 1978,
    rating: 4.3,
  },
  {
    title: 'Donkey Kong',
    emulator: 'mame',
    description: "Mario's arcade debut — climb girders and dodge barrels to rescue Pauline from Kong.",
    releaseYear: 1981,
    rating: 4.4,
  },
   {
    title: 'Doom [NTSC-U] [SLUS-00077] ',
    emulator: 'n64',
    description: "Doom.",
    releaseYear: 1997,
    rating: 4.4,
  },
];

async function main() {
  console.log(`Seeding ${games.length} games...`);
  await mkdir(ROMS_DIR, { recursive: true });

  for (const game of games) {
    // Keeps re-runs from piling up duplicates — Game has no unique
    // constraint on title to upsert against, so this is a plain check-then-create.
    let record = await db.orm.public.Game.first({ title: game.title });

    if (record) {
      console.log(`  = ${game.title} already exists`);
    } else {
      record = await db.orm.public.Game.create({
        title: game.title,
        emulator: game.emulator,
        romPath: 'pending', // set for real below, once the id (part of the URL) is known
        cover: null,
        description: game.description,
        releaseYear: game.releaseYear,
        rating: game.rating,
        tags: null,
      });
      console.log(`  + ${record.title} (${record.emulator}, ${record.releaseYear})`);
    }

    // A placeholder, non-playable file — just enough for GET /games/:id/rom
    // to have real bytes to stream. Overwritten each run so it always
    // matches the current title/emulator even if those change above.
    const extension = EXTENSION_BY_EMULATOR[record.emulator] ?? '.rom';
    await writeFile(
      join(ROMS_DIR, `${record.id}${extension}`),
      `Placeholder ROM for "${record.title}" (${record.emulator}). Not a real, playable ROM file.\n`,
    );

    // Relative to the backend API, not a fully-qualified URL — the frontend
    // resolves it against its own API_URL (see useEmulator.ts's romPath
    // handling) rather than baking a specific host/port into stored data.
    const romPath = `/games/${record.id}/rom`;
    if (record.romPath !== romPath) {
      await db.orm.public.Game.where({ id: record.id }).update({ romPath });
      console.log(`    romPath -> ${romPath}`);
    }
  }

  console.log('Done.');
}

try {
  await main();
} finally {
  // Scripts must close the pool explicitly or the process hangs — the
  // server (main.ts) never calls this, since it needs the pool open for
  // the process lifetime. See the prisma-8 skill, references/runtime.md
  // "Workflow — Running as a script (teardown)".
  await db.close();
}
