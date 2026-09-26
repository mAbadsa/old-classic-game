"use client";

import { useEffect, useState } from "react";
import { fetchCurrentUser, getAccessToken, type AuthUser } from "@/lib/auth";

export interface UseCurrentUserResult {
  /** null once resolved with no valid session — check isLoading to tell that apart from "not checked yet". */
  user: AuthUser | null;
  isLoading: boolean;
}

/**
 * Reports the current session without gating anything — unlike
 * useRequireAuth, it never redirects. For UI that should merely adapt to
 * auth state (e.g. the navbar showing/hiding itself); actual route
 * protection still belongs to useRequireAuth.
 */
export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      const currentUser = await fetchCurrentUser(token);
      if (cancelled) return;
      setUser(currentUser);
      setIsLoading(false);
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, isLoading };
}
