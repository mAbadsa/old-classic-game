"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminApi, type AnalyticsOverview, type TopGame } from "@/lib/admin";

function formatHours(seconds: number): string {
  return `${Math.round(seconds / 3600)} h`;
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [topGames, setTopGames] = useState<TopGame[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([adminApi.overview(), adminApi.topGames(5)])
      .then(([o, t]) => {
        setOverview(o);
        setTopGames(t);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-neon-pink">{error}</p>;
  if (!overview) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;

  const stats = [
    { label: "Users", value: overview.totalUsers },
    { label: "New users (7d)", value: overview.newUsersLast7Days },
    { label: "Games", value: overview.totalGames },
    { label: "Save states", value: overview.totalSaves },
    { label: "Total playtime", value: formatHours(overview.totalPlaytimeSeconds) },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="neon-text font-arcade text-lg">DASHBOARD</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="neon-border flex flex-col gap-2 border-[3px] bg-[#1a1f3a] p-4">
            <span className="text-xs uppercase text-neon-pink">{s.label}</span>
            <span className="font-arcade text-base text-slate-100">{s.value}</span>
          </div>
        ))}
      </div>

      <section className="neon-border flex flex-col gap-3 border-[3px] bg-[#1a1f3a] p-4">
        <h2 className="font-arcade text-xs text-neon-yellow">TOP GAMES</h2>
        {topGames.length === 0 ? (
          <p className="text-sm text-muted-foreground">No play data yet.</p>
        ) : (
          <ol className="flex flex-col gap-2 text-sm text-slate-200">
            {topGames.map((g) => (
              <li key={g.gameId} className="flex justify-between gap-4">
                <Link href={`/admin/games/${g.gameId}`} className="truncate hover:text-neon-pink">
                  {g.title}
                </Link>
                <span className="shrink-0 text-muted-foreground">{g.playCount} plays</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
