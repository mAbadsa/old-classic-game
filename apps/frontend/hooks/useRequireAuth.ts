"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAccessToken } from "@/lib/auth";
import { useCurrentUser, type UseCurrentUserResult } from "./useCurrentUser";

export type UseRequireAuthResult = UseCurrentUserResult;

/**
 * Client-side route guard: redirects to /auth/login (preserving the current path
 * to return to) once useCurrentUser resolves with no valid session. Render
 * nothing (or a loading state) while isLoading is true so protected content
 * never flashes before the check resolves.
 */
export function useRequireAuth(): UseRequireAuthResult {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading || user) return;
    clearAccessToken();
    router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
  }, [user, isLoading, router, pathname]);

  return { user, isLoading };
}
