"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PushEnableButton } from "@/components/PushEnableButton";
import { DEFAULT_TARGETS, normalizeTargets, type MacroTargets } from "@/lib/targets";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [targets, setTargets] = useState<MacroTargets>(DEFAULT_TARGETS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) return;

      setEmail(user.email || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, target_calories, target_protein, target_carbs, target_fats")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      setDisplayName(
        profile?.display_name ||
          (user.user_metadata?.display_name as string | undefined) ||
          user.email?.split("@")[0] ||
          ""
      );
      setTargets(normalizeTargets(profile));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const payload = {
      id: user.id,
      email: user.email,
      display_name: displayName.trim() || user.email?.split("@")[0] || "Athlete",
      target_calories: Math.max(0, Math.round(targets.target_calories)),
      target_protein: Math.max(0, Math.round(targets.target_protein)),
      target_carbs: Math.max(0, Math.round(targets.target_carbs)),
      target_fats: Math.max(0, Math.round(targets.target_fats)),
    };

    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    setSaving(false);
    if (error) {
      if (/target_/i.test(error.message)) {
        setMsg("Run schema_targets.sql in Supabase to unlock macro targets.");
      } else {
        setMsg(error.message);
      }
      return;
    }
    setMsg("Saved");
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-1/3 animate-pulse rounded-lg bg-[var(--card-2)]" />
        <div className="h-40 animate-pulse rounded-2xl bg-[var(--card-2)]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="text-[28px] font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--muted)]">{email}</p>
      </div>

      <form onSubmit={saveProfile} className="card space-y-4">
        <div>
          <label className="label">Display name</label>
          <input
            className="field"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div>
          <p className="label !mb-2">Daily macro targets</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["target_calories", "Calories"],
                ["target_protein", "Protein (g)"],
                ["target_carbs", "Carbs (g)"],
                ["target_fats", "Fat (g)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-[10px] font-semibold text-[var(--muted)]">
                  {label}
                </label>
                <input
                  className="field !py-2.5 text-center"
                  inputMode="numeric"
                  value={targets[key] || ""}
                  onChange={(e) =>
                    setTargets((t) => ({
                      ...t,
                      [key]: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            Used on Nutrition and Home progress.
          </p>
        </div>

        <button className="btn-green w-full" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
        {msg ? (
          <p
            className={`text-center text-sm ${
              msg === "Saved" ? "text-[var(--green)]" : "text-[var(--yellow)]"
            }`}
          >
            {msg}
          </p>
        ) : null}
      </form>

      <PushEnableButton />

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="w-full rounded-xl border border-[var(--border-solid)] px-4 py-3 text-sm font-bold text-[var(--red)]"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
