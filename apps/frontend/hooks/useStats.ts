"use client";

import { useEffect, useState } from "react";
import { getStats, type RecentGame, type UserStats } from "@/lib/stats";

export interface UseStatsResult {
  totalGames: number;
  gamesPlayed: number;
  totalPlaytime: number;
  recentGames: RecentGame[];
  loading: boolean;
  error: string | null;
}

const EMPTY_STATS: UserStats = {
  totalGames: 0,
  gamesPlayed: 0,
  totalPlaytime: 0,
  recentGames: [],
};

/**
 * Fetches the given user's stats from GET /stats/:userId (games in the
 * library, games played, total playtime, and the last 5 recently played
 * games). Pass "" while the caller's own id isn't known yet (e.g. auth still
 * resolving) — the fetch is skipped and loading stays true until a real id
 * comes through.
 */
export function useStats(userId: string): UseStatsResult {
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getStats(userId);
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { ...stats, loading, error };
}
