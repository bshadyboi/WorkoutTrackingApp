/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { exercisePhoto } from "@/lib/exercisePhotos";
import { createClient } from "@/lib/supabase/client";
import {
  buildLiftSeries,
  formatLiftWeight,
  type LiftSeries,
} from "@/lib/liftProgress";

function Sparkline({ points }: { points: { weight: number }[] }) {
  if (points.length < 2) return null;

  const w = 280;
  const h = 56;
  const pad = 4;
  const vals = points.map((p) => p.weight);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.weight - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });

  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  const last = coords[coords.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-14 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polygon points={area} fill="rgba(48, 209, 89, 0.12)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--green)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--green)" />
    </svg>
  );
}

export function LiftProgressCard({ expanded = false }: { expanded?: boolean }) {
  const [series, setSeries] = useState<LiftSeries[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
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

      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          "started_at, set_logs(exercise_name, weight, reps, is_completed, is_warmup)",
        )
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(60);

      if (cancelled) return;
      if (error) { setError("Could not load lift history. Please reload and try again."); setLoading(false); return; }
      const built = buildLiftSeries(data ?? [], expanded ? 1000 : 8);
      setSeries(built);
      setSelected((prev) => prev ?? built[0]?.name ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded]);

  if (loading) {
    return <div className="h-36 animate-pulse rounded-md bg-[var(--card-2)]" />;
  }

  if (error) return <p role="alert" className="card text-sm text-[var(--yellow)]">{error}</p>;

  if (series.length === 0) {
    return (
      <div className="card space-y-1 !py-3.5">
        <p className="text-sm font-semibold">Lift progress</p>
        <p className="text-xs text-[var(--muted)]">
          Finish a few sessions of the same lifts and your top-set trend shows
          up here.
        </p>
      </div>
    );
  }

  const active = series.find((s) => s.name === selected) ?? series[0];
  const delta = active.deltaLb;
  const deltaLabel =
    Math.abs(delta) < 0.05
      ? "flat"
      : `${delta > 0 ? "+" : ""}${formatLiftWeight(delta)} lb`;

  if (expanded) {
    const first = active.points[0];
    const best = active.points.reduce((a,b) => b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a);
    const fmt = (p: {weight:number;reps:number}) => `${formatLiftWeight(p.weight)} lb × ${p.reps}`;
    return <section className="strength-detail space-y-5">
      <label className="block"><span className="sr-only">Choose exercise</span><select className="field" value={active.name} onChange={e => setSelected(e.target.value)}>{series.map(s => <option key={s.name}>{s.name}</option>)}</select></label>
      <div><h2 className="text-3xl font-extrabold">{fmt(active.latest)}</h2><p className="mt-1 text-sm text-[var(--muted)]">Latest logged top set</p></div>
      <StrengthChart points={active.points} />
      <div className="card !py-0">{[{label:"First in chart",point:first},{label:"Latest",point:active.latest},{label:"Best load in chart",point:best}].map(x => <div key={x.label} className="flex justify-between gap-3 border-b border-[var(--border)] py-3 last:border-0"><span className="text-sm text-[var(--muted)]">{x.label}</span><strong className="text-sm">{fmt(x.point)}</strong></div>)}</div>
      <div><h3 className="mb-3 text-lg font-bold">Recent training days</h3><div className="space-y-2">{active.points.slice(-5).reverse().map(point => <div key={point.date} className="progress-session card flex items-center gap-3 !p-3">
        {exercisePhoto(active.name) && <img src={exercisePhoto(active.name)!} alt="" className="h-16 w-16 rounded-md object-cover" />}
        <div><p className="text-sm text-[var(--muted)]">{new Date(point.date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</p><strong>{fmt(point)}</strong></div>
      </div>)}</div></div>
      <p className="text-xs text-[var(--muted)]">Heaviest completed working set per day, from your last 60 completed workouts. This chart is a recent trend; your NT program baseline is in Coach.</p>
    </section>;
  }

  return (
    <div className="card min-w-0 max-w-full space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Lift progress</p>
          <p className="text-[11px] text-[var(--muted)]">
            Top set over recent sessions
          </p>
        </div>
        <span
          className={`text-xs font-bold ${
            delta > 0.05
              ? "text-[var(--green)]"
              : delta < -0.05
                ? "text-[var(--yellow)]"
                : "text-[var(--muted)]"
          }`}
        >
          {deltaLabel}
        </span>
      </div>

      <div className="flex min-w-0 max-w-full gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {series.map((s) => {
          const on = s.name === active.name;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => setSelected(s.name)}
              className={`shrink-0 rounded-[4px] px-2.5 py-1.5 text-[11px] font-semibold ${
                on
                  ? "bg-[var(--blue)] text-[var(--on-blue)]"
                  : "bg-[var(--raised)] text-[var(--muted)]"
              }`}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      <Sparkline points={active.points} />

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase text-[var(--muted)]">
            Latest
          </p>
          <p className="text-xl font-bold tabular-nums">
            {formatLiftWeight(active.latest.weight)}
            <span className="text-sm font-semibold text-[var(--muted)]">
              {" "}
              × {active.latest.reps}
            </span>
          </p>
        </div>
        <p className="text-[11px] text-[var(--muted)]">
          {active.points.length} sessions · {active.points[0].date.slice(5)} →{" "}
          {active.latest.date.slice(5)}
        </p>
      </div>
    </div>
  );
}

function StrengthChart({points}: {points: LiftSeries["points"]}) {
  const low = Math.floor(Math.min(...points.map(p=>p.weight)) / 10) * 10 - 10;
  const high = Math.ceil(Math.max(...points.map(p=>p.weight)) / 10) * 10 + 10;
  const first = +new Date(points[0].date), last = +new Date(points[points.length-1].date);
  const xy = points.map(p=>[42+(+new Date(p.date)-first)/Math.max(1,last-first)*270, 160-(p.weight-low)/(high-low)*140]);
  const line = xy.map(p=>p.join(",")).join(" ");
  return <svg viewBox="0 0 330 195" className="w-full" role="img" aria-label={`Top-set load from ${points[0].weight} to ${points[points.length-1].weight} pounds between ${points[0].date} and ${points[points.length-1].date}`}>
    {[0,1,2,3,4].map(i=><g key={i}><line x1="42" x2="312" y1={20+i*35} y2={20+i*35} stroke="var(--border)"/><text x="32" y={24+i*35} textAnchor="end" fill="var(--muted)" fontSize="11">{Math.round(high-(high-low)*i/4)}</text></g>)}
    <polygon points={`42,160 ${line} 312,160`} fill="var(--blue-dim)" />
    <polyline points={line} fill="none" stroke="var(--blue)" strokeWidth="2" />
    {xy.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3" fill="var(--blue)" stroke="var(--text)"><title>{`${points[i].date}: ${points[i].weight} lb × ${points[i].reps}`}</title></circle>)}
    <text x="42" y="185" fill="var(--muted)" fontSize="11">{points[0].date}</text><text x="312" y="185" textAnchor="end" fill="var(--muted)" fontSize="11">{points[points.length-1].date}</text>
  </svg>;
}
