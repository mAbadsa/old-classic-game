"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clock,
  Gamepad2,
  ListOrdered,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Zap,
  ZapOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SaveManager } from "@/components/SaveManager";
import { cn } from "@/lib/utils";
import { TYPE_TO_SYSTEM, useEmulator, type EmulatorType } from "@/hooks/useEmulator";
import { EMULATOR_SYSTEMS } from "@/lib/emulator-systems";
import { createSave, formatPlaytime, listSavesForGame, updateSave } from "@/lib/saves";

const QUICK_SAVE_SLOT = 1;

// Native <button>s, not the shared <Button>: Button's base classes include
// `active:translate-y-px` unconditionally, which would fight .pixel-button's
// own press-down transform on these controls (see PrimaryButton.tsx for the
// same reasoning).
const PIXEL_YELLOW =
  "pixel-button [--pixel-shadow-color:#000000] inline-flex items-center justify-center gap-1.5 border-[3px] border-[#ffff00] bg-[#ffff00] px-3 py-1.5 font-arcade text-[10px] font-bold text-black transition-transform hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 disabled:pointer-events-none disabled:opacity-50";
const PIXEL_PINK =
  "pixel-button [--pixel-shadow-color:#000000] inline-flex items-center justify-center gap-1.5 border-[3px] border-[#ff2e88] bg-[#1a1f3a] px-3 py-1.5 font-arcade text-[10px] font-bold text-neon-pink transition-transform hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 disabled:pointer-events-none disabled:opacity-50";

export interface EmulatorUIProps {
  gameId: string;
  type: EmulatorType;
  title: string;
  /** Sizes this component — e.g. "h-dvh" for a full-page player. Defaults to filling its parent. */
  className?: string;
}

