"use client";

import { useMemo, useState } from "react";
import { FoodSearchModal, type MealItem } from "@/components/FoodSearchModal";
import { IconPlus, IconX } from "@/components/icons";
import {
  MEAL_SLOTS,
  mealTotals,
  roundMacro,
  type MealSlot,
  type SavedMeal,
  type SavedMealItem,
} from "@/lib/savedMeals";

type Draft = { key: string; base: SavedMealItem; servings: number };

function scale(item: SavedMealItem, servings: number): SavedMealItem {
  if (servings === 1) return item;
  return {
    ...item,
    calories: roundMacro(item.calories * servings),
    protein: roundMacro(item.protein * servings),
    carbs: roundMacro(item.carbs * servings),
    fat: roundMacro(item.fat * servings),
    servingLabel: `${servings}× ${item.servingLabel}`.trim(),
  };
}

export function MealBuilderSheet({
  initialName = "",
  initialSlot = "Lunch",
  initialItems = [],
  saving,
  error,
  onClose,
  onSave,
}: {
  initialName?: string;
  initialSlot?: MealSlot;
  initialItems?: SavedMealItem[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (meal: Omit<SavedMeal, "id">) => void;
}) {
  const [name, setName] = useState(initialName);
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    initialItems.map((base, i) => ({ key: `init-${i}`, base, servings: 1 }))
  );
  const [picking, setPicking] = useState(false);

  const items = useMemo(() => drafts.map((d) => scale(d.base, d.servings)), [drafts]);
  const totals = mealTotals(items);

  function addFood(m: MealItem) {
    setDrafts((ds) => [
      ...ds,
      {
        key: `${Date.now()}-${ds.length}`,
        servings: 1,
        base: {
          name: m.name,
          brand: m.brand,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          servingLabel: m.servingLabel,
        },
      },
    ]);
  }

  function setServings(key: string, delta: number) {
    setDrafts((ds) =>
      ds.map((d) =>
        d.key === key ? { ...d, servings: Math.max(0.5, Math.round((d.servings + delta) * 2) / 2) } : d
      )
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="builder-title">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-md border border-[var(--border)] bg-[var(--card)] sm:rounded-md">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
          <h2 id="builder-title" className="text-[17px] font-bold">
            Save a meal
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--card-2)] text-[var(--muted)]">
            <IconX size={16} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="label" htmlFor="meal-name">Name</label>
            <input id="meal-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beef & rice bowl" />
          </div>

          <div>
            <p className="label">Logs into</p>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={`h-10 rounded-md text-[13px] font-semibold ${
                    slot === s ? "bg-[var(--blue)] text-[var(--on-blue)]" : "bg-[var(--card-2)] text-[var(--muted)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label">Foods</p>
            {drafts.length ? (
              <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
                {drafts.map((d, i) => {
                  const it = items[i];
                  return (
                    <div key={d.key} className="flex items-center gap-3 border-b border-white/5 px-3.5 py-3 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold">{it.name}</p>
                        <p className="truncate text-[12px] tabular-nums text-[var(--muted)]">
                          {it.servingLabel} · {roundMacro(it.calories)} cal · {roundMacro(it.protein)}p · {roundMacro(it.carbs)}c · {roundMacro(it.fat)}f
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" aria-label={`Fewer servings of ${it.name}`} onClick={() => setServings(d.key, -0.5)} className="h-9 w-9 rounded-[4px] bg-[var(--card-2)] text-[16px] font-bold text-[var(--muted)]">−</button>
                        <span className="w-9 text-center text-[13px] font-bold tabular-nums">{d.servings}×</span>
                        <button type="button" aria-label={`More servings of ${it.name}`} onClick={() => setServings(d.key, 0.5)} className="h-9 w-9 rounded-[4px] bg-[var(--card-2)] text-[16px] font-bold text-[var(--muted)]">+</button>
                        <button type="button" aria-label={`Remove ${it.name}`} onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))} className="ml-1 flex h-9 w-9 items-center justify-center rounded-[4px] text-[var(--muted)]">
                          <IconX size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-[var(--border-solid)] px-4 py-5 text-center text-[13px] text-[var(--muted)]">
                No foods yet — add the pieces of this meal.
              </p>
            )}
            <button type="button" onClick={() => setPicking(true)} className="btn-secondary mt-2 w-full gap-1.5">
              <IconPlus size={15} /> Add food
            </button>
          </div>

          {drafts.length ? (
            <p className="text-center text-[13px] tabular-nums text-[var(--muted)]">
              Total <span className="font-bold text-[var(--text)]">{roundMacro(totals.calories)} cal</span> · {roundMacro(totals.protein)}p · {roundMacro(totals.carbs)}c · {roundMacro(totals.fat)}f
            </p>
          ) : null}
          {error ? <p className="text-center text-[13px] text-[var(--yellow)]">{error}</p> : null}
        </div>

        <div className="border-t border-[var(--border)] px-5 py-3.5" style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom, 0px))" }}>
          <button
            type="button"
            className="btn-accent w-full"
            disabled={saving || !name.trim() || !drafts.length}
            onClick={() => onSave({ name: name.trim(), meal: slot, items })}
          >
            {saving ? "Saving…" : "Save meal"}
          </button>
        </div>
      </div>

      {picking ? <FoodSearchModal meal={slot} onClose={() => setPicking(false)} onAdd={addFood} /> : null}
    </div>
  );
}
