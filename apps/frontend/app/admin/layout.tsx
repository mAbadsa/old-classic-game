"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/games", label: "Games" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/banner", label: "Banner" },
  { href: "/admin/email", label: "Email" },
];

// Role gate for every /admin page. The API enforces the same rule (AdminGuard);
// this only keeps non-admins from seeing the admin UI.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useRequireAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Checking your session…
      </div>
    );
  }
  if (!user) return null;
  if (user.role !== "admin") {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-300">
        Admins only.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <nav className="flex flex-wrap gap-2 border-b-2 border-neon-pink/40 pb-3">
        {SECTIONS.map(({ href, label }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-neon-pink hover:[text-shadow:0_0_6px_var(--neon-pink)]",
                active && "bg-neon-pink/15 [text-shadow:0_0_6px_var(--neon-pink)]",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
