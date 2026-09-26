"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSave, deleteSave, formatPlaytime, listSavesForGame, updateSave, type SaveRecord } from "@/lib/saves";

const SLOTS = [1, 2, 3, 4, 5] as const;

// Native <button>, not the shared <Button>: see the same note in EmulatorUI.tsx.
const PIXEL_YELLOW =
  "pixel-button [--pixel-shadow-color:#000000] inline-flex items-center justify-center gap-1.5 border-[3px] border-[#ffff00] bg-[#ffff00] px-3 py-1.5 font-arcade text-[10px] font-bold text-black transition-transform hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 disabled:pointer-events-none disabled:opacity-50";
const PIXEL_PINK_SM =
  "pixel-button [--pixel-shadow-color:#000000] inline-flex flex-1 items-center justify-center gap-1.5 border-[3px] border-[#ff2e88] bg-[#0a0e27] px-2 py-1 font-arcade text-[9px] font-bold text-neon-pink transition-transform hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 disabled:pointer-events-none disabled:opacity-50";

export interface SaveManagerProps {
  gameId: string;
  /**
   * Reads the live emulator's current state + a screenshot — e.g.
   * useEmulator()'s captureCurrentState. Resolves null if the emulator
   * isn't ready to save yet. `playTime` is optional purely for callers that
   * don't track it; omitting it just means saves record 0 seconds.
   */
  onCaptureState: () => Promise<{ state: string; screenshot: string; playTime?: number } | null>;
  /** Restores a save's state into the live emulator — e.g. useEmulator()'s loadStateBytes. */
  onLoadState: (stateBase64: string) => void;
  /** Slot most recently loaded into the emulator, if any — highlighted as "Currently loaded." */
  currentSlot?: number | null;
  /** Called after a successful load, so the parent can update `currentSlot`. */
  onSlotLoaded?: (slot: number) => void;
  className?: string;
}

export function SaveManager({
  gameId,
  onCaptureState,
  onLoadState,
  currentSlot = null,
  onSlotLoaded,
  className,
}: SaveManagerProps) {
  const [saves, setSaves] = useState<Map<number, SaveRecord>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [busySlot, setBusySlot] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const records = await listSavesForGame(gameId);
      setSaves(new Map(records.map((record) => [record.slotNumber, record])));
      const firstEmptySlot = SLOTS.find((slot) => !records.some((record) => record.slotNumber === slot));
      if (firstEmptySlot) setSelectedSlot(firstEmptySlot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saves");
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    // Wrapped in a nested async callback (rather than calling refresh()
    // directly) per the react-hooks/set-state-in-effect rule — see the same
    // pattern and rationale in hooks/useEmulator.ts.
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  const handleSaveGame = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const captured = await onCaptureState();
      if (!captured) {
        setError("Emulator isn't ready to save yet");
        return;
      }

      const existing = saves.get(selectedSlot);
      if (existing) {
        await updateSave(existing.id, {
          saveState: captured.state,
          screenshot: captured.screenshot,
          playTime: captured.playTime,
        });
      } else {
        await createSave({
          gameId,
          slotNumber: selectedSlot,
          saveState: captured.state,
          screenshot: captured.screenshot,
          playTime: captured.playTime,
        });
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [gameId, onCaptureState, refresh, saves, selectedSlot]);

  const handleLoad = useCallback(
    (slot: number) => {
      const record = saves.get(slot);
      if (!record) return;
      onLoadState(record.saveState);
      onSlotLoaded?.(slot);
    },
    [saves, onLoadState, onSlotLoaded],
  );

  const handleDelete = useCallback(
    async (slot: number) => {
      const record = saves.get(slot);
      if (!record) return;
      setBusySlot(slot);
      setError(null);
      try {
        await deleteSave(record.id);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setBusySlot(null);
      }
    },
    [saves, refresh],
  );

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="neon-text text-sm">Save slots</h2>
        <button type="button" onClick={handleSaveGame} disabled={isSaving} className={PIXEL_YELLOW}>
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {isSaving ? "Saving…" : `Save Game (Slot ${selectedSlot})`}
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-slate-300">Loading saves…</p>
      ) : (
        // @container, not viewport breakpoints below: this component renders
        // both full-width (a page) and inside a narrow Sheet (EmulatorUI's
        // Saves panel) — sm:/lg: would key off the viewport and misjudge how
        // much room is actually available in the latter case.
        <div className="@container">
          <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @lg:grid-cols-5">
            {SLOTS.map((slot) => {
              const record = saves.get(slot);
              const isBusy = busySlot === slot;

              return (
                <div
                  key={slot}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSlot(slot)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedSlot(slot);
                  }}
                  className={cn(
                    "neon-border flex flex-col gap-2 border-[3px] bg-[#1a1f3a] p-3 text-left transition-all",
                    selectedSlot === slot &&
                      "shadow-[0_0_6px_var(--neon-pink),0_0_18px_var(--neon-pink),0_0_36px_color-mix(in_oklch,var(--neon-pink),transparent_40%)]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-arcade text-xs text-neon-pink">Slot {slot}</span>
                    {currentSlot === slot && (
                      <Badge variant="secondary" className="bg-neon-pink text-neon-yellow">
                        Currently loaded
                      </Badge>
                    )}
                  </div>

                  <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                    {record?.screenshot ? (
                      // Screenshots come from useEmulator's captureCurrentState as data:
                      // URLs, or otherwise arbitrary hosts — no fixed set next/image
                      // could allow-list ahead of time.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={record.screenshot} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        {record ? "No screenshot" : "Empty"}
                      </div>
                    )}
                  </div>

                  {record ? (
                    <div className="neon-text flex flex-col gap-0.5 text-xs">
                      <span>{new Date(record.updatedAt).toLocaleString()}</span>
                      <span>{formatPlaytime(record.playTime)}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No save in this slot</p>
                  )}

                  <div className="mt-auto flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={!record || isBusy}
                      onClick={() => handleLoad(slot)}
                      className={PIXEL_PINK_SM}
                    >
                      <Download className="size-3" /> Load
                    </button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!record || isBusy}
                      onClick={() => handleDelete(slot)}
                    >
                      {isBusy ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
