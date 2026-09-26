"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Gamepad2, History, Library, Loader2, PlayCircle, Save, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useStats } from "@/hooks/useStats";
import { formatPlaytime, listSavesForUser, type SaveRecord } from "@/lib/saves";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Same pixel-shadow CTA look as components/PrimaryButton.tsx, inlined here
// because these are real navigation (<Link>), not <button> elements.
const PIXEL_BUTTON =
  "pixel-button [--pixel-shadow-color:#000000] inline-flex w-fit items-center justify-center gap-2 border-[3px] border-[#ffff00] bg-[#ffff00] px-6 py-3 font-arcade text-xs font-bold text-black";
const PIXEL_BUTTON_SM =
  "pixel-button [--pixel-shadow-color:#000000] inline-flex shrink-0 items-center justify-center gap-1.5 border-[3px] border-[#ffff00] bg-[#ffff00] px-3 py-1.5 font-arcade text-[10px] font-bold text-black";

// Matches (a subset of) GamesService's `Game` shape
// (apps/backend/src/games/games.service.ts). Only fetched for the Featured
// Game section and to look up titles/covers for the raw Recent Saves list
// below — the quick-stats numbers themselves come from useStats().
interface GameSummary {
  id: string;
  title: string;
  emulator: string;
  cover: string | null;
  releaseYear: number | null;
  rating: number | null;
}

