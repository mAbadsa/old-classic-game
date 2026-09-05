#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/367a56b09b6348f21f24aacddd4cbc41d3f21a5eba24a401a9e7f0a6bd6955c3/contract';
import startContract from '../../snapshots/367a56b09b6348f21f24aacddd4cbc41d3f21a5eba24a401a9e7f0a6bd6955c3/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/59b86b40de953b0aff645174fcde4c4f066dccbbb493401b204a1b718dd62be4/contract';
import endContract from '../../snapshots/59b86b40de953b0aff645174fcde4c4f066dccbbb493401b204a1b718dd62be4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

// The planner has no in-contract rename hint (Postgres) and emits drop+create
// for every table here. Hand-rewritten as RENAME statements so the existing
// dev data (and every dependent constraint/index) survives instead of being
// dropped and recreated empty. See prisma-8 skill, references/migrations.md
// "Common Pitfalls" #8.

function renameTable(from: string, to: string) {
  return rawSql({
    id: `renameTable.${to}`,
    label: `Rename table "${from}" to "${to}"`,
    operationClass: 'additive',
    target: { id: `table.${to}` },
    precheck: [],
    execute: [
      {
        description: `Rename table "${from}" to "${to}"`,
        sql: `ALTER TABLE "public"."${from}" RENAME TO "${to}"`,
      },
    ],
    postcheck: [],
  });
}

function renameConstraint(table: string, from: string, to: string) {
  return rawSql({
    id: `renameConstraint.${table}.${to}`,
    label: `Rename constraint "${from}" to "${to}" on "${table}"`,
    operationClass: 'additive',
    target: { id: `table.${table}` },
    precheck: [],
    execute: [
      {
        description: `Rename constraint "${from}" to "${to}" on "${table}"`,
        sql: `ALTER TABLE "public"."${table}" RENAME CONSTRAINT "${from}" TO "${to}"`,
      },
    ],
    postcheck: [],
  });
}

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      // Table renames
      renameTable('achievement', 'achievements'),
      renameTable('game', 'games'),
      renameTable('saveGame', 'save_games'),
      renameTable('session', 'sessions'),
      renameTable('user', 'users'),
      renameTable('userAchievement', 'user_achievements'),

      // Primary key constraint renames (Postgres doesn't rename these on ALTER TABLE ... RENAME TO)
      renameConstraint('achievements', 'achievement_pkey', 'achievements_pkey'),
      renameConstraint('games', 'game_pkey', 'games_pkey'),
      renameConstraint('save_games', 'saveGame_pkey', 'save_games_pkey'),
      renameConstraint('sessions', 'session_pkey', 'sessions_pkey'),
      renameConstraint('users', 'user_pkey', 'users_pkey'),
      renameConstraint('user_achievements', 'userAchievement_pkey', 'user_achievements_pkey'),

      // Unique constraint renames
      renameConstraint(
        'save_games',
        'saveGame_userId_gameId_slotNumber_key',
        'save_games_userId_gameId_slotNumber_key',
      ),
      renameConstraint('sessions', 'session_token_key', 'sessions_token_key'),
      renameConstraint(
        'user_achievements',
        'userAchievement_userId_achievementId_key',
        'user_achievements_userId_achievementId_key',
      ),
      renameConstraint('users', 'user_email_key', 'users_email_key'),
      renameConstraint('users', 'user_username_key', 'users_username_key'),

      // Plain index renames
      this.renameIndex({
        schema: 'public',
        table: 'games',
        from: 'game_emulator_idx_9cfe7b23',
        to: 'games_emulator_idx_9cfe7b23',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'games',
        from: 'game_rating_idx_fcb0b199',
        to: 'games_rating_idx_fcb0b199',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'games',
        from: 'game_title_idx_1c94c7b6',
        to: 'games_title_idx_1c94c7b6',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'save_games',
        from: 'saveGame_gameId_idx_6cdb47f8',
        to: 'save_games_gameId_idx_6cdb47f8',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'save_games',
        from: 'saveGame_userId_idx_a489d58a',
        to: 'save_games_userId_idx_a489d58a',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'save_games',
        from: 'saveGame_userId_updatedAt_idx_42f5280d',
        to: 'save_games_userId_updatedAt_idx_42f5280d',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'sessions',
        from: 'session_expiresAt_idx_6b6b8c10',
        to: 'sessions_expiresAt_idx_6b6b8c10',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'sessions',
        from: 'session_userId_idx_a489d58a',
        to: 'sessions_userId_idx_a489d58a',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'user_achievements',
        from: 'userAchievement_achievementId_idx_05a27a05',
        to: 'user_achievements_achievementId_idx_05a27a05',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'user_achievements',
        from: 'userAchievement_userId_idx_a489d58a',
        to: 'user_achievements_userId_idx_a489d58a',
      }),

      // Foreign key constraint renames
      renameConstraint('save_games', 'saveGame_userId_fkey', 'save_games_userId_fkey'),
      renameConstraint('save_games', 'saveGame_gameId_fkey', 'save_games_gameId_fkey'),
      renameConstraint('sessions', 'session_userId_fkey', 'sessions_userId_fkey'),
      renameConstraint(
        'user_achievements',
        'userAchievement_userId_fkey',
        'user_achievements_userId_fkey',
      ),
      renameConstraint(
        'user_achievements',
        'userAchievement_achievementId_fkey',
        'user_achievements_achievementId_fkey',
      ),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
