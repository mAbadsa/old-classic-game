"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { adminApi, type AdminGame, type Paginated } from "@/lib/admin";

const LIMIT = 20;

export default function AdminGamesPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<AdminGame> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .listGames(page, LIMIT)
      .then(setResult)
      .catch((err: Error) => setError(err.message));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(game: AdminGame) {
    if (!window.confirm(`Delete "${game.title}" and all its save states?`)) return;
    try {
      await adminApi.deleteGame(game.id);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="neon-text font-arcade text-lg">GAMES</h1>
        <Link href="/upload" className={buttonVariants()}>
          New game
        </Link>
      </div>

      {error && <p className="text-sm text-neon-pink">{error}</p>}
      {!result && !error && <p className="text-sm text-muted-foreground">Loading games…</p>}

      {result && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm text-slate-200">
              <thead className="border-b-2 border-neon-pink/40 text-xs uppercase text-neon-pink">
                <tr>
                  <th className="p-2">Title</th>
                  <th className="p-2">System</th>
                  <th className="p-2">Rating</th>
                  <th className="p-2">Added</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((game) => (
                  <tr key={game.id} className="border-b border-slate-700/60">
                    <td className="p-2">
                      <Link href={`/admin/games/${game.id}`} className="hover:text-neon-pink">
                        {game.title}
                      </Link>
                    </td>
                    <td className="p-2">{game.emulator}</td>
                    <td className="p-2">{game.rating ?? "—"}</td>
                    <td className="p-2">{new Date(game.createdAt).toLocaleDateString()}</td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/games/${game.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          Edit
                        </Link>
                        <Button variant="destructive" size="sm" onClick={() => remove(game)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {result.data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No games yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {result.meta.page} of {Math.max(result.meta.totalPages, 1)} · {result.meta.total} games
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= result.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
