"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { adminApi, type AdminGame, type GameStats } from "@/lib/admin";

const fieldClass = "w-full border-2 border-neon-pink/40 bg-[#0f1430] px-3 py-2 text-slate-100 outline-none focus:border-neon-pink";
const labelClass = "flex flex-col gap-1 text-xs uppercase text-neon-pink";

export default function AdminGameEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<AdminGame | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([adminApi.getGame(id), adminApi.getGameStats(id)])
      .then(([g, s]) => {
        setGame(g);
        setStats(s);
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const year = String(form.get("releaseYear") ?? "");
    const rating = String(form.get("rating") ?? "");
    setBusy(true);
    setError(null);
    try {
      const updated = await adminApi.updateGame(id, {
        title: String(form.get("title") ?? ""),
        emulator: String(form.get("emulator") ?? ""),
        description: String(form.get("description") ?? ""),
        releaseYear: year ? Number(year) : undefined,
        rating: rating ? Number(rating) : undefined,
      });
      setGame(updated);
      setMessage("Saved.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(kind: "cover" | "thumbnail", file: File | undefined) {
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      setGame(await adminApi.uploadImage(id, kind, file));
      setMessage(`${kind === "cover" ? "Cover" : "Thumbnail"} updated.`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove() {
    if (!game || !window.confirm(`Delete "${game.title}" and all its save states?`)) return;
    try {
      await adminApi.deleteGame(id);
      router.replace("/admin/games");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (error && !game) return <p className="text-sm text-neon-pink">{error}</p>;
  if (!game || !stats) return <p className="text-sm text-muted-foreground">Loading game…</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <section className="flex flex-col gap-6">
        <h1 className="neon-text font-arcade text-base">EDIT GAME</h1>

        <div className="grid grid-cols-2 gap-4">
          <ImageSlot label="Cover" url={game.cover} onPick={(f) => uploadImage("cover", f)} />
          <ImageSlot label="Thumbnail" url={game.thumbnail} onPick={(f) => uploadImage("thumbnail", f)} />
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-sm text-slate-200">
          <Stat label="Plays" value={stats.totalPlays} />
          <Stat label="Players" value={stats.uniquePlayers} />
          <Stat label="Hours" value={Math.round(stats.totalPlaytimeSeconds / 3600)} />
        </div>
      </section>

      <form onSubmit={save} className="neon-border flex flex-col gap-4 border-[3px] bg-[#1a1f3a] p-6">
        <label className={labelClass}>
          Title
          <input name="title" required maxLength={200} defaultValue={game.title} className={fieldClass} />
        </label>
        <label className={labelClass}>
          System
          <input name="emulator" required maxLength={50} defaultValue={game.emulator} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Description
          <textarea name="description" rows={4} defaultValue={game.description ?? ""} className={fieldClass} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className={labelClass}>
            Release year
            <input name="releaseYear" type="number" min={1970} max={2100} defaultValue={game.releaseYear ?? ""} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Rating (0–10)
            <input name="rating" type="number" min={0} max={10} step="0.1" defaultValue={game.rating ?? ""} className={fieldClass} />
          </label>
        </div>

        {error && <p className="text-sm text-neon-pink">{error}</p>}
        {message && <p className="text-sm text-neon-yellow">{message}</p>}

        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <Link href="/admin/games" className={buttonVariants({ variant: "outline" })}>
            Back to games
          </Link>
          <div className="flex gap-3">
            <Button type="button" variant="destructive" onClick={remove}>
              Delete game
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ImageSlot({ label, url, onPick }: { label: string; url: string | null; onPick: (file: File | undefined) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase text-neon-pink">{label}</span>
      <div className="flex aspect-[4/3] items-center justify-center border-2 border-dashed border-neon-pink/40 bg-[#0f1430]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage returns full URLs, not Next image paths
          <img src={url} alt={label} className="size-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">No image</span>
        )}
      </div>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => onPick(e.target.files?.[0])}
        className="text-xs text-slate-300 file:mr-3 file:border-2 file:border-neon-pink/40 file:bg-[#0f1430] file:px-2 file:py-1 file:text-slate-100"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="neon-border border-[2px] bg-[#1a1f3a] p-3">
      <div className="text-[10px] uppercase text-neon-pink">{label}</div>
      <div className="font-arcade text-sm">{value}</div>
    </div>
  );
}
