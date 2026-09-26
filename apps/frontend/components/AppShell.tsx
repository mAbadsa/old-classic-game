"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface AppShellProps {
  children: React.ReactNode;
}

// Kept in sync by hand with proxy.ts's PUBLIC_AUTH_PATHS — that file can't be
// imported here (it pulls in next/server, which isn't valid in client code).
const AUTH_PATHS = ["/auth/login", "/auth/signup"];

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Global page shell rendered once from the root layout: shows the Navbar on
 * every route once a session is confirmed, except /auth/* (a still-logged-in
 * visitor landing back on the login/signup form shouldn't also see a "Log
 * out" bar over it) and while the check is still pending, so it never
 * flashes for a logged-out visitor. Wraps page content in the app's single
 * scrollable <main> region. Doesn't gate anything itself — route protection
 * is still each page's own useRequireAuth() call.
 */
export function AppShell({ children }: AppShellProps) {
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const showNavbar = user && !isAuthPath(pathname);

  return (
    <>
      {showNavbar && <Navbar user={user} />}
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
    </>
  );
}
