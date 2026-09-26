import Link from "next/link";
import { Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Matches (a subset of) GamesService's `Game` shape
// (apps/backend/src/games/games.service.ts).
export interface GameCardProps {
  game: {
    id: string;
    title: string;
    emulator: string;
    cover?: string | null;
    releaseYear?: number | null;
    rating?: number | null;
  };
  className?: string;
}

export function GameCard({ game, className }: GameCardProps) {
  return (
    <Link
      href={`/emulator/${game.id}`}
      aria-label={`Play ${game.title}`}
      className={cn(
        "neon-border group flex flex-col overflow-hidden border-[3px] bg-[#1a1f3a] text-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-[0_0_6px_var(--neon-pink),0_0_18px_var(--neon-pink),0_0_36px_color-mix(in_oklch,var(--neon-pink),transparent_40%)] focus-visible:-translate-y-0.5 focus-visible:outline-none",
        className,
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black/40">
        {game.cover ? (
          // Covers come from arbitrary, unconfigured external hosts (S3 or
          // otherwise per Game.cover) — next/image requires allow-listing
          // remote hostnames ahead of time, which doesn't fit that.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.cover}
            alt=""
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No cover</div>
        )}
        <Badge variant="secondary" className="absolute top-2 left-2 bg-neon-pink text-neon-yellow">
          {game.emulator}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="neon-text line-clamp-2 text-xs">{game.title}</h3>
          {typeof game.rating === "number" && game.rating > 0 && (
            <span className="neon-text shrink-0 text-xs">★ {game.rating.toFixed(1)}</span>
          )}
        </div>
        {game.releaseYear && <p className="text-xs text-slate-400">{game.releaseYear}</p>}

        {/*
          Rendered as a span, not a <button>: the whole card above is already
          a single clickable <Link>, and nesting a real interactive button
          inside an anchor is invalid HTML (and would double up on click /
          keyboard activation). Styled as a pixel-arcade CTA (matches
          PrimaryButton.tsx) and triggers the same navigation as the card
          itself, satisfying "a Play button that triggers navigation" without
          a second, separate click target.
        */}
        <span
          className="pixel-button [--pixel-shadow-color:#000000] mt-auto inline-flex w-full items-center justify-center gap-1.5 border-[3px] border-[#ffff00] bg-[#ffff00] px-3 py-1.5 font-arcade text-[10px] font-bold text-black transition-transform group-hover:scale-105"
          aria-hidden="true"
        >
          <Play className="size-3.5" /> Play
        </span>
      </div>
    </Link>
  );
}
