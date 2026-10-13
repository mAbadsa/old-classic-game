"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { adminApi, type AdminUser, type EmailResult } from "@/lib/admin";

const fieldClass = "w-full border-2 border-neon-pink/40 bg-[#0f1430] px-3 py-2 text-slate-100 outline-none focus:border-neon-pink";

export default function AdminEmailPage() {
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<EmailResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The first page of users is enough to pick recipients from; "all" covers everyone.
    adminApi
      .listUsers(1, 100)
      .then((res) => setUsers(res.data.filter((u) => u.status === "active")))
      .catch((err: Error) => setError(err.message));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = String(form.get("subject") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();

    if (audience === "selected" && selected.size === 0) {
      setError("Pick at least one recipient.");
      return;
    }
    const target = audience === "all" ? "all active users" : `${selected.size} selected user(s)`;
    if (!window.confirm(`Send this email to ${target}?`)) return;

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const dto = audience === "all" ? { audience: "all" as const } : { audience: "selected" as const, userIds: [...selected] };
      setResult(await adminApi.sendEmail(dto, subject, body));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <form onSubmit={send} className="neon-border flex flex-col gap-4 border-[3px] bg-[#1a1f3a] p-6">
        <h1 className="neon-text font-arcade text-base">EMAIL USERS</h1>

        <fieldset className="flex gap-6 text-sm text-slate-200">
          <legend className="mb-2 text-xs uppercase text-neon-pink">Recipients</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="audience" checked={audience === "all"} onChange={() => setAudience("all")} />
            All active users
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="audience" checked={audience === "selected"} onChange={() => setAudience("selected")} />
            Selected users
          </label>
        </fieldset>

        {audience === "selected" && (
          <div className="max-h-48 overflow-y-auto border-2 border-neon-pink/40 bg-[#0f1430] p-2">
            {users.length === 0 && <p className="text-sm text-muted-foreground">No active users.</p>}
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 py-1 text-sm text-slate-200">
                <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                {u.username} <span className="text-muted-foreground">{u.email}</span>
              </label>
            ))}
          </div>
        )}

        <label className="flex flex-col gap-1 text-xs uppercase text-neon-pink">
          Subject
          <input name="subject" required maxLength={150} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase text-neon-pink">
          Message
          <textarea name="body" required maxLength={5000} rows={8} className={fieldClass} />
        </label>

        {error && <p className="text-sm text-neon-pink">{error}</p>}
        {result && (
          <p className="text-sm text-neon-yellow">
            {result.sent} sent, {result.failed} failed, {result.recipients} recipients.
          </p>
        )}

        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Send email"}
        </Button>
      </form>

      <section className="flex flex-col gap-2 text-sm text-muted-foreground">
        <h2 className="font-arcade text-xs text-neon-yellow">DELIVERY</h2>
        <p>
          Messages go through the mail driver set on the server (MAIL_DRIVER). While it is <code>log</code>, sends are
          recorded in the server log and not delivered.
        </p>
      </section>
    </div>
  );
}
