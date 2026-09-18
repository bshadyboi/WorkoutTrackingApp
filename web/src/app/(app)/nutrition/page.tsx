"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WaterStepsCards } from "@/components/WaterStepsCards";
import { FastedBloodPressureCard } from "@/components/FastedBloodPressureCard";
import { MorningCheckinCard } from "@/components/MorningCheckinCard";
import { FoodSearchModal, type MealItem } from "@/components/FoodSearchModal";
import { OrderAdviceSheet } from "@/components/OrderAdviceSheet";
import { MealBuilderSheet } from "@/components/MealBuilderSheet";
import { MacroTargetsSheet } from "@/components/MacroTargetsSheet";
import { NutritionTrend } from "@/components/NutritionTrend";
import { IconChevronLeft, IconChevronRight, IconGear, IconHistory, IconPlus, IconStar, IconX } from "@/components/icons";
import { DEFAULT_TARGETS, normalizeTargets, type MacroTargets } from "@/lib/targets";
import { STAPLE_FOODS, type FoodHit } from "@/lib/foods";
import {
  MEAL_SLOTS,
  deleteSavedMeal,
  listSavedMeals,
  mealTotals,
  roundMacro,
  saveMeal,
  toLogItems,
  type MealSlot,
  type SavedMeal,
  type SavedMealItem,
} from "@/lib/savedMeals";
import { DERRICK_RECOMP_BASELINE } from "@/lib/derrickRecomp";
import { dateKey } from "@/lib/protocol";

type DailyLog = {
  date: string;
  water_oz: number;
  steps_count: number;
  bp1_systolic: number;
  bp1_diastolic: number;
  bp2_systolic: number;
  bp2_diastolic: number;
  bp_logged_at?: string | null;
  checkin_sleep: number;
  checkin_energy: number;
  checkin_pump: number;
  actual_calories: number;
  actual_protein: number;
  actual_carbs_pre: number;
  actual_carbs_post: number;
  actual_fats: number;
  meals: MealItem[];
};

/** The targets the lifter asked for; applied once over the untouched program baseline. */
const REQUESTED_TARGETS: MacroTargets = {
  target_calories: 2350,
  target_protein: 190,
  target_carbs: 275,
  target_fats: 47,
};

function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function emptyLog(date: string): DailyLog {
  return {
    date,
    water_oz: 0,
    steps_count: 0,
    bp1_systolic: 0,
    bp1_diastolic: 0,
    bp2_systolic: 0,
    bp2_diastolic: 0,
    checkin_sleep: 0,
    checkin_energy: 0,
    checkin_pump: 0,
    actual_calories: 0,
    actual_protein: 0,
    actual_carbs_pre: 0,
    actual_carbs_post: 0,
    actual_fats: 0,
    meals: [],
  };
}

/** Which slot a one-tap food lands in, by the clock. */
function slotForNow(): MealSlot {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h < 10.5) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 17) return "Snacks";
  if (h < 21) return "Dinner";
  return "Snacks";
}

function stapleToItem(f: FoodHit, slot: MealSlot, stamp: number): MealItem {
  return {
    id: `${stamp}-${f.id}`,
    meal: slot,
    name: f.name,
    brand: f.brand,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    servingLabel: f.servingLabel,
  };
}

