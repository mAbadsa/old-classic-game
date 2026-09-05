#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/367a56b09b6348f21f24aacddd4cbc41d3f21a5eba24a401a9e7f0a6bd6955c3/contract';
import endContract from '../../snapshots/367a56b09b6348f21f24aacddd4cbc41d3f21a5eba24a401a9e7f0a6bd6955c3/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b6387a60971cf5faaa5269cc2c995d1451ff77f8f41c4bfaff045726ec880e22/contract';
import startContract from '../../snapshots/b6387a60971cf5faaa5269cc2c995d1451ff77f8f41c4bfaff045726ec880e22/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('role', 'text', {
          notNull: true,
          default: lit('user'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
