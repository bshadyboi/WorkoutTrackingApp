"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateKey } from "@/lib/protocol";

type TrendRow = {
  date: string;
  weight: number;
  systolic: number;
};

function avgBp(sys1: number, sys2: number, dia1: number, dia2: number) {
  const sys: number[] = [];
  const dia: number[] = [];
  if (sys1 > 0 && dia1 > 0) {
    sys.push(sys1);
    dia.push(dia1);
  }
  if (sys2 > 0 && dia2 > 0) {
    sys.push(sys2);
    dia.push(dia2);
  }
  if (!sys.length) return 0;
  return Math.round(sys.reduce((a, b) => a + b, 0) / sys.length);
}

function coords(
  values: number[],
  w: number,
  h: number,
  pad: number
): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = pad + (i / Math.max(1, values.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

function DualTrendChart({ rows }: { rows: TrendRow[] }) {
  const w = 300;
  const h = 72;
  const pad = 6;

  const weightVals = rows.map((r) => r.weight).filter((v) => v > 0);
  const bpVals = rows.map((r) => r.systolic).filter((v) => v > 0);
  const weightLine = coords(
    rows.map((r) => r.weight || weightVals[0] || 0),
    w,
    h,
    pad
  );
  const bpLine = coords(
    rows.map((r) => r.systolic || bpVals[0] || 0),
    w,
    h,
    pad
  );

  const lastWeight = [...rows].reverse().find((r) => r.weight > 0)?.weight;
  const firstWeight = rows.find((r) => r.weight > 0)?.weight;
  const lastBp = [...rows].reverse().find((r) => r.systolic > 0)?.systolic;
  const firstBp = rows.find((r) => r.systolic > 0)?.systolic;
  const wDelta =
    lastWeight && firstWeight ? lastWeight - firstWeight : null;
  const bDelta = lastBp && firstBp ? lastBp - firstBp : null;

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-[72px] w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        {weightVals.length >= 2 ? (
          <polyline
            points={weightLine}
            fill="none"
            stroke="var(--blue)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {bpVals.length >= 2 ? (
          <polyline
            points={bpLine}
            fill="none"
            stroke="var(--green)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="6 4"
          />
        ) : null}
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[var(--blue)]">
            <span className="inline-block h-0.5 w-3 rounded bg-[var(--blue)]" />
            Weight
          </span>
          <span className="flex items-center gap-1 text-[var(--green)]">
            <span className="inline-block h-0.5 w-3 rounded border-t border-dashed border-[var(--green)]" />
            BP (sys)
          </span>
        </div>
        <span className="text-[var(--muted)]">
          {rows[0]?.date.slice(5)} → {rows[rows.length - 1]?.date.slice(5)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {lastWeight ? (
          <div className="rounded-lg bg-[var(--surface)] px-2.5 py-2">
            <p className="text-[10px] uppercase text-[var(--muted)]">Weight</p>
            <p className="font-bold text-[var(--blue)]">{lastWeight.toFixed(1)} lb</p>
            {wDelta !== null ? (
              <p className="text-[10px] text-[var(--muted)]">
                {wDelta > 0.05 ? "+" : ""}
                {wDelta.toFixed(1)} lb
              </p>
            ) : null}
          </div>
        ) : null}
        {lastBp ? (
          <div className="rounded-lg bg-[var(--surface)] px-2.5 py-2">
            <p className="text-[10px] uppercase text-[var(--muted)]">BP avg</p>
            <p className="font-bold text-[var(--green)]">{lastBp} sys</p>
            {bDelta !== null ? (
              <p className="text-[10px] text-[var(--muted)]">
                {bDelta > 0 ? "+" : ""}
                {bDelta} mmHg
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function BpWeightTrendCard() {
  const [rows, setRows] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const since = new Date();
      since.setDate(since.getDate() - 30);

      const sinceKey = dateKey(since);
      const { data, error } = await supabase
        .from("daily_logs")
        .select(
          "date, morning_weight, bp1_systolic, bp1_diastolic, bp2_systolic, bp2_diastolic"
        )
        .eq("user_id", user.id)
        .gte("date", sinceKey)
        .order("date", { ascending: true });

      if (cancelled) return;
      if (error) {
        setLoading(false);
        return;
      }

      const built: TrendRow[] = (data ?? [])
        .map((r) => ({
          date: String(r.date),
          weight: Number(r.morning_weight) || 0,
          systolic: avgBp(
            Number(r.bp1_systolic) || 0,
            Number(r.bp2_systolic) || 0,
            Number(r.bp1_diastolic) || 0,
            Number(r.bp2_diastolic) || 0
          ),
        }))
        .filter((r) => r.weight > 0 || r.systolic > 0);

      setRows(built);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartable = useMemo(() => {
    const weightCount = rows.filter((r) => r.weight > 0).length;
    const bpCount = rows.filter((r) => r.systolic > 0).length;
    return weightCount >= 2 || bpCount >= 2;
  }, [rows]);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-[var(--card-2)]" />;
  }

  if (!rows.length) {
    return (
      <div className="card space-y-1">
        <p className="text-sm font-semibold">Weight & BP trends</p>
        <p className="text-xs text-[var(--muted)]">
          Log morning weight and fasted BP to see trends here.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-2">
      <div>
        <p className="text-sm font-semibold">Weight & BP trends</p>
        <p className="text-[11px] text-[var(--muted)]">Last 30 days</p>
      </div>
      {chartable ? (
        <DualTrendChart rows={rows} />
      ) : (
        <p className="text-xs text-[var(--muted)]">
          Log at least 2 days of weight or BP to see the trend line.
        </p>
      )}
    </div>
  );
}
