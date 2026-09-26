"use client";

import { useEffect, useId, useRef } from "react";
import { EMULATOR_SYSTEMS, type EmulatorSystemKey } from "@/lib/emulator-systems";

// Global `EJS_*` / `window.EJS_emulator` types live in types/emulatorjs.d.ts
// (ambient — picked up automatically, no import needed).

// Self-hosted by default (apps/frontend/public/emulators/data/, populated per
// EMULATORS.md). Point this at "https://cdn.emulatorjs.org/stable/data/" via
// env instead if you don't want to vendor the core files.
const DATA_PATH = process.env.NEXT_PUBLIC_EMULATORJS_DATA_PATH ?? "/emulators/data/";

export interface EmulatorPlayerProps {
  system: EmulatorSystemKey;
  /** URL to the ROM file, e.g. "/emulators/roms/nes/game.nes" */
  romUrl: string;
  /** URL to a BIOS file, for systems/cores that require one. */
  biosUrl?: string;
  gameName?: string;
  /** Enable threaded WASM cores. Requires the COOP/COEP headers on this route (see next.config.ts). */
  threads?: boolean;
  className?: string;
}

export function EmulatorPlayer({
  system,
  romUrl,
  biosUrl,
  gameName,
  threads = false,
  className,
}: EmulatorPlayerProps) {
  const containerId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    window.EJS_player = `#${containerId}`;
    window.EJS_core = EMULATOR_SYSTEMS[system].core;
    window.EJS_gameUrl = romUrl;
    window.EJS_pathtodata = DATA_PATH;
    window.EJS_gameName = gameName;
    // No DB game id in this static-file player — the ROM URL is itself a
    // stable per-game identifier for scoping EmulatorJS's own settings.
    window.EJS_gameID = romUrl;
    window.EJS_biosUrl = biosUrl;
    window.EJS_startOnLoaded = true;
    window.EJS_threads = threads;

    const script = document.createElement("script");
    script.src = `${DATA_PATH}loader.js`;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
      container.replaceChildren();
      delete window.EJS_player;
      delete window.EJS_core;
      delete window.EJS_gameUrl;
      delete window.EJS_pathtodata;
      delete window.EJS_gameName;
      delete window.EJS_gameID;
      delete window.EJS_biosUrl;
      delete window.EJS_startOnLoaded;
      delete window.EJS_threads;
      delete window.EJS_emulator;
    };
  }, [containerId, system, romUrl, biosUrl, gameName, threads]);

  return <div id={containerId} ref={containerRef} className={className} />;
}
