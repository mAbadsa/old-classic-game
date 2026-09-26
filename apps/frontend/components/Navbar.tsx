"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Gamepad2, Home, Library, LogOut, Menu, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { clearAccessToken, type AuthUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const APP_NAME = "RetroPlay";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/games", label: "Games", icon: Library },
  { href: "/profile", label: "Profile", icon: UserIcon },
] as const;

export interface NavbarProps {
  /** null while the session is still being confirmed (see useRequireAuth) — the email slot is just hidden until it resolves. */
  user: AuthUser | null;
}

function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Site-wide top nav: logo, current user's email, Home/Games/Profile links, and Logout — a Sheet-based drawer replaces the link row on mobile. */
export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    clearAccessToken();
    router.replace("/auth/login");
  }

  return (
    <header className="dark-grid-bg sticky top-0 z-20 border-b-[3px] border-neon-pink shadow-neon-pink">
      <div className="mx-auto grid max-w-6xl grid-cols-2 items-center gap-3 px-4 py-3 sm:grid-cols-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="neon-text flex items-center gap-2 font-arcade text-lg whitespace-nowrap sm:text-2xl md:text-3xl"
        >
          <Gamepad2 className="size-6 drop-shadow-[0_0_8px_var(--neon-yellow)] sm:size-8" />
          {APP_NAME}
        </Link>

        {user && (
          <span className="hidden truncate text-center text-sm text-muted-foreground sm:block">
            {user.email}
          </span>
        )}

        <div className="hidden items-center justify-end gap-1 sm:flex">
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-2.5 py-1.5 text-sm font-bold tracking-wide text-neon-pink uppercase transition-all hover:[text-shadow:0_0_6px_var(--neon-pink),0_0_16px_var(--neon-pink)]",
                  isActivePath(pathname, href) &&
                    "[text-shadow:0_0_6px_var(--neon-pink),0_0_16px_var(--neon-pink)]",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Button variant="outline" onClick={handleLogout} className="ml-2">
            <LogOut /> Log out
          </Button>
        </div>

        <div className="flex items-center justify-end gap-1 sm:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="right" className="w-3/4 sm:max-w-xs">
              <SheetHeader>
                <SheetTitle className="neon-text flex items-center gap-2 font-arcade text-lg">
                  <Gamepad2 className="size-6 drop-shadow-[0_0_8px_var(--neon-yellow)]" /> {APP_NAME}
                </SheetTitle>
                {user && <SheetDescription className="truncate">{user.email}</SheetDescription>}
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-bold tracking-wide text-neon-pink uppercase transition-all hover:[text-shadow:0_0_6px_var(--neon-pink),0_0_16px_var(--neon-pink)]",
                      isActivePath(pathname, href) &&
                        "[text-shadow:0_0_6px_var(--neon-pink),0_0_16px_var(--neon-pink)]",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto p-4">
                <Button variant="outline" className="w-full" onClick={handleLogout}>
                  <LogOut /> Log out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
