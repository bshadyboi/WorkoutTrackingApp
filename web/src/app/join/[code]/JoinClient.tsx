"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function JoinClient({
  code,
  signedIn,
}: {
  code: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function accept() {
    setStatus("working");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?next=/join/${code}`);
      return;
    }

    const { data: link, error: findErr } = await supabase
      .from("coach_links")
      .select("*")
      .eq("invite_code", code)
      .eq("status", "pending")
      .maybeSingle();

    if (findErr || !link) {
      setStatus("error");
      setMessage("Invite not found or already used.");
      return;
    }

    if (link.athlete_id === user.id) {
      setStatus("error");
      setMessage("You can't accept your own invite.");
      return;
    }

    const { error } = await supabase
      .from("coach_links")
      .update({ coach_id: user.id, status: "active" })
      .eq("id", link.id);

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("done");
    setMessage("Connected. Opening coach view…");
    setTimeout(() => router.push("/coach"), 700);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-bold">Coach invite</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Accept to view this athlete&apos;s training, nutrition, and sleep (read-only). You can still
        use FitTrack for your own workouts.
      </p>
      <div className="card mt-6 space-y-3">
        <p className="text-xs text-[var(--muted)]">Invite code</p>
        <p className="font-mono text-lg font-bold">{code}</p>
        <button className="btn-primary w-full" onClick={accept} disabled={status === "working"}>
          {status === "working" ? "Connecting…" : signedIn ? "Accept invite" : "Sign in to accept"}
        </button>
        {message ? (
          <p className={`text-sm ${status === "error" ? "text-red-400" : "text-[var(--green)]"}`}>
            {message}
          </p>
        ) : null}
        {!signedIn ? (
          <Link href={`/signup`} className="block text-center text-sm text-[var(--blue)]">
            Create a coach account
          </Link>
        ) : null}
      </div>
    </main>
  );
}