export default function NutritionPage() {
  const todayKey = dateKey(new Date());
  const [selected, setSelected] = useState(todayKey);
  const [view, setView] = useState<"day" | "trends">("day");
  const [targets, setTargets] = useState<MacroTargets>(DEFAULT_TARGETS);
  const [log, setLog] = useState<DailyLog>(emptyLog(todayKey));
  const [loading, setLoading] = useState(true);
  const [loggedDays, setLoggedDays] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  /**
   * A meal list that never reached the server. Food kept only in page state
   * looks logged until the app is opened on another device — the whole point
   * of logging it — so a failed write has to say so and offer another go.
   */
  const [unsaved, setUnsaved] = useState<{ items: MealItem[]; reason: string } | null>(null);
  const [toast, setToast] = useState<{ text: string; undoIds?: string[] } | null>(null);
  const [quickSlot, setQuickSlot] = useState<MealSlot>(slotForNow);
  const [searchSlot, setSearchSlot] = useState<MealSlot | null>(null);
  const [saved, setSaved] = useState<SavedMeal[]>([]);
  const [deviceOnly, setDeviceOnly] = useState(false);
  const [editingSaved, setEditingSaved] = useState(false);
  const [builder, setBuilder] = useState<{ name: string; slot: MealSlot; items: SavedMealItem[] } | null>(null);
  const [orderSlot, setOrderSlot] = useState<MealSlot | null>(null);
  const [builderSaving, setBuilderSaving] = useState(false);
  const [builderError, setBuilderError] = useState("");
  const [editingTargets, setEditingTargets] = useState(false);
  const [trendKey, setTrendKey] = useState(0);
  const supabaseRef = useRef(createClient());
  const loadSeqRef = useRef(0);
  const mealsRef = useRef<MealItem[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  mealsRef.current = log.meals;

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

      const current = normalizeTargets(profile);
      const untouchedBaseline =
        Number(profile?.target_calories) === DERRICK_RECOMP_BASELINE.target_calories &&
        Number(profile?.target_protein) === DERRICK_RECOMP_BASELINE.target_protein &&
        Number(profile?.target_carbs) === DERRICK_RECOMP_BASELINE.target_carbs &&
        Number(profile?.target_fats) === DERRICK_RECOMP_BASELINE.target_fats;

      if (untouchedBaseline) {
        const { error: err } = await supabaseRef.current
          .from("profiles")
          .update(REQUESTED_TARGETS)
          .eq("id", user.id);
        setTargets(err ? current : REQUESTED_TARGETS);
      } else {
        setTargets(current);
      }
    })();

    void listSavedMeals()
      .then((r) => {
        setSaved(r.meals);
        setDeviceOnly(r.deviceOnly);
      })
      .catch((e: Error) => setError(e.message));
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

  const load = useCallback(
    async (date: string) => {
      const seq = ++loadSeqRef.current;
      setLoading(true);
      const {
        data: { session },
      } = await supabaseRef.current.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const [{ data }, { data: weekLogs }] = await Promise.all([
        supabaseRef.current.from("daily_logs").select("*").eq("user_id", user.id).eq("date", date).maybeSingle(),
        supabaseRef.current
          .from("daily_logs")
          .select("date, actual_calories, meals")
          .eq("user_id", user.id)
          .gte("date", dateKey(week[0]))
          .lte("date", dateKey(week[6])),
      ]);
      if (seq !== loadSeqRef.current) return;

      setLog(
        data
          ? { ...emptyLog(date), ...data, meals: Array.isArray(data.meals) ? (data.meals as MealItem[]) : [] }
          : emptyLog(date)
      );
      setLoggedDays(
        new Set(
          (weekLogs ?? [])
            .filter((r) => r.actual_calories > 0 || (Array.isArray(r.meals) && r.meals.length > 0))
            .map((r) => String(r.date))
        )
      );
      setLoading(false);
    },
    [week]
  );

  useEffect(() => {
    void load(selected);
  }, [selected, load]);

  const totals = useMemo(() => {
    if (log.meals.length) return mealTotals(log.meals);
    return {
      calories: log.actual_calories,
      protein: log.actual_protein,
      carbs: log.actual_carbs_pre + log.actual_carbs_post,
      fat: log.actual_fats,
    };
  }, [log]);

  function showToast(text: string, undoIds?: string[]) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, undoIds });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  /**
   * Writes only the meal list and the totals derived from it. The water, steps,
   * check-in and blood-pressure cards on this screen save those columns
   * themselves; upserting the whole row from page state used to put back
   * whatever they held when the page loaded, silently undoing a water log.
   */
  async function persistMeals(next: MealItem[]) {
    const date = selected;
    setLog((l) => ({ ...l, meals: next }));
    const {
      data: { session },
    } = await supabaseRef.current.auth.getSession();
    const user = session?.user;
    if (!user) {
      setUnsaved({ items: next, reason: "You're signed out on this device." });
      return;
    }

    const t = mealTotals(next);
    const payload = {
      user_id: user.id,
      date,
      meals: next,
      actual_calories: Math.round(t.calories),
      actual_protein: Math.round(t.protein),
      actual_carbs_pre: Math.round(t.carbs),
      actual_carbs_post: 0,
      actual_fats: Math.round(t.fat),
      ...targets,
    };
    const { error: err } = await supabaseRef.current
      .from("daily_logs")
      .upsert(payload, { onConflict: "user_id,date" })
      .then((r) => r, (e: Error) => ({ error: e }));
    if (err) {
      setUnsaved({ items: next, reason: err.message });
      setError("");
      return;
    }
    setUnsaved(null);
    setError("");
    setLoggedDays((s) => {
      const copy = new Set(s);
      if (next.length) copy.add(date);
      else copy.delete(date);
      return copy;
    });
    setTrendKey((k) => k + 1);
  }

  function addItems(items: MealItem[], label: string) {
    const next = [...mealsRef.current, ...items];
    void persistMeals(next);
    showToast(label, items.map((i) => i.id));
  }

  function removeItems(ids: string[]) {
    void persistMeals(mealsRef.current.filter((m) => !ids.includes(m.id)));
  }

  function logStaple(f: FoodHit) {
    addItems([stapleToItem(f, quickSlot, Date.now())], `Added ${f.name} to ${quickSlot}`);
  }

  function logSaved(meal: SavedMeal) {
    addItems(toLogItems(meal), `Logged ${meal.name} to ${meal.meal}`);
  }

  async function copyYesterday(slot: MealSlot) {
    const d = parseKey(selected);
    d.setDate(d.getDate() - 1);
    const {
      data: { session },
    } = await supabaseRef.current.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const { data } = await supabaseRef.current
      .from("daily_logs")
      .select("meals")
      .eq("user_id", user.id)
      .eq("date", dateKey(d))
      .maybeSingle();
    const prior = (Array.isArray(data?.meals) ? (data.meals as MealItem[]) : []).filter((m) => m.meal === slot);
    if (!prior.length) {
      showToast(`Nothing logged for ${slot} yesterday`);
      return;
    }
    const stamp = Date.now();
    addItems(
      prior.map((m, i) => ({ ...m, id: `${stamp}-${i}-copy` })),
      `Copied yesterday's ${slot}`
    );
  }

  async function handleSaveMeal(meal: Omit<SavedMeal, "id">) {
    setBuilderSaving(true);
    setBuilderError("");
    try {
      const r = await saveMeal(meal);
      setSaved(r.meals);
      setDeviceOnly(r.deviceOnly);
      setBuilder(null);
      showToast(`Saved ${meal.name}`);
    } catch (e) {
      setBuilderError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBuilderSaving(false);
    }
  }

  async function handleDeleteSaved(id: string) {
    try {
      const r = await deleteSavedMeal(id);
      setSaved(r.meals);
      setDeviceOnly(r.deviceOnly);
      if (!r.meals.length) setEditingSaved(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    }
  }

  function shiftDay(delta: number) {
    const d = parseKey(selected);
    d.setDate(d.getDate() + delta);
    const key = dateKey(d);
    if (key <= todayKey) setSelected(key);
  }

  const isToday = selected === todayKey;
  const dateLabel = parseKey(selected).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const calsLeft = Math.round(targets.target_calories - totals.calories);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">Fuel</h1>
          <p className="mt-0.5 text-[13px] font-semibold text-[var(--muted)]">
            {isToday ? `Today · ${dateLabel}` : dateLabel}
            {!isToday ? (
              <button type="button" className="ml-2 font-bold text-[var(--blue)]" onClick={() => setSelected(todayKey)}>
                Jump to today
              </button>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          aria-label="Edit daily targets"
          onClick={() => setEditingTargets(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] active:bg-white/5"
        >
          <IconGear size={18} />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous day" className="flex h-11 w-7 items-center justify-center text-[var(--muted)]" onClick={() => shiftDay(-1)}>
          <IconChevronLeft size={18} />
        </button>
        <div className="flex flex-1 justify-between gap-1">
          {week.map((d) => {
            const key = dateKey(d);
            const isSel = key === selected;
            const future = key > todayKey;
            return (
              <button
                key={key}
                type="button"
                disabled={future}
                onClick={() => setSelected(key)}
                className={`flex h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-md border ${
                  isSel ? "border-[var(--blue)] bg-[var(--blue)]/10" : future ? "border-transparent opacity-30" : "border-[var(--border-solid)]"
                }`}
              >
                <span className="text-[10.5px] font-semibold text-[var(--muted)]">{d.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
                <span className={`text-[13px] font-bold tabular-nums ${isSel ? "text-[var(--blue)]" : ""}`}>{d.getDate()}</span>
                <span className={`h-[4px] w-[4px] rounded-full ${loggedDays.has(key) ? "bg-[var(--green)]" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
        <button type="button" aria-label="Next day" disabled={isToday} className="flex h-11 w-7 items-center justify-center text-[var(--muted)] disabled:opacity-30" onClick={() => shiftDay(1)}>
          <IconChevronRight size={18} />
        </button>
      </div>

      <div className="flex gap-1 rounded-md border border-white/5 bg-[var(--surface)] p-1">
        {(
          [
            ["day", "Day"],
            ["trends", "Weekly trend"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`h-9 flex-1 rounded-md text-[14px] ${view === key ? "bg-[var(--raised)] font-bold text-[var(--text)]" : "font-semibold text-[var(--muted)]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {unsaved ? (
        <div className="rounded-md border border-[var(--red)]/50 bg-[var(--red)]/10 p-3">
          <p className="text-[13px] font-bold text-[var(--red)]">
            Not saved — this food is only on this device
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            It won&apos;t show on your phone, and it&apos;ll be gone when this page closes.
            {unsaved.reason ? ` (${unsaved.reason})` : ""}
          </p>
          <button
            type="button"
            className="btn-accent mt-2.5 !py-2 text-xs"
            onClick={() => void persistMeals(unsaved.items)}
          >
            Try saving again
          </button>
        </div>
      ) : null}

      {error ? <p className="text-[13px] text-[var(--yellow)]">{error}</p> : null}

      {view === "trends" ? (
        <NutritionTrend endDate={selected} targets={targets} refreshKey={trendKey} />
      ) : loading ? (
        <div className="space-y-3">
          <div className="h-40 animate-pulse rounded-md bg-[var(--card-2)]" />
          <div className="h-24 animate-pulse rounded-md bg-[var(--card-2)]" />
        </div>
      ) : (
        <>
          <section className="reg space-y-4 rounded-md border border-[var(--border-solid)] bg-[var(--card)] p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--muted)]">
                  {calsLeft >= 0 ? "CALORIES LEFT" : "OVER TARGET"}
                </p>
                <p className="text-[34px] font-extrabold leading-none tracking-tight tabular-nums">
                  {Math.abs(calsLeft).toLocaleString()}
                </p>
              </div>
              <p className="pb-1 text-right text-[13px] tabular-nums text-[var(--muted)]">
                <span className="font-bold text-[var(--text)]">{Math.round(totals.calories).toLocaleString()}</span> of{" "}
                {targets.target_calories.toLocaleString()} cal
              </p>
            </div>
            <MacroBar label="Calories" value={totals.calories} target={targets.target_calories} unit="" />
            <div className="grid grid-cols-3 gap-3">
              <MacroBar label="Protein" value={totals.protein} target={targets.target_protein} unit="g" compact />
              <MacroBar label="Carbs" value={totals.carbs} target={targets.target_carbs} unit="g" compact />
              <MacroBar label="Fat" value={totals.fat} target={targets.target_fats} unit="g" compact />
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-bold">Saved meals</h2>
              <div className="flex items-center gap-3">
                {saved.length ? (
                  <button type="button" className="text-[13px] font-bold text-[var(--muted)]" onClick={() => setEditingSaved((v) => !v)}>
                    {editingSaved ? "Done" : "Edit"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-[13px] font-bold text-[var(--blue)]"
                  onClick={() => {
                    setBuilderError("");
                    setBuilder({ name: "", slot: quickSlot, items: [] });
                  }}
                >
                  New
                </button>
              </div>
            </div>
            {saved.length ? (
              <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card)]">
                {saved.map((m, i) => {
                  const t = mealTotals(m.items);
                  return (
                    <div key={m.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/5" : ""}`}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold">{m.name}</p>
                        <p className="truncate text-[12.5px] tabular-nums text-[var(--muted)]">
                          {m.meal} · {m.items.length} {m.items.length === 1 ? "food" : "foods"} · {roundMacro(t.calories)} cal · {roundMacro(t.protein)}p
                        </p>
                      </div>
                      {editingSaved ? (
                        <button
                          type="button"
                          aria-label={`Delete ${m.name}`}
                          onClick={() => void handleDeleteSaved(m.id)}
                          className="flex h-10 shrink-0 items-center rounded-md border border-[var(--red)]/40 px-3 text-[13px] font-bold text-[var(--red)]"
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => logSaved(m)}
                          className="flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3.5 text-[13.5px] font-extrabold text-[var(--on-accent)] active:scale-95"
                        >
                          <IconPlus size={14} /> Log
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-[var(--border-solid)] px-4 py-4 text-[13px] text-[var(--muted)]">
                Save a meal you eat often and log it here in one tap.
              </p>
            )}
            {deviceOnly ? (
              <p className="text-[11.5px] text-[var(--dim)]">
                Saved on this phone only until schema_saved_meals.sql is run in Supabase.
              </p>
            ) : null}
          </section>

          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-bold">Staples</h2>
              <p className="text-[12px] font-semibold text-[var(--muted)]">Tap to add to</p>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuickSlot(s)}
                  className={`h-9 rounded-md text-[12.5px] font-semibold ${quickSlot === s ? "bg-[var(--blue)] text-[var(--on-blue)]" : "bg-[var(--card-2)] text-[var(--muted)]"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STAPLE_FOODS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => logStaple(f)}
                  className="flex min-h-[64px] flex-col items-start justify-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-left active:bg-white/5"
                >
                  <span className="w-full truncate text-[13.5px] font-bold">{f.name}</span>
                  <span className="w-full truncate text-[11.5px] tabular-nums text-[var(--muted)]">
                    {f.servingLabel} · {f.calories} cal · {f.protein}p
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-[17px] font-bold">Meals</h2>
            <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card)]">
              {MEAL_SLOTS.map((slot, idx) => {
                const items = log.meals.filter((m) => m.meal === slot);
                const t = mealTotals(items);
                return (
                  <div key={slot} className={`px-4 py-3.5 ${idx > 0 ? "border-t border-white/5" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[15px] font-bold">{slot}</p>
                      {items.length ? (
                        <p className="text-[12.5px] tabular-nums text-[var(--muted)]">
                          {roundMacro(t.calories)} cal · {roundMacro(t.protein)}p
                        </p>
                      ) : null}
                    </div>
                    {items.length ? (
                      <div className="mt-2 space-y-1.5">
                        {items.map((it) => (
                          <div key={it.id} className="flex items-center gap-2 rounded-md bg-[var(--surface)] py-2 pl-3 pr-1">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13.5px] font-semibold">{it.name}</p>
                              <p className="truncate text-[11.5px] tabular-nums text-[var(--muted)]">
                                {it.servingLabel ? `${it.servingLabel} · ` : ""}
                                {roundMacro(it.calories)} cal · {roundMacro(it.protein)}p · {roundMacro(it.carbs)}c · {roundMacro(it.fat)}f
                              </p>
                            </div>
                            <button
                              type="button"
                              aria-label={`Remove ${it.name}`}
                              onClick={() => removeItems([it.id])}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] text-[var(--muted)] active:text-[var(--text)]"
                            >
                              <IconX size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSearchSlot(slot)}
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-[var(--raised)] text-[12.5px] font-bold text-[var(--blue)]"
                      >
                        <IconPlus size={14} /> Add food
                      </button>
                      <button
                        type="button"
                        aria-label={`What should I order for ${slot}`}
                        title="Eating out? See what fits"
                        onClick={() => setOrderSlot(slot)}
                        className="flex h-10 w-11 items-center justify-center rounded-md bg-[var(--raised)] text-[15px] font-bold text-[var(--blue)]"
                      >
                        🍔
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyYesterday(slot)}
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-[var(--raised)] text-[12.5px] font-bold text-[var(--muted)]"
                      >
                        <IconHistory size={14} /> Yesterday
                      </button>
                      {items.length ? (
                        <button
                          type="button"
                          aria-label={`Save ${slot} as a meal`}
                          onClick={() => {
                            setBuilderError("");
                            setBuilder({
                              name: "",
                              slot,
                              items: items.map((m) => ({
                                name: m.name,
                                brand: m.brand,
                                calories: m.calories,
                                protein: m.protein,
                                carbs: m.carbs,
                                fat: m.fat,
                                servingLabel: m.servingLabel,
                              })),
                            });
                          }}
                          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-[var(--raised)] text-[12.5px] font-bold text-[var(--muted)]"
                        >
                          <IconStar size={14} /> Save
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[17px] font-bold">Daily check-ins</h2>
            <WaterStepsCards date={selected} waterOz={log.water_oz} steps={log.steps_count} waterGoal={128} targets={targets} />
            <MorningCheckinCard
              key={`checkin-${selected}-${log.checkin_sleep}-${log.checkin_energy}-${log.checkin_pump}`}
              date={selected}
              initial={{ checkin_sleep: log.checkin_sleep, checkin_energy: log.checkin_energy, checkin_pump: log.checkin_pump }}
              targets={targets}
            />
            <FastedBloodPressureCard
              key={`bp-${selected}-${log.bp1_systolic}-${log.bp2_systolic}`}
              date={selected}
              initial={{
                bp1_systolic: log.bp1_systolic,
                bp1_diastolic: log.bp1_diastolic,
                bp2_systolic: log.bp2_systolic,
                bp2_diastolic: log.bp2_diastolic,
                bp_logged_at: log.bp_logged_at,
              }}
              targets={targets}
            />
          </section>
        </>
      )}

      {toast ? (
        <div
          className="fixed inset-x-0 z-40 mx-auto flex max-w-lg px-4"
          style={{ bottom: "calc(92px + env(safe-area-inset-bottom, 0px))" }}
          role="status"
        >
          <div className="flex w-full items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 shadow-lg shadow-black/40">
            <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{toast.text}</p>
            {toast.undoIds?.length ? (
              <button
                type="button"
                className="shrink-0 text-[13.5px] font-bold text-[var(--blue)]"
                onClick={() => {
                  removeItems(toast.undoIds!);
                  setToast(null);
                }}
              >
                Undo
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {orderSlot ? (
        <OrderAdviceSheet
          slot={orderSlot}
          remaining={{
            calories: targets.target_calories - totals.calories,
            protein: targets.target_protein - totals.protein,
            carbs: targets.target_carbs - totals.carbs,
            fat: targets.target_fats - totals.fat,
          }}
          onClose={() => setOrderSlot(null)}
          onLog={(items, label) => addItems(items, label)}
        />
      ) : null}

      {searchSlot ? (
        <FoodSearchModal
          meal={searchSlot}
          onClose={() => setSearchSlot(null)}
          onAdd={(item) => addItems([item], `Added ${item.name} to ${item.meal}`)}
        />
      ) : null}

      {builder ? (
        <MealBuilderSheet
          initialName={builder.name}
          initialSlot={builder.slot}
          initialItems={builder.items}
          saving={builderSaving}
          error={builderError}
          onClose={() => setBuilder(null)}
          onSave={(m) => void handleSaveMeal(m)}
        />
      ) : null}

      {editingTargets ? (
        <MacroTargetsSheet
          targets={targets}
          onClose={() => setEditingTargets(false)}
          onSaved={(t) => {
            setTargets(t);
            setEditingTargets(false);
            setTrendKey((k) => k + 1);
            showToast("Targets updated");
          }}
        />
      ) : null}
    </div>
  );
}

function MacroBar({
  label,
  value,
  target,
  unit,
  compact,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  compact?: boolean;
}) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const over = target > 0 && value > target;
  const shown = roundMacro(value);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-1">
        <span className={`font-bold text-[var(--muted)] ${compact ? "text-[11.5px]" : "text-[12.5px]"}`}>{label}</span>
        {!compact ? (
          <span className="text-[12px] tabular-nums text-[var(--muted)]">{Math.round(pct)}%</span>
        ) : null}
      </div>
      {compact ? (
        <p className="mt-0.5 text-[15px] font-extrabold tabular-nums">
          {shown}
          <span className="text-[11.5px] font-semibold text-[var(--muted)]">
            /{target}
            {unit}
          </span>
        </p>
      ) : null}
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--border-solid)]">
        <div className="h-full rounded-full bg-[var(--blue)]" style={{ width: `${pct}%` }} />
      </div>
      {over ? (
        <p className="mt-1 text-[11px] font-semibold tabular-nums text-[var(--yellow)]">
          {roundMacro(value - target)}
          {unit} over
        </p>
      ) : null}
    </div>
  );
}
