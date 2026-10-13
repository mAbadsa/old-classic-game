"use client";

import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function ProfilePage() {
  const { user, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Checking your session…
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-4 sm:p-8">
      <h1 className="neon-text font-arcade text-lg">PROFILE</h1>

      <dl className="neon-border grid w-full max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-[3px] bg-[#1a1f3a] p-6 text-sm shadow-neon-pink">
        <dt className="text-neon-pink">Username</dt>
        <dd className="truncate text-slate-200">{user.username}</dd>

        <dt className="text-neon-pink">Email</dt>
        <dd className="truncate text-slate-200">{user.email}</dd>

        <dt className="text-neon-pink">Role</dt>
        <dd className="capitalize text-slate-200">{user.role}</dd>
      </dl>

      <Link href="/games" className="text-sm text-neon-pink underline underline-offset-4">
        Back to library
      </Link>
    </div>
  );
}