export function EmulatorUI({ gameId, type, title, className }: EmulatorUIProps) {
  const {
    isLoading,
    error,
    emulatorReady,
    containerId,
    play,
    pause,
    captureCurrentState,
    loadStateBytes,
  } = useEmulator({ gameId, type, hideDefaultControls: true });

  const screenRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [savesOpen, setSavesOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playTimeSeconds, setPlayTimeSeconds] = useState(0);
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [quickActionError, setQuickActionError] = useState<string | null>(null);
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [isQuickLoading, setIsQuickLoading] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void screenRef.current?.requestFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === screenRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // "F" toggles fullscreen. EmulatorJS's default gameplay keys (arrow keys
  // for the d-pad, Z/X/A/S for face buttons — see EJS_defaultControls in
  // emulatorjs.org/docs/options) are handled internally by EmulatorJS itself
  // and are untouched here, so this can't shadow an actual game control.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "f") return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      toggleFullscreen();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleFullscreen]);

  // Counts up while the emulator is ready and not paused. Resets to 0 on
  // remount rather than persisting across sessions — it's "time played this
  // session," recorded into a save's playTime on Save Game / Quick Save.
  useEffect(() => {
    if (!emulatorReady || !isPlaying) return;
    const interval = setInterval(() => setPlayTimeSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [emulatorReady, isPlaying]);

  const handlePlay = useCallback(() => {
    play();
    setIsPlaying(true);
  }, [play]);

  const handlePause = useCallback(() => {
    pause();
    setIsPlaying(false);
  }, [pause]);

  const handleCaptureForSaveManager = useCallback(async () => {
    const captured = await captureCurrentState();
    return captured ? { ...captured, playTime: playTimeSeconds } : null;
  }, [captureCurrentState, playTimeSeconds]);

  const handleSaveManagerLoad = useCallback(
    (stateBase64: string) => {
      loadStateBytes(stateBase64);
    },
    [loadStateBytes],
  );

  const handleQuickSave = useCallback(async () => {
    setQuickActionError(null);
    setIsQuickSaving(true);
    try {
      const captured = await captureCurrentState();
      if (!captured) throw new Error("Emulator isn't ready to save yet");

      const existingSaves = await listSavesForGame(gameId);
      const existingSlot = existingSaves.find((s) => s.slotNumber === QUICK_SAVE_SLOT);
      if (existingSlot) {
        await updateSave(existingSlot.id, {
          saveState: captured.state,
          screenshot: captured.screenshot,
          playTime: playTimeSeconds,
        });
      } else {
        await createSave({
          gameId,
          slotNumber: QUICK_SAVE_SLOT,
          saveState: captured.state,
          screenshot: captured.screenshot,
          playTime: playTimeSeconds,
        });
      }
    } catch (err) {
      setQuickActionError(err instanceof Error ? err.message : "Quick save failed");
    } finally {
      setIsQuickSaving(false);
    }
  }, [gameId, captureCurrentState, playTimeSeconds]);

  const handleQuickLoad = useCallback(async () => {
    setQuickActionError(null);
    setIsQuickLoading(true);
    try {
      const existingSaves = await listSavesForGame(gameId);
      const slot = existingSaves.find((s) => s.slotNumber === QUICK_SAVE_SLOT);
      if (!slot) throw new Error(`No save in slot ${QUICK_SAVE_SLOT} yet`);
      loadStateBytes(slot.saveState);
      setCurrentSlot(QUICK_SAVE_SLOT);
    } catch (err) {
      setQuickActionError(err instanceof Error ? err.message : "Quick load failed");
    } finally {
      setIsQuickLoading(false);
    }
  }, [gameId, loadStateBytes]);

  const systemLabel = EMULATOR_SYSTEMS[TYPE_TO_SYSTEM[type]].label;

  return (
    <div className={cn("dark-grid-bg flex h-full min-h-0 w-full flex-col", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-neon-pink p-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="neon-text truncate text-lg sm:text-2xl">{title}</h1>
          <Badge variant="secondary" className="bg-neon-pink text-neon-yellow">
            {systemLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="neon-text flex items-center gap-1.5 text-xs">
            <Clock className="size-3.5" />
            {formatPlaytime(playTimeSeconds)}
          </span>
          <p className="hidden items-center gap-1.5 text-xs text-slate-300 sm:flex">
            <Gamepad2 className="size-3.5" />
            Arrows to move &middot; Z / X to act &middot; controller supported
          </p>
        </div>
      </header>

      <div
        ref={screenRef}
        className="relative min-h-0 flex-1 border-[3px] border-[#06b6d4] bg-black shadow-[0_0_4px_#06b6d4,0_0_14px_#06b6d4,0_0_32px_rgba(6,182,212,0.5)]"
      >
        <div id={containerId} className="absolute inset-0" />
        {(isLoading || error) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-4 text-center text-sm text-white">
            {error ?? "Loading game…"}
          </div>
        )}
      </div>

      {quickActionError && (
        <p className="border-t border-[#334155] bg-destructive/10 px-3 py-1.5 text-center text-sm text-destructive">
          {quickActionError}
        </p>
      )}

      <footer className="flex flex-wrap items-center justify-center gap-2 border-t-[3px] border-neon-pink bg-[#0a0e27] p-2 sm:p-3">
        <button type="button" onClick={handlePlay} disabled={!emulatorReady} className={PIXEL_YELLOW}>
          <Play className="size-3.5" /> Play
        </button>
        <button type="button" onClick={handlePause} disabled={!emulatorReady} className={PIXEL_PINK}>
          <Pause className="size-3.5" /> Pause
        </button>
        <button
          type="button"
          onClick={handleQuickSave}
          disabled={!emulatorReady || isQuickSaving}
          className={PIXEL_PINK}
        >
          {isQuickSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
          Quick Save
        </button>
        <button
          type="button"
          onClick={handleQuickLoad}
          disabled={!emulatorReady || isQuickLoading}
          className={PIXEL_PINK}
        >
          {isQuickLoading ? <Loader2 className="size-3.5 animate-spin" /> : <ZapOff className="size-3.5" />}
          Quick Load
        </button>

        <Sheet open={savesOpen} onOpenChange={setSavesOpen}>
          <SheetTrigger
            render={
              <button type="button" disabled={!emulatorReady} className={PIXEL_PINK}>
                <ListOrdered className="size-3.5" /> Saves
              </button>
            }
          />
          <SheetContent className="w-full border-l-[3px] border-neon-pink bg-[#0a0e27] shadow-neon-pink sm:max-w-xl">
            <SheetHeader>
              <SheetTitle className="neon-text font-arcade text-sm">Save slots</SheetTitle>
              <SheetDescription className="text-slate-300">{title}</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">
              <SaveManager
                gameId={gameId}
                onCaptureState={handleCaptureForSaveManager}
                onLoadState={handleSaveManagerLoad}
                currentSlot={currentSlot}
                onSlotLoaded={setCurrentSlot}
              />
            </div>
          </SheetContent>
        </Sheet>

        <button type="button" onClick={toggleFullscreen} className={PIXEL_PINK}>
          {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
          Fullscreen
        </button>
      </footer>
    </div>
  );
}
