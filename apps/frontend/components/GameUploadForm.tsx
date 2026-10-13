"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TYPE_TO_SYSTEM } from "@/hooks/useEmulator";
import { getAccessToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Union of the backend's per-system ROM extensions (games/rom-file.util.ts).
// The backend checks the exact extension for the chosen system.
const ROM_ACCEPT = ".nes,.sfc,.md,.bin,.zip,.n64";
const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";

const inputClassName =
  "h-9 border-[2px] border-[#ff2e88] bg-[#0a0e27] px-3 text-sm text-white outline-none placeholder:text-slate-500 focus-visible:border-[#ffff00] focus-visible:ring-2 focus-visible:ring-[#ffff00]/50";

const fileClassName =
  "text-sm text-slate-300 file:mr-3 file:border-[2px] file:border-[#ff2e88] file:bg-[#0a0e27] file:px-3 file:py-1.5 file:text-white";

// Matches the backend's POST /games/upload (apps/backend/src/games/games.controller.ts).
export function GameUploadForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/games/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: new FormData(event.currentTarget),
      });
      const body = (await res.json().catch(() => null)) as { id?: string; message?: unknown } | null;
      if (!res.ok) {
        const message = body?.message;
        if (Array.isArray(message)) throw new Error(message.join(", "));
        throw new Error(typeof message === "string" ? message : `Upload failed (HTTP ${res.status})`);
      }
      router.push(`/emulator/${body?.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="neon-border flex w-full max-w-lg flex-col gap-5 border-[3px] bg-[#1a1f3a] p-6 shadow-neon-pink"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-neon-pink">
          Title
        </label>
        <input id="title" name="title" required maxLength={200} className={inputClassName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="emulator" className="text-sm font-medium text-neon-pink">
          System
        </label>
        <select id="emulator" name="emulator" required defaultValue="nes" className={inputClassName}>
          {Object.keys(TYPE_TO_SYSTEM).map((type) => (
            <option key={type} value={type} className="bg-[#0a0e27]">
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-neon-pink">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={2000}
          className="border-[2px] border-[#ff2e88] bg-[#0a0e27] px-3 py-2 text-sm text-white outline-none focus-visible:border-[#ffff00]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rom" className="text-sm font-medium text-neon-pink">
          ROM file ({ROM_ACCEPT})
        </label>
        <input id="rom" name="rom" type="file" required accept={ROM_ACCEPT} className={fileClassName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cover" className="text-sm font-medium text-neon-pink">
          Cover image (PNG, JPEG or WebP, max 5 MB)
        </label>
        <input id="cover" name="cover" type="file" required accept={IMAGE_ACCEPT} className={fileClassName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="thumbnail" className="text-sm font-medium text-neon-pink">
          Thumbnail (PNG, JPEG or WebP, max 5 MB)
        </label>
        <input
          id="thumbnail"
          name="thumbnail"
          type="file"
          required
          accept={IMAGE_ACCEPT}
          className={fileClassName}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PrimaryButton type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Uploading…" : "Upload game"}
      </PrimaryButton>
    </form>
  );
}
