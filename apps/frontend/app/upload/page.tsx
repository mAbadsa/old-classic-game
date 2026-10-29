"use client";

import { GameUploadForm } from "@/components/GameUploadForm";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function UploadPage() {
  const { user, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Checking your session…
      </div>
    );
  }

  if (!user) return null;

  if (user.role !== "admin") {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-300">
        Only admins can upload games.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-4 sm:p-8">
      <h1 className="neon-text font-arcade text-lg">UPLOAD A GAME</h1>
      <GameUploadForm />
    </div>
  );
}
