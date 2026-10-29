#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/19373be146a7443efcd1339a0f3ff4665d0237ed321f914d5d3443a1e801989e/contract';
import endContract from '../../snapshots/19373be146a7443efcd1339a0f3ff4665d0237ed321f914d5d3443a1e801989e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/57c894b38fdf36a646172de302920e01f35700cc3c564aa99af300bc430892cd/contract';
import startContract from '../../snapshots/57c894b38fdf36a646172de302920e01f35700cc3c564aa99af300bc430892cd/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('status', 'text', {
          notNull: true,
          default: lit('active'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('tokenVersion', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
