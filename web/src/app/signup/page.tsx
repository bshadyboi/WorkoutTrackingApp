"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-[var(--text)]">Fit</span>
          <span className="text-[var(--blue)]">Track</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Create your account
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">Display name</label>
          <input
            className="field"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            className="field"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button className="btn-accent w-full" disabled={loading}>
          {loading ? "Creating…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-[var(--blue)]"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-sm text-[var(--muted)]">Loading…</main>}>
      <SignupForm />
    </Suspense>
  );
}