interface GamesResponse {
  data: GameSummary[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatCard({
  icon: Icon,
  label,
  loading,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="neon-border border-[3px] bg-[#1a1f3a] p-4 shadow-neon-pink flex flex-col gap-2">
      <div className="flex items-center gap-2 text-neon-pink">
        <Icon className="size-4" />
        <span className="text-xs font-bold tracking-wide uppercase">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="size-5 animate-spin text-neon-pink" />
      ) : (
        <div className="neon-text">{children}</div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const stats = useStats(user?.id ?? "");

  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [gamesError, setGamesError] = useState<string | null>(null);

  const [saves, setSaves] = useState<SaveRecord[] | null>(null);
  const [savesError, setSavesError] = useState<string | null>(null);

  // GET /games is public and doesn't need the session, but there's no point
  // starting the fetch while useRequireAuth is about to redirect away. Still
  // needed for the Featured Game section and for titles/covers in the raw
  // Recent Saves list below — useStats() covers the quick-stats numbers.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function loadGames() {
      try {
        // Same "generous single-page limit instead of real pagination" tradeoff
        // as components/GameLibrary.tsx (100 is GET /games's max limit).
        const res = await fetch(`${API_URL}/games?limit=100`);
        if (!res.ok) throw new Error(`Failed to load games (HTTP ${res.status})`);
        const body = (await res.json()) as GamesResponse;
        if (!cancelled) setGames(body.data);
      } catch (err) {
        if (!cancelled) setGamesError(err instanceof Error ? err.message : "Failed to load games");
      }
    }

    void loadGames();
    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  useEffect(() => {
    if (authLoading || !user) return;
    const userId = user.id;
    let cancelled = false;

    async function loadSaves() {
      try {
        const records = await listSavesForUser(userId);
        if (!cancelled) setSaves(records);
      } catch (err) {
        if (!cancelled) setSavesError(err instanceof Error ? err.message : "Failed to load saves");
      }
    }

    void loadSaves();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const gamesById = useMemo(() => new Map((games ?? []).map((g) => [g.id, g] as const)), [games]);

  // stats.recentGames is already most-recently-played-first and deduped by
  // game (see StatsService.getStats) — the first entry is "last played".
  const continuePlaying = stats.recentGames[0] ?? null;

  const featuredGame = useMemo(() => {
    if (!games || games.length === 0) return null;
    return games.reduce((best, g) => ((g.rating ?? 0) > (best.rating ?? 0) ? g : best), games[0]);
  }, [games]);

  if (authLoading || !user) {
    return (
      <div className="dark-grid-bg flex flex-1 items-center justify-center p-8 text-sm text-slate-300">
        Checking your session…
      </div>
    );
  }

  return (
    <div className="dark-grid-bg flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-4 sm:p-6">
        <section>
          <h1 className="neon-text text-lg sm:text-2xl">🎮 WELCOME BACK 🎮</h1>
          <p className="mt-2 text-sm text-slate-300">
            Signed in as <span className="font-bold text-neon-pink">{user.username}</span> ({user.email})
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard icon={Library} label="Games in library" loading={stats.loading}>
            <p className="text-2xl font-bold">{stats.totalGames}</p>
          </StatCard>
          <StatCard icon={Gamepad2} label="Games played" loading={stats.loading}>
            <p className="text-2xl font-bold">{stats.gamesPlayed}</p>
          </StatCard>
          <StatCard icon={Clock} label="Total playtime" loading={stats.loading}>
            <p className="text-2xl font-bold">{formatPlaytime(stats.totalPlaytime)}</p>
          </StatCard>
          <StatCard icon={History} label="Recent games played" loading={stats.loading}>
            {stats.recentGames.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {stats.recentGames.slice(0, 3).map((game) => (
                  <li key={game.gameId} className="truncate text-sm font-medium">
                    {game.title}
                  </li>
                ))}
              </ul>
            )}
          </StatCard>
        </section>

        {(stats.error || gamesError || savesError) && (
          <p className="text-sm text-destructive">{stats.error ?? gamesError ?? savesError}</p>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/games"
            className="neon-border flex flex-col gap-2 bg-[#1a1f3a] p-4 text-neon-pink transition-all hover:-translate-y-0.5 hover:[text-shadow:0_0_6px_var(--neon-pink),0_0_16px_var(--neon-pink)] focus-visible:-translate-y-0.5 focus-visible:outline-none"
          >
            <Library className="size-5" />
            <span className="font-arcade text-sm">Browse Games</span>
            <span className="text-sm text-neon-pink/80">Explore the full library</span>
          </Link>

          <Link
            href={continuePlaying ? `/emulator/${continuePlaying.gameId}` : "/games"}
            className="neon-border flex flex-col gap-2 bg-[#1a1f3a] p-4 text-neon-pink transition-all hover:-translate-y-0.5 hover:[text-shadow:0_0_6px_var(--neon-pink),0_0_16px_var(--neon-pink)] focus-visible:-translate-y-0.5 focus-visible:outline-none"
          >
            <PlayCircle className="size-5" />
            <span className="font-arcade text-sm">Continue Playing</span>
            <span className="truncate text-sm text-neon-pink/80">
              {continuePlaying ? continuePlaying.title : "No games played yet — start one"}
            </span>
          </Link>

          <a
            href="#recent-saves"
            className="neon-border flex flex-col gap-2 bg-[#1a1f3a] p-4 text-neon-pink transition-all hover:-translate-y-0.5 hover:[text-shadow:0_0_6px_var(--neon-pink),0_0_16px_var(--neon-pink)] focus-visible:-translate-y-0.5 focus-visible:outline-none"
          >
            <Save className="size-5" />
            <span className="font-arcade text-sm">My Saves</span>
            <span className="text-sm text-neon-pink/80">
              {saves === null
                ? "Loading…"
                : saves.length === 0
                  ? "No saves yet"
                  : `${saves.length} save${saves.length === 1 ? "" : "s"} across your games`}
            </span>
          </a>
        </section>

        {featuredGame && (
          <section>
            <h2 className="neon-text mb-3 text-sm">Featured Game</h2>
            <div className="neon-border flex flex-col overflow-hidden bg-[#1a1f3a] sm:flex-row">
              <div className="relative aspect-video w-full shrink-0 bg-black/40 sm:aspect-auto sm:w-72">
                {featuredGame.cover ? (
                  // Covers come from arbitrary, unconfigured external hosts — see
                  // the same note in components/GameCard.tsx.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={featuredGame.cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-300">
                    No cover
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-center gap-3 p-5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">{featuredGame.emulator}</Badge>
                  {featuredGame.releaseYear && <Badge variant="secondary">{featuredGame.releaseYear}</Badge>}
                  {typeof featuredGame.rating === "number" && featuredGame.rating > 0 && (
                    <Badge variant="secondary">
                      <Star className="size-3" /> {featuredGame.rating.toFixed(1)}
                    </Badge>
                  )}
                </div>
                <h3 className="neon-text text-base">{featuredGame.title}</h3>
                <div>
                  {/* A styled Link, not <Button render={<Link/>}>: Base UI's Button
                      expects its render target to itself be button-semantic (see
                      the same note on components/GameCard.tsx's Play span) — this
                      is real navigation, not a button triggering client-side logic. */}
                  <Link href={`/emulator/${featuredGame.id}`} className={PIXEL_BUTTON}>
                    <PlayCircle /> Play Now
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        <section id="recent-saves" className="scroll-mt-20">
          <h2 className="neon-text mb-3 text-sm">Recent Saves</h2>
          {saves === null ? (
            <p className="text-sm text-slate-300">Loading saves…</p>
          ) : saves.length === 0 ? (
            <p className="text-sm text-slate-300">
              No saves yet — jump into a game and hit Quick Save to see it here.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {saves.slice(0, 5).map((save) => {
                const game = gamesById.get(save.gameId);
                return (
                  <div
                    key={save.id}
                    className="flex items-center justify-between gap-3 border-[3px] border-[#334155] bg-[#1a1f3a] p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden bg-black/40">
                        {save.screenshot ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={save.screenshot} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Save className="size-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neon-pink">
                          {game?.title ?? "Unknown game"}
                        </p>
                        <p className="text-xs text-slate-400">
                          Slot {save.slotNumber} &middot; {formatPlaytime(save.playTime)} &middot;{" "}
                          {formatDate(save.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <Link href={`/emulator/${save.gameId}`} className={PIXEL_BUTTON_SM}>
                      <PlayCircle className="size-3.5" /> Resume
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
