#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/91bca83312f2e00fb73b788123c8f50add245c8b58b039dae488825b13f9dafe/contract';
import startContract from '../../snapshots/91bca83312f2e00fb73b788123c8f50add245c8b58b039dae488825b13f9dafe/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/bf2ae4a17c8f70a13da639b5b36723df29f0e713a1e4f4ea58346fc61f8924ae/contract';
import endContract from '../../snapshots/bf2ae4a17c8f70a13da639b5b36723df29f0e713a1e4f4ea58346fc61f8924ae/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'admin_logs',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('targetId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('targetType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'system_settings',
        columns: [
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('value', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
        ],
        constraints: [primaryKey(['key'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'admin_logs',
        index: 'admin_logs_actorId_idx_a58f6b4b',
        columns: ['actorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'admin_logs',
        index: 'admin_logs_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
