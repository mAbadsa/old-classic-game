"use client";

import { useEffect, useState } from "react";
import { adminApi, type Announcement } from "@/lib/admin";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<Announcement["tone"], string> = {
  info: "border-neon-pink text-neon-pink",
  warning: "border-neon-yellow text-neon-yellow",
  success: "border-slate-300 text-slate-100",
};

/** The banner itself, for a given announcement. Used live and by the admin preview. */
export function AnnouncementMessage({ announcement }: { announcement: Announcement }) {
  return (
    <div
      role="status"
      className={cn(
        "border-b-[3px] bg-[#1a1f3a] px-4 py-2 text-center font-arcade text-[10px] leading-relaxed sm:text-xs",
        TONE_CLASS[announcement.tone],
      )}
    >
      {announcement.text}
    </div>
  );
}

/** Site-wide message set by an admin (GET /announcement). Renders nothing when no banner is active. */
export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getAnnouncement()
      .then((res) => {
        if (!cancelled) setAnnouncement(res.announcement);
      })
      .catch(() => {
        // A failed banner fetch should never block the page.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!announcement) return null;
  return <AnnouncementMessage announcement={announcement} />;
}
