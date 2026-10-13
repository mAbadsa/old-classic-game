"use client";

import Link from "next/link";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthUser } from "@/lib/auth";

export interface UserMenuProps {
  user: AuthUser;
  onLogout: () => void;
  className?: string;
}

/** Account dropdown for the navbar: who is signed in, plus Profile and Log out. */
export function UserMenu({ user, onLogout, className }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className={className} />}>
        <UserIcon />
        <span className="max-w-32 truncate">{user.username}</span>
        <ChevronDown />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
            <span className="truncate text-sm font-semibold text-foreground">{user.username}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
            <span className="text-xs font-normal capitalize text-neon-pink">{user.role}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/profile" />}>
          <UserIcon /> Profile
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={onLogout}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
