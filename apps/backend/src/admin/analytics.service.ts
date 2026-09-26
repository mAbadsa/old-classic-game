import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db.js';

export interface AnalyticsOverview {
  totalUsers: number;
  totalGames: number;
  totalSaves: number;
  totalPlaytimeSeconds: number;
  newUsersLast7Days: number;
  usersByRole: { role: string; count: number }[];
}

export interface TopGame {
  gameId: string;
  title: string;
  cover: string | null;
  playCount: number;
  totalPlaytimeSeconds: number;
}

export interface GameStats {
  gameId: string;
  title: string;
  totalPlays: number;
  totalPlaytimeSeconds: number;
  uniquePlayers: number;
  // Game.rating is a single stored score (e.g. seeded from an external
  // source), not an average over per-user ratings — there's no rating-per-
  // user table in the contract to average over. Named "average" here only
  // because that's the vocabulary the admin UI asked for.
  averageRating: number | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_TOP_GAMES_LIMIT = 10;

/** Platform-wide statistics for the admin dashboard — distinct from stats/stats.service.ts, which reports one user's own stats. */
@Injectable()
export class AnalyticsService {
  async getOverview(): Promise<AnalyticsOverview> {
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

    const [
      { totalUsers },
      { totalGames },
      { totalSaves },
      { totalPlaytimeSeconds },
      { newUsersLast7Days },
      usersByRole,
    ] = await Promise.all([
      db.orm.public.User.aggregate((a) => ({ totalUsers: a.count() })),
      db.orm.public.Game.aggregate((a) => ({ totalGames: a.count() })),
      db.orm.public.SaveGame.aggregate((a) => ({ totalSaves: a.count() })),
      db.orm.public.SaveGame.aggregate((a) => ({ totalPlaytimeSeconds: a.sum('playTime') })),
      db.orm.public.User.where((u) => u.createdAt.gte(sevenDaysAgo)).aggregate((a) => ({
        newUsersLast7Days: a.count(),
      })),
      db.orm.public.User.groupBy('role').aggregate((a) => ({ count: a.count() })),
    ]);

    return {
      totalUsers,
      totalGames,
      totalSaves,
      totalPlaytimeSeconds: totalPlaytimeSeconds ?? 0,
      newUsersLast7Days,
      usersByRole,
    };
  }

  async getTopGames(limit = DEFAULT_TOP_GAMES_LIMIT): Promise<TopGame[]> {
    const grouped = await db.orm.public.SaveGame.groupBy('gameId').aggregate((a) => ({
      playCount: a.count(),
      totalPlaytimeSeconds: a.sum('playTime'),
    }));

    // The grouped collection can't .orderBy an aggregate alias on Postgres
    // (see the prisma-8 skill's queries-postgres.md, "What Prisma Next
    // doesn't do yet") — sort client-side. Fine at this app's game-catalog
    // scale; drop to db.sql if the catalog grows large.
    const top = [...grouped].sort((a, b) => b.playCount - a.playCount).slice(0, limit);
    if (top.length === 0) return [];

    const games = await db.orm.public.Game.select('id', 'title', 'cover')
      .where((g) => g.id.in(top.map((t) => t.gameId)))
      .all();
    const gamesById = new Map(games.map((g) => [g.id, g]));

    return top.map((t) => ({
      gameId: t.gameId,
      title: gamesById.get(t.gameId)?.title ?? 'Unknown game',
      cover: gamesById.get(t.gameId)?.cover ?? null,
      playCount: t.playCount,
      totalPlaytimeSeconds: t.totalPlaytimeSeconds ?? 0,
    }));
  }

  async getGameStats(gameId: string): Promise<GameStats> {
    const game = await db.orm.public.Game.select('id', 'title', 'rating').first({ id: gameId });
    if (!game) {
      throw new NotFoundException(`Game with id "${gameId}" not found`);
    }

    const [{ totalPlays }, { totalPlaytimeSeconds }, uniquePlayerGroups] = await Promise.all([
      db.orm.public.SaveGame.where({ gameId }).aggregate((a) => ({ totalPlays: a.count() })),
      db.orm.public.SaveGame.where({ gameId }).aggregate((a) => ({ totalPlaytimeSeconds: a.sum('playTime') })),
      db.orm.public.SaveGame.where({ gameId }).groupBy('userId').aggregate((a) => ({ count: a.count() })),
    ]);

    return {
      gameId: game.id,
      title: game.title,
      totalPlays,
      totalPlaytimeSeconds: totalPlaytimeSeconds ?? 0,
      uniquePlayers: uniquePlayerGroups.length,
      averageRating: game.rating,
    };
  }
}
