#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/59b86b40de953b0aff645174fcde4c4f066dccbbb493401b204a1b718dd62be4/contract';
import startContract from '../../snapshots/59b86b40de953b0aff645174fcde4c4f066dccbbb493401b204a1b718dd62be4/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/91bca83312f2e00fb73b788123c8f50add245c8b58b039dae488825b13f9dafe/contract';
import endContract from '../../snapshots/91bca83312f2e00fb73b788123c8f50add245c8b58b039dae488825b13f9dafe/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

// The planner has no in-contract rename hint (Postgres) and would otherwise
// drop+recreate `saveData` as `saveState` with a NOT-NULL backfill
// placeholder. Hand-rewritten as a real RENAME COLUMN — see prisma-8 skill,
// references/migrations.md "Common Pitfalls" #8. `saveFile` really is being
// dropped: it was never read or written by any application code (the
// `saves` module didn't exist until this migration), so there is nothing to
// preserve.
export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'save_games', column: 'saveFile' }),
      rawSql({
        id: 'renameColumn.save_games.saveState',
        label: 'Rename column "saveData" to "saveState" on "save_games"',
        operationClass: 'additive',
        target: { id: 'table.save_games' },
        precheck: [],
        execute: [
          {
            description: 'Rename column "saveData" to "saveState" on "save_games"',
            sql: 'ALTER TABLE "public"."save_games" RENAME COLUMN "saveData" TO "saveState"',
          },
        ],
        postcheck: [],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
