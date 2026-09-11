"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TARGETS, type MacroTargets } from "@/lib/targets";
import { assessBloodPressure, type BpAssessment } from "@/lib/bpAssess";
import { buildBpWeeklySummary, type BpDayRow } from "@/lib/bpSummary";
import { weekStartKey } from "@/lib/checkin";
import { dateKey } from "@/lib/protocol";
import { CopyShareButton } from "@/components/CopyShareButton";

export type BpReadings = {
  bp1_systolic: number;
  bp1_diastolic: number;
  bp2_systolic: number;
  bp2_diastolic: number;
  bp_logged_at?: string | null;
};

type HistoryRow = {
  date: string;
  bp1_systolic: number;
  bp1_diastolic: number;
  bp2_systolic: number;
  bp2_diastolic: number;
  bp_logged_at: string | null;
};

function fmtNum(n: number) {
  return n > 0 ? String(n) : "";
}

function clampDigits(raw: string, maxLen = 3) {
  return raw.replace(/\D/g, "").slice(0, maxLen);
}

function BpPairInput({
  label,
  sys,
  dia,
  onSys,
  onDia,
  sysPlaceholder = "120",
  diaPlaceholder = "80",
}: {
  label: string;
  sys: string;
  dia: string;
  onSys: (v: string) => void;
  onDia: (v: string) => void;
  sysPlaceholder?: string;
  diaPlaceholder?: string;
}) {
  const diaRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <input
            className="field w-full !py-3 text-center text-[17px] font-semibold tabular-nums"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            enterKeyHint="next"
            placeholder={sysPlaceholder}
            value={sys}
            onChange={(e) => {
              const next = clampDigits(e.target.value);
              onSys(next);
              if (next.length >= 3) diaRef.current?.focus();
            }}
            aria-label={`${label} systolic`}
          />
          <p className="text-center text-[9px] font-bold uppercase text-[var(--muted)]">
            Sys
          </p>
        </div>
        <span className="mb-4 shrink-0 text-xl font-bold text-[var(--muted)]">/</span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <input
            ref={diaRef}
            className="field w-full !py-3 text-center text-[17px] font-semibold tabular-nums"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            enterKeyHint="done"
            placeholder={diaPlaceholder}
            value={dia}
            onChange={(e) => onDia(clampDigits(e.target.value))}
            aria-label={`${label} diastolic`}
          />
          <p className="text-center text-[9px] font-bold uppercase text-[var(--muted)]">
            Dia
          </p>
        </div>
      </div>
    </div>
  );
}

function fmtPair(sys: number, dia: number) {
  if (!sys && !dia) return "";
  return `${sys}/${dia}`;
}

function formatLoggedAt(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHistoryDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, 12);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const TONE_CLASS: Record<BpAssessment["tone"], string> = {
  green: "border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]",
  blue: "border-[var(--blue)]/50 bg-[var(--blue)]/10 text-[var(--blue)]",
  yellow: "border-[var(--yellow)]/50 bg-[var(--yellow)]/10 text-[var(--yellow)]",
  orange: "border-orange-400/50 bg-orange-400/10 text-orange-300",
  red: "border-red-400/50 bg-red-500/10 text-red-300",
};

