"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  calendarInitials,
  dateKey,
  DEFAULT_PROTOCOL,
  isDueOnWeekday,
  parseTakenDates,
  serializeTakenDates,
} from "@/lib/protocol";

type Item = {
  id: string;
  name: string;
  dosage: string;
  schedule_label: string;
  frequency_label: string;
  sort_order: number;
  taken_dates: string;
};

type Mode = "today" | "calendar" | "manage";

export default function ProtocolPage() {
  const [mode, setMode] = useState<Mode>("today");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(() => new Date());
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const load = useCallback(async () => {
    setError("");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data: firstData, error: err } = await supabase
      .from("protocol_items")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order");

    let data = firstData;

    if (err) {
      setError(
        "Protocol table missing — run web/supabase/schema_ea.sql in Supabase SQL Editor."
      );
      setLoading(false);
      return;
    }

    // Only seed when empty — never wipe existing items (that cleared checkmarks)
    if (!(data?.length)) {
      await supabase.from("protocol_items").insert(
        DEFAULT_PROTOCOL.map((item, i) => ({
          user_id: user.id,
          name: item.name,
          dosage: item.dosage,
          schedule_label: item.schedule_label,
          frequency_label: item.frequency_label,
          sort_order: i,
          taken_dates: "",
        }))
      );
      const refetch = await supabase
        .from("protocol_items")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order");
      data = refetch.data;
    }

    setItems((data as Item[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const key = dateKey(selected);
  const weekday = selected.getDay();
  const due = useMemo(
    () => items.filter((i) => isDueOnWeekday(i.frequency_label, weekday)),
    [items, weekday]
  );
  const takenCount = due.filter((i) => parseTakenDates(i.taken_dates).has(key)).length;

  async function toggleTaken(item: Item) {
    const set = parseTakenDates(item.taken_dates);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    const next = serializeTakenDates(set);
    setItems((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, taken_dates: next } : p))
    );
    const supabase = createClient();
    const { error: upErr } = await supabase
      .from("protocol_items")
      .update({ taken_dates: next })
      .eq("id", item.id);
    if (upErr) {
      setError(upErr.message || "Couldn’t save checkmark");
      // revert
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, taken_dates: item.taken_dates } : p
        )
      );
    }
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
    const supabase = createClient();
    await supabase.from("protocol_items").delete().eq("id", id);
  }

  async function addItem(kind: "compound" | "supplement") {
    const name = prompt(kind === "compound" ? "Compound name" : "Supplement name");
    if (!name) return;
    const dosage = prompt("Dosage / notes", "") ?? "";
    const frequency = prompt("Frequency (Daily, Sun, Mon Thu…)", "Daily") ?? "Daily";
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("protocol_items")
      .insert({
        user_id: user.id,
        name,
        dosage,
        schedule_label: kind === "compound" ? "SubQ" : "Oral",
        frequency_label: frequency,
        sort_order: items.length,
        taken_dates: "",
      })
      .select("*")
      .single();
    if (data) setItems((prev) => [...prev, data as Item]);
  }

  if (loading) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const dayLabel = selected.toLocaleDateString(undefined, { weekday: "short" });
  const isToday = key === dateKey(new Date());

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" className={mode === "today" ? "chip-active" : "chip"} onClick={() => setMode("today")}>
          ✓ Today
        </button>
        <button type="button" className={mode === "calendar" ? "chip-active" : "chip"} onClick={() => setMode("calendar")}>
          📅 Calendar
        </button>
        <button type="button" className={mode === "manage" ? "chip-active" : "chip"} onClick={() => setMode("manage")}>
          ✏️ Manage
        </button>
      </div>

      {error ? <p className="text-sm text-[var(--yellow)]">{error}</p> : null}

      {mode === "today" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {isToday ? "Today" : key} — {dayLabel}
            </h1>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-[var(--blue)]"
                onClick={() => setSelected(new Date(selected.getTime() - 86400000))}
              >
                ‹
              </button>
              <button
                type="button"
                className="text-[var(--blue)]"
                disabled={isToday}
                onClick={() => setSelected(new Date(selected.getTime() + 86400000))}
              >
                ›
              </button>
            </div>
          </div>

          <div className="card reg !p-0">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="font-semibold">Due today</p>
              <span className="btn-pill border border-[var(--yellow)] text-[var(--yellow)]">
                {takenCount}/{due.length}
              </span>
            </div>
            {due.length === 0 ? (
              <p className="p-4 text-sm text-[var(--muted)]">Nothing due this day.</p>
            ) : (
              due.map((item) => {
                const on = parseTakenDates(item.taken_dates).has(key);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleTaken(item)}
                    className="flex w-full items-start gap-3 border-b border-[var(--border)] px-4 py-3 text-left last:border-0"
                  >
                    <span className={on ? "check-box-on" : "check-box"} aria-hidden>
                      {on ? "✓" : ""}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{item.name}</span>
                      <span className="block text-xs text-[var(--muted)]">{item.dosage}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <h2 className="text-xl font-bold">Full Schedule</h2>
          <div className="card !p-0 overflow-hidden">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{item.name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{item.dosage}</p>
                </div>
                <p className="shrink-0 text-xs font-semibold text-[var(--muted)]">
                  {item.frequency_label}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mode === "manage" ? (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Full Schedule</h1>
          <div className="card !p-0 overflow-hidden">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{item.name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {item.dosage} · {item.frequency_label}
                  </p>
                </div>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--raised)] text-sm"
                  onClick={() => removeItem(item.id)}
                  aria-label="Delete"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 p-3">
              <button type="button" className="btn-accent !py-2.5 text-xs" onClick={() => addItem("compound")}>
                + Add compound
              </button>
              <button type="button" className="btn-accent !py-2.5 text-xs" onClick={() => addItem("supplement")}>
                + Add supplement
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "calendar" ? (
        <ProtocolCalendar
          month={month}
          setMonth={setMonth}
          items={items}
          selected={selected}
          setSelected={(d) => {
            setSelected(d);
            setMode("today");
          }}
        />
      ) : null}
    </div>
  );
}

function ProtocolCalendar({
  month,
  setMonth,
  items,
  selected,
  setSelected,
}: {
  month: Date;
  setMonth: (d: Date) => void;
  items: Item[];
  selected: Date;
  setSelected: (d: Date) => void;
}) {
  const cells = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const pad = first.getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < pad; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, m, d, 12));
    return out;
  }, [month]);

  const todayKey = dateKey(new Date());
  const selectedKey = dateKey(selected);
  const title = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" className="text-[var(--blue)]" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          ‹
        </button>
        <h2 className="text-lg font-bold">{title}</h2>
        <button type="button" className="text-[var(--blue)]" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) => {
          if (!c) return <div key={`e${i}`} />;
          const key = dateKey(c);
          const due = items.filter((it) => isDueOnWeekday(it.frequency_label, c.getDay()));
          const taken = due.filter((it) => parseTakenDates(it.taken_dates).has(key)).length;
          const all = due.length > 0 && taken === due.length;
          const none = due.length > 0 && taken === 0 && key < todayKey;
          const partial = due.length > 0 && taken > 0 && taken < due.length;
          const isToday = key === todayKey;
          const isSel = key === selectedKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(c)}
              className={`flex aspect-square flex-col items-center justify-center rounded-md border text-[9px] ${
                all
                  ? "border-[var(--green)] text-[var(--green)]"
                  : partial
                    ? "border-[var(--yellow)] text-[var(--yellow)]"
                    : none
                      ? "border-transparent text-[var(--red)]"
                      : isToday || isSel
                        ? "border-[var(--blue)] text-[var(--text)]"
                        : "border-[var(--border-solid)] text-[var(--muted)]"
              }`}
            >
              <span className="font-bold text-[11px] text-[var(--text)]">{c.getDate()}</span>
              {all ? (
                <span>✓</span>
              ) : due.length ? (
                <span>
                  {taken}/{due.length}
                </span>
              ) : (
                <span className="opacity-40">
                  {due.slice(0, 1).map((d) => calendarInitials(d.name)).join("")}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        <span className="text-[var(--green)]">●</span> all taken ·{" "}
        <span className="text-[var(--muted)]">●</span> missed · initials = due
      </p>
    </div>
  );
}
