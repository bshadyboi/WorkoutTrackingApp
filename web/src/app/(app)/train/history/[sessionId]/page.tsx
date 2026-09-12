"use client";

import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildSessionReview,
  tagLabel,
  type SessionBrief,
  type SessionReview,
} from "@/lib/checkin";
import { CopyShareButton } from "@/components/CopyShareButton";
import { clearTabCache } from "@/lib/tabCache";
import { CompletionBanner, WinsCard } from "@/components/CompletionBanner";
import {
  buildAllTimeBest,
  detectSessionWins,
  winsCopyBlock,
  type Win,
} from "@/lib/wins";

type SetLog = {
  exercise_name: string;
  weight: number;
  reps: number;
  set_number: number;
  is_warmup?: boolean;
};

function SessionRecapInner() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const fresh = search.get("fresh") === "1";
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [review, setReview] = useState<SessionReview | null>(null);
  const [showBanner, setShowBanner] = useState(fresh);
  const [allSets, setAllSets] = useState<{ name: string; line: string; isPr: boolean }[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [wins, setWins] = useState<Win[]>([]);
  const [copyText, setCopyText] = useState("");
  const [prNames, setPrNames] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [startedAt, setStartedAt] = useState("");

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    if (fresh) {
      router.replace(`/train/history/${sessionId}`, { scroll: false });
    }
  }, [fresh, router, sessionId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session: auth },
      } = await supabase.auth.getSession();
      if (!auth?.user) {
        setErr("Sign in to view this session");
        setLoading(false);
        return;
      }

      type SessionRow = {
        id: string;
        day_name: string;
        started_at: string;
        duration_seconds: number;
        notes: string;
        rating?: number | null;
        set_logs: SetLog[] | null;
      };

      let data: SessionRow | null = null;
      let error: { message: string } | null = null;

      {
        const res = await supabase
          .from("workout_sessions")
          .select(
            "id, day_name, started_at, duration_seconds, notes, rating, set_logs(exercise_name, weight, reps, set_number, is_warmup)"
          )
          .eq("id", sessionId)
          .eq("user_id", auth.user.id)
          .maybeSingle();
        data = res.data as SessionRow | null;
        error = res.error;
        if (error?.message?.toLowerCase().includes("rating")) {
          const fallback = await supabase
            .from("workout_sessions")
            .select(
              "id, day_name, started_at, duration_seconds, notes, set_logs(exercise_name, weight, reps, set_number, is_warmup)"
            )
            .eq("id", sessionId)
            .eq("user_id", auth.user.id)
            .maybeSingle();
          data = fallback.data as SessionRow | null;
          error = fallback.error;
        }
      }

      if (cancelled) return;
      if (error || !data) {
        setErr(error?.message || "Session not found");
        setLoading(false);
        return;
      }

      setRating(typeof data.rating === "number" ? data.rating : null);
      setStartedAt(data.started_at);

      const logs = [...((data.set_logs as SetLog[] | null) ?? [])].sort(
        (a, b) =>
          a.exercise_name.localeCompare(b.exercise_name) || a.set_number - b.set_number
      );

      const brief: SessionBrief = {
        id: data.id,
        dayName: data.day_name,
        startedAt: data.started_at,
        durationSeconds: data.duration_seconds || 0,
        sets: logs,
        notes: data.notes || "",
        rating: typeof data.rating === "number" ? data.rating : null,
      };

      // Previous session with same day name (for lift compare)
      const { data: prevRows } = await supabase
        .from("workout_sessions")
        .select(
          "id, day_name, started_at, duration_seconds, set_logs(exercise_name, weight, reps, set_number, is_warmup)"
        )
        .eq("user_id", auth.user.id)
        .eq("day_name", data.day_name)
        .neq("id", data.id)
        .not("ended_at", "is", null)
        .lt("started_at", data.started_at)
        .order("started_at", { ascending: false })
        .limit(1);

      const prevRaw = prevRows?.[0];
      const previous: SessionBrief | null = prevRaw
        ? {
            id: prevRaw.id,
            dayName: prevRaw.day_name,
            startedAt: prevRaw.started_at,
            durationSeconds: prevRaw.duration_seconds || 0,
            sets: (prevRaw.set_logs as SessionBrief["sets"] | null) ?? [],
          }
        : null;

      const built = buildSessionReview(brief, previous);

      // History context for wins (PRs, streaks, comeback)
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ data: oldSessions }, { count: priorCount }, { count: weekCount }, { data: lastAny }] =
        await Promise.all([
          supabase
            .from("workout_sessions")
            .select("id, set_logs(exercise_name, weight, reps, is_warmup)")
            .eq("user_id", auth.user.id)
            .not("ended_at", "is", null)
            .lt("started_at", data.started_at)
            .order("started_at", { ascending: false })
            .limit(200),
          supabase
            .from("workout_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", auth.user.id)
            .not("ended_at", "is", null)
            .lt("started_at", data.started_at),
          supabase
            .from("workout_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", auth.user.id)
            .not("ended_at", "is", null)
            .gte("started_at", weekAgo),
          supabase
            .from("workout_sessions")
            .select("started_at")
            .eq("user_id", auth.user.id)
            .not("ended_at", "is", null)
            .lt("started_at", data.started_at)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      const bestRows: { exercise_name: string; weight: number; reps: number }[] = [];
      for (const s of oldSessions ?? []) {
        for (const l of (s.set_logs as {
          exercise_name: string;
          weight: number;
          reps: number;
          is_warmup?: boolean;
        }[] | null) ?? []) {
          bestRows.push(l);
        }
      }

      const allTimeBest = buildAllTimeBest(bestRows);
      let daysSince: number | null = null;
      if (lastAny?.started_at) {
        daysSince = Math.floor(
          (new Date(data.started_at).getTime() - new Date(lastAny.started_at).getTime()) /
            86400000
        );
      }

      const detected = detectSessionWins({
        session: brief,
        previousSameDay: previous,
        allTimeBest,
        priorSessionCount: priorCount ?? 0,
        sessionsThisWeek: weekCount ?? 1,
        daysSinceLastSession: daysSince,
        liftLog: built.liftLog,
      });

      const prSet = new Set(
        detected
          .filter((w) => w.kind === "pr")
          .map((w) => w.title.replace(/^New best · /, "").replace(/^First log · /, ""))
      );

      const copy = [...built.copyText.split("\n"), ...winsCopyBlock(detected)].join("\n");

      if (cancelled) return;
      setReview(built);
      setWins(detected);
      setCopyText(copy);
      setPrNames(prSet);

      const byName = new Map<string, SetLog[]>();
      for (const s of logs) {
        const arr = byName.get(s.exercise_name) ?? [];
        arr.push(s);
        byName.set(s.exercise_name, arr);
      }
      setAllSets(
        [...byName.entries()].map(([name, rows]) => ({
          name,
          isPr: prSet.has(name),
          line: rows
            .map((r) => {
              const w = Number.isInteger(r.weight) ? String(r.weight) : r.weight.toFixed(1);
              return `${w} × ${r.reps}${r.is_warmup ? " W" : ""}`;
            })
            .join("  ·  "),
        }))
      );

      if (fresh && "Notification" in window && Notification.permission === "granted") {
        try {
          const reg = await navigator.serviceWorker.ready;
          const prs = detected.filter((w) => w.kind === "pr");
          const body =
            prs.length > 0
              ? prs
                  .map((w) => w.title)
                  .slice(0, 2)
                  .join(" · ")
              : "Session logged — nice work.";
          await reg.showNotification(
            prs.length
              ? `${built.title} · ${prs.length} PR${prs.length > 1 ? "s" : ""}`
              : `${built.title} complete`,
            {
              body,
              icon: "/icons/icon-192.png",
              tag: `checkin-daily-${data.id}`,
              data: { url: `/train/history/${data.id}` },
            }
          );
        } catch {
          /* ignore */
        }
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, fresh]);

  async function deleteSession() {
    if (deleting) return;
    setDeleting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setDeleting(false);
      setErr("Sign in required");
      return;
    }
    const { error } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id);
    setDeleting(false);
    if (error) {
      setErr(error.message);
      setShowDeleteConfirm(false);
      return;
    }
    clearTabCache("train");
    clearTabCache("dashboard");
    router.push("/train");
    router.refresh();
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-md bg-[var(--card-2)]" />;
  }

  if (err || !review) {
    return (
      <div className="space-y-3">
        <Link href="/train" className="text-xs font-semibold text-[var(--blue)]">
          ← Train
        </Link>
        <p className="text-sm text-[var(--yellow)]">{err || "Not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CompletionBanner
        dayName={review.title}
        wins={wins}
        show={showBanner}
        onDismiss={dismissBanner}
      />

      <div>
        <Link href="/train" className="text-xs font-semibold text-[var(--blue)]">
          ← Train
        </Link>
        <div className="mt-2 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">{review.title}</h1>
            <p className="text-sm text-[var(--muted)]">{review.subtitle}</p>
            {rating != null ? (
              <p className="mt-1 text-sm font-semibold text-[var(--green)]">
                Rated {rating}/10
              </p>
            ) : null}
          </div>
          <CopyShareButton text={copyText || review.copyText} label="Copy summary" />
        </div>
        <button
          type="button"
          className="mt-3 text-xs font-semibold text-[var(--red)]"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete this session
        </button>
      </div>

      <WinsCard wins={wins} />

      <div
        className="card space-y-2"
        style={{ borderColor: "rgba(91, 168, 255, 0.35)" }}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--blue)]">
          Highlights
        </p>
        {review.highlights.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No sets logged.</p>
        ) : (
          <ul className="space-y-1.5">
            {review.highlights.map((h) => (
              <li key={h} className="text-sm leading-snug text-[var(--text)]">
                {h}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-lg font-bold">Top sets vs last time</p>
        <div className="card !p-0 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-[var(--border)] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
            <span>Lift</span>
            <span className="text-right">Last → Today</span>
            <span></span>
          </div>
          {review.liftLog.length === 0 ? (
            <p className="p-3 text-sm text-[var(--muted)]">No lifts to compare.</p>
          ) : (
            review.liftLog.map((r) => (
              <div
                key={r.name}
                className="grid grid-cols-[1fr_auto_auto] items-baseline gap-2 border-b border-[var(--border)] px-3 py-2.5 last:border-0"
              >
                <p className="truncate text-sm font-semibold text-[var(--blue)]">
                  {r.name}
                  {prNames.has(r.name) ? (
                    <span className="ml-1.5 text-[10px] font-bold text-[var(--green)]">
                      PR
                    </span>
                  ) : null}
                </p>
                <p className="text-right text-[11px] text-[var(--muted)]">
                  {r.last ? `${r.last} → ${r.today}` : r.today}
                </p>
                <span
                  className={`text-[10px] font-bold uppercase ${
                    prNames.has(r.name)
                      ? "text-[var(--green)]"
                      : r.tag === "up"
                        ? "text-[var(--green)]"
                        : r.tag === "down"
                          ? "text-[var(--yellow)]"
                          : "text-[var(--muted)]"
                  }`}
                >
                  {prNames.has(r.name) ? "PR" : tagLabel(r.tag)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {review.notes ? (
        <div className="card space-y-1">
          <p className="text-xs font-bold uppercase text-[var(--muted)]">Session notes</p>
          <p className="whitespace-pre-wrap text-sm">{review.notes}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-lg font-bold">All sets</p>
        {allSets.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No completed sets.</p>
        ) : (
          allSets.map((row) => (
            <div
              key={row.name}
              className="card space-y-1 !py-3"
              style={
                row.isPr
                  ? { borderColor: "rgba(61, 220, 151, 0.4)" }
                  : undefined
              }
            >
              <p className="font-semibold text-[var(--blue)]">
                {row.name}
                {row.isPr ? (
                  <span className="ml-2 text-[10px] font-bold uppercase text-[var(--green)]">
                    PR
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-[var(--muted)]">{row.line}</p>
            </div>
          ))
        )}
      </div>

      {showDeleteConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-md border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl">
            <p className="text-lg font-bold">Delete session?</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This removes {review.title}
              {startedAt
                ? ` from ${new Date(startedAt).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}`
                : ""}
              . Set logs are deleted too. This cannot be undone.
            </p>
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                className="w-full rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300"
                disabled={deleting}
                onClick={() => void deleteSession()}
              >
                {deleting ? "Deleting…" : "Delete session"}
              </button>
              <button
                type="button"
                className="btn-secondary w-full"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SessionRecapPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-md bg-[var(--card-2)]" />}>
      <SessionRecapInner />
    </Suspense>
  );
}