export function FastedBloodPressureCard({
  date,
  initial,
  targets = DEFAULT_TARGETS,
}: {
  date: string;
  initial?: Partial<BpReadings> | null;
  targets?: MacroTargets;
}) {
  const [r1Sys, setR1Sys] = useState(fmtNum(initial?.bp1_systolic ?? 0));
  const [r1Dia, setR1Dia] = useState(fmtNum(initial?.bp1_diastolic ?? 0));
  const [r2Sys, setR2Sys] = useState(fmtNum(initial?.bp2_systolic ?? 0));
  const [r2Dia, setR2Dia] = useState(fmtNum(initial?.bp2_diastolic ?? 0));
  const [loggedAt, setLoggedAt] = useState<string | null>(
    initial?.bp_logged_at ?? null
  );
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [weekSummary, setWeekSummary] = useState<ReturnType<
    typeof buildBpWeeklySummary
  > | null>(null);
  const [summary, setSummary] = useState<BpAssessment | null>(() => {
    const a = initial?.bp1_systolic ?? 0;
    const b = initial?.bp2_systolic ?? 0;
    if (!a && !b) return null;
    return assessBloodPressure({
      bp1_systolic: initial?.bp1_systolic ?? 0,
      bp1_diastolic: initial?.bp1_diastolic ?? 0,
      bp2_systolic: initial?.bp2_systolic ?? 0,
      bp2_diastolic: initial?.bp2_diastolic ?? 0,
    });
  });

  useEffect(() => {
    setR1Sys(fmtNum(initial?.bp1_systolic ?? 0));
    setR1Dia(fmtNum(initial?.bp1_diastolic ?? 0));
    setR2Sys(fmtNum(initial?.bp2_systolic ?? 0));
    setR2Dia(fmtNum(initial?.bp2_diastolic ?? 0));
    setLoggedAt(initial?.bp_logged_at ?? null);
  }, [
    date,
    initial?.bp1_systolic,
    initial?.bp1_diastolic,
    initial?.bp2_systolic,
    initial?.bp2_diastolic,
    initial?.bp_logged_at,
  ]);

  async function loadWeekSummary() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const monday = weekStartKey();
    const [y, m, d] = monday.split("-").map(Number);
    const end = new Date(y, m - 1, d, 12);
    end.setDate(end.getDate() + 6);
    const endKey = dateKey(end);

    const { data, error } = await supabase
      .from("daily_logs")
      .select(
        "date, bp1_systolic, bp1_diastolic, bp2_systolic, bp2_diastolic, bp_logged_at"
      )
      .eq("user_id", user.id)
      .gte("date", monday)
      .lte("date", endKey)
      .or("bp1_systolic.gt.0,bp2_systolic.gt.0")
      .order("date", { ascending: true });

    if (!error && data) {
      setWeekSummary(buildBpWeeklySummary(data as BpDayRow[]));
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setHistoryLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("daily_logs")
      .select(
        "date, bp1_systolic, bp1_diastolic, bp2_systolic, bp2_diastolic, bp_logged_at"
      )
      .eq("user_id", user.id)
      .or("bp1_systolic.gt.0,bp2_systolic.gt.0")
      .order("date", { ascending: false })
      .limit(30);

    if (!error && data) {
      setHistory(
        (data as HistoryRow[]).filter(
          (r) =>
            (r.bp1_systolic > 0 && r.bp1_diastolic > 0) ||
            (r.bp2_systolic > 0 && r.bp2_diastolic > 0)
        )
      );
    }
    setHistoryLoading(false);
  }

  useEffect(() => {
    void loadWeekSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    if (showHistory && history.length === 0 && !historyLoading) {
      void loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory]);

  async function save() {
    setSaving(true);
    setMsg("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setMsg("Sign in required");
      return;
    }

    const a = { sys: Number(r1Sys) || 0, dia: Number(r1Dia) || 0 };
    const b = { sys: Number(r2Sys) || 0, dia: Number(r2Dia) || 0 };

    if (
      (a.sys > 0 && !a.dia) ||
      (a.dia > 0 && !a.sys) ||
      (b.sys > 0 && !b.dia) ||
      (b.dia > 0 && !b.sys)
    ) {
      setSaving(false);
      setMsg("Enter both numbers for each reading (e.g. 120 and 80)");
      return;
    }

    const nowIso = new Date().toISOString();
    const readings = {
      bp1_systolic: a.sys,
      bp1_diastolic: a.dia,
      bp2_systolic: b.sys,
      bp2_diastolic: b.dia,
      bp_logged_at: nowIso,
    };

    const { error } = await supabase.from("daily_logs").upsert(
      {
        user_id: user.id,
        date,
        ...readings,
        ...targets,
      },
      { onConflict: "user_id,date" }
    );
    setSaving(false);
    if (error) {
      // Column may not exist yet
      if (error.message.toLowerCase().includes("bp_logged_at")) {
        const { error: err2 } = await supabase.from("daily_logs").upsert(
          {
            user_id: user.id,
            date,
            bp1_systolic: a.sys,
            bp1_diastolic: a.dia,
            bp2_systolic: b.sys,
            bp2_diastolic: b.dia,
            ...targets,
          },
          { onConflict: "user_id,date" }
        );
        if (err2) {
          setMsg(err2.message);
          return;
        }
        setLoggedAt(nowIso);
        setMsg("Saved (run schema_bp.sql for timestamps)");
        setSummary(assessBloodPressure(readings));
        return;
      }
      setMsg(error.message);
      return;
    }
    setLoggedAt(nowIso);
    setMsg("Saved");
    setSummary(assessBloodPressure(readings));
    void loadWeekSummary();
    if (showHistory) void loadHistory();
  }

  const loggedLabel = formatLoggedAt(loggedAt);

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Fasted blood pressure</p>
        <span className="rounded-full bg-[var(--raised)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">
          2 readings
        </span>
      </div>

      <div className="space-y-3">
        <BpPairInput
          label="Reading 1"
          sys={r1Sys}
          dia={r1Dia}
          onSys={setR1Sys}
          onDia={setR1Dia}
        />
        <BpPairInput
          label="Reading 2"
          sys={r2Sys}
          dia={r2Dia}
          onSys={setR2Sys}
          onDia={setR2Dia}
          sysPlaceholder="118"
          diaPlaceholder="78"
        />
      </div>

      <button
        type="button"
        className="btn-green w-full"
        onClick={() => void save()}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save BP"}
      </button>

      <p className="text-[11px] text-[var(--muted)]">
        Fasted AM — sit quietly, then two readings a minute apart. Enter top
        number (systolic) and bottom (diastolic) in each row.
        {loggedLabel ? (
          <>
            {" "}
            · Last saved{" "}
            <span className="font-semibold text-white/80">{loggedLabel}</span>
          </>
        ) : null}
      </p>
      {msg ? (
        <p
          className={`text-xs ${
            msg.startsWith("Saved") ? "text-[var(--green)]" : "text-[var(--yellow)]"
          }`}
        >
          {msg}
        </p>
      ) : null}

      {summary && summary.category !== "incomplete" ? (
        <div
          className={`mt-1 rounded-xl border px-3 py-2.5 ${TONE_CLASS[summary.tone]}`}
          role="status"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white">
                {summary.title} · {summary.label}
              </p>
              <p className="mt-0.5 text-[11px] text-white/80">{summary.detail}</p>
            </div>
            <button
              type="button"
              className="shrink-0 text-[11px] font-semibold text-white/60"
              onClick={() => setSummary(null)}
            >
              Dismiss
            </button>
          </div>
          <ul className="mt-2 space-y-1 text-[11px] text-white/75">
            {summary.tips.map((t) => (
              <li key={t}>· {t}</li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-white/45">
            Educational only — not a medical diagnosis.
          </p>
        </div>
      ) : null}

      {weekSummary && weekSummary.daysLogged > 0 ? (
        <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                This week
              </p>
              <p className="text-[12px] font-semibold text-white">
                {weekSummary.weekLabel}
              </p>
            </div>
            <CopyShareButton
              text={weekSummary.copyText}
              label="Copy for coach"
            />
          </div>
          <ul className="space-y-1 border-t border-[var(--border)] pt-2">
            {weekSummary.dayLines.map((line) => (
              <li key={line} className="text-[11px] leading-snug text-[var(--muted)]">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        className="w-full text-left text-[12px] font-semibold text-[var(--blue)]"
        onClick={() => setShowHistory((v) => !v)}
      >
        {showHistory ? "Hide history ▴" : "View BP history ▾"}
      </button>

      {showHistory ? (
        <div className="space-y-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2">
          {historyLoading ? (
            <p className="px-1 py-2 text-[11px] text-[var(--muted)]">Loading…</p>
          ) : history.length === 0 ? (
            <p className="px-1 py-2 text-[11px] text-[var(--muted)]">
              No past readings yet — save today’s to start the log.
            </p>
          ) : (
            history.map((row) => {
              const assess = assessBloodPressure(row);
              const time = formatLoggedAt(row.bp_logged_at);
              const r1s = fmtPair(row.bp1_systolic, row.bp1_diastolic);
              const r2s = fmtPair(row.bp2_systolic, row.bp2_diastolic);
              return (
                <div
                  key={row.date}
                  className="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white">
                      {formatHistoryDate(row.date)}
                    </p>
                    <p className="text-[11px] tabular-nums text-[var(--muted)]">
                      {r1s}
                      {r1s && r2s ? " · " : ""}
                      {r2s}
                      {time ? ` · ${time}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      assess.tone === "green"
                        ? "bg-[var(--green)]/15 text-[var(--green)]"
                        : assess.tone === "blue"
                          ? "bg-[var(--blue)]/15 text-[var(--blue)]"
                          : assess.tone === "yellow"
                            ? "bg-[var(--yellow)]/15 text-[var(--yellow)]"
                            : assess.tone === "orange"
                              ? "bg-orange-400/15 text-orange-300"
                              : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    {assess.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
