"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, setAccessToken } from "@/lib/auth";

const inputClassName =
  "h-9 border-[2px] border-[#ff2e88] bg-[#0a0e27] px-3 text-sm text-white outline-none placeholder:text-slate-500 focus-visible:border-[#ffff00] focus-visible:ring-2 focus-visible:ring-[#ffff00]/50";

const submitButtonClassName =
  "pixel-button [--pixel-shadow-color:#000000] inline-flex w-full items-center justify-center gap-2 border-[3px] border-[#ffff00] bg-[#ffff00] px-4 py-2.5 font-arcade text-xs font-bold text-black transition-transform hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 disabled:pointer-events-none disabled:opacity-50";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { accessToken } = await login(email, password);
      setAccessToken(accessToken);
      router.replace(searchParams.get("redirect") ?? "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="neon-border flex w-full max-w-sm flex-col gap-4 border-[3px] bg-[#1a1f3a] p-6 shadow-neon-pink"
    >
      <div className="text-center">
        <h1 className="neon-text text-lg">ENTER THE ARENA</h1>
        <p className="mt-1 text-xs text-slate-400">Sign in</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-neon-pink">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-neon-pink">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClassName}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button type="submit" disabled={isSubmitting} className={submitButtonClassName}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-300">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/signup"
          className="font-medium text-neon-pink underline underline-offset-4 hover:[text-shadow:0_0_6px_var(--neon-pink),0_0_16px_var(--neon-pink)]"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
