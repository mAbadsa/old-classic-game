#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/57c894b38fdf36a646172de302920e01f35700cc3c564aa99af300bc430892cd/contract';
import endContract from '../../snapshots/57c894b38fdf36a646172de302920e01f35700cc3c564aa99af300bc430892cd/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/bf2ae4a17c8f70a13da639b5b36723df29f0e713a1e4f4ea58346fc61f8924ae/contract';
import startContract from '../../snapshots/bf2ae4a17c8f70a13da639b5b36723df29f0e713a1e4f4ea58346fc61f8924ae/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'games',
        column: col('thumbnail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
