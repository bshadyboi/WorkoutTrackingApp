"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { WaterStepsCards } from "@/components/WaterStepsCards";
import { FastedBloodPressureCard } from "@/components/FastedBloodPressureCard";
import { MorningCheckinCard } from "@/components/MorningCheckinCard";
import { FoodSearchModal, type MealItem } from "@/components/FoodSearchModal";
import { DEFAULT_TARGETS, normalizeTargets, type MacroTargets } from "@/lib/targets";
import { dateKey } from "@/lib/protocol";

type DailyLog = {
  date: string;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fats: number;
  actual_calories: number;
  actual_protein: number;
  actual_carbs_pre: number;
  actual_carbs_post: number;
  actual_fats: number;
  sleep_hours: number;
  steps_count: number;
  water_oz: number;
  morning_weight: number;
  bp1_systolic: number;
  bp1_diastolic: number;
  bp2_systolic: number;
  bp2_diastolic: number;
  bp_logged_at?: string | null;
  checkin_sleep: number;
  checkin_energy: number;
  checkin_pump: number;
  meals?: MealItem[];
};

function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function emptyLog(date: string, targets: MacroTargets = DEFAULT_TARGETS): DailyLog {
  return {
    date,
    ...targets,
    actual_calories: 0,
    actual_protein: 0,
    actual_carbs_pre: 0,
    actual_carbs_post: 0,
    actual_fats: 0,
    sleep_hours: 0,
    steps_count: 0,
    water_oz: 0,
    morning_weight: 0,
    bp1_systolic: 0,
    bp1_diastolic: 0,
    bp2_systolic: 0,
    bp2_diastolic: 0,
    checkin_sleep: 0,
    checkin_energy: 0,
    checkin_pump: 0,
    meals: [],
  };
}

