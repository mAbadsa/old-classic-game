"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { EMULATOR_SYSTEMS, type EmulatorSystemKey } from "@/lib/emulator-systems";
import { getAccessToken } from "@/lib/auth";

/**
 * Public-facing system names for this hook. Mirrors `EmulatorSystemKey` from
 * lib/emulator-systems.ts except for "atari" (that table's key is
 * "atari2600" — kept for symmetry with EmulatorJS's own naming there since
 * it's used directly as an EJS_core-adjacent identifier in more places).
 */
export type EmulatorType = "nes" | "snes" | "genesis" | "atari";

export const TYPE_TO_SYSTEM: Record<EmulatorType, EmulatorSystemKey> = {
  nes: "nes",
  snes: "snes",
  genesis: "genesis",
  atari: "atari2600",
};

/** Validates an untrusted string (e.g. Game.emulator from the API) as an EmulatorType. */
export function isEmulatorType(value: string): value is EmulatorType {
  return value in TYPE_TO_SYSTEM;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const DATA_PATH = process.env.NEXT_PUBLIC_EMULATORJS_DATA_PATH ?? "/emulators/data/";
const ROM_CACHE_PREFIX = "emulatorjs:rom:";
const SAVE_STATE_PREFIX = "emulatorjs:save-state:";
const SAVE_INDEX_PREFIX = "emulatorjs:save-index:";
const DEFAULT_SLOT = 1;

// Every EmulatorJS control-bar button this app knows how to replace with
// custom UI. Buttons not listed here (e.g. cheat, screenRecord) keep
// EmulatorJS's own default when hideDefaultControls is set.
const REPLACEABLE_BUTTONS = [
  "playPause",
  "restart",
  "settings",
  "fullscreen",
  "saveState",
  "loadState",
  "quickSave",
  "quickLoad",
  "gamepad",
  "cacheManager",
  "exitEmulation",
] as const;

export interface SaveSlotInfo {
  slot: number;
  savedAt: string;
}

// Matches GamesService's `Game` shape (apps/backend/src/games/games.service.ts).
// `romPath` is either a fully-qualified URL (S3, or the uploads module's
// LocalStorageProvider — see apps/backend/CLAUDE.md notes on uploads/) or a
// path relative to the backend API, e.g. "/games/<id>/rom" (the seed
// script's convention, pointing at GET /games/:gameId/rom). See the
// romPath resolution below.
interface GameMetadata {
  id: string;
  romPath: string;
}

// Global `EJS_*` / `window.EJS_emulator.gameManager` types (including the
// caveat that gameManager is undocumented/version-fragile) live in
// types/emulatorjs.d.ts — ambient, picked up automatically, no import needed.

export interface UseEmulatorOptions {
  gameId: string;
  type: EmulatorType;
  /** Hide EmulatorJS's own control-bar buttons — set this when rendering a custom control UI over it. */
  hideDefaultControls?: boolean;
}

export interface UseEmulatorResult {
  isLoading: boolean;
  error: string | null;
  emulatorReady: boolean;
  /** Element id to render the emulator into: `<div id={containerId} />`. */
  containerId: string;
  play: () => void;
  pause: () => void;
  /** Persists the current in-game save state to localStorage (slot defaults to 1). Resolves false on failure. */
  saveState: (slot?: number) => Promise<boolean>;
  /** Restores a saved state from localStorage (slot defaults to 1). Resolves false if there's nothing to load or it fails. */
  loadState: (slot?: number) => Promise<boolean>;
  /** Lists slots with a save for this game, most recent first. */
  listSaveSlots: () => SaveSlotInfo[];
  /**
   * Reads the live emulator's current state and a screenshot, base64-encoded
   * (the screenshot as a `data:image/png;base64,...` URL) — for callers that
   * persist saves somewhere other than this hook's own localStorage slots
   * (e.g. POSTing to a backend saves API). Resolves null if the emulator
   * isn't ready.
   */
  captureCurrentState: () => Promise<{ state: string; screenshot: string } | null>;
  /**
   * Loads arbitrary previously-captured state bytes (from captureCurrentState,
   * fetched back from wherever they were persisted) into the live emulator.
   * Independent of this hook's own localStorage slots — pairs with
   * captureCurrentState, not with saveState/loadState's slot numbers.
   */
  loadStateBytes: (stateBase64: string) => boolean;
}

function bytesToBase64(bytes: Uint8Array<ArrayBufferLike>): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Reads a cached ROM (as a Blob) from localStorage, if present and not corrupt. */
function readCachedRom(gameId: string): Blob | null {
  try {
    const cached = window.localStorage.getItem(ROM_CACHE_PREFIX + gameId);
    if (!cached) return null;
    return new Blob([base64ToBytes(cached)]);
  } catch {
    // Corrupt entry or localStorage unavailable (private browsing, etc.) — treat as a cache miss.
    return null;
  }
}

/** Best-effort cache write. Silently skipped on quota errors — caching is an optimization, not a requirement. */
function writeCachedRom(gameId: string, bytes: Uint8Array<ArrayBufferLike>): void {
  try {
    window.localStorage.setItem(ROM_CACHE_PREFIX + gameId, bytesToBase64(bytes));
  } catch {
    // QuotaExceededError or unavailable storage — the emulator still has the bytes in memory, so this is non-fatal.
  }
}

function readSaveIndex(gameId: string): Record<number, string> {
  try {
    const raw = window.localStorage.getItem(SAVE_INDEX_PREFIX + gameId);
    return raw ? (JSON.parse(raw) as Record<number, string>) : {};
  } catch {
    return {};
  }
}

function writeSaveIndex(gameId: string, index: Record<number, string>): void {
  try {
    window.localStorage.setItem(SAVE_INDEX_PREFIX + gameId, JSON.stringify(index));
  } catch {
    // Non-fatal — worst case the slot menu misses an entry until the next successful save.
  }
}

export function useEmulator({
  gameId,
  type,
  hideDefaultControls,
}: UseEmulatorOptions): UseEmulatorResult {
  const containerId = `emulator-${useId().replace(/:/g, "")}`;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emulatorReady, setEmulatorReady] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const scriptRef: { current: HTMLScriptElement | null } = { current: null };

    async function loadRom(): Promise<Blob> {
      const cached = readCachedRom(gameId);
      if (cached) return cached;

      const metaRes = await fetch(`${API_URL}/games/${gameId}`, {
        signal: controller.signal,
      });
      if (!metaRes.ok) {
        throw new Error(`Failed to load game metadata (HTTP ${metaRes.status})`);
      }
      const game = (await metaRes.json()) as GameMetadata;
      if (!game.romPath) {
        throw new Error("Game has no ROM file associated with it");
      }

      // romPath may be absolute (S3, the uploads module's LocalStorageProvider)
      // or a path relative to the backend API (the seed script's convention).
      // A bare "/games/:id/rom" must NOT be fetched as-is: `fetch()` would
      // resolve it against this page's own origin (the frontend), not the
      // backend's — there is no such route on the frontend's port.
      const romUrl = /^https?:\/\//.test(game.romPath) ? game.romPath : `${API_URL}${game.romPath}`;

      // Bearer token included unconditionally: harmless against a public/static
      // romPath (an unrecognized header is just ignored), but required now that
      // romPath can point at the backend's authenticated GET /games/:id/rom.
      const token = getAccessToken();
      const romRes = await fetch(romUrl, {
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!romRes.ok) {
        throw new Error(`Failed to download ROM (HTTP ${romRes.status})`);
      }
      const buffer = await romRes.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      writeCachedRom(gameId, bytes);
      return new Blob([bytes]);
    }

    // Reset + kick off the async load from inside a callback (rather than
    // synchronously in the effect body) per the react-hooks/set-state-in-effect
    // rule — see https://react.dev/learn/you-might-not-need-an-effect.
    async function run() {
      setIsLoading(true);
      setError(null);
      setEmulatorReady(false);

      try {
        const romBlob = await loadRom();
        if (cancelled) return;

        const objectUrl = URL.createObjectURL(romBlob);
        objectUrlRef.current = objectUrl;

        window.EJS_ready = () => {
          if (cancelled) return;
          setEmulatorReady(true);
          setIsLoading(false);
        };
        window.EJS_player = `#${containerId}`;
        window.EJS_core = EMULATOR_SYSTEMS[TYPE_TO_SYSTEM[type]].core;
        window.EJS_gameUrl = objectUrl;
        window.EJS_pathtodata = DATA_PATH;
        window.EJS_gameID = gameId;
        window.EJS_startOnLoaded = true;
        if (hideDefaultControls) {
          window.EJS_Buttons = Object.fromEntries(
            REPLACEABLE_BUTTONS.map((name) => [name, false]),
          );
        }

        const script = document.createElement("script");
        script.src = `${DATA_PATH}loader.js`;
        script.async = true;
        script.onerror = () => {
          if (cancelled) return;
          setError("Failed to load the EmulatorJS runtime");
          setIsLoading(false);
        };
        document.body.appendChild(script);
        scriptRef.current = script;
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        setError(err instanceof Error ? err.message : "Failed to load the ROM");
        setIsLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
      controller.abort();
      scriptRef.current?.remove();
      document.getElementById(containerId)?.replaceChildren();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      delete window.EJS_ready;
      delete window.EJS_player;
      delete window.EJS_core;
      delete window.EJS_gameUrl;
      delete window.EJS_pathtodata;
      delete window.EJS_gameID;
      delete window.EJS_startOnLoaded;
      delete window.EJS_Buttons;
      delete window.EJS_emulator;
    };
  }, [containerId, gameId, type, hideDefaultControls]);

  const play = useCallback(() => {
    window.EJS_emulator?.gameManager?.toggleMainLoop(true);
  }, []);

  const pause = useCallback(() => {
    window.EJS_emulator?.gameManager?.toggleMainLoop(false);
  }, []);

  const saveState = useCallback(
    async (slot: number = DEFAULT_SLOT): Promise<boolean> => {
      try {
        const gameManager = window.EJS_emulator?.gameManager;
        if (!gameManager) return false;
        const state = gameManager.getState();
        window.localStorage.setItem(`${SAVE_STATE_PREFIX}${gameId}:${slot}`, bytesToBase64(state));
        const index = readSaveIndex(gameId);
        index[slot] = new Date().toISOString();
        writeSaveIndex(gameId, index);
        return true;
      } catch {
        return false;
      }
    },
    [gameId],
  );

  const loadState = useCallback(
    async (slot: number = DEFAULT_SLOT): Promise<boolean> => {
      try {
        const gameManager = window.EJS_emulator?.gameManager;
        if (!gameManager) return false;
        const saved = window.localStorage.getItem(`${SAVE_STATE_PREFIX}${gameId}:${slot}`);
        if (!saved) return false;
        gameManager.loadState(base64ToBytes(saved));
        return true;
      } catch {
        return false;
      }
    },
    [gameId],
  );

  const listSaveSlots = useCallback((): SaveSlotInfo[] => {
    const index = readSaveIndex(gameId);
    return Object.entries(index)
      .map(([slot, savedAt]) => ({ slot: Number(slot), savedAt }))
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }, [gameId]);

  const captureCurrentState = useCallback(async (): Promise<{
    state: string;
    screenshot: string;
  } | null> => {
    try {
      const gameManager = window.EJS_emulator?.gameManager;
      if (!gameManager) return null;
      const stateBytes = gameManager.getState();
      const screenshotBytes = await gameManager.screenshot();
      return {
        state: bytesToBase64(stateBytes),
        screenshot: `data:image/png;base64,${bytesToBase64(screenshotBytes)}`,
      };
    } catch {
      return null;
    }
  }, []);

  const loadStateBytes = useCallback((stateBase64: string): boolean => {
    try {
      const gameManager = window.EJS_emulator?.gameManager;
      if (!gameManager) return false;
      gameManager.loadState(base64ToBytes(stateBase64));
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    isLoading,
    error,
    emulatorReady,
    containerId,
    play,
    pause,
    saveState,
    loadState,
    listSaveSlots,
    captureCurrentState,
    loadStateBytes,
  };
}
