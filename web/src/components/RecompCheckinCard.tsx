"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateKey } from "@/lib/protocol";
import { normalizeTargets } from "@/lib/targets";
import {
  applyCalorieDelta,
  DERRICK_CHECKPOINT_WEEK,
  DERRICK_RECOMP_END,
  DERRICK_RECOMP_START,
  derrickRecompWeek,
  evaluateRecompCheckin,
} from "@/lib/derrickRecomp";
import { weekStartKey } from "@/lib/checkin";
import { clearTabCache } from "@/lib/tabCache";
import {
  compareKeyLiftsWeek,
  strengthTrendFromKeyLifts,
} from "@/lib/keyLifts";

type WaistTrend = "down" | "stable" | "up";
type StrengthTrend = "climbing" | "flat" | "falling";

export function RecompCheckinCard() {
  const todayKey = dateKey(new Date());
  const week = derrickRecompWeek(todayKey);
  const inBlock = todayKey >= DERRICK_RECOMP_START && todayKey <= DERRICK_RECOMP_END;
  const checkpointOpen = week >= DERRICK_CHECKPOINT_WEEK;
  const isWeek1 = week === 1;

  const [weightAvg, setWeightAvg] = useState<number | null>(null);
  const [waist, setWaist] = useState("");
  const [waistTrend, setWaistTrend] = useState<WaistTrend>("stable");
  const [strengthTrend, setStrengthTrend] = useState<StrengthTrend>("flat");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [doneThisWeek, setDoneThisWeek] = useState(false);
  const [macrosLabel, setMacrosLabel] = useState("");
  const [autoStrength, setAutoStrength] = useState<StrengthTrend | null>(null);

  const weekStart = useMemo(() => weekStartKey(new Date()), []);

  useEffect(() => {
    if (!inBlock) return;
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) return;

      const start = new Date(`${weekStart}T12:00:00`);
      const keys: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        keys.push(dateKey(d));
      }

      const [{ data: logs }, { data: existing }, { data: profile }, { data: sessions }] =
        await Promise.all([
          supabase
            .from("daily_logs")
            .select("date, morning_weight, waist_cm")
            .eq("user_id", user.id)
            .in("date", keys),
          supabase
            .from("recomp_checkins")
            .select("id, condition, calorie_delta")
            .eq("user_id", user.id)
            .eq("week_start", weekStart)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("target_calories, target_protein, target_carbs, target_fats")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("workout_sessions")
            .select(
              "started_at, set_logs(exercise_name, weight, reps, is_completed, is_warmup)"
            )
            .eq("user_id", user.id)
            .not("ended_at", "is", null)
            .order("started_at", { ascending: false })
            .limit(40),
        ]);

      if (cancelled) return;

      const weights = (logs ?? [])
        .map((l) => Number(l.morning_weight) || 0)
        .filter((w) => w > 0);
      setWeightAvg(
        weights.length
          ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10
          : null
      );

      const waistVals = (logs ?? [])
        .map((l) => Number(l.waist_cm) || 0)
        .filter((w) => w > 0);
      const lastWaist = waistVals.length ? waistVals[waistVals.length - 1] : 0;
      if (lastWaist) setWaist(String(lastWaist));

      if (existing) {
        setDoneThisWeek(true);
        setMsg(
          existing.calorie_delta
            ? `Logged · condition ${existing.condition} · ${existing.calorie_delta > 0 ? "+" : ""}${existing.calorie_delta} kcal`
            : `Logged · condition ${existing.condition} · no change`
        );
      }

      const t = normalizeTargets(profile);
      setMacrosLabel(`${t.target_calories} · ${t.target_protein}p · ${t.target_carbs}c · ${t.target_fats}f`);

      const compares = compareKeyLiftsWeek(
        (sessions ?? []).map((s) => ({
          started_at: s.started_at,
          set_logs:
            (s.set_logs as {
              exercise_name: string;
              weight: number;
              reps: number;
              is_completed: boolean;
              is_warmup?: boolean;
            }[] | null) ?? null,
        }))
      );
      const auto = strengthTrendFromKeyLifts(compares);
      if (auto) {
        setAutoStrength(auto);
        if (!existing) setStrengthTrend(auto);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inBlock, weekStart]);

  if (!inBlock) return null;

  async function submit() {
    setBusy(true);
    setMsg("");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setBusy(false);
      setMsg("Sign in required");
      return;
    }

    const decision = evaluateRecompCheckin({ waistTrend, strengthTrend });
    const waistNum = Number(waist) || null;

    if (waistNum) {
      await supabase.from("daily_logs").upsert(
        {
          user_id: user.id,
          date: todayKey,
          waist_cm: waistNum,
        },
        { onConflict: "user_id,date" }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("target_calories, target_protein, target_carbs, target_fats")
      .eq("id", user.id)
      .maybeSingle();

    const current = normalizeTargets(profile);
    const next = applyCalorieDelta(current, decision.calorieDelta);

    if (decision.calorieDelta !== 0) {
      await supabase
        .from("profiles")
        .update({
          target_calories: next.target_calories,
          target_protein: next.target_protein,
          target_carbs: next.target_carbs,
          target_fats: next.target_fats,
        })
        .eq("id", user.id);
    }

    const { error } = await supabase.from("recomp_checkins").upsert(
      {
        user_id: user.id,
        week_start: weekStart,
        week_number: week,
        weight_avg: weightAvg,
        waist_cm: waistNum,
        waist_trend: waistTrend,
        strength_trend: strengthTrend,
        condition: decision.condition,
        calorie_delta: decision.calorieDelta,
        notes: decision.message,
      },
      { onConflict: "user_id,week_start" }
    );

    setBusy(false);
    if (error) {
      setMsg(error.message.includes("recomp_checkins")
        ? "Run schema_recomp.sql in Supabase, then try again."
        : error.message);
      return;
    }

    setDoneThisWeek(true);
    setMacrosLabel(
      `${next.target_calories} · ${next.target_protein}p · ${next.target_carbs}c · ${next.target_fats}f`
    );
    setMsg(decision.message);
    clearTabCache("dashboard");
    clearTabCache("nutrition");
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--blue)]">
            Derrick Recomp · Week {week || "—"}/10
          </p>
          <p className="text-lg font-bold">Weekly check-in</p>
        </div>
        {macrosLabel ? (
          <p className="shrink-0 text-right text-[11px] font-semibold text-[var(--muted)]">
            {macrosLabel}
          </p>
        ) : null}
      </div>

      {isWeek1 ? (
        <p className="rounded-xl bg-[var(--yellow)]/10 px-3 py-2 text-[12px] text-[var(--yellow)]">
          Week 1 glycogen flag: a 1–3 lb scale bump from carbs/water is expected — not fat gain.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-[var(--surface)] p-3">
          <p className="text-[11px] text-[var(--muted)]">7-day avg weight</p>
          <p className="text-xl font-bold">
            {weightAvg != null ? `${weightAvg} lb` : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--surface)] p-3">
          <p className="text-[11px] text-[var(--muted)]">Navel waist (cm)</p>
          <input
            className="field mt-1 !py-1.5"
            inputMode="decimal"
            placeholder="e.g. 84"
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
            disabled={doneThisWeek}
          />
        </div>
      </div>

      {!checkpointOpen ? (
        <p className="text-[12px] text-[var(--muted)]">
          Checkpoint rules unlock Week {DERRICK_CHECKPOINT_WEEK} (Sep 28). Keep logging weight &
          top sets until then.
        </p>
      ) : doneThisWeek ? (
        <p className="text-[13px] text-[var(--green)]">{msg || "Check-in saved for this week."}</p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-[12px] font-semibold">Waist vs last week</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["down", "Down"],
                  ["stable", "Stable"],
                  ["up", "Up"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`rounded-full px-2 py-2 text-[12px] font-semibold ${
                    waistTrend === k
                      ? "border border-[var(--blue)] bg-[#1a3050] text-white"
                      : "bg-[#1a1f2a] text-[var(--muted)]"
                  }`}
                  onClick={() => setWaistTrend(k)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold">Top-set strength</p>
              {autoStrength ? (
                <p className="text-[10px] text-[var(--muted)]">
                  from key lifts · {autoStrength}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["climbing", "Climbing"],
                  ["flat", "Flat"],
                  ["falling", "Falling"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`rounded-full px-2 py-2 text-[12px] font-semibold ${
                    strengthTrend === k
                      ? "border border-[var(--blue)] bg-[#1a3050] text-white"
                      : "bg-[#1a1f2a] text-[var(--muted)]"
                  }`}
                  onClick={() => setStrengthTrend(k)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-primary w-full"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? "Saving…" : "Apply weekly rules"}
          </button>
          {msg ? <p className="text-[12px] text-[var(--yellow)]">{msg}</p> : null}
        </>
      )}

      {doneThisWeek && msg && checkpointOpen ? (
        <p className="text-[12px] text-[var(--muted)]">{msg}</p>
      ) : null}
    </div>
  );
}