export default function NutritionPage() {
  const todayKey = dateKey(new Date());
  const [selected, setSelected] = useState(todayKey);
  const [targets, setTargets] = useState<MacroTargets>(DEFAULT_TARGETS);
  const [form, setForm] = useState<DailyLog>(emptyLog(todayKey));
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [planTab, setPlanTab] = useState<"plan" | "browse" | "trends">("plan");
  const [searchMeal, setSearchMeal] = useState<MealItem["meal"] | null>(null);
  const [loggedDays, setLoggedDays] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const supabaseRef = useRef(createClient());
  const targetsRef = useRef(targets);
  const loadSeqRef = useRef(0);
  targetsRef.current = targets;

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabaseRef.current.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const { data: profile } = await supabaseRef.current
        .from("profiles")
        .select("target_calories, target_protein, target_carbs, target_fats")
        .eq("id", user.id)
        .maybeSingle();
      setTargets(normalizeTargets(profile));
    })();
  }, []);

  const week = useMemo(() => {
    const center = parseKey(selected);
    const start = new Date(center);
    start.setDate(center.getDate() - center.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selected]);

  const load = useCallback(async (date: string) => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setMsg("");
    const {
      data: { user },
    } = await supabaseRef.current.auth.getUser();
    if (!user) return;

    const t = targetsRef.current;
    const { data } = await supabaseRef.current
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle();

    if (seq !== loadSeqRef.current) return;

    if (data) {
      const meals = Array.isArray(data.meals) ? (data.meals as MealItem[]) : [];
      setForm({
        ...emptyLog(date, t),
        ...data,
        ...t,
        meals,
      });
    } else {
      setForm(emptyLog(date, t));
    }

    const start = week[0] ? dateKey(week[0]) : date;
    const end = week[6] ? dateKey(week[6]) : date;
    const { data: weekLogs } = await supabaseRef.current
      .from("daily_logs")
      .select("date, actual_calories, steps_count, meals")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end);

    if (seq !== loadSeqRef.current) return;

    const set = new Set<string>();
    for (const row of weekLogs ?? []) {
      const hasMeals = Array.isArray(row.meals) && row.meals.length > 0;
      if (row.actual_calories > 0 || row.steps_count > 0 || hasMeals) {
        set.add(row.date);
      }
    }
    setLoggedDays(set);
    setLoading(false);
  }, [week]);

  useEffect(() => {
    void load(selected);
  }, [selected, load]);

  const meals = useMemo(() => form.meals ?? [], [form.meals]);
  const mealTotals = useMemo(() => {
    return meals.reduce(
      (a, m) => ({
        cal: a.cal + m.calories,
        p: a.p + m.protein,
        c: a.c + m.carbs,
        f: a.f + m.fat,
      }),
      { cal: 0, p: 0, c: 0, f: 0 }
    );
  }, [meals]);

  const displayCal = meals.length ? mealTotals.cal : form.actual_calories;
  const displayPro = meals.length ? mealTotals.p : form.actual_protein;
  const displayCarb = meals.length
    ? mealTotals.c
    : form.actual_carbs_pre + form.actual_carbs_post;
  const displayFat = meals.length ? mealTotals.f : form.actual_fats;
  const calsLeft = targets.target_calories - displayCal;

  function persistPatch(patch: Partial<DailyLog> & { meals?: MealItem[] }) {
    startTransition(async () => {
      const {
        data: { user },
      } = await supabaseRef.current.auth.getUser();
      if (!user) return;

      let nextForm: DailyLog | null = null;
      setForm((prev) => {
        const next = { ...prev, ...patch, ...targetsRef.current, date: selected, user_id: user.id } as DailyLog & { user_id: string };
        if (patch.meals) {
          const t = patch.meals.reduce(
            (a, m) => ({
              cal: a.cal + m.calories,
              p: a.p + m.protein,
              c: a.c + m.carbs,
              f: a.f + m.fat,
            }),
            { cal: 0, p: 0, c: 0, f: 0 }
          );
          next.actual_calories = t.cal;
          next.actual_protein = t.p;
          next.actual_carbs_pre = t.c;
          next.actual_carbs_post = 0;
          next.actual_fats = t.f;
        }
        nextForm = next;
        return next;
      });

      if (!nextForm) return;
      const payload = nextForm as DailyLog & { user_id: string };

      const { error } = await supabaseRef.current
        .from("daily_logs")
        .upsert(payload, { onConflict: "user_id,date" });
      if (error) {
        if (error.message.toLowerCase().includes("meals")) {
          const rest = { ...payload };
          delete (rest as { meals?: MealItem[] }).meals;
          await supabaseRef.current.from("daily_logs").upsert(rest, {
            onConflict: "user_id,date",
          });
          setMsg("Saved macros (run schema_meals.sql for meal items)");
        } else {
          setMsg(error.message);
        }
      } else {
        setMsg("Saved");
        setLoggedDays((s) => new Set(s).add(selected));
      }
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    persistPatch(form);
  }

  function addMealItem(item: MealItem) {
    const next = [...meals, item];
    setForm((f) => ({ ...f, meals: next }));
    persistPatch({ meals: next });
  }

  function removeMeal(id: string) {
    const next = meals.filter((m) => m.id !== id);
    setForm((f) => ({ ...f, meals: next }));
    persistPatch({ meals: next });
  }

  async function copyYesterday(meal: MealItem["meal"]) {
    const d = parseKey(selected);
    d.setDate(d.getDate() - 1);
    const yKey = dateKey(d);
    const {
      data: { user },
    } = await supabaseRef.current.auth.getUser();
    if (!user) return;
    const { data } = await supabaseRef.current
      .from("daily_logs")
      .select("meals, actual_calories, actual_protein, actual_carbs_pre, actual_carbs_post, actual_fats")
      .eq("user_id", user.id)
      .eq("date", yKey)
      .maybeSingle();
    if (!data) {
      setMsg("Nothing logged yesterday");
      return;
    }
    const yMeals = Array.isArray(data.meals) ? (data.meals as MealItem[]) : [];
    const fromMeal = yMeals.filter((m) => m.meal === meal);
    if (fromMeal.length) {
      const copied = fromMeal.map((m) => ({
        ...m,
        id: `${Date.now()}-${m.id}`,
      }));
      const next = [...meals, ...copied];
      setForm((f) => ({ ...f, meals: next }));
      persistPatch({ meals: next });
      setMsg(`Copied ${meal} from yesterday`);
      return;
    }
    // Fallback: split yesterday totals into this meal roughly
    setMsg("No meal items yesterday — use Search / Manual");
  }

  function shiftDay(delta: number) {
    const d = parseKey(selected);
    d.setDate(d.getDate() + delta);
    const key = dateKey(d);
    if (key > todayKey) return;
    setSelected(key);
  }

  const isToday = selected === todayKey;
  const selectedLabel = parseKey(selected).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isToday ? "Today" : selectedLabel}</h1>
          {!isToday ? (
            <button
              type="button"
              className="text-xs font-semibold text-[var(--blue)]"
              onClick={() => setSelected(todayKey)}
            >
              Jump to today
            </button>
          ) : null}
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-solid)] text-[11px] font-bold text-[var(--muted)]">
          {parseKey(selected).getDate()}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button type="button" className="px-2 text-[var(--muted)]" onClick={() => shiftDay(-1)}>
          ‹
        </button>
        <div className="flex flex-1 gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {week.map((d) => {
            const key = dateKey(d);
            const isSel = key === selected;
            const future = key > todayKey;
            const done = loggedDays.has(key);
            return (
              <button
                key={key}
                type="button"
                disabled={future}
                onClick={() => setSelected(key)}
                className={`flex h-[58px] w-11 shrink-0 flex-col items-center justify-center rounded-xl border ${
                  isSel
                    ? "border-[var(--blue)]"
                    : future
                      ? "border-transparent opacity-30"
                      : "border-[var(--border-solid)]"
                }`}
              >
                <span className="text-[10px] text-[var(--muted)]">
                  {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                </span>
                <span className="text-sm font-bold">{d.getDate()}</span>
                {done ? <span className="text-[9px] text-[var(--green)]">✓</span> : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="px-2 text-[var(--muted)] disabled:opacity-30"
          disabled={isToday}
          onClick={() => shiftDay(1)}
        >
          ›
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <>
          <div className="card space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <MacroTile label="Calories" value={displayCal} target={targets.target_calories} />
              <MacroTile label="Protein" value={displayPro} target={targets.target_protein} />
              <MacroTile label="Carbs" value={displayCarb} target={targets.target_carbs} />
              <MacroTile label="Fat" value={displayFat} target={targets.target_fats} />
            </div>
            <p className="text-center text-xs text-white">
              {calsLeft} cal left ·{" "}
              <span className="text-[var(--blue)]">full breakdown ▸</span>
            </p>
          </div>

          <WaterStepsCards
            date={selected}
            waterOz={form.water_oz}
            steps={form.steps_count}
            waterGoal={128}
            targets={targets}
          />

          <MorningCheckinCard
            key={`checkin-${selected}-${form.checkin_sleep}-${form.checkin_energy}-${form.checkin_pump}`}
            date={selected}
            initial={{
              checkin_sleep: form.checkin_sleep,
              checkin_energy: form.checkin_energy,
              checkin_pump: form.checkin_pump,
            }}
            targets={targets}
          />

          <FastedBloodPressureCard
            key={`bp-${selected}-${form.bp1_systolic}-${form.bp2_systolic}`}
            date={selected}
            initial={{
              bp1_systolic: form.bp1_systolic,
              bp1_diastolic: form.bp1_diastolic,
              bp2_systolic: form.bp2_systolic,
              bp2_diastolic: form.bp2_diastolic,
              bp_logged_at: form.bp_logged_at,
            }}
            targets={targets}
          />

          <div className="grid grid-cols-[1.4fr_0.8fr] gap-2">
            <button
              type="button"
              className="btn-primary !py-3 text-sm"
              onClick={() => setSearchMeal("Snacks")}
            >
              📷 Snap / search
            </button>
            <button
              type="button"
              className="btn-primary !py-3 text-sm"
              onClick={() => setSearchMeal("Snacks")}
            >
              ⊞ Scan
            </button>
          </div>

          <div className="card !p-0 overflow-hidden">
            {(
              [
                ["Breakfast", "🍳"],
                ["Lunch", "🥪"],
                ["Dinner", "🍽️"],
                ["Snacks", "🍿"],
              ] as const
            ).map(([meal, emoji]) => {
              const items = meals.filter((m) => m.meal === meal);
              return (
                <div
                  key={meal}
                  className="border-b border-[var(--border)] px-3 py-3 last:border-0"
                >
                  <p className="mb-2 text-sm font-semibold">
                    {emoji} {meal}
                  </p>
                  {items.length ? (
                    <div className="mb-2 space-y-1.5">
                      {items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-start justify-between gap-2 rounded-lg bg-[var(--surface)] px-2.5 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">{it.name}</p>
                            <p className="text-[10px] text-[var(--muted)]">
                              {it.calories} cal · {it.protein}p · {it.carbs}c · {it.fat}f
                            </p>
                          </div>
                          <button
                            type="button"
                            className="text-[var(--muted)]"
                            onClick={() => removeMeal(it.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      className="rounded-lg bg-[var(--raised)] py-2 text-[11px] font-semibold text-[var(--blue)]"
                      onClick={() => setSearchMeal(meal)}
                    >
                      + Log
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-[var(--raised)] py-2 text-[11px] font-semibold text-[var(--blue)]"
                      onClick={() => setSearchMeal(meal)}
                    >
                      📷 Snap
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-[var(--raised)] py-2 text-[11px] font-semibold text-[var(--blue)]"
                      onClick={() => void copyYesterday(meal)}
                    >
                      🔄 Copy
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(["plan", "browse", "trends"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`rounded-full px-2 py-1.5 text-[12px] font-semibold ${
                  planTab === t
                    ? "border border-[var(--blue)] bg-[#123240] text-white"
                    : "bg-[var(--card-2)] text-[var(--muted)]"
                }`}
                onClick={() => setPlanTab(t)}
              >
                {t === "plan" ? "📋 My Plan" : t === "browse" ? "🥩 Browse" : "📈 Trends"}
              </button>
            ))}
          </div>
          <div className="card text-sm text-[var(--muted)]">
            {planTab === "plan" ? "No meal plan assigned yet." : null}
            {planTab === "browse" ? "Use + Log to search Open Food Facts + restaurant items." : null}
            {planTab === "trends" ? "Pick past days above to backfill nutrition." : null}
          </div>

          <button className="btn-green w-full" type="submit">
            Save {isToday ? "today" : selectedLabel}
          </button>
          {msg ? (
            <p
              className={`text-center text-sm ${
                msg.startsWith("Saved") || msg.startsWith("Copied")
                  ? "text-[var(--green)]"
                  : "text-[var(--yellow)]"
              }`}
            >
              {msg}
            </p>
          ) : null}
        </>
      )}

      {searchMeal ? (
        <FoodSearchModal
          meal={searchMeal}
          onClose={() => setSearchMeal(null)}
          onAdd={addMealItem}
        />
      ) : null}
    </form>
  );
}

function MacroTile({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number;
}) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div className="min-w-0 rounded-xl bg-[var(--surface)] px-1.5 py-2.5 text-center">
      <p className="text-[13px] font-bold leading-tight">{value}</p>
      <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="text-[10px] text-[var(--muted)]">/ {target}</p>
      <div className="mx-auto mt-2 h-1 w-full max-w-[48px] overflow-hidden rounded-full bg-[var(--border-solid)]">
        <div className="h-full rounded-full bg-[var(--blue)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
