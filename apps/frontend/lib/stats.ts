import { getAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Matches StatsService's response shape (apps/backend/src/stats/stats.service.ts).
export interface RecentGame {
  gameId: string;
  title: string;
  cover: string | null;
  /** ISO timestamp of that game's most recently updated save. */
  lastPlayedAt: string;
  /** Seconds, from that game's most recently updated save. */
  playTime: number;
}

export interface UserStats {
  /** Total games in the catalog (GamesService's GET /games meta.total), not just ones this user has played. */
  totalGames: number;
  /** Distinct games this user has at least one save for. */
  gamesPlayed: number;
  /** Seconds, summed across every save this user has, across all games and slots. */
  totalPlaytime: number;
  /** Up to 5 games, most-recently-played first (deduped by game, not by save slot). */
  recentGames: RecentGame[];
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
  if (typeof body?.message === "string") return body.message;
  if (Array.isArray(body?.message)) return body.message.join(", ");
  return fallback;
}

/** GET /stats/:userId — StatsController checks the caller owns userId (or is admin), same as the /saves/user/:userId pattern. */
export async function getStats(userId: string): Promise<UserStats> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/stats/${userId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, `Failed to load stats (HTTP ${res.status})`));
  }
  return res.json() as Promise<UserStats>;
}
