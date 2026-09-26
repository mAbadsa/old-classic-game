"use client";

import { GameLibrary } from "@/components/GameLibrary";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function GamesLibraryPage() {
  const { isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Checking your session…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <h1 className="text-xl font-semibold">My Games Library</h1>
      </div>

      <div className="flex-1 p-4">
        <GameLibrary />
      </div>
    </div>
  );
}
