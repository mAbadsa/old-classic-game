"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signup } from "@/lib/auth";

const inputClassName =
  "h-9 border-[2px] border-[#ff2e88] bg-[#0a0e27] px-3 text-sm text-white outline-none placeholder:text-slate-500 focus-visible:border-[#ffff00] focus-visible:ring-2 focus-visible:ring-[#ffff00]/50";

const submitButtonClassName =
  "pixel-button [--pixel-shadow-color:#000000] inline-flex w-full items-center justify-center gap-2 border-[3px] border-[#ffff00] bg-[#ffff00] px-4 py-2.5 font-arcade text-xs font-bold text-black transition-transform hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 disabled:pointer-events-none disabled:opacity-50";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsSubmitting(true);
    try {
      // Deliberately not logging the user in with the returned token —
      // redirecting to /auth/login keeps signup and sign-in as one flow
      // instead of silently authenticating on the signup response.
      await signup(email, username, password);
      router.push("/auth/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dark-grid-bg flex flex-1 items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="neon-border flex w-full max-w-sm flex-col gap-4 border-[3px] bg-[#1a1f3a] p-6 shadow-neon-pink"
      >
        <div className="text-center">
          <h1 className="neon-text text-lg">ENTER THE ARENA</h1>
          <p className="mt-1 text-xs text-slate-400">Create an account</p>
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
          <label htmlFor="username" className="text-sm font-medium text-neon-pink">
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
            title="Letters, numbers, and underscores only"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-neon-pink">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={passwordsMismatch}
            className={inputClassName}
          />
          {passwordsMismatch && <p className="text-sm text-destructive">Passwords don&apos;t match</p>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button type="submit" disabled={isSubmitting} className={submitButtonClassName}>
          {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-sm text-slate-300">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-neon-pink underline underline-offset-4 hover:[text-shadow:0_0_6px_var(--neon-pink),0_0_16px_var(--neon-pink)]"
          >
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
