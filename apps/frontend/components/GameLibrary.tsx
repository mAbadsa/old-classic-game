"use client";

import { useEffect, useState } from "react";
import { GameCard } from "@/components/GameCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Matches (a subset of) GamesService's `Game` shape
// (apps/backend/src/games/games.service.ts).
interface GameListItem {
  id: string;
  title: string;
  emulator: string;
  cover: string | null;
  releaseYear: number | null;
  rating: number | null;
}

interface GamesResponse {
  data: GameListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function GameLibrary() {
  const [games, setGames] = useState<GameListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGames() {
      try {
        // A generous single-page limit (100 is GET /games's max) rather than
        // real pagination — fine for a personal library; add page/limit
        // controls once a catalog can realistically exceed this.
        const res = await fetch(`${API_URL}/games?limit=100`);
        if (!res.ok) {
          throw new Error(`Failed to load games (HTTP ${res.status})`);
        }
        const body = (await res.json()) as GamesResponse;
        if (!cancelled) setGames(body.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load games");
      }
    }

    void loadGames();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="p-8 text-center text-sm text-destructive">{error}</p>;
  }

  if (!games) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Loading games…</p>;
  }

  if (games.length === 0) {
    return <p className="p-8 text-center text-sm text-muted-foreground">No games yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
