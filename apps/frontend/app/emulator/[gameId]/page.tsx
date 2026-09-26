"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmulatorUI } from "@/components/EmulatorUI";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { isEmulatorType } from "@/hooks/useEmulator";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Matches GamesService's `Game` shape (apps/backend/src/games/games.service.ts).
interface GameDetails {
  id: string;
  title: string;
  emulator: string;
  description: string | null;
  releaseYear: number | null;
  rating: number | null;
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark-grid-bg flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-300">
      {children}
    </div>
  );
}

export default function EmulatorGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { isLoading: authLoading } = useRequireAuth();

  const [game, setGame] = useState<GameDetails | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [isLoadingGame, setIsLoadingGame] = useState(true);

  useEffect(() => {
    // Wait for the auth check first — GET /games/:id itself needs no token
    // (it's a public endpoint), but a protected page shouldn't start doing
    // its own work before the session is confirmed.
    if (authLoading) return;

    let cancelled = false;

    async function loadGame() {
      setIsLoadingGame(true);
      setGameError(null);
      try {
        const res = await fetch(`${API_URL}/games/${gameId}`);
        if (!res.ok) {
          throw new Error(res.status === 404 ? "Game not found" : `Failed to load game (HTTP ${res.status})`);
        }
        const data = (await res.json()) as GameDetails;
        if (!cancelled) setGame(data);
      } catch (err) {
        if (!cancelled) setGameError(err instanceof Error ? err.message : "Failed to load game");
      } finally {
        if (!cancelled) setIsLoadingGame(false);
      }
    }

    void loadGame();
    return () => {
      cancelled = true;
    };
  }, [authLoading, gameId]);

  if (authLoading) {
    return <CenteredMessage>Checking your session…</CenteredMessage>;
  }

  return (
    // h-full, not h-dvh: this page now renders inside the root layout's
    // scrollable <main> alongside the global Navbar (see components/AppShell.tsx)
    // rather than owning the whole viewport — h-dvh here would add a second
    // viewport's worth of height on top of the navbar instead of filling
    // exactly what's left under it.
    <div className="dark-grid-bg flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-neon-pink p-3">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="text-neon-pink hover:bg-[#1a1f3a] hover:text-neon-pink"
        >
          <ArrowLeft /> Back to Library
        </Button>
        {game && (
          <div className="flex flex-wrap items-center gap-1.5">
            {game.releaseYear && (
              <Badge variant="secondary" className="neon-text bg-[#1a1f3a]">
                {game.releaseYear}
              </Badge>
            )}
            {typeof game.rating === "number" && game.rating > 0 && (
              <Badge variant="secondary" className="neon-text bg-[#1a1f3a]">
                ★ {game.rating.toFixed(1)}
              </Badge>
            )}
          </div>
        )}
      </div>
      {game?.description && (
        <p className="truncate border-b border-[#334155] px-3 py-2 text-sm text-slate-300">{game.description}</p>
      )}

      <div className="min-h-0 flex-1">
        {isLoadingGame && <CenteredMessage>Loading game…</CenteredMessage>}
        {!isLoadingGame && gameError && <CenteredMessage>{gameError}</CenteredMessage>}
        {!isLoadingGame &&
          !gameError &&
          game &&
          (isEmulatorType(game.emulator) ? (
            // EmulatorUI shows its own loading state while the emulator itself initializes.
            <EmulatorUI gameId={game.id} type={game.emulator} title={game.title} className="h-full" />
          ) : (
            <CenteredMessage>Unsupported emulator type: &quot;{game.emulator}&quot;</CenteredMessage>
          ))}
      </div>
    </div>
  );
}
