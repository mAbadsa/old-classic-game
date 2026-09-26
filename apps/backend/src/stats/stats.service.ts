import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

export interface RecentGame {
  gameId: string;
  title: string;
  cover: string | null;
  lastPlayedAt: string;
  playTime: number;
}

export interface UserStats {
  totalGames: number;
  gamesPlayed: number;
  totalPlaytime: number;
  recentGames: RecentGame[];
}

const RECENT_GAMES_LIMIT = 5;
// SaveGame.slotNumber is capped at 5 (enforced at the application layer, see
// saves.controller.ts), so 100 rows comfortably covers 20 distinct games'
// worth of slots — plenty to find RECENT_GAMES_LIMIT distinct games in,
// without pulling a user's entire save history just to read the top 5.
const RECENT_SAVES_SCAN_LIMIT = 100;

@Injectable()
export class StatsService {
  async getStats(userId: string): Promise<UserStats> {
    const [{ totalGames }, playedGameGroups, { totalPlaytime }, recentSaves] = await Promise.all([
      db.orm.public.Game.aggregate((a) => ({ totalGames: a.count() })),
      // Count of distinct games this user has a save for — a plain count()
      // would count save rows (one per slot), not distinct games, so this
      // groups by gameId first and counts the groups instead.
      db.orm.public.SaveGame.where({ userId })
        .groupBy('gameId')
        .aggregate((a) => ({ count: a.count() })),
      db.orm.public.SaveGame.where({ userId }).aggregate((a) => ({ totalPlaytime: a.sum('playTime') })),
      db.orm.public.SaveGame.where({ userId })
        .orderBy((s) => s.updatedAt.desc())
        .include('game', (g) => g.select('title', 'cover'))
        .limit(RECENT_SAVES_SCAN_LIMIT)
        .all(),
    ]);

    // recentSaves is already most-recently-updated-first; keep only each
    // game's most recent save (a game can have up to 5, one per slot).
    const seenGameIds = new Set<string>();
    const recentGames: RecentGame[] = [];
    for (const save of recentSaves) {
      if (seenGameIds.has(save.gameId)) continue;
      seenGameIds.add(save.gameId);
      recentGames.push({
        gameId: save.gameId,
        title: save.game.title,
        cover: save.game.cover,
        lastPlayedAt: save.updatedAt,
        playTime: save.playTime,
      });
      if (recentGames.length >= RECENT_GAMES_LIMIT) break;
    }

    return {
      totalGames,
      gamesPlayed: playedGameGroups.length,
      totalPlaytime: totalPlaytime ?? 0,
      recentGames,
    };
  }
}
