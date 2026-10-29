"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AnnouncementMessage } from "@/components/AnnouncementBanner";
import { adminApi, type Announcement } from "@/lib/admin";

const fieldClass = "w-full border-2 border-neon-pink/40 bg-[#0f1430] px-3 py-2 text-slate-100 outline-none focus:border-neon-pink";

export default function AdminBannerPage() {
  const [current, setCurrent] = useState<Announcement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [tone, setTone] = useState<Announcement["tone"]>("info");
  const [active, setActive] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read the stored value (even when inactive) so the editor reflects what's saved.
    adminApi
      .getSetting("announcement")
      .then((setting) => {
        const value = setting?.value as Announcement | undefined;
        if (value) {
          setCurrent(value);
          setText(value.text);
          setTone(value.tone);
          setActive(value.active);
        }
      })
      .catch(() => {
        // No banner saved yet — start with an empty form.
      })
      .finally(() => setLoaded(true));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const value = { text: text.trim(), tone, active };
    try {
      await adminApi.saveAnnouncement(value);
      setCurrent(value);
      setMessage("Banner saved.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={save} className="neon-border flex flex-col gap-4 border-[3px] bg-[#1a1f3a] p-6">
        <h1 className="neon-text font-arcade text-base">BANNER</h1>
        <p className="text-sm text-muted-foreground">Shown at the top of every page to all visitors.</p>

        <label className="flex flex-col gap-1 text-xs uppercase text-neon-pink">
          Message
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={280}
            rows={3}
            required
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase text-neon-pink">
          Tone
          <select value={tone} onChange={(e) => setTone(e.target.value as Announcement["tone"])} className={fieldClass}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Show banner
        </label>

        {error && <p className="text-sm text-neon-pink">{error}</p>}
        {message && <p className="text-sm text-neon-yellow">{message}</p>}

        <Button type="submit" disabled={!loaded}>
          Save banner
        </Button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="font-arcade text-xs text-neon-yellow">PREVIEW</h2>
        {text.trim() ? (
          <div className="border-2 border-dashed border-neon-pink/40 p-2">
            <AnnouncementMessage announcement={{ text: text.trim(), tone, active: true }} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Type a message to preview it.</p>
        )}
        {current && (
          <p className="text-xs text-muted-foreground">
            Currently saved: {current.active ? "shown" : "hidden"}. Live banner is rendered at the top of every page.
          </p>
        )}
      </section>
    </div>
  );
}
