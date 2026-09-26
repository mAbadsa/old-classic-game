"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createSave,
  deleteSave as deleteSaveRequest,
  listSavesForUser,
  type SaveInput,
  type SaveRecord,
} from "@/lib/saves";

export interface UseSavesResult {
  saves: SaveRecord[];
  loading: boolean;
  error: string | null;
  /** POSTs a new save (see SaveInput for the shape) and refreshes the list. Returns the created record, or null on failure. */
  saveGame: (input: SaveInput) => Promise<SaveRecord | null>;
  /** Returns a save's base64 state from the already-loaded list — no extra request, since GET /saves/user/:userId already returns it. Null if saveId isn't found. */
  loadGame: (saveId: string) => string | null;
  /** DELETEs a save and refreshes the list. Returns whether it succeeded. */
  deleteSave: (saveId: string) => Promise<boolean>;
}

/** Manages one user's saves against the backend (GET/POST/DELETE /saves...). */
export function useSaves(userId: string): UseSavesResult {
  const [saves, setSaves] = useState<SaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await listSavesForUser(userId);
      setSaves(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saves");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Wrapped in a nested async callback (rather than calling refresh()
    // directly) per the react-hooks/set-state-in-effect rule — see the same
    // pattern in hooks/useEmulator.ts and components/SaveManager.tsx.
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  const saveGame = useCallback(
    async (input: SaveInput): Promise<SaveRecord | null> => {
      setError(null);
      try {
        const record = await createSave(input);
        await refresh();
        return record;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
        return null;
      }
    },
    [refresh],
  );

  const loadGame = useCallback(
    (saveId: string): string | null => {
      return saves.find((save) => save.id === saveId)?.saveState ?? null;
    },
    [saves],
  );

  const deleteSave = useCallback(
    async (saveId: string): Promise<boolean> => {
      setError(null);
      try {
        await deleteSaveRequest(saveId);
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
        return false;
      }
    },
    [refresh],
  );

  return { saves, loading, error, saveGame, loadGame, deleteSave };
}
